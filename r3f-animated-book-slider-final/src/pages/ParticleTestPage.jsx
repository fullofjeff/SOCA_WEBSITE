// ParticlesTestPage.jsx
import { useEffect, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import * as QUARKS from "three.quarks";

function MagicalDust({ progress /* 0..1 */ }) {
  const { scene } = useThree();
  const batchedRendererRef = useRef(null);
  const systemRef = useRef(null);

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
        emissionOverTime: new QUARKS.ConstantValue(50), // 50 particles per second
        
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
          opacity: 0.8,
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
                [0.9, 0],   // Start visible
                [1.0, 0.3], // Peak brightness
                [0.3, 1],   // Fade out
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
      
      // Add to scene and batched renderer
      scene.add(particleSystem.emitter);
      batchedRenderer.addSystem(particleSystem);
      
      console.log('Magical dust particles created successfully!');
    } catch (err) {
      console.error("Particle system error:", err);
    }

    return () => {
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
  }, [scene]);

  useFrame((_, dt) => {
    const renderer = batchedRendererRef.current;
    if (renderer) {
      renderer.update(dt);
    }
  });

  // Fade particles based on progress (0..1)
  useEffect(() => {
    const system = systemRef.current;
    if (!system) return;
    
    const alpha = 1 - progress;
    
    // Control system visibility and emission
    if (system.emitter) {
      system.emitter.visible = alpha > 0.02;
    }
  }, [progress]);

  return null;
}

export default function ParticlesTestPage() {
  // progress simulates your flip spring t (0..1)
  const [progress, setProgress] = useState(0);

  return (
    <div style={{ height: "100vh", background: "#0b0b0b" }}>
      <Canvas camera={{ position: [0, 0, 3], fov: 45 }} dpr={[1, 1.75]}>
        <ambientLight intensity={0.9} />
        <directionalLight position={[2, 6, 3]} intensity={1.1} />
        <hemisphereLight intensity={0.35} groundColor={"#553"} />

        {/* origin marker (optional): */}
        {/* <mesh>
          <boxGeometry args={[0.05, 0.05, 0.05]} />
          <meshStandardMaterial color="hotpink" />
        </mesh> */}

        <MagicalDust progress={progress} />
      </Canvas>

      {/* simple UI to scrub 0..1 */}
      <div style={{
        position: "absolute", left: 16, bottom: 16, right: 16,
        display: "flex", gap: 12, alignItems: "center", color: "#ddd"
      }}>
        <label style={{ whiteSpace: "nowrap" }}>progress (t): {progress.toFixed(2)}</label>
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={progress}
          onChange={(e) => setProgress(parseFloat(e.target.value))}
          style={{ flex: 1 }}
        />
        <button onClick={() => setProgress(0)}>reset</button>
        <button onClick={() => setProgress(1)}>hide</button>
      </div>
    </div>
  );
}