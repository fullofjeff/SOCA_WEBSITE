This is a comprehensive technical implementation plan for the **Hybrid Skinned-Wedge Architecture**.

This plan bridges the gap between your current solid "block" implementation and the fluid "SkinnedMesh" animation seen in projects like Wawa Sensei's.

---

# Implementation Plan: High-Fidelity 3D Book

## 1. System Architecture Overview

The system relies on a "Theatre" model. The **Stage** (Wedges) handles the volume/thickness, while the **Actor** (Page) performs the action.

* **The Wedges (Static/Morph):** Two persistent `ExtrudeGeometry` meshes representing the left and right page stacks. They now feature a curved "gutter" profile.
* **The Actor (Dynamic):** A single `SkinnedMesh` (bone-rigged plane) that spawns only during the flip transition.
* **The Coordinator:** A React state machine that synchronizes the "Instant Morph" of the wedges with the "Animation Start" of the Actor.

---

## Phase 1: The "Soft Gutter" Geometry

**Goal:** Replace the sharp V-angle at the spine with a realistic, tangent-continuous curve.

### 1.1. Curve Mathematics

We replace the linear line `lineTo(offset, height)` in your `ExtrudeGeometry` shape with a cubic Bezier curve.

* **The Constraint:** The tangent at the spine () must be perfectly horizontal (). This ensures the left and right pages meet smoothly.
* **The Shape Logic:**
1. **MoveTo:** Spine Edge (Bottom) -> 
2. **LineTo:** Outer Edge (Bottom) -> 
3. **LineTo:** Outer Edge (Top) -> 
4. **BezierCurveTo:** Back to Spine Edge (Top) -> .
* *Control Point 1:*  (Keeps it flat near the edge)
* *Control Point 2:*  (Creates the deep slope near spine)
* *End Point:* 


5. **Close:** Connect back to start.



### 1.2. Normal Smoothing

Standard `ExtrudeGeometry` will create "hard edges" at the curve segments.

* **Action:** After geometry creation, iterate through vertex normals. Force the normals at the spine edge vertices to be `(0, 1, 0)` (straight up).
* **Result:** Lighting calculates as if the surface continues seamlessly across the spine gap.

---

## Phase 2: The "Actor" (Skinned Flip Mesh)

**Goal:** Implement the "Wawa-style" flexible page using Bones, but adapted for a thick book context.

### 2.1. The Skeleton Rig

Instead of a simple plane, we create a `SkinnedMesh`.

* **Geometry:** `PlaneGeometry` () with high segmentation ( is sufficient for bones,  if using shaders).
* **Bones:** Create a chain of 5–8 `THREE.Bone` objects running horizontally from the spine (Left) to the edge (Right).
* *Bone 0 (Root):* Anchored at the spine.
* *Bone 1..N:* Children extending outward.



### 2.2. The "Leap" Offset

This is the critical divergence from the Wawa project (which assumes a flat book).

* **Problem:** The Wawa page rotates around . Your page needs to rotate around .
* **Implementation:** Wrap the `SkinnedMesh` in a `THREE.Group` called `ActorContainer`.
* **Logic:** When a flip starts, position `ActorContainer.position.y` exactly at the top of the **Source Wedge**.

### 2.3. The Double-Sided Material

To look realistic, the flipping page needs "Page N" on the front and "Page N+1" on the back.

* **Technique:** Use `geometry.addGroup` to assign Material Index 0 to the front faces and Material Index 1 to the back faces.
* **Shader Note:** If using `MeshStandardMaterial`, ensure `side: DoubleSide` is **OFF** and handle the two sides via the groups array to avoid lighting artifacts.

---

## Phase 3: The Logic Core (The Hand-off)

**Goal:** Orchestrate the illusion so the user never sees the "pop."

### 3.1. The State Machine

We need three atoms/state variables:

1. `pageIndex`: Integer (Current open page).
2. `isFlipping`: Boolean.
3. `flipDirection`: 'Next' or 'Prev'.

### 3.2. The Animation Sequence (Frame-by-Frame)

| Step | Action | Visual Result |
| --- | --- | --- |
| **0. Trigger** | User clicks "Next". | - |
| **1. Setup** | 1. **Snapshot Thickness:** Calculate current Wedge height.<br>

<br>2. **Spawn Actor:** Set `Actor` to visible at `SnapshotHeight`. <br>

<br>3. **Load Textures:** Actor Front = Page 1, Actor Back = Page 2.<br>

<br>4. **Wedge Morph:** Instantly reduce Right Wedge height by 1 page unit. | The "Top Page" separates from the block. The block underneath shrinks instantly, but the Actor covers the change. |
| **2. Animate** | Tween `Actor.rotation.y` from .<br>

<br>Tween `Bone[i].rotation` sequentially (The Curl). | The page curls up, travels across the spine, and uncurls. |
| **3. Landing** | Wait for rotation to hit . | The page is nearly flat on the left side. |
| **4. Cleanup** | 1. **Wedge Morph:** Increase Left Wedge height by 1 page unit.<br>

<br>2. **Hide Actor:** Set `Actor` to invisible.<br>

<br>3. **Update Textures:** Set Left Wedge Top to Page 2. | The "Actor" disappears, merging seamlessly into the Left Wedge geometry. |

---

## Phase 4: Polish & Physics

### 4.1. The "Spine Gap" Shift

In a real book, the "hinge" of the page moves slightly as it turns because of the paper thickness.

* **Logic:** During the animation loop (`useFrame`), interpolate the `ActorContainer.position.x` slightly.
* : 
* : 
* : 



### 4.2. Ambient Occlusion (The "Gutter Shadow")

To sell the depth of the new curved wedges:

* **Texture Method:** Bake a shadow map where the spine edge is black and fades to transparent white. Overlay this on your page texture.
* **Vertex Color Method:** In the geometry loop, set `color` attributes to darker values for vertices near .

### 4.3. Dynamic Speed

Don't use a fixed duration.

* **Velocity:** If the user drags, map the bone rotation to drag distance.
* **Snap:** If they release > 50%, spring-animate to the finish using a physics spring (like `react-spring` or `maath`).

---

## Summary Checklist

1. [ ] **Refactor Geometry:** Modify `pageBlockGeometry` to use a Cubic Bezier shape profile.
2. [ ] **Create Actor:** Build the `PageActor` component with `SkinnedMesh` and 6 bones.
3. [ ] **State Logic:** Implement the `handleNextPage` function to swap Wedge heights instantly.
4. [ ] **Animation Loop:** Connect `useFrame` to the Actor's bones for the curl effect.
5. [ ] **Texture Logic:** Ensure the Actor grabs the correct `texture[i]` and `texture[i+1]` before becoming visible.