import { Environment, Float, OrbitControls, useTexture } from "@react-three/drei";
import { useState } from "react";
import { RealisticBook } from "./RealisticBook";
import * as THREE from 'three';
import { useAtom } from "jotai";
import {
  cameraPositionAtom,
  showFloorTextureAtom,
  ambientIntensityAtom,
  directionalIntensityAtom,
  directionalPositionAtom,
  directionalColorAtom,
  ambientColorAtom,
  bookPositionAtom,
  bookRotationAtom
} from "./UI";
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

const Rug = () => {
  const rugTexture = useTexture("/textures/conjuring_arts_rug.png");

  return (
    <mesh position={[0, -1.49, 0]} rotation={[-Math.PI / 2, 0, Math.PI / 2]} receiveShadow>
      <planeGeometry args={[9.95, 14.37]} />
      <meshStandardMaterial map={rugTexture} transparent />
    </mesh>
  );
};

const Walls = () => {
  const wallHeight = 8;
  const floorSize = 24;

  const stoneTexture = useTexture("/textures/stone_block_wall_diff_1k.jpg");
  stoneTexture.wrapS = THREE.RepeatWrapping;
  stoneTexture.wrapT = THREE.RepeatWrapping;
  stoneTexture.repeat.set(3, 1);

  return (
    <group>
      {/* Back wall */}
      <mesh position={[0, wallHeight / 2 - 1.5, -floorSize / 2]}>
        <planeGeometry args={[floorSize, wallHeight]} />
        <meshStandardMaterial map={stoneTexture} side={THREE.DoubleSide} />
      </mesh>
      {/* Left wall */}
      <mesh position={[-floorSize / 2, wallHeight / 2 - 1.5, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[floorSize, wallHeight]} />
        <meshStandardMaterial map={stoneTexture} side={THREE.DoubleSide} />
      </mesh>
      {/* Front wall */}
      <mesh position={[0, wallHeight / 2 - 1.5, floorSize / 2]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[floorSize, wallHeight]} />
        <meshStandardMaterial map={stoneTexture} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
};

const Floor = () => {
  const [showTexture] = useAtom(showFloorTextureAtom);
  const floorTexture = useTexture("/textures/old_wood_floor_diff_1k.jpg");

  floorTexture.wrapS = THREE.RepeatWrapping;
  floorTexture.wrapT = THREE.RepeatWrapping;
  floorTexture.repeat.set(3, 3);
  floorTexture.needsUpdate = true;

  return (
    <>
      {showTexture ? (
        <>
          <mesh position-y={-1.5} rotation-x={-Math.PI / 2} receiveShadow>
            <planeGeometry args={[24, 24]} />
            <meshStandardMaterial map={floorTexture} />
          </mesh>
          <Rug />
          <Walls />
        </>
      ) : (
        <>
          <mesh position-y={-1.5} rotation-x={-Math.PI / 2} receiveShadow>
            <planeGeometry args={[100, 100]} />
            <shadowMaterial transparent opacity={0.2} />
          </mesh>
          <gridHelper args={[20, 20, 0x333333, 0x333333]} position={[0.5, -1.5, 0.5]} />
          <axesHelper args={[15]} position={[0, -1.5, 0]} />
        </>
      )}
    </>
  );
};

export const Experience = () => {
  const [hovered, setHovered] = useState(false);
  const [ambientIntensity] = useAtom(ambientIntensityAtom);
  const [directionalIntensity] = useAtom(directionalIntensityAtom);
  const [directionalPosition] = useAtom(directionalPositionAtom);
  const [directionalColor] = useAtom(directionalColorAtom);
  const [ambientColor] = useAtom(ambientColorAtom);
  const [bookPosition] = useAtom(bookPositionAtom);
  const [bookRotation] = useAtom(bookRotationAtom);

  return (
    <>
      <CameraManager />

      <group position={bookPosition} rotation={bookRotation}>
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
      </group>
      <OrbitControls
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        minPolarAngle={0}
        maxPolarAngle={Math.PI}
      />
      <ambientLight intensity={ambientIntensity} color={ambientColor} />
      <directionalLight
        position={directionalPosition}
        intensity={directionalIntensity}
        color={directionalColor}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-bias={-0.0001}
      />
      <Floor />
    </>
  );
};
