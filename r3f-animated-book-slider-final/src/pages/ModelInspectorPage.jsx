import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { useState } from "react";
import { ModelInspector } from "../components/ModelInspector";
import { AnimatedBook } from "../components/AnimatedBook";
import { FBXBook } from "../components/FBXBook";

export default function ModelInspectorPage() {
  const [mode, setMode] = useState("fbx");

  return (
    <div style={{ width: "100vw", height: "100vh", background: "#1a1a1a" }}>
      <Canvas camera={{ position: [0, 2, 5], fov: 50 }}>
        <ambientLight intensity={1.5} />
        <directionalLight position={[5, 5, 5]} intensity={3} castShadow />
        <directionalLight position={[-5, 3, -5]} intensity={1.5} />
        <pointLight position={[0, 5, 0]} intensity={0.5} />
        {mode === "inspect" ? <ModelInspector /> : mode === "fbx" ? <FBXBook /> : <AnimatedBook />}
        <OrbitControls />
        <gridHelper args={[10, 10]} />
      </Canvas>

      <div style={{
        position: "fixed",
        top: 10,
        left: 10,
        color: "white",
        background: "rgba(0,0,0,0.7)",
        padding: "15px",
        fontFamily: "monospace",
        fontSize: "12px",
        zIndex: 1000
      }}>
        <strong>Model Inspector</strong><br/>

        <div style={{ marginTop: "10px" }}>
          <button
            onClick={() => setMode("fbx")}
            style={{
              background: mode === "fbx" ? "#4CAF50" : "#333",
              color: "white",
              border: "none",
              padding: "5px 10px",
              marginRight: "5px",
              cursor: "pointer",
              fontSize: "11px"
            }}
          >
            FBX Mode
          </button>
          <button
            onClick={() => setMode("animated")}
            style={{
              background: mode === "animated" ? "#4CAF50" : "#333",
              color: "white",
              border: "none",
              padding: "5px 10px",
              marginRight: "5px",
              cursor: "pointer",
              fontSize: "11px"
            }}
          >
            GLB Mode
          </button>
          <button
            onClick={() => setMode("inspect")}
            style={{
              background: mode === "inspect" ? "#4CAF50" : "#333",
              color: "white",
              border: "none",
              padding: "5px 10px",
              cursor: "pointer",
              fontSize: "11px"
            }}
          >
            Inspect
          </button>
        </div>

        {(mode === "animated" || mode === "fbx") && (
          <div style={{ marginTop: "15px" }}>
            <label>Animation Time:</label><br/>
            <input
              type="range"
              id="animation-slider"
              min="0"
              max="100"
              defaultValue="0"
              style={{ width: "200px" }}
            />
          </div>
        )}

        <div style={{ marginTop: "10px", fontSize: "10px", opacity: 0.7 }}>
          Check console (F12) for details
        </div>
      </div>
    </div>
  );
}
