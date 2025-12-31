import { Canvas } from "@react-three/fiber";
import { Experience } from "../components/Experience";

import { useAtom } from "jotai";
import { bookClosedAtom, pageAtom, cameraPositionAtom } from "../components/UI";

import { useState } from "react";

const CameraButtons = () => {
  const [, setCameraPos] = useAtom(cameraPositionAtom);
  const [bookClosed] = useAtom(bookClosedAtom);

  const presets = [
    { label: "Free Look", pos: null },
    { label: bookClosed ? "Red Cover" : "Red Pages Side", pos: [0, 0, 14] },
    { label: bookClosed ? "Spine" : "Back", pos: [14, 0, 0] },
    { label: bookClosed ? "Blue Cover" : "Blue Pages Side", pos: [0, 0, -14] },
    { label: bookClosed ? "Straight On" : "Straight On Open Side", pos: [-14, 0, 0] },
    { label: "Top Down - Side", pos: [0, 14, 0] },
  ];

  return (
    <>
      {presets.map((p) => (
        <button
          key={p.label}
          onClick={() => setCameraPos(p.pos)}
          style={{
            padding: "8px 16px",
            background: p.pos === null ? "#d32f2f" : "#444", // Highlight Free Look
            color: "white",
            border: "none",
            borderRadius: "6px",
            cursor: "pointer",
            fontWeight: "bold",
            boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
            fontSize: "0.9rem"
          }}
        >
          {p.label}
        </button>
      ))}
    </>
  );
};

const TestPage = () => {
  const [bookClosed, setBookClosed] = useAtom(bookClosedAtom);
  const [page, setPage] = useAtom(pageAtom);
  const [disabled, setDisabled] = useState(false);

  const handleToggle = () => {
    if (disabled) return;
    setDisabled(true);
    setBookClosed(!bookClosed);
    setTimeout(() => setDisabled(false), 1000);
  };

  return (
    <>
      {/* Full screen fixed background */}
      <div style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        backgroundColor: "#ffe0b2", // Light orange
        zIndex: -999,
        pointerEvents: "none"
      }} />

      {/* Control Panel */}
      <div style={{
        position: "fixed",
        top: 20,
        left: 20,
        zIndex: 9999,
        display: "flex",
        gap: "10px"
      }}>
        {/* Toggle Button */}
        <button
          style={{
            padding: "12px 24px",
            background: disabled ? "#999" : "#d32f2f",
            color: "white",
            border: "none",
            borderRadius: "8px",
            cursor: disabled ? "wait" : "pointer",
            fontSize: "1rem",
            fontWeight: "bold",
            boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
            transition: "background 0.3s"
          }}
          onClick={handleToggle}
        >
          {bookClosed ? "Open Book" : "Close Book"}
        </button>

        {/* Page Navigation */}
        <button
          style={{
            padding: "12px 24px",
            background: bookClosed ? "#ccc" : "#1976d2",
            color: "white",
            border: "none",
            borderRadius: "8px",
            cursor: bookClosed ? "not-allowed" : "pointer",
            fontSize: "1rem",
            fontWeight: "bold",
            boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
          }}
          onClick={() => setPage((p) => Math.max(0, p - 1))}
          disabled={bookClosed}
        >
          Prev Page
        </button>

        <button
          style={{
            padding: "12px 24px",
            background: bookClosed ? "#ccc" : "#1976d2",
            color: "white",
            border: "none",
            borderRadius: "8px",
            cursor: bookClosed ? "not-allowed" : "pointer",
            fontSize: "1rem",
            fontWeight: "bold",
            boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
          }}
          onClick={() => setPage((p) => p + 1)}
          disabled={bookClosed}
        >
          Next Page ({page})
        </button>
      </div>

      {/* Camera Controls */}
      <div style={{
        position: "fixed",
        top: 20,
        right: 20,
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        gap: "10px"
      }}>
        <CameraButtons />
        <div
          id="debug-cam-pos"
          style={{
            background: "rgba(0,0,0,0.8)",
            color: "#0f0",
            padding: "10px",
            borderRadius: "4px",
            fontFamily: "monospace",
            fontSize: "12px",
            maxWidth: "200px"
          }}
        >
          Camera: -
        </div>
      </div>

      {/* Center Crosshair for Alignment */}
      <div style={{
        position: "fixed",
        top: "50%",
        left: "50%",
        width: "20px",
        height: "20px",
        transform: "translate(-50%, -50%)",
        pointerEvents: "none",
        zIndex: 10000
      }}>
        <div style={{ position: "absolute", top: "9px", left: "0", width: "20px", height: "2px", background: "rgba(0, 255, 0, 0.5)" }}></div>
        <div style={{ position: "absolute", top: "0", left: "9px", width: "2px", height: "20px", background: "rgba(0, 255, 0, 0.5)" }}></div>
      </div>

      <Canvas shadows camera={{ position: [0, 2, 8], fov: 30 }}>
        <Experience />
      </Canvas>
    </>
  );
};

export default TestPage;
