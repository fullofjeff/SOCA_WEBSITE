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
    CylinderGeometry,
    RepeatWrapping
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


    // --- Material & Texture Setup ---
    const texEdgeTop = useTexture("/textures/page-edge-top.png");
    const texEdgeBottom = useTexture("/textures/page-edge-bottom.png");
    const texEdgeFore = useTexture("/textures/page-edge-fore.png");

    // Fix Texture Stretching (World Unit UVs)
    // ExtrudeGeometry UVs are in world units (1.0 = 1 meter)
    // We want the texture (1 unit) to stretch across the dimension (e.g. 1.28m)
    // So we need to scale the texture by 1/Dimension?
    // Actually, texture.repeat denotes how many times it repeats.
    // If we want 1 image to cover 1.28 units, and UV goes to 1.28...
    // We want normalized UV 1.0 to map to texture 1.0.
    // Current UV: 1.28.
    // We need to divide UV by 1.28 to get 1.0.
    // So repeat should be 1/1.28.

    texEdgeTop.repeat.set(1 / PAGE_WIDTH, 1 / 0.15); // Width x Thickness
    texEdgeTop.wrapS = texEdgeTop.wrapT = RepeatWrapping; // RepeatWrapping needed? No, Clamp or Repeat. 
    // If we scale UV down, we are zooming in? No.
    // UV * Repeat. 1.28 * (1/1.28) = 1.0. Correct.

    texEdgeBottom.repeat.set(1 / PAGE_WIDTH, 1 / 0.15);
    texEdgeBottom.wrapS = texEdgeBottom.wrapT = RepeatWrapping; // RepeatWrapping

    texEdgeFore.repeat.set(1 / PAGE_HEIGHT, 1 / 0.15); // Height x Thickness
    texEdgeFore.wrapS = texEdgeFore.wrapT = RepeatWrapping;

    // Rotate/Flip edge textures if needed
    // Top/Bottom are usually landscape, matching the edge length
    texEdgeTop.rotation = 0;
    texEdgeTop.center.set(0.5, 0.5);
    texEdgeBottom.rotation = 0;
    texEdgeBottom.center.set(0.5, 0.5);

    // Fore-edge might still need rotation depending on UVs vs Image
    texEdgeFore.rotation = Math.PI / 2;
    texEdgeFore.center.set(0.5, 0.5);

    const wedgeMaterials = useMemo(() => {
        const matMain = new MeshStandardMaterial({ color: PAPER_COLOR, roughness: 0.9, name: "main" });
        const matHidden = new MeshStandardMaterial({ color: PAPER_COLOR, roughness: 0.9, name: "hidden" });
        const matEdgeTop = new MeshStandardMaterial({ map: texEdgeTop, roughness: 0.8, name: "edge-top" });
        const matEdgeBottom = new MeshStandardMaterial({ map: texEdgeBottom, roughness: 0.8, name: "edge-bottom" });
        const matEdgeSpine = new MeshStandardMaterial({ color: PAPER_COLOR, roughness: 0.9, name: "edge-spine" });
        const matEdgeFore = new MeshStandardMaterial({ map: texEdgeFore, roughness: 0.8, name: "edge-fore" });

        return [
            matMain,      // 0: Front lid (+Z)
            matHidden,    // 1: Back lid (-Z)
            matEdgeTop,   // 2: Top edge (+Y)
            matEdgeBottom,// 3: Bottom edge (-Y)
            matEdgeSpine, // 4: Spine edge (-X)
            matEdgeFore   // 5: Fore-edge (+X)
        ];
    }, [texEdgeTop, texEdgeBottom, texEdgeFore]);

    // Use a geometry with groups for materials
    const pageBlockGeometry = useMemo(() => {
        // Note: ExtrudeGeometry automatically sets groups for faces (0) and sides (1)
        // We need to re-group the "sides" into top, bottom, spine, fore

        const shape = new Shape();
        const w = PAGE_WIDTH;
        const offset = -0.18;

        shape.moveTo(offset, 0);
        shape.lineTo(w, 0);
        shape.lineTo(w, 0.16);
        shape.lineTo(offset, 0.16);
        shape.lineTo(offset, 0);

        const geo = new ExtrudeGeometry(shape, {
            depth: PAGE_HEIGHT,
            bevelEnabled: false,
            curveSegments: 12
        });

        geo.translate(0, 0, -PAGE_HEIGHT / 2);

        // --- Custom UV Mapping / Groups Logic ---
        // Strictly follow `textures.md` requiring 6 materials

        const pos = geo.attributes.position;
        const nor = geo.attributes.normal;
        const count = pos.count;

        // Clear existing groups
        geo.clearGroups();

        // Efficiently group faces by material index
        const faceCount = count / 3;
        const faceIndices = new Uint8Array(faceCount);

        // 1. Calculate material index for each face
        for (let f = 0; f < faceCount; f++) {
            const i = f * 3;
            // Get normal of the face (use first vertex normal)
            const nx = nor.getX(i);
            const ny = nor.getY(i);
            const nz = nor.getZ(i);

            let matIdx = 0; // Default Main

            // CORRECTED MAPPING LOGIC
            // Lids (+Z / -Z) are Top/Bottom Edges (Thickness x Width)
            if (Math.abs(nz) > 0.9) {
                // Z axis -> Top/Bottom Edges (Index 2/3)
                // Assuming +Z is Top Edge?
                // Wait. Extrusion is along Z.
                // +Z is "Front" in 3D space usually, but here it's Height?
                // Let's assume +Z is Top Edge, -Z is Bottom Edge.
                matIdx = nz > 0 ? 2 : 3;
            } else {
                // Walls (X/Y plane)
                // +Y / -Y are Main Faces (Width x Height)
                if (Math.abs(ny) > 0.9) {
                    // Y axis -> Main/Hidden Faces (Index 0/1)
                    // +Y is Front, -Y is Back/Hidden
                    matIdx = ny > 0 ? 0 : 1;
                } else if (Math.abs(nx) > 0.9) {
                    // X axis -> Spine/Fore Edges (Index 4/5)
                    matIdx = nx > 0 ? 5 : 4;
                } else {
                    // Bevels -> Fore
                    matIdx = 5;
                }
            }
            faceIndices[f] = matIdx;
        }

        // 2. Create groups by finding contiguous ranges
        let currentMat = faceIndices[0];
        let startFace = 0;

        for (let f = 1; f < faceCount; f++) {
            if (faceIndices[f] !== currentMat) {
                // End of current range
                geo.addGroup(startFace * 3, (f - startFace) * 3, currentMat);

                // Start new range
                currentMat = faceIndices[f];
                startFace = f;
            }
        }
        // Add final group
        geo.addGroup(startFace * 3, (faceCount - startFace) * 3, currentMat);

        // --- Morph Logic ---
        const vertexCount = pos.count;
        const wedgeYs = new Float32Array(vertexCount);
        const blockYs = new Float32Array(vertexCount);
        const isTopVertex = new Uint8Array(vertexCount);

        for (let i = 0; i < vertexCount; i++) {
            const x = pos.getX(i);
            const y = pos.getY(i);
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
        // Ensure we refer to `pageBlockGeometry` which is defined above
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

    // --- Cover Textures ---
    const texCoverFront = useTexture("/textures/book-cover-front.png");
    const texCoverBack = useTexture("/textures/book-cover-back.png");
    const texCoverMisc = useTexture("/textures/texture_misc.png");

    // Fix Cover Texture Orientation & UV Mapping
    // Geometry dimensions:
    const COVER_W = PAGE_WIDTH + COVER_OVERHANG; // ~1.33
    const COVER_H = PAGE_HEIGHT + COVER_OVERHANG * 2; // ~1.81

    // 1. Scale texture to fit world units (1/Dimension)
    // 2. Center vertically (Offset Y by 0.5)

    // Front Cover - FLIPPED Horizontal (Mirrored Fix)
    texCoverFront.repeat.set(1 / COVER_W, 1 / COVER_H);
    texCoverFront.offset.set(0, 0.5); // Reset Offset X to 0

    texCoverBack.repeat.set(1 / COVER_W, 1 / COVER_H);
    texCoverBack.offset.set(0, 0.5);

    // Mat arrays
    const coverMaterialsRight = useMemo(() => {
        // Right Cover (Front) 
        // Index 0: +Z (Top/Inner/Endpaper) -> Misc Texture
        // Index 1: -Z (Bottom/Outer/FrontArt) -> Texture
        // Index 2: Sides -> Misc Texture
        const matEndpaper = new MeshStandardMaterial({ map: texCoverMisc, roughness: 0.6 });
        const matOuter = new MeshStandardMaterial({ map: texCoverBack, roughness: 0.6 }); // Use BACK texture here (Swap)
        const matSide = new MeshStandardMaterial({ map: texCoverMisc, roughness: 0.6 });
        return [matEndpaper, matOuter, matSide];
    }, [texCoverBack, texCoverMisc]);


    const coverMaterialsLeft = useMemo(() => {
        // Left Cover (Back) - It is scaled -1 on X.
        // Index 0: +Z (Top/Inner/Endpaper) -> Misc Texture
        // Index 1: -Z (Bottom/Outer/BackArt) -> Texture
        // Index 2: Sides -> Misc Texture
        const matEndpaper = new MeshStandardMaterial({ map: texCoverMisc, roughness: 0.6 });
        const matOuter = new MeshStandardMaterial({ map: texCoverFront, roughness: 0.6 }); // Use FRONT texture here (Swap)
        const matSide = new MeshStandardMaterial({ map: texCoverMisc, roughness: 0.6 });
        return [matEndpaper, matOuter, matSide];
    }, [texCoverFront, texCoverMisc]);


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

        const geo = new ExtrudeGeometry(shape, {
            depth: COVER_THICKNESS,
            bevelEnabled: true,
            bevelThickness: 0.02,
            bevelSize: 0.02,
            bevelSegments: 5,
        });

        // Manual Grouping for Covers
        // 0: +Z (Top)
        // 1: -Z (Bottom)
        // 2: Sides

        geo.clearGroups();
        const pos = geo.attributes.position;
        const nor = geo.attributes.normal;
        const count = pos.count;

        // Strategy: Naive iteration + Group Coalescing (copied from wedges)
        const faceCount = count / 3;
        const faceIndices = new Uint8Array(faceCount);

        for (let f = 0; f < faceCount; f++) {
            const i = f * 3;
            const nz = nor.getZ(i);
            // const ny = nor.getY(i); // We treat all sides including bevels as "Side"

            let matIdx = 2; // Default Side
            if (Math.abs(nz) > 0.9) {
                matIdx = nz > 0 ? 0 : 1; // 0=+Z, 1=-Z
            }
            faceIndices[f] = matIdx;
        }

        // Coalesce
        let currentMat = faceIndices[0];
        let startFace = 0;

        for (let f = 1; f < faceCount; f++) {
            if (faceIndices[f] !== currentMat) {
                geo.addGroup(startFace * 3, (f - startFace) * 3, currentMat);
                currentMat = faceIndices[f];
                startFace = f;
            }
        }
        geo.addGroup(startFace * 3, (faceCount - startFace) * 3, currentMat);

        return geo;
    }, []);

    const spineGeometry = useMemo(() => {
        const shape = new Shape();
        // Original radius = 0.176. Original Scale Y = 0.4.
        const rOuterX = 0.176;
        const rOuterY = 0.176 * 0.4; // Bake scale into geometry
        const rInnerX = 0.121;
        const rInnerY = 0.121 * 0.4;

        const height = 1.84; // Adjusted as requested

        // Define shape: Outer arc (Bottom half relative to shape origin because PI->0 Clockwise)
        // Note: Mesh is RotZ=180, so Bottom becomes Top in world.
        shape.absellipse(0, 0, rOuterX, rOuterY, Math.PI, 0, false); // Clockwise PI->0
        shape.absellipse(0, 0, rInnerX, rInnerY, 0, Math.PI, true);  // Counter-Clockwise 0->PI

        const geo = new ExtrudeGeometry(shape, {
            depth: height,
            bevelEnabled: false,
            curveSegments: 24 // Higher segments for smoother UVs
        });

        geo.translate(0, 0, -height / 2); // Center Z

        // --- Custom UV & Group Logic ---
        const pos = geo.attributes.position;
        const uv = geo.attributes.uv;
        const count = pos.count;

        geo.clearGroups();

        const faceCount = count / 3;
        const faceIndices = new Uint8Array(faceCount);

        for (let i = 0; i < faceCount; i++) {
            let isOuterFace = true;
            let isCap = false;

            // Check Face Normal Z to detect Caps
            const nz = geo.attributes.normal.getZ(i * 3);
            if (Math.abs(nz) > 0.9) {
                isCap = true;
                isOuterFace = false;
            } else {
                // Not a cap, check if it's Outer Wall
                for (let k = 0; k < 3; k++) {
                    const idx = i * 3 + k;
                    const x = pos.getX(idx);
                    const y = pos.getY(idx);

                    // Ellipse equation: (x/a)^2 + (y/b)^2 = 1
                    const val = (x * x) / (rOuterX * rOuterX) + (y * y) / (rOuterY * rOuterY);

                    // Tolerance loose because of tessellation
                    if (Math.abs(val - 1) > 0.1) {
                        isOuterFace = false;
                        break;
                    }
                }
            }

            if (isOuterFace) {
                faceIndices[i] = 1;

                // Remap UVs for Outer Wall
                for (let k = 0; k < 3; k++) {
                    const idx = i * 3 + k;
                    const x = pos.getX(idx);
                    const y = pos.getY(idx);
                    const z = pos.getZ(idx); // -H/2 to H/2

                    // Cylindrical mapping
                    // Angle from PI (Left) to 0 (Right)
                    const angle = Math.atan2(y, x); // Returns -PI to 0 for bottom half

                    // Map angle -PI..0 to 0..1
                    const u = (angle + Math.PI) / Math.PI;

                    // V from 0 (Bottom) to 1 (Top)
                    const v = (z + height / 2) / height;

                    uv.setXY(idx, u, v);
                }
            } else {
                faceIndices[i] = 0; // Caps or Inner Wall

                if (isCap) {
                    // Planar Map Caps nicely
                    for (let k = 0; k < 3; k++) {
                        const idx = i * 3 + k;
                        const x = pos.getX(idx);
                        const y = pos.getY(idx);
                        // Center at 0.5
                        uv.setXY(idx, 0.5 + x, 0.5 + y);
                    }
                } else {
                    // Inner Wall - Custom Cylindrical Mapping
                    for (let k = 0; k < 3; k++) {
                        const idx = i * 3 + k;
                        const x = pos.getX(idx);
                        const y = pos.getY(idx);
                        const z = pos.getZ(idx);

                        const angle = Math.atan2(y, x);
                        const u = (angle + Math.PI) / Math.PI;
                        const v = (z + height / 2) / height;

                        uv.setXY(idx, u, v);
                    }
                }
            }
        }

        // Coalesce Groups
        let currentMat = faceIndices[0];
        let startFace = 0;
        for (let f = 1; f < faceCount; f++) {
            if (faceIndices[f] !== currentMat) {
                geo.addGroup(startFace * 3, (f - startFace) * 3, currentMat);
                currentMat = faceIndices[f];
                startFace = f;
            }
        }
        geo.addGroup(startFace * 3, (faceCount - startFace) * 3, currentMat);

        return geo;
    }, []);

    const spineTexture = useTexture("/textures/spine.png");
    const spineMaterials = useMemo(() => {
        const matSolid = new MeshStandardMaterial({ map: texCoverMisc, roughness: 0.5 }); // Ends/Inner

        // Fix spine texture wrapping
        spineTexture.wrapS = 1000; // RepeatWrapping
        spineTexture.wrapT = 1000;
        spineTexture.repeat.set(1, 1);
        spineTexture.center.set(0.5, 0.5);
        spineTexture.rotation = -Math.PI / 2; // Rotate -90 deg (which is 90 + 180)

        const matTexture = new MeshStandardMaterial({ map: spineTexture, roughness: 0.5, color: "#ffffff" });

        return [matSolid, matTexture];
    }, [spineTexture, texCoverMisc]);

    // Actor Textures
    const texFront = useTexture("/textures/DSC00680.jpg");
    const texBack = useTexture("/textures/DSC00933.jpg");

    return (
        <group {...props} rotation-y={-Math.PI / 2}>
            {/* Covers */}
            <group ref={coverGroupLeft} position={[-COVER_SPINE_OFFSET, 0, 0]}><group scale={[-1, 1, 1]}><mesh geometry={coverGeometry} material={coverMaterialsLeft} castShadow receiveShadow /></group></group>
            <group ref={coverGroupRight} position={[COVER_SPINE_OFFSET, 0, 0]}><group><mesh geometry={coverGeometry} material={coverMaterialsRight} castShadow receiveShadow /></group></group>

            {/* Scale-Morphing Wedges (Constant Thickness Restored) */}
            <group ref={groupLeft} position={[-PAGE_SPINE_OFFSET, 0, 0]}>
                <group scale={[-1, 1, 1]}>
                    {/* Apply Multi-Material Array */}
                    <mesh ref={meshLeftPage} geometry={pageBlockGeometry} material={wedgeMaterials} position={[0, 0, COVER_THICKNESS]} rotation-x={Math.PI / 2} castShadow />
                </group>
            </group>

            <group ref={groupRight} position={[PAGE_SPINE_OFFSET, 0, 0]}>
                <group>
                    <mesh ref={meshRightPage} geometry={pageBlockGeometry} material={wedgeMaterials} position={[0, 0, COVER_THICKNESS]} rotation-x={Math.PI / 2} castShadow />
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
            <mesh position={[0, 0, 0]} rotation-x={-Math.PI / 2} rotation-z={Math.PI} castShadow receiveShadow geometry={spineGeometry} material={spineMaterials} />
        </group >
    );
};
