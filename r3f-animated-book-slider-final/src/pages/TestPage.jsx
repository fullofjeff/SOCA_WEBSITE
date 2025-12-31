import { Canvas } from "@react-three/fiber";
import { Experience } from "../components/Experience";

import { useAtom } from "jotai";
import {
  bookClosedAtom,
  pageAtom,
  cameraPositionAtom,
  showFloorTextureAtom,
  ambientIntensityAtom,
  directionalIntensityAtom,
  directionalPositionAtom,
  directionalColorAtom,
  ambientColorAtom,
  bookPositionAtom,
  bookRotationAtom
} from "../components/UI";

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
            background: p.pos === null ? "#d32f2f" : "#444",
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

const ControlPanel = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("camera");
  const [showTexture, setShowTexture] = useAtom(showFloorTextureAtom);
  const [copyStatus, setCopyStatus] = useState("");

  // Lighting atoms
  const [ambientIntensity, setAmbientIntensity] = useAtom(ambientIntensityAtom);
  const [directionalIntensity, setDirectionalIntensity] = useAtom(directionalIntensityAtom);
  const [directionalPosition, setDirectionalPosition] = useAtom(directionalPositionAtom);
  const [directionalColor, setDirectionalColor] = useAtom(directionalColorAtom);
  const [ambientColor, setAmbientColor] = useAtom(ambientColorAtom);

  // Book atoms
  const [bookPosition, setBookPosition] = useAtom(bookPositionAtom);
  const [bookRotation, setBookRotation] = useAtom(bookRotationAtom);

  // Generate config object
  const getConfig = () => ({
    lighting: {
      ambient: {
        intensity: ambientIntensity,
        color: ambientColor,
      },
      directional: {
        intensity: directionalIntensity,
        color: directionalColor,
        position: directionalPosition,
      },
    },
    book: {
      position: bookPosition,
      rotation: bookRotation,
      rotationDegrees: bookRotation.map(r => Math.round(r * 180 / Math.PI)),
    },
    floor: {
      showTexture,
    },
  });

  const copyConfig = async () => {
    const config = getConfig();
    const json = JSON.stringify(config, null, 2);
    try {
      await navigator.clipboard.writeText(json);
      setCopyStatus("Copied!");
      setTimeout(() => setCopyStatus(""), 2000);
    } catch {
      setCopyStatus("Failed to copy");
      setTimeout(() => setCopyStatus(""), 2000);
    }
  };

  const downloadConfig = () => {
    const config = getConfig();
    const json = JSON.stringify(config, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `scene-config-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const loadConfig = (config) => {
    if (config.lighting) {
      if (config.lighting.ambient) {
        if (config.lighting.ambient.intensity !== undefined) setAmbientIntensity(config.lighting.ambient.intensity);
        if (config.lighting.ambient.color) setAmbientColor(config.lighting.ambient.color);
      }
      if (config.lighting.directional) {
        if (config.lighting.directional.intensity !== undefined) setDirectionalIntensity(config.lighting.directional.intensity);
        if (config.lighting.directional.color) setDirectionalColor(config.lighting.directional.color);
        if (config.lighting.directional.position) setDirectionalPosition(config.lighting.directional.position);
      }
    }
    if (config.book) {
      if (config.book.position) setBookPosition(config.book.position);
      if (config.book.rotation) setBookRotation(config.book.rotation);
    }
    if (config.floor !== undefined) {
      if (config.floor.showTexture !== undefined) setShowTexture(config.floor.showTexture);
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const config = JSON.parse(event.target.result);
        loadConfig(config);
        setCopyStatus("Loaded!");
        setTimeout(() => setCopyStatus(""), 2000);
      } catch {
        setCopyStatus("Invalid JSON");
        setTimeout(() => setCopyStatus(""), 2000);
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const pasteConfig = async () => {
    try {
      const text = await navigator.clipboard.readText();
      const config = JSON.parse(text);
      loadConfig(config);
      setCopyStatus("Pasted!");
      setTimeout(() => setCopyStatus(""), 2000);
    } catch {
      setCopyStatus("Invalid JSON");
      setTimeout(() => setCopyStatus(""), 2000);
    }
  };

  const sliderStyle = {
    width: "100%",
    marginTop: "4px",
    accentColor: "#6b9fff",
  };

  const labelStyle = {
    display: "flex",
    justifyContent: "space-between",
    marginTop: "10px",
    marginBottom: "2px",
    fontSize: "0.85rem",
  };

  const colorInputStyle = {
    width: "40px",
    height: "22px",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
  };

  const sectionStyle = {
    borderTop: "1px solid #444",
    paddingTop: "10px",
    marginTop: "10px",
  };

  const tabStyle = (tab) => ({
    flex: 1,
    padding: "8px",
    background: activeTab === tab ? "#1976d2" : "#333",
    color: "white",
    border: "none",
    cursor: "pointer",
    fontSize: "0.8rem",
    fontWeight: activeTab === tab ? "bold" : "normal",
  });

  return (
    <div style={{
      position: "fixed",
      top: 20,
      right: 20,
      zIndex: 9999,
    }}>
      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          padding: "12px 20px",
          background: isOpen ? "#1976d2" : "#444",
          color: "white",
          border: "none",
          borderRadius: "8px",
          cursor: "pointer",
          fontWeight: "bold",
          boxShadow: "0 4px 6px rgba(0,0,0,0.2)",
          fontSize: "1rem",
          display: "flex",
          alignItems: "center",
          gap: "8px"
        }}
      >
        Control Panel {isOpen ? "▲" : "▼"}
      </button>

      {/* Collapsible Content */}
      {isOpen && (
        <div style={{
          marginTop: "10px",
          background: "rgba(0,0,0,0.9)",
          borderRadius: "8px",
          overflow: "hidden",
          minWidth: "280px",
          maxHeight: "70vh",
          overflowY: "auto",
        }}>
          {/* Tabs */}
          <div style={{ display: "flex" }}>
            <button style={tabStyle("camera")} onClick={() => setActiveTab("camera")}>Camera</button>
            <button style={tabStyle("lighting")} onClick={() => setActiveTab("lighting")}>Lighting</button>
            <button style={tabStyle("book")} onClick={() => setActiveTab("book")}>Book</button>
            <button style={tabStyle("config")} onClick={() => setActiveTab("config")}>Config</button>
          </div>

          <div style={{ padding: "15px" }}>
            {/* Camera Tab */}
            {activeTab === "camera" && (
              <>
                {/* Floor Toggle */}
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "8px 0",
                  borderBottom: "1px solid #555"
                }}>
                  <span style={{ color: "white", fontSize: "0.9rem" }}>Floor</span>
                  <div style={{ display: "flex", gap: "5px" }}>
                    <button
                      onClick={() => setShowTexture(true)}
                      style={{
                        padding: "6px 12px",
                        background: showTexture ? "#4caf50" : "#555",
                        color: "white",
                        border: "none",
                        borderRadius: "4px",
                        cursor: "pointer",
                        fontSize: "0.8rem"
                      }}
                    >
                      Texture
                    </button>
                    <button
                      onClick={() => setShowTexture(false)}
                      style={{
                        padding: "6px 12px",
                        background: !showTexture ? "#4caf50" : "#555",
                        color: "white",
                        border: "none",
                        borderRadius: "4px",
                        cursor: "pointer",
                        fontSize: "0.8rem"
                      }}
                    >
                      Grid
                    </button>
                  </div>
                </div>

                {/* Camera Presets */}
                <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "10px" }}>
                  <span style={{ color: "#aaa", fontSize: "0.8rem", textTransform: "uppercase" }}>Camera Presets</span>
                  <CameraButtons />
                </div>

                {/* Debug Display */}
                <div
                  id="debug-cam-pos"
                  style={{
                    background: "rgba(0,0,0,0.5)",
                    color: "#0f0",
                    padding: "10px",
                    borderRadius: "4px",
                    fontFamily: "monospace",
                    fontSize: "12px",
                    marginTop: "10px"
                  }}
                >
                  Camera: -
                </div>
              </>
            )}

            {/* Lighting Tab */}
            {activeTab === "lighting" && (
              <>
                {/* Ambient Light */}
                <span style={{ color: "#aaa", fontSize: "0.8rem", textTransform: "uppercase" }}>Ambient Light</span>
                <div style={labelStyle}>
                  <span style={{ color: "white" }}>Intensity</span>
                  <span style={{ color: "#6b9fff" }}>{ambientIntensity.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="2"
                  step="0.05"
                  value={ambientIntensity}
                  onChange={(e) => setAmbientIntensity(parseFloat(e.target.value))}
                  style={sliderStyle}
                />
                <div style={{ ...labelStyle, marginTop: "8px" }}>
                  <span style={{ color: "white" }}>Color</span>
                  <input
                    type="color"
                    value={ambientColor}
                    onChange={(e) => setAmbientColor(e.target.value)}
                    style={colorInputStyle}
                  />
                </div>

                {/* Directional Light */}
                <div style={sectionStyle}>
                  <span style={{ color: "#aaa", fontSize: "0.8rem", textTransform: "uppercase" }}>Directional Light</span>
                  <div style={labelStyle}>
                    <span style={{ color: "white" }}>Intensity</span>
                    <span style={{ color: "#6b9fff" }}>{directionalIntensity.toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="5"
                    step="0.1"
                    value={directionalIntensity}
                    onChange={(e) => setDirectionalIntensity(parseFloat(e.target.value))}
                    style={sliderStyle}
                  />
                  <div style={{ ...labelStyle, marginTop: "8px" }}>
                    <span style={{ color: "white" }}>Color</span>
                    <input
                      type="color"
                      value={directionalColor}
                      onChange={(e) => setDirectionalColor(e.target.value)}
                      style={colorInputStyle}
                    />
                  </div>
                </div>

                {/* Directional Position */}
                <div style={sectionStyle}>
                  <span style={{ color: "#aaa", fontSize: "0.8rem", textTransform: "uppercase" }}>Light Position</span>
                  <div style={labelStyle}>
                    <span style={{ color: "white" }}>X</span>
                    <span style={{ color: "#6b9fff" }}>{directionalPosition[0].toFixed(1)}</span>
                  </div>
                  <input
                    type="range"
                    min="-10"
                    max="10"
                    step="0.5"
                    value={directionalPosition[0]}
                    onChange={(e) => setDirectionalPosition([parseFloat(e.target.value), directionalPosition[1], directionalPosition[2]])}
                    style={sliderStyle}
                  />
                  <div style={labelStyle}>
                    <span style={{ color: "white" }}>Y</span>
                    <span style={{ color: "#6b9fff" }}>{directionalPosition[1].toFixed(1)}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="15"
                    step="0.5"
                    value={directionalPosition[1]}
                    onChange={(e) => setDirectionalPosition([directionalPosition[0], parseFloat(e.target.value), directionalPosition[2]])}
                    style={sliderStyle}
                  />
                  <div style={labelStyle}>
                    <span style={{ color: "white" }}>Z</span>
                    <span style={{ color: "#6b9fff" }}>{directionalPosition[2].toFixed(1)}</span>
                  </div>
                  <input
                    type="range"
                    min="-10"
                    max="10"
                    step="0.5"
                    value={directionalPosition[2]}
                    onChange={(e) => setDirectionalPosition([directionalPosition[0], directionalPosition[1], parseFloat(e.target.value)])}
                    style={sliderStyle}
                  />
                </div>

                {/* Reset Lighting Button */}
                <button
                  onClick={() => {
                    setAmbientIntensity(0.5);
                    setDirectionalIntensity(2.5);
                    setDirectionalPosition([2, 5, 2]);
                    setDirectionalColor("#ffffff");
                    setAmbientColor("#ffffff");
                  }}
                  style={{
                    width: "100%",
                    marginTop: "15px",
                    padding: "8px",
                    background: "#444",
                    border: "none",
                    borderRadius: "4px",
                    color: "white",
                    cursor: "pointer",
                    fontSize: "0.85rem",
                  }}
                >
                  Reset Lighting
                </button>
              </>
            )}

            {/* Book Tab */}
            {activeTab === "book" && (
              <>
                {/* Book Position */}
                <span style={{ color: "#aaa", fontSize: "0.8rem", textTransform: "uppercase" }}>Position</span>
                <div style={labelStyle}>
                  <span style={{ color: "white" }}>X</span>
                  <span style={{ color: "#6b9fff" }}>{bookPosition[0].toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min="-5"
                  max="5"
                  step="0.1"
                  value={bookPosition[0]}
                  onChange={(e) => setBookPosition([parseFloat(e.target.value), bookPosition[1], bookPosition[2]])}
                  style={sliderStyle}
                />
                <div style={labelStyle}>
                  <span style={{ color: "white" }}>Y</span>
                  <span style={{ color: "#6b9fff" }}>{bookPosition[1].toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min="-3"
                  max="3"
                  step="0.1"
                  value={bookPosition[1]}
                  onChange={(e) => setBookPosition([bookPosition[0], parseFloat(e.target.value), bookPosition[2]])}
                  style={sliderStyle}
                />
                <div style={labelStyle}>
                  <span style={{ color: "white" }}>Z</span>
                  <span style={{ color: "#6b9fff" }}>{bookPosition[2].toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min="-5"
                  max="5"
                  step="0.1"
                  value={bookPosition[2]}
                  onChange={(e) => setBookPosition([bookPosition[0], bookPosition[1], parseFloat(e.target.value)])}
                  style={sliderStyle}
                />

                {/* Book Rotation */}
                <div style={sectionStyle}>
                  <span style={{ color: "#aaa", fontSize: "0.8rem", textTransform: "uppercase" }}>Rotation (degrees)</span>
                  <div style={labelStyle}>
                    <span style={{ color: "white" }}>X</span>
                    <span style={{ color: "#6b9fff" }}>{(bookRotation[0] * 180 / Math.PI).toFixed(0)}°</span>
                  </div>
                  <input
                    type="range"
                    min={-Math.PI}
                    max={Math.PI}
                    step="0.05"
                    value={bookRotation[0]}
                    onChange={(e) => setBookRotation([parseFloat(e.target.value), bookRotation[1], bookRotation[2]])}
                    style={sliderStyle}
                  />
                  <div style={labelStyle}>
                    <span style={{ color: "white" }}>Y</span>
                    <span style={{ color: "#6b9fff" }}>{(bookRotation[1] * 180 / Math.PI).toFixed(0)}°</span>
                  </div>
                  <input
                    type="range"
                    min={-Math.PI}
                    max={Math.PI}
                    step="0.05"
                    value={bookRotation[1]}
                    onChange={(e) => setBookRotation([bookRotation[0], parseFloat(e.target.value), bookRotation[2]])}
                    style={sliderStyle}
                  />
                  <div style={labelStyle}>
                    <span style={{ color: "white" }}>Z</span>
                    <span style={{ color: "#6b9fff" }}>{(bookRotation[2] * 180 / Math.PI).toFixed(0)}°</span>
                  </div>
                  <input
                    type="range"
                    min={-Math.PI}
                    max={Math.PI}
                    step="0.05"
                    value={bookRotation[2]}
                    onChange={(e) => setBookRotation([bookRotation[0], bookRotation[1], parseFloat(e.target.value)])}
                    style={sliderStyle}
                  />
                </div>

                {/* Reset Book Button */}
                <button
                  onClick={() => {
                    setBookPosition([0, 0, 0]);
                    setBookRotation([0, 0, 0]);
                  }}
                  style={{
                    width: "100%",
                    marginTop: "15px",
                    padding: "8px",
                    background: "#444",
                    border: "none",
                    borderRadius: "4px",
                    color: "white",
                    cursor: "pointer",
                    fontSize: "0.85rem",
                  }}
                >
                  Reset Book
                </button>
              </>
            )}

            {/* Config Tab */}
            {activeTab === "config" && (
              <>
                <span style={{ color: "#aaa", fontSize: "0.8rem", textTransform: "uppercase" }}>Export Configuration</span>

                <div style={{ display: "flex", gap: "8px", marginTop: "10px" }}>
                  <button
                    onClick={copyConfig}
                    style={{
                      flex: 1,
                      padding: "10px",
                      background: "#4caf50",
                      border: "none",
                      borderRadius: "4px",
                      color: "white",
                      cursor: "pointer",
                      fontSize: "0.85rem",
                      fontWeight: "bold",
                    }}
                  >
                    Copy to Clipboard
                  </button>
                  <button
                    onClick={downloadConfig}
                    style={{
                      flex: 1,
                      padding: "10px",
                      background: "#1976d2",
                      border: "none",
                      borderRadius: "4px",
                      color: "white",
                      cursor: "pointer",
                      fontSize: "0.85rem",
                      fontWeight: "bold",
                    }}
                  >
                    Download JSON
                  </button>
                </div>

                <div style={sectionStyle}>
                  <span style={{ color: "#aaa", fontSize: "0.8rem", textTransform: "uppercase" }}>Import Configuration</span>

                  <div style={{ display: "flex", gap: "8px", marginTop: "10px" }}>
                    <button
                      onClick={pasteConfig}
                      style={{
                        flex: 1,
                        padding: "10px",
                        background: "#ff9800",
                        border: "none",
                        borderRadius: "4px",
                        color: "white",
                        cursor: "pointer",
                        fontSize: "0.85rem",
                        fontWeight: "bold",
                      }}
                    >
                      Paste from Clipboard
                    </button>
                  </div>

                  <label
                    style={{
                      display: "block",
                      marginTop: "10px",
                      padding: "10px",
                      background: "#555",
                      border: "2px dashed #888",
                      borderRadius: "4px",
                      color: "white",
                      cursor: "pointer",
                      fontSize: "0.85rem",
                      textAlign: "center",
                    }}
                  >
                    Upload JSON File
                    <input
                      type="file"
                      accept=".json"
                      onChange={handleFileUpload}
                      style={{ display: "none" }}
                    />
                  </label>
                </div>

                {/* Status Message */}
                {copyStatus && (
                  <div style={{
                    marginTop: "15px",
                    padding: "10px",
                    background: copyStatus.includes("Invalid") || copyStatus.includes("Failed") ? "#d32f2f" : "#4caf50",
                    borderRadius: "4px",
                    color: "white",
                    textAlign: "center",
                    fontSize: "0.9rem",
                    fontWeight: "bold",
                  }}>
                    {copyStatus}
                  </div>
                )}

                {/* Current Config Preview */}
                <div style={sectionStyle}>
                  <span style={{ color: "#aaa", fontSize: "0.8rem", textTransform: "uppercase" }}>Current Config Preview</span>
                  <pre style={{
                    marginTop: "10px",
                    padding: "10px",
                    background: "rgba(0,0,0,0.5)",
                    borderRadius: "4px",
                    color: "#0f0",
                    fontSize: "10px",
                    fontFamily: "monospace",
                    overflow: "auto",
                    maxHeight: "150px",
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-all",
                  }}>
                    {JSON.stringify(getConfig(), null, 2)}
                  </pre>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
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

      {/* Unified Control Panel */}
      <ControlPanel />

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
