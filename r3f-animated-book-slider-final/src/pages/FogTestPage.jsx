import { Canvas } from "@react-three/fiber";
import { ExperienceFog } from "../components/ExperienceFog";

export default function FogTestPage() {
    return (
        <>
            <div style={{ position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh", backgroundColor: "#ffe0b2", zIndex: -999, pointerEvents: "none" }} />
            <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: "10px", height: "10px", backgroundColor: "rgba(255, 0, 0, 0.5)", borderRadius: "50%", zIndex: 9998, pointerEvents: "none" }} />
            <Canvas shadows className="r3f-canvas" camera={{ position: [0, 4, 12], fov: 45 }}>
                <ExperienceFog />
            </Canvas>
        </>
    );
};
