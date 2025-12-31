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

    // Presets - MUST be first to allow cascading updates if we used a store, 
    // but here we just need access to the set function of other controls.
    // However, useControls hooks return values. The `set` function is available differently.
    // Leva doesn't expose a global `set` easily unless we use the store. 
    // But we can use `set` from the return if we destructure: `const [values, set] = useControls(...)` - checking documentation/memory.
    // Standard `useControls` returns `values`. 
    // To get `set`, we should use `useControls(() => ({ ... }))` returning `[values, set]`.

    // We need to refactor existing controls to get their setters.

    // Renamed, collapsed, ordered folders

    // Lighting (Order 1)
    const [{ ambientIntensity, ambientColor, dirIntensity, dirPosition, dirColor }, setLighting] = useControls("Lighting", () => ({
        ambientIntensity: { value: 0.5, min: 0, max: 2, step: 0.05 },
        ambientColor: { value: "#ffffff" },
        dirIntensity: { value: 2.5, min: 0, max: 10, step: 0.1, label: "Directional Intensity" },
        dirPosition: { value: [2, 5, 2] },
        dirColor: { value: "#ffffff", label: "Directional Color" }
    }), { collapsed: true, order: 1 });

    // Book Transform (Order 2)
    const [{ bookPos, bookRot }, setBookTransform] = useControls("Book Transform", () => ({
        bookPos: { value: [0, 0, 0], step: 0.1, label: "Position" },
        bookRot: { value: [0, 0, 0], step: 0.01, label: "Rotation" }
    }), { collapsed: true, order: 2 });

    // Presets (Order 3)
    useControls("Presets", {
        "Load Preset": {
            options: {
                "Default": "default",
                "Dev Preset 1": "dev1"
            },
            onChange: (v) => {
                if (v === "default") {
                    setLighting({
                        ambientIntensity: 0.5, ambientColor: "#ffffff",
                        dirIntensity: 2.5, dirPosition: [2, 5, 2], dirColor: "#ffffff"
                    });
                    setBookTransform({ bookPos: [0, 0, 0], bookRot: [0, 0, 0] });
                } else if (v === "dev1") {
                    setBookTransform({
                        bookPos: [-2.2, -1.1, -2.3],
                        bookRot: [1.92, -0.11, 2.37]
                    });
                }
            }
        }
    }, { collapsed: true, order: 3 });

    // Book State (Order 4)
    useControls("Book State", {
        "Next Page": button(() => !bookClosed && setPage((p) => p + 1)),
        "Prev Page": button(() => !bookClosed && setPage((p) => Math.max(0, p - 1))),
        "Open/Close Book": button(() => setBookClosed((c) => !c)),
        "Reset Page": button(() => setPage(0)),
    }, { collapsed: true, order: 4 }, [bookClosed, page]);

    // Camera (Order 5)
    useControls("Camera", {
        "Free Look": button(() => setCameraPos(null)),
        "Red Cover / Page Side": button(() => setCameraPos([0, 0, 14])),
        "Spine / Back": button(() => setCameraPos([14, 0, 0])),
        "Blue Cover / Page Side": button(() => setCameraPos([0, 0, -14])),
        "Straight On": button(() => setCameraPos([-14, 0, 0])),
        "Top Down": button(() => setCameraPos([0, 14, 0])),
    }, { collapsed: true, order: 5 });

    // Debug Settings (Order 100 - Bottom)
    const [{ showTexture }] = useControls("Debug Settings", () => ({
        showTexture: { value: true, label: "Show Floor Texture" }
    }), { collapsed: true, order: 100 });

    // Master Save (Order -100 - Top)
    // We define this last so it closes over the values, but use order -100 to show it at top.
    useControls({
        "Master Save": button(() => {
            const config = {
                lighting: { ambientIntensity, ambientColor, dirIntensity, dirPosition, dirColor },
                bookTransform: { bookPos, bookRot },
                floor: { showTexture },
                note: "Cloud settings are saved separately via their own controls if needed, or we can grab them if we lift state."
            };
            console.log("--- MASTER SAVE ---");
            console.log(JSON.stringify(config, null, 2));
            const blob = new Blob([JSON.stringify(config, null, 2)], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = "master-scene-config.json";
            a.click();
            URL.revokeObjectURL(url);
        })
    }, { order: -100 });

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
        </>
    );
};
