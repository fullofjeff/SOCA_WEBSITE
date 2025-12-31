// Book_Test.jsx
import React, { useMemo, useRef, useState, useEffect } from "react";
import { Text, useCursor } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import {
  Bone,
  BoxGeometry,
  Float32BufferAttribute,
  MeshStandardMaterial,
  Skeleton,
  SkinnedMesh,
  Uint16BufferAttribute,
  Vector3,
  Euler,
  MathUtils,
} from "three";
import { easing } from "maath";

/* =============================== Tunables =============================== */
// Page stack
const PAGE_COUNT = 16;        // total sheets including back(0) and front(last)
const PAGE_WIDTH = 1.28;      // 3:4 ratio
const PAGE_HEIGHT = 1.71;     // 3:4 ratio
const PAGE_DEPTH = 0.003;

const COVER_THICKNESS_MULT = 6;
const PAGE_THICKNESS_MULT  = 1;

const SEGMENTS = 28;                        // bones across the width
const SEG_W = PAGE_WIDTH / SEGMENTS;
const Z_EPS = PAGE_DEPTH * 0.5;

// Motion & easing
const EASE_HINGE = 0.5;
const EASE_CURL  = 0.25;

// Angles (deg) → rad
const MIN_CLEAR  = MathUtils.degToRad(4);   // gap between any page and cover plane
const COVER_GAP  = MathUtils.degToRad(2);   // covers never reach perfect 180º
const INNER_GAP  = MathUtils.degToRad(3);   // inner pages stop short of cover
const BASE_BEND_Y = 0.01;                   // very light Y bend shaping
const FOLD_DEG   = 1.25;                    // tiny X fold near the free edge

/* =============================== Materials (colors only) =============================== */
const MAT_EDGE_PAPER  = new MeshStandardMaterial({ color: "#d8d1c5", roughness: 0.9, metalness: 0.0 });
const MAT_EDGE_COVER  = new MeshStandardMaterial({ color: "#2f2620", roughness: 0.8, metalness: 0.05 });
const MAT_COVER_FRONT = new MeshStandardMaterial({ color: "darkred", roughness: 0.8, metalness: 0.1 });
const MAT_COVER_BACK  = new MeshStandardMaterial({ color: "black",   roughness: 0.8, metalness: 0.1 });
const MAT_PAGE_FRONT  = new MeshStandardMaterial({ color: "lightgray", roughness: 0.25, metalness: 0.0 });
const MAT_PAGE_BACK   = new MeshStandardMaterial({ color: "green",     roughness: 0.25, metalness: 0.0 });

/* =============================== Geometry + skinning =============================== */
const pageGeom = new BoxGeometry(PAGE_WIDTH, PAGE_HEIGHT, PAGE_DEPTH, SEGMENTS, 2);
pageGeom.translate(PAGE_WIDTH / 2, 0, 0);
{
  const pos = pageGeom.attributes.position;
  const v = new Vector3();
  const idx = [];
  const wts = [];
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const x = v.x;
    const si = Math.max(0, Math.floor(x / SEG_W));
    const w = (x % SEG_W) / SEG_W;
    idx.push(si, si + 1, 0, 0);
    wts.push(1 - w, w, 0, 0);
  }
  pageGeom.setAttribute("skinIndex", new Uint16BufferAttribute(idx, 4));
  pageGeom.setAttribute("skinWeight", new Float32BufferAttribute(wts, 4));
}

const coverGeom = new BoxGeometry(PAGE_WIDTH, PAGE_HEIGHT, PAGE_DEPTH * COVER_THICKNESS_MULT, SEGMENTS, 2);
coverGeom.translate(PAGE_WIDTH / 2, 0, 0);
{
  const pos = coverGeom.attributes.position;
  const v = new Vector3();
  const idx = [];
  const wts = [];
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const x = v.x;
    const si = Math.max(0, Math.floor(x / SEG_W));
    const w = (x % SEG_W) / SEG_W;
    idx.push(si, si + 1, 0, 0);
    wts.push(1 - w, w, 0, 0);
  }
  coverGeom.setAttribute("skinIndex", new Uint16BufferAttribute(idx, 4));
  coverGeom.setAttribute("skinWeight", new Float32BufferAttribute(wts, 4));
}

/* =============================== Helpers =============================== */
const isBackCover  = (i) => i === 0;
const isFrontCover = (i, n) => i === n - 1;
const isCover      = (i, n) => isBackCover(i) || isFrontCover(i, n);

// thickness along Z so sheets don't z-fight
const thicknessMult = (i, n) => (isCover(i, n) ? COVER_THICKNESS_MULT : PAGE_THICKNESS_MULT);
const sheetT        = (i, n) => PAGE_DEPTH * thicknessMult(i, n);
const totalT        = (n) => { let t = 0; for (let i = 0; i < n; i++) t += sheetT(i, n) + Z_EPS; return t; };
const beforeT       = (i, n) => { let t = 0; for (let k = 0; k < i; k++) t += sheetT(k, n) + Z_EPS; return t; };
const pageZ         = (i, n) => -totalT(n) / 2 + beforeT(i, n) + sheetT(i, n) / 2;

// side logic
const closedSide = (i, n) => (isBackCover(i) ? "left" : "right");                 // closed: back-left, rest-right
const openSide   = (i, n) => (i <= Math.floor(n / 2) ? "left" : "right");         // open: split near middle
// decide left/right strictly from the current "open" state
const whichSide = (i, count, open) => (open ? openSide(i, count) : closedSide(i, count));

/* =============================== Spine =============================== */
const Spine = ({ count, title }) => {
  const T = totalT(count);
  return (
    <>
      <mesh>
        <boxGeometry args={[PAGE_DEPTH * 2, PAGE_HEIGHT, T]} />
        <meshStandardMaterial color="#2f2620" />
      </mesh>
      {title && (
        <Text
          position={[-PAGE_DEPTH - 0.002, 0, 0]}
          rotation={[0, Math.PI / 2, Math.PI / 2]}
          fontSize={0.08}
          color="#cdbb9a"
          anchorX="center"
          anchorY="middle"
        >
          {title}
        </Text>
      )}
    </>
  );
};

/* =============================== Page (skinned) =============================== */
const Page = ({ index, total, open }) => {
  const mats = useMemo(() => {
    const edge  = isCover(index, total) ? MAT_EDGE_COVER : MAT_EDGE_PAPER;
    const front = isFrontCover(index, total) ? MAT_COVER_FRONT : MAT_PAGE_FRONT;
    const back  = isBackCover(index)        ? MAT_COVER_BACK  : MAT_PAGE_BACK;
    // +X, -X, +Y, -Y, +Z, -Z
    return [edge, edge, edge, edge, front, back];
  }, [index, total]);

  const skinned = useMemo(() => {
    const bones = [];
    for (let i = 0; i <= SEGMENTS; i++) {
      const b = new Bone();
      b.rotation.order = "YXZ";
      bones.push(b);
      b.position.x = i === 0 ? 0 : SEG_W;
      if (i > 0) bones[i - 1].add(b);
    }
    const skeleton = new Skeleton(bones);
    const geom = isCover(index, total) ? coverGeom : pageGeom;
    const mesh = new SkinnedMesh(geom, mats);
    mesh.castShadow = !isCover(index, total);
    mesh.receiveShadow = true;
    mesh.frustumCulled = false;
    mesh.add(skeleton.bones[0]);
    mesh.bind(skeleton);
    return mesh;
  }, [index, total, mats]);

  const ref = useRef();
  const [hover, setHover] = useState(false);
  useCursor(hover);

  useFrame((_, dt) => {
    if (!ref.current) return;
    const bones = ref.current.skeleton.bones;

    const side = whichSide(index, total, open);
    // planes a perfectly flat sheet would live on
    const LEFT_PLANE  = Math.PI / 2 - COVER_GAP;
    const RIGHT_PLANE = -Math.PI / 2 + COVER_GAP;
    const plane = side === "left" ? LEFT_PLANE : RIGHT_PLANE;

    // CLOSED STATE: back cover left, everything else right, NO CURL
    if (!open) {
      const closedPlane =
        isBackCover(index) ? LEFT_PLANE : RIGHT_PLANE;
      const desiredY = new Array(bones.length).fill(closedPlane);
      // set relative (incremental) rotation per bone
      for (let i = 0; i < bones.length; i++) {
        const prev = i === 0 ? 0 : desiredY[i - 1];
        const deltaY = desiredY[i] - prev;
        easing.dampAngle(bones[i].rotation, "y", deltaY, EASE_HINGE, dt);
        // no X fold when closed
        easing.dampAngle(bones[i].rotation, "x", 0, EASE_CURL, dt);
      }
      return; // important: stop here while closed
    }

    // OPEN STATE: covers on their planes, inner pages just inside the planes
    let hingeTarget = isCover(index, total)
      ? plane
      : plane + (side === "left" ? -INNER_GAP : +INNER_GAP);

    // build absolute desired Y profile across width (small, gentle S-curve)
    const desiredY = new Array(bones.length);
    desiredY[0] = hingeTarget;
    for (let i = 1; i < bones.length; i++) {
      const t = i / (bones.length - 1);
      const sCurve = Math.sin(t * Math.PI);
      desiredY[i] = hingeTarget + BASE_BEND_Y * sCurve * (side === "left" ? 1 : -1);

      // hard clamp vs the actual cover plane with a safety margin
      if (side === "left") {
        desiredY[i] = Math.min(desiredY[i], LEFT_PLANE - MIN_CLEAR);
      } else {
        desiredY[i] = Math.max(desiredY[i], RIGHT_PLANE + MIN_CLEAR);
      }
    }

    // convert absolute profile -> incremental bone rotations
    for (let i = 0; i < bones.length; i++) {
      const prevAbs = i === 0 ? 0 : desiredY[i - 1];
      const deltaY = desiredY[i] - prevAbs; // RELATIVE rotation per bone
      easing.dampAngle(bones[i].rotation, "y", deltaY, EASE_HINGE, dt);
      // tiny non-cumulative X fold only on the last few bones
      const foldBand = i > bones.length - 4 ? 1 : 0;
      const foldSign = side === "left" ? 1 : -1;
      const foldDeg  = 0.8 * foldBand; // tiny
      easing.dampAngle(bones[i].rotation, "x", MathUtils.degToRad(foldDeg) * foldSign, EASE_CURL, dt);
    }
  });

  return (
    <primitive
      object={skinned}
      ref={ref}
      position-z={pageZ(index, total)}
      onPointerEnter={(e) => { e.stopPropagation(); setHover(true); }}
      onPointerLeave={(e) => { e.stopPropagation(); setHover(false); }}
    />
  );
};

/* =============================== Book =============================== */
export function Book({ title, ...props }) {
  const [open, setOpen] = useState(false); // LOADS CLOSED

  return (
    <group
      {...props}
      rotation-y={-Math.PI / 2}
      onClick={(e) => { e.stopPropagation(); setOpen(v => !v); }}
    >
      <Spine count={PAGE_COUNT} title={title ?? "Physics Book"} />
      {Array.from({ length: PAGE_COUNT }).map((_, i) => (
        <Page key={i} index={i} total={PAGE_COUNT} open={open} />
      ))}
    </group>
  );
}

/* =============================== (Optional) Falling rig ===============================
   Wrap <Book/> with this if you want shelf-fall motion. Otherwise, ignore.
======================================================================================= */
export function BookRig({
  fall,
  children,
  onRest,
  initialPosition = [0, 1.2, 0], // up on a shelf
  initialRotation = [0, 0, 0],
  groundY = 0,
  restitution = 0.28,
  friction = 0.85,
  linDrag = 0.15,
  angDrag = 0.2,
  impulse = { v: [0.6, 1.2, -0.3], w: [0.0, 3.0, 0.0] },
}) {
  const g = useRef();
  const pos = useRef(new Vector3(...initialPosition));
  const rot = useRef(new Euler(...initialRotation, "YXZ"));
  const vel = useRef(new Vector3(0, 0, 0));
  const w   = useRef(new Vector3(0, 0, 0));
  const GRAV = -9.8;
  const REST_EPS = 0.02;

  useEffect(() => {
    if (fall) {
      pos.current.set(...initialPosition);
      rot.current.set(...initialRotation);
      vel.current.set(...impulse.v);
      w.current.set(...impulse.w);
    } else {
      vel.current.set(0, 0, 0);
      w.current.set(0, 0, 0);
    }
  }, [fall]);

  useFrame((_, dt) => {
    if (!g.current) return;
    const h = Math.min(dt, 1 / 30);

    if (fall) {
      vel.current.y += GRAV * h;
      vel.current.multiplyScalar(1 - linDrag * h);
      pos.current.addScaledVector(vel.current, h);

      if (pos.current.y <= groundY) {
        pos.current.y = groundY;
        vel.current.y *= -restitution;
        vel.current.x *= friction;
        vel.current.z *= friction;

        const speed = Math.hypot(vel.current.x, vel.current.z);
        if (speed > 0.01) {
          w.current.x += (vel.current.z > 0 ? -1 : 1) * speed * 0.05;
          w.current.z += (vel.current.x > 0 ?  1 : -1) * speed * 0.05;
        }
      }

      w.current.multiplyScalar(1 - angDrag * h);
      rot.current.y += w.current.y * h;
      rot.current.x += w.current.x * h;
      rot.current.z += w.current.z * h;

      const atRest =
        Math.abs(vel.current.x) < REST_EPS &&
        Math.abs(vel.current.y) < REST_EPS &&
        Math.abs(vel.current.z) < REST_EPS &&
        Math.abs(w.current.x)   < REST_EPS &&
        Math.abs(w.current.y)   < REST_EPS &&
        Math.abs(w.current.z)   < REST_EPS &&
        pos.current.y === groundY;

      if (atRest) {
        vel.current.set(0, 0, 0);
        w.current.set(0, 0, 0);
        onRest?.();
      }
    }

    const obj = g.current;
    obj.position.copy(pos.current);
    obj.rotation.copy(rot.current);
  });

  return <group ref={g}>{children}</group>;
}