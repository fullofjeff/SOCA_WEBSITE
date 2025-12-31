// CardParticles.jsx
import { useEffect, useRef } from "react";
import { useThree, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import * as QUARKS from "three.quarks";

/**
 * Props:
 *  - flipProgress: SpringValue<number> (0..1) from react-spring
 *  - offset: local XYZ offset relative to the card (behind = negative Z)
 *  - scale: uniform scalar
 */
export default function CardParticles({
  flipProgress,
  offset = [0, 0.02, -0.1], // Behind the card
  scale = 0.3, // Smaller for card-appropriate size
}) {
  console.log('CardParticles component mounted with props:', { flipProgress, offset, scale });
  
  const { scene } = useThree();
  const batchedRendererRef = useRef(null);
  const systemRef = useRef(null);
  const unsubRef = useRef(null);

  useEffect(() => {
    let disposed = false;

    try {
      // Create BatchedRenderer for efficient particle rendering
      const batchedRenderer = new QUARKS.BatchedRenderer();
      scene.add(batchedRenderer);
      batchedRendererRef.current = batchedRenderer;

      // Create tiny sphere geometry for dust particles
      const sphereGeometry = new THREE.SphereGeometry(0.008, 6, 4);
      
      // Create magical gold dust particle system
      const particleSystem = new QUARKS.ParticleSystem({
        // Duration and looping
        duration: 10,
        looping: true,
        
        // Emission from a small sphere 
        shape: new QUARKS.SphereEmitter({
          radius: 0.3,
          thickness: 0.9,
        }),
        
        // More particles
        emissionOverTime: new QUARKS.ConstantValue(30), // Fewer for card background
        
        // Particle properties - small, slow, long-lived
        startLife: new QUARKS.IntervalValue(3, 5),
        startSpeed: new QUARKS.ConstantValue(0.03),
        startSize: new QUARKS.IntervalValue(0.8, 1.5), // Much smaller particles
        startColor: new QUARKS.ConstantColor(new THREE.Vector4(1, 0.8, 0.3, 0.9)), // Gold color
        
        worldSpace: true,
        instancingGeometry: sphereGeometry, // Use sphere geometry instead of planes
        
        // Gold shimmering material
        material: new THREE.MeshBasicMaterial({
          color: 0xFFD700, // Gold
          transparent: true,
          blending: THREE.AdditiveBlending,
          opacity: 0.6, // Slightly more subtle for background
        }),
        
        // Behaviors for magical effect
        behaviors: [
          // Gentle size variation over life
          new QUARKS.SizeOverLife(
            new QUARKS.PiecewiseBezier([[new QUARKS.Bezier(0.1, 1, 1, 0.3), 0]])
          ),
          // Shimmer effect - color changes
          new QUARKS.ColorOverLife(
            new QUARKS.Gradient(
              [
                [new THREE.Vector3(1, 0.8, 0.3), 0], // Start gold
                [new THREE.Vector3(1, 1, 0.7), 0.5],   // Mid shimmer
                [new THREE.Vector3(0.8, 0.6, 0.2), 1], // End darker gold
              ],
              [
                [0.6, 0],   // Start subtle
                [0.8, 0.3], // Peak brightness
                [0.2, 1],   // Fade out
              ],
            ),
          ),
          // Very gentle floating motion
          new QUARKS.ApplyForce(
            new THREE.Vector3(0, 0.02, 0), // Very slow upward drift
            new QUARKS.ConstantValue(1),
          ),
        ],
      });

      if (disposed) return;

      systemRef.current = particleSystem;
      
      // Position behind the card
      particleSystem.emitter.position.set(offset[0], offset[1], offset[2]);
      particleSystem.emitter.scale.setScalar(scale);
      
      // Add to scene and batched renderer
      scene.add(particleSystem.emitter);
      batchedRenderer.addSystem(particleSystem);
      
      // Subscribe to the flip spring (0 -> 1). Use onChange for react-spring v9.
      if (flipProgress?.onChange) {
        unsubRef.current = flipProgress.onChange((v) => {
          const alpha = 1 - v; // fade out while flipping
          particleSystem.emitter.visible = alpha > 0.02;

          // Control material opacity for fade effect
          const material = particleSystem.material;
          if (material && typeof material.opacity === "number") {
            material.opacity = alpha * 0.6; // Base opacity * fade
          }
        });
      }
      
      console.log('Card particles created successfully!');
    } catch (err) {
      console.error("Card particle system error:", err);
    }

    return () => {
      if (unsubRef.current) unsubRef.current();
      
      const system = systemRef.current;
      const renderer = batchedRendererRef.current;
      
      if (system && renderer) {
        renderer.removeSystem(system);
        scene.remove(system.emitter);
        system.dispose();
      }
      
      if (renderer) {
        scene.remove(renderer);
        renderer.dispose();
      }
      
      systemRef.current = null;
      batchedRendererRef.current = null;
      disposed = true;
    };
  }, [scene, flipProgress, offset, scale]);

  useFrame((_, dt) => {
    const renderer = batchedRendererRef.current;
    if (renderer) {
      renderer.update(dt);
    }
  });

  return null;
}