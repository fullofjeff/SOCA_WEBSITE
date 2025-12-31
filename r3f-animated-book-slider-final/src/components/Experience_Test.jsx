import { Environment, Float, OrbitControls } from "@react-three/drei";
import { useRef, useState } from "react";
import { Book, BookRig } from "./Book_Test";

export const Experience_Test = () => {
  const [fall, setFall] = useState(true);
  const [hovered, setHovered] = useState(false);

  return (
    <>
      
      <BookRig
        fall={fall}
        initialPosition={[0.4, 1.4, -0.2]}
        initialRotation={[0, Math.PI * 0.1, 0]}
        groundY={-1.5}
        restitution={0.25}
        friction={0.8}
        impulse={{ v: [0.7, 1.4, -0.4], w: [0.2, 3.2, 0.1] }}
        onRest={() => {
          console.log("Book has settled!");
          setTimeout(() => setFall(false), 1000);
        }}
      >
        <group
          onPointerEnter={() => setHovered(true)}
          onPointerLeave={() => setHovered(false)}
          onClick={() => setFall(!fall)}
        >
          <Book title="Physics Book" />
        </group>
      </BookRig>
      <OrbitControls />
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
    </>
  );
};