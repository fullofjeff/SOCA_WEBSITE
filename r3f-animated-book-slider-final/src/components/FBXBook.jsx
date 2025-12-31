import { useFBX, useAnimations, useTexture } from "@react-three/drei";
import { useEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { SRGBColorSpace } from "three";

export const FBXBook = () => {
  const group = useRef();
  const fbx = useFBX("/models/uploads_files_5552136_Magic_Book_Anim.fbx");
  const { actions, mixer } = useAnimations(fbx.animations, group);

  // Load test textures (first 3 from your collection)
  const testTextures = useTexture([
    "/textures/DSC00680.jpg",
    "/textures/DSC00933.jpg",
    "/textures/DSC00966.jpg"
  ]);

  useEffect(() => {
    // Apply custom textures to pages
    let textureIndex = 0;

    fbx.traverse((child) => {
      if (child.isMesh) {
        // Clone material so each page has its own
        if (child.material) {
          child.material = child.material.clone();
        }

        // CRITICAL FIX for disappearing skinned meshes
        if (child.isSkinnedMesh) {
          // Disable frustum culling for skinned meshes
          child.frustumCulled = false;

          // Force geometry to update bounds
          child.geometry.computeBoundingBox();
          child.geometry.computeBoundingSphere();

          // Make bounding sphere much larger to prevent culling
          if (child.geometry.boundingSphere) {
            child.geometry.boundingSphere.radius *= 5;
          }
        } else {
          // Regular meshes can use normal culling
          child.frustumCulled = false;
        }

        // Apply custom texture to pages (test with first 3 pages)
        if ((child.name === 'PG1' || child.name === 'PG2' || child.name === 'PG3') && textureIndex < testTextures.length) {
          const texture = testTextures[textureIndex];
          texture.colorSpace = SRGBColorSpace;
          child.material.map = texture;
          child.material.needsUpdate = true;
          textureIndex++;
        }

        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    // Setup animation
    if (actions && Object.keys(actions).length > 0) {
      const actionName = Object.keys(actions)[0];
      console.log(`Animation found: ${actionName}`);

      const action = actions[actionName];
      action.reset();
      action.play();
      action.paused = true;
      action.time = 0;

      console.log("Animation duration:", action.getClip().duration);
    }
  }, [fbx, actions, testTextures]);

  // Control animation with slider
  useEffect(() => {
    const handleSlider = (e) => {
      if (actions && Object.keys(actions).length > 0) {
        const actionName = Object.keys(actions)[0];
        const action = actions[actionName];
        const duration = action.getClip().duration;
        action.time = (parseFloat(e.target.value) / 100) * duration;
      }
    };

    const slider = document.getElementById('animation-slider');
    if (slider) {
      slider.addEventListener('input', handleSlider);
      return () => slider.removeEventListener('input', handleSlider);
    }
  }, [actions]);

  return (
    <group ref={group} scale={0.01} rotation={[-Math.PI / 4, 0, 0]}>
      <primitive object={fbx} />
    </group>
  );
};

useFBX.preload("/models/uploads_files_5552136_Magic_Book_Anim.fbx");
