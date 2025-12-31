import { Environment, Float, OrbitControls, useTexture } from "@react-three/drei";
import { useState } from "react";
import { RealisticBook } from "./RealisticBook";
import * as THREE from 'three';
import { useAtom } from "jotai";
import {
    cameraPositionAtom,
    pageAtom,
    bookClosedAtom
} from "./UI";
import { useFrame } from "@react-three/fiber";
import { easing } from "maath";
import { CloudFog } from "./CloudFog";
import { useControls, button, folder } from "leva";

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

const Floor = ({ showTexture }) => {
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

const SceneExport = ({ values }) => {
    useControls("Scene / Export", {
        "Export Config (Log)": button(() => {
            const config = {
                ...values,
                cloudFog: "See CloudFog controls (separate)"
            };
            console.log("--- EXPORTED SCENE CONFIG ---");
            console.log(JSON.stringify(config, null, 2));
            alert("Configuration logged to console!");
        }),
        "Download Config": button(() => {
            const config = {
                ...values
            };
            const blob = new Blob([JSON.stringify(config, null, 2)], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = "scene-config.json";
            a.click();
            URL.revokeObjectURL(url);
        })
    });
    return null;
};

export const ExperienceFog = () => {
    const [hovered, setHovered] = useState(false);
    const [, setCameraPos] = useAtom(cameraPositionAtom);
    const [page, setPage] = useAtom(pageAtom);
    const [bookClosed, setBookClosed] = useAtom(bookClosedAtom);

    // --- LEVA CONTROLS ---

    // Scene / Lighting
    const { ambientIntensity, ambientColor, dirIntensity, dirPosition, dirColor } = useControls("Scene / Lighting", {
        ambientIntensity: { value: 0.5, min: 0, max: 2, step: 0.05 },
        ambientColor: { value: "#ffffff" },
        dirIntensity: { value: 2.5, min: 0, max: 10, step: 0.1, label: "Directional Intensity" },
        dirPosition: { value: [2, 5, 2] },
        dirColor: { value: "#ffffff", label: "Directional Color" }
    });

    // Scene / Floor
    const { showTexture } = useControls("Scene / Floor", {
        showTexture: { value: true, label: "Show Texture" }
    });

    // Scene / Book Transform
    const { bookPos, bookRot } = useControls("Scene / Book Transform", {
        bookPos: { value: [0, 0, 0], step: 0.1, label: "Position" },
        bookRot: { value: [0, 0, 0], step: 0.01, label: "Rotation" }
    });

    // Scene / Book State
    useControls("Scene / Book State", {
        "Next Page": button(() => !bookClosed && setPage((p) => p + 1)),
        "Prev Page": button(() => !bookClosed && setPage((p) => Math.max(0, p - 1))),
        "Toggle Close": button(() => setBookClosed((c) => !c)),
        "Reset Page": button(() => setPage(0)),
    }, [bookClosed, page]); // Dep array for callbacks? Leva button callbacks might need stable refs or use updated state if not closed over? 
    // Actually Leva buttons don't take a dependency array in the hook like useEffect. 
    // But they will close over the current scope.
    // However, since we are inside the component render body, `setPage` is stable. `bookClosed` changes.
    // Ideally we pass a function that doesn't depend on stale closures if possible.
    // The `setPage` with updater `p => p+1` is safe.
    // `setBookClosed` with `c => !c` is safe.
    // But the check `!bookClosed` inside the button callback:
    // If we re-render, the hook is called again with new callbacks closing over new `bookClosed`.
    // Leva should update the button handler.

    // Scene / Camera Presets
    useControls("Scene / Camera", {
        "Free Look": button(() => setCameraPos(null)),
        "Red Cover / Page Side": button(() => setCameraPos([0, 0, 14])),
        "Spine / Back": button(() => setCameraPos([14, 0, 0])),
        "Blue Cover / Page Side": button(() => setCameraPos([0, 0, -14])),
        "Straight On": button(() => setCameraPos([-14, 0, 0])),
        "Top Down": button(() => setCameraPos([0, 14, 0])),
    });

    return (
        <>
            <CameraManager />

            {/* CLOUD FOG ADDITION */}
            <CloudFog />

            <group position={bookPos} rotation={bookRot}>
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
                position={dirPosition}
                intensity={dirIntensity}
                color={dirColor}
                castShadow
                shadow-mapSize-width={2048}
                shadow-mapSize-height={2048}
                shadow-bias={-0.0001}
            />
            <Floor showTexture={showTexture} />

            {/* Export controls last to ensure bottom placement */}
            <SceneExport values={{
                ambient: { intensity: ambientIntensity, color: ambientColor },
                directional: { intensity: dirIntensity, position: dirPosition, color: dirColor },
                book: { position: bookPos, rotation: bookRot }
            }} />
        </>
    );
};
