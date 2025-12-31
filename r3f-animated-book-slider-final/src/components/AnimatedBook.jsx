import { useGLTF, useAnimations } from "@react-three/drei";
import { useEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

export const AnimatedBook = () => {
  const group = useRef();
  const { scene, animations } = useGLTF("/models/Magic_Book.glb");
  const { actions, mixer } = useAnimations(animations, group);

  useEffect(() => {
    // Fix frustum culling and rendering
    scene.traverse((child) => {
      if (child.isMesh) {
        child.frustumCulled = false;
        child.castShadow = true;
        child.receiveShadow = true;

        // Fix for skinned meshes - compute bounding sphere manually
        if (child.isSkinnedMesh) {
          child.frustumCulled = false;

          // Create a large bounding sphere that won't cull
          const boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, 0), 100);
          child.geometry.boundingSphere = boundingSphere;

          // Force geometry to not auto-compute bounds
          child.geometry.boundingSphere.copy(boundingSphere);
        }

        if (child.material) {
          child.material.side = 2; // DoubleSide
          child.material.needsUpdate = true;
        }
      }
    });

    console.log("=== ANIMATION ACTIONS ===");
    console.log("Available actions:", Object.keys(actions));

    // Play the animation to see all pages
    if (actions && Object.keys(actions).length > 0) {
      const actionName = Object.keys(actions)[0];
      console.log(`Playing animation: ${actionName}`);

      const action = actions[actionName];
      const clip = action.getClip();

      action.reset();
      action.play();
      action.paused = true; // Pause so we can control it
      action.time = 0; // Start at beginning

      console.log("Animation controls:", {
        duration: clip.duration,
        time: action.time,
        paused: action.paused
      });

      // Analyze tracks to understand page animations
      console.log("\n=== ANIMATION TIMELINE ANALYSIS ===");
      const pageTracks = {};

      clip.tracks.forEach(track => {
        const match = track.name.match(/PG(\d+)/);
        if (match) {
          const pageNum = match[1];
          if (!pageTracks[pageNum]) pageTracks[pageNum] = [];
          pageTracks[pageNum].push({
            name: track.name,
            times: track.times,
            values: track.values.slice(0, 12) // First few values
          });
        }
      });

      console.log("Pages with animations:", Object.keys(pageTracks).sort((a, b) => parseInt(a) - parseInt(b)));

      // Sample the animation at different points to find page states
      console.log("\n=== PAGE VISIBILITY AT DIFFERENT TIMES ===");
      const sampleTimes = [0, 0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 3.366];
      sampleTimes.forEach(time => {
        action.time = time;
        mixer.update(0); // Force update without advancing time

        const visiblePages = [];
        scene.traverse((child) => {
          if (child.isMesh && child.name.startsWith('PG')) {
            const rotation = child.skeleton?.bones[0]?.rotation.y || 0;
            if (Math.abs(rotation) > 0.1) { // If page is turned
              visiblePages.push(child.name);
            }
          }
        });
        console.log(`Time ${time.toFixed(2)}s: Open pages: ${visiblePages.join(', ') || 'none'}`);
      });

      action.time = 0; // Reset
    }
  }, [actions, scene]);

  // Control animation time with slider
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

  // Force constant re-render to prevent geometry breaking
  useFrame(() => {
    if (group.current) {
      group.current.traverse((child) => {
        if (child.isSkinnedMesh) {
          // Force the skinned mesh to update its matrix
          child.updateMatrixWorld(true);
        }
      });
    }
  });

  return (
    <group ref={group}>
      <primitive object={scene} />
    </group>
  );
};

useGLTF.preload("/models/Magic_Book.glb");
