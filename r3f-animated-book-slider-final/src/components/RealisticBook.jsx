import { useMemo, useRef, useEffect, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { useCursor, useTexture } from "@react-three/drei";
import {
    ExtrudeGeometry,
    Shape,
    Vector3,
    MathUtils,
    Color,
    MeshStandardMaterial,
    BoxGeometry,
    Group,
    DynamicDrawUsage,
    CylinderGeometry
} from "three";
import { degToRad } from "three/src/math/MathUtils.js";
import { easing } from "maath";
import { useAtom } from "jotai";
import { pageAtom, bookClosedAtom } from "./UI";
import { PageActor } from "./PageActor"; // Import the Actor

const PAGE_WIDTH = 1.28;
const PAGE_HEIGHT = 1.71;
const BOOK_THICKNESS = 0.4; // Total thickness
const COVER_THICKNESS = 0.03;
const COVER_OVERHANG = 0.05;
const SPINE_WIDTH = 0.15;
const SPINE_OFFSET = 0.19;

const COVER_COLOR_FRONT = "#FF0000";
const COVER_COLOR_BACK = "#0000FF";
const PAPER_COLOR = "#fdfbf7";
const GOLD_COLOR = "#d4af37";

// Helper function for easing since maath.easing doesn't export cubicInOut directly
const easeCubicInOut = (t) => {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
};

export const RealisticBook = (props) => {
    const [page] = useAtom(pageAtom);
    const [bookClosed] = useAtom(bookClosedAtom);

    // State for Direction & Animation
    const prevPage = useRef(page);
    const [isFlipping, setIsFlipping] = useState(false);
    const flipStartTime = useRef(0);
    const flipDirection = useRef('next'); // 'next' or 'prev'

    const actorRef = useRef();
    const actorGroupRef = useRef(); // Ref for the moving container

    // Page Groups (The Wedges)
    const groupLeft = useRef();
    const groupRight = useRef();

    // Cover Groups
    const coverGroupLeft = useRef();
    const coverGroupRight = useRef();

    const meshLeftPage = useRef();
    const meshRightPage = useRef();

    const COVER_SPINE_OFFSET = 0.16;
    const PAGE_SPINE_OFFSET = 0.18;

    const pageBlockGeometry = useMemo(() => {
        const shape = new Shape();
        const w = PAGE_WIDTH;
        const offset = -0.18;

        shape.moveTo(offset, 0);
        shape.lineTo(w, 0);
        shape.lineTo(w, 0.16); // Max Thickness Height
        shape.lineTo(offset, 0.16);
        shape.lineTo(offset, 0);

        const geo = new ExtrudeGeometry(shape, {
            depth: PAGE_HEIGHT,
            bevelEnabled: false,
            curveSegments: 12
        });

        geo.translate(0, 0, -PAGE_HEIGHT / 2);

        // Morph Targets (Wedge Profiling)
        const posAttribute = geo.attributes.position;
        const vertexCount = posAttribute.count;
        const wedgeYs = new Float32Array(vertexCount);
        const blockYs = new Float32Array(vertexCount);
        const isTopVertex = new Uint8Array(vertexCount);

        for (let i = 0; i < vertexCount; i++) {
            const x = posAttribute.getX(i);
            const y = posAttribute.getY(i);

            blockYs[i] = y;

            if (y > 0.15) {
                isTopVertex[i] = 1;
                const minX = offset;
                const maxX = w;
                const t = MathUtils.clamp((x - minX) / (maxX - minX), 0, 1);
                const easedT = t * t * (3 - 2 * t);
                const targetY = 0.04 + (0.16 - 0.04) * easedT;
                wedgeYs[i] = targetY;
            } else {
                isTopVertex[i] = 0;
                wedgeYs[i] = y;
            }
        }

        geo.userData = { wedgeYs, blockYs, isTopVertex };
        geo.attributes.position.usage = DynamicDrawUsage;

        return geo;
    }, []);

    // Flip Orchestration
    useEffect(() => {
        if (page !== prevPage.current) {
            // Trigger Flip
            setIsFlipping(true);
            flipStartTime.current = Date.now();
            flipDirection.current = page > prevPage.current ? 'next' : 'prev';

            // Timeout to end flip
            setTimeout(() => {
                setIsFlipping(false);
            }, 6000); // 6000ms flip duration

            prevPage.current = page;
        }
    }, [page]);

    useFrame((state, delta) => {
        const targetRotationClosedLeft = Math.PI / 2;
        const targetRotationClosedRight = -Math.PI / 2;

        // Animate Page Groups Opening/Closing
        easing.dampAngle(groupLeft.current.rotation, "y", bookClosed ? targetRotationClosedLeft : 0, 0.4, delta);
        easing.dampAngle(groupRight.current.rotation, "y", bookClosed ? targetRotationClosedRight : 0, 0.4, delta);

        // Animate Cover Groups
        easing.dampAngle(coverGroupLeft.current.rotation, "y", bookClosed ? targetRotationClosedLeft : 0, 0.4, delta);
        easing.dampAngle(coverGroupRight.current.rotation, "y", bookClosed ? targetRotationClosedRight : 0, 0.4, delta);

        // --- Block Morphing Logic (Closed vs Open) ---
        const currentRot = Math.abs(groupLeft.current.rotation.y);
        const closedFactor = MathUtils.clamp(currentRot / (Math.PI / 2), 0, 1);

        // 1. Width Scaling (Retraction)
        const targetScaleX = 1 - (1 - 0.89) * closedFactor;
        const targetPosX = PAGE_WIDTH - (PAGE_WIDTH * targetScaleX);

        // 2. Height Scaling (Thickness reduction when closed to prevent overlap)
        const targetScaleY = 1 - (1 - 0.935) * closedFactor;

        if (meshLeftPage.current) {
            meshLeftPage.current.scale.x = targetScaleX;
            meshLeftPage.current.scale.y = targetScaleY;
            meshLeftPage.current.position.x = targetPosX;
            meshLeftPage.current.rotation.x = Math.PI / 2;
        }

        if (meshRightPage.current) {
            meshRightPage.current.scale.x = targetScaleX;
            meshRightPage.current.scale.y = targetScaleY;
            meshRightPage.current.position.x = targetPosX;
            meshRightPage.current.rotation.x = Math.PI / 2;
        }

        // 2. Vertex Morphing (Wedge <-> Block)
        const geo = pageBlockGeometry;
        const { wedgeYs, blockYs, isTopVertex } = geo.userData;
        const pos = geo.attributes.position;
        let needsUpdate = false;

        for (let i = 0; i < pos.count; i++) {
            if (isTopVertex[i]) {
                const startY = wedgeYs[i];
                const endY = blockYs[i];
                const newY = startY + (endY - startY) * closedFactor;
                if (Math.abs(pos.getY(i) - newY) > 0.0001) {
                    pos.setY(i, newY);
                    needsUpdate = true;
                }
            }
        }
        if (needsUpdate) pos.needsUpdate = true;

        // --- Page Actor Animation ---
        if (isFlipping && actorRef.current) {
            const FLIP_DURATION = 6000; // ms
            const now = Date.now();
            const elapsed = now - flipStartTime.current;
            const rawProgress = Math.min(elapsed / FLIP_DURATION, 1);

            // Smoothstep for nicer time feel
            const smoothProgress = easeCubicInOut(rawProgress);

            const isNext = flipDirection.current === 'next';
            const targetRot = isNext ? -Math.PI : 0;
            const startRot = isNext ? 0 : -Math.PI;

            const currentAngle = startRot + (targetRot - startRot) * smoothProgress;
            actorRef.current.setRotation(currentAngle);

            // --- SPINE SHIFT LOGIC (EDGE TO EDGE) ---
            if (actorGroupRef.current) {
                // Right Wedge (0.19) - Offset (0.18) = 0.01
                // Left Wedge (-0.19) + Offset (0.18) = -0.01
                const rightX = 0.01;
                const leftX = -0.01;

                const startX = isNext ? rightX : leftX;
                const endX = isNext ? leftX : rightX;

                // Use smoothProgress here too so it stays synced with rotation
                const currentX = startX + (endX - startX) * smoothProgress;
                actorGroupRef.current.position.x = currentX;
            }
        }
    });

    // Asset Loading
    const coverGeometry = useMemo(() => {
        const shape = new Shape();
        const w = PAGE_WIDTH + COVER_OVERHANG;
        const h = PAGE_HEIGHT + COVER_OVERHANG * 2;
        const offset = 0;
        const r = 0.04;
        shape.moveTo(offset, -h / 2);
        shape.lineTo(w - r, -h / 2);
        shape.quadraticCurveTo(w, -h / 2, w, -h / 2 + r);
        shape.lineTo(w, h / 2 - r);
        shape.quadraticCurveTo(w, h / 2, w - r, h / 2);
        shape.lineTo(offset, h / 2);
        shape.lineTo(offset, -h / 2);
        return new ExtrudeGeometry(shape, {
            depth: COVER_THICKNESS,
            bevelEnabled: true,
            bevelThickness: 0.02,
            bevelSize: 0.02,
            bevelSegments: 5,
        });
    }, []);

    const coverMaterialFront = useMemo(() => new MeshStandardMaterial({ color: COVER_COLOR_FRONT, roughness: 0.6 }), []);
    const coverMaterialBack = useMemo(() => new MeshStandardMaterial({ color: COVER_COLOR_BACK, roughness: 0.6 }), []);
    const pageMaterial = useMemo(() => new MeshStandardMaterial({ color: PAPER_COLOR, roughness: 0.9 }), []);
    const pageMaterialLeft = useMemo(() => new MeshStandardMaterial({ color: "orange", roughness: 0.9 }), []);
    const spineTexture = useTexture("/textures/spine.png");
    const spineMaterial = useMemo(() => new MeshStandardMaterial({ color: "#ffffff", map: spineTexture, roughness: 0.5 }), [spineTexture]);

    // Actor Textures
    const texFront = useTexture("/textures/DSC00680.jpg");
    const texBack = useTexture("/textures/DSC00933.jpg");

    return (
        <group {...props} rotation-y={-Math.PI / 2}>
            {/* Covers */}
            <group ref={coverGroupLeft} position={[-COVER_SPINE_OFFSET, 0, 0]}><group scale={[-1, 1, 1]}><mesh geometry={coverGeometry} material={coverMaterialBack} castShadow receiveShadow /></group></group>
            <group ref={coverGroupRight} position={[COVER_SPINE_OFFSET, 0, 0]}><group><mesh geometry={coverGeometry} material={coverMaterialFront} castShadow receiveShadow /></group></group>

            {/* Scale-Morphing Wedges (Constant Thickness Restored) */}
            <group ref={groupLeft} position={[-PAGE_SPINE_OFFSET, 0, 0]}>
                <group scale={[-1, 1, 1]}>
                    <mesh ref={meshLeftPage} geometry={pageBlockGeometry} material={pageMaterialLeft} position={[0, 0, COVER_THICKNESS]} rotation-x={Math.PI / 2} castShadow />
                </group>
            </group>

            <group ref={groupRight} position={[PAGE_SPINE_OFFSET, 0, 0]}>
                <group>
                    <mesh ref={meshRightPage} geometry={pageBlockGeometry} material={pageMaterial} position={[0, 0, COVER_THICKNESS]} rotation-x={Math.PI / 2} castShadow />
                </group>
            </group>

            {/* The ACTOR (Only visible when flipping) */}
            {isFlipping && (
                <group ref={actorGroupRef} position={[0, 0, 0.2]}>
                    <PageActor
                        ref={actorRef}
                        textureFront={texFront}
                        textureBack={texBack}
                    />
                </group>
            )}

            {/* Spine */}
            <mesh position={[0, -((PAGE_HEIGHT + COVER_OVERHANG * 2) / 2), 0]} rotation-x={-Math.PI / 2} rotation-z={Math.PI} scale={[1, 0.4, 1]} castShadow receiveShadow>
                <primitive object={useMemo(() => {
                    const shape = new Shape();
                    const rOuter = 0.176;
                    const rInner = 0.121;
                    shape.absarc(0, 0, rOuter, Math.PI, 0, false);
                    shape.absarc(0, 0, rInner, 0, Math.PI, true);
                    return new ExtrudeGeometry(shape, { depth: PAGE_HEIGHT + COVER_OVERHANG * 2, bevelEnabled: false, curveSegments: 12 });
                }, [])} attach="geometry" />
                <primitive object={spineMaterial} attach="material" />
            </mesh>
        </group >
    );
};
