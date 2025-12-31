import { Environment, Float, OrbitControls, useTexture } from "@react-three/drei";
import { useRef, useState, useEffect } from "react";
import { RealisticBook } from "./RealisticBook";
import * as THREE from 'three';
import { useAtom } from "jotai";
import { cameraPositionAtom } from "./UI";
import { useFrame } from "@react-three/fiber";
import { easing } from "maath";

const CameraManager = () => {
  const [targetPos] = useAtom(cameraPositionAtom);

  useFrame((state, delta) => {
    if (targetPos) {
      easing.damp3(state.camera.position, targetPos, 0.4, delta);
    }

    // Debug Display
    const el = document.getElementById("debug-cam-pos");
    if (el) {
      const { x, y, z } = state.camera.position;
      el.innerText = `x: ${x.toFixed(2)}\ny: ${y.toFixed(2)}\nz: ${z.toFixed(2)}`;
    }
  });

  return null;
};

export const Experience = () => {
  const [hovered, setHovered] = useState(false);

  /* 
  BACKGROUND TEXTURE SYSTEM (Currently commented out)
  ...
  */

  // Load background texture
  // ...

  return (
    <>
      <CameraManager />
      {/* Background plane with texture - COMMENTED OUT FOR CURRENT USE CASE */}
      {/* ... */}

      <Float
        rotation-x={0}
        floatIntensity={hovered ? 0.2 : 0}
        speed={hovered ? 1.5 : 0.5}
        rotationIntensity={hovered ? 0.1 : 0}
      >
        <group
          onPointerEnter={() => setHovered(true)}
          onPointerLeave={() => setHovered(false)}
        >
          <RealisticBook />
        </group>
      </Float>
      <OrbitControls
        minPolarAngle={0.1}
        maxPolarAngle={Math.PI - 0.1}
      />
      <ambientLight intensity={0.5} />
      <directionalLight
        position={[2, 5, 2]}
        intensity={2.5}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-bias={-0.0001}
      />
      <mesh position-y={-1.5} rotation-x={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[100, 100]} />
        <shadowMaterial transparent opacity={0.2} />
      </mesh>

      {/* Alignment Helpers */}
      {/* Grid offset slightly so it doesn't overlap with axes */}
      <gridHelper args={[20, 20, 0x333333, 0x333333]} position={[0.5, -2, 0.5]} />
      {/* Axes: X=Red, Y=Green, Z=Blue */}
      <axesHelper args={[15]} position={[0, -2, 0]} />
    </>
  );
};
