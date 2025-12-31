import { useGLTF } from "@react-three/drei";
import { useEffect } from "react";

export const ModelInspector = () => {
  const gltf = useGLTF("/models/Magic_Book.glb");

  useEffect(() => {
    console.log("=== GLB MODEL INSPECTION ===");
    console.log("Full GLTF Object:", gltf);
    console.log("Scene:", gltf.scene);
    console.log("Animations:", gltf.animations);
    console.log("Nodes:", gltf.nodes);
    console.log("Materials:", gltf.materials);

    // Check if materials/meshes are visible
    console.log("\n=== VISIBILITY CHECK ===");
    gltf.scene.traverse((child) => {
      if (child.isMesh) {
        console.log(`Mesh "${child.name}":`, {
          visible: child.visible,
          renderOrder: child.renderOrder,
          materialVisible: child.material?.visible,
          opacity: child.material?.opacity,
          transparent: child.material?.transparent,
          side: child.material?.side
        });

        // Force all meshes visible
        child.visible = true;
        if (child.material) {
          child.material.visible = true;
          child.material.side = 2; // DoubleSide
        }
      }
    });

    // Log animation details
    if (gltf.animations && gltf.animations.length > 0) {
      console.log("\n=== ANIMATIONS ===");
      gltf.animations.forEach((clip, index) => {
        console.log(`Animation ${index}:`, {
          name: clip.name,
          duration: clip.duration,
          tracks: clip.tracks.length,
          trackNames: clip.tracks.map(t => t.name)
        });
      });
    }

    // Log scene structure
    console.log("\n=== SCENE STRUCTURE ===");
    gltf.scene.traverse((child) => {
      console.log(`- ${child.type}: ${child.name}`, {
        isMesh: child.isMesh,
        isBone: child.type === 'Bone',
        children: child.children.length
      });
    });

    // Log meshes and fix frustum culling
    console.log("\n=== MESHES ===");
    gltf.scene.traverse((child) => {
      if (child.isMesh) {
        console.log(`Mesh: ${child.name}`, {
          geometry: child.geometry.type,
          vertices: child.geometry.attributes.position?.count,
          material: child.material?.name,
          hasUV: !!child.geometry.attributes.uv,
          isSkinnedMesh: child.isSkinnedMesh,
          frustumCulled: child.frustumCulled
        });

        // FIX: Disable frustum culling to prevent disappearing meshes
        child.frustumCulled = false;

        // Also ensure proper rendering settings
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    console.log("\n✅ Applied fixes: frustumCulled = false for all meshes");
  }, [gltf]);

  return <primitive object={gltf.scene} />;
};

// Preload the model
useGLTF.preload("/models/Magic_Book.glb");
