import { useMemo, useRef, forwardRef, useImperativeHandle } from "react";
import { useFrame } from "@react-three/fiber";
import {
    Bone,
    Skeleton,
    SkinnedMesh,
    BoxGeometry,
    Vector3,
    Uint16BufferAttribute,
    Float32BufferAttribute,
    MeshStandardMaterial,
    MathUtils
} from "three";
import { easing } from "maath";

// Dimensions
const PAGE_WIDTH = .56;
const SPINE_OFFSET = 0.18; // The "stem" connecting to spine
const PAGE_HEIGHT = 1.71;
const PAGE_DEPTH = 0.005; // Thin paper
const PAGE_SEGMENTS = 30;

const ACTOR_WIDTH = PAGE_WIDTH + SPINE_OFFSET; // Total Mesh Width (1.46)
const SEGMENT_WIDTH = ACTOR_WIDTH / PAGE_SEGMENTS;

// Geometry Builder with Correct UVs
const buildPageGeometry = () => {
    // 1. Create Box centered at (0,0,0)
    const geo = new BoxGeometry(ACTOR_WIDTH, PAGE_HEIGHT, PAGE_DEPTH, PAGE_SEGMENTS, 2);

    // 2. Shift pivot to Left Edge (Spine)
    // Original X range: [-0.73, 0.73] -> New X range: [0, 1.46]
    geo.translate(ACTOR_WIDTH / 2, 0, 0);

    // 3. Fix UVs to prevent "Stretched/Too Big" texture
    // The texture should only appear on the PAGE_WIDTH part (Right side)
    // The SPINE_OFFSET part (Left side) should be clamping or transparent
    const uvAttribute = geo.attributes.uv;
    const posAttribute = geo.attributes.position;

    for (let i = 0; i < uvAttribute.count; i++) {
        const x = posAttribute.getX(i); // 0 to 1.46
        const u = uvAttribute.getX(i);

        // Remap U so 0 starts at SPINE_OFFSET
        // Normalized X position relative to Page Width
        // If x < SPINE_OFFSET, it's the gutter (keep texture edge or white)
        // If x > SPINE_OFFSET, map 0..1

        let newU = (x - SPINE_OFFSET) / PAGE_WIDTH;

        // Clamp to prevent texture bleeding into spine
        if (newU < 0) newU = 0;

        uvAttribute.setX(i, newU);
    }
    geo.attributes.uv.needsUpdate = true;

    // 4. Skin Weights (Linear distribution)
    const position = geo.attributes.position;
    const vertex = new Vector3();
    const skinIndexes = [];
    const skinWeights = [];

    for (let i = 0; i < position.count; i++) {
        vertex.fromBufferAttribute(position, i);
        const x = vertex.x;

        const skinIndex = Math.max(0, Math.floor(x / SEGMENT_WIDTH));
        const safeIndex = Math.min(skinIndex, PAGE_SEGMENTS - 1);
        const skinWeight = (x % SEGMENT_WIDTH) / SEGMENT_WIDTH;

        skinIndexes.push(safeIndex, safeIndex + 1, 0, 0);
        skinWeights.push(1 - skinWeight, skinWeight, 0, 0);
    }

    geo.setAttribute('skinIndex', new Uint16BufferAttribute(skinIndexes, 4));
    geo.setAttribute('skinWeight', new Float32BufferAttribute(skinWeights, 4));

    return geo;
};

const pageGeometry = buildPageGeometry();

export const PageActor = forwardRef(({ textureFront, textureBack, scale = 1 }, ref) => {
    const meshRef = useRef();

    // Create Skeleton
    const { skeleton, bones } = useMemo(() => {
        const bonesArr = [];
        for (let i = 0; i <= PAGE_SEGMENTS; i++) {
            const bone = new Bone();
            bonesArr.push(bone);
            // Linear placement along X axis
            bone.position.x = i === 0 ? 0 : SEGMENT_WIDTH;
            if (i > 0) bonesArr[i - 1].add(bone);
        }
        return { skeleton: new Skeleton(bonesArr), bones: bonesArr };
    }, []);

    const state = useRef({ rotationAngle: 0 });

    useImperativeHandle(ref, () => ({
        setRotation: (angleRad) => {
            state.current.rotationAngle = angleRad;
        }
    }));

    useFrame((_, delta) => {
        if (!meshRef.current) return;
        const { rotationAngle } = state.current;
        const bones = skeleton.bones;

        // Progress: 0 (Start) -> 1 (End)
        // We use Abs because angle goes 0 -> -PI or 0 -> PI
        const progress = Math.min(Math.abs(rotationAngle) / Math.PI, 1);

        // Turning Time: 0 -> 1 -> 0 (The Bell Curve for Curl)
        const turningTime = Math.sin(progress * Math.PI);

        for (let i = 0; i < bones.length; i++) {
            const bone = bones[i];

            if (i === 0) {
                // Root Bone: Handles the MAIN flip rotation
                bone.rotation.y = rotationAngle;
            } else {
                // Child Bones: Handle the CURL
                // We multiply by turningTime so it is perfectly FLAT at start and end

                // Quadratic curl: Stiff at spine (0), curlier at edge (1)
                // This creates a natural "J" shape rather than a ripple or spiral
                const curlShape = Math.pow(i / PAGE_SEGMENTS, 2);
                const MAX_BEND = 0.05; // ~85 degrees total curvature over 30 segments

                // Direction of flip determines curl direction
                const curlDir = Math.sign(rotationAngle);

                // Apply Curl (using turningTime for flat landing)
                const targetRotation = curlShape * MAX_BEND * turningTime * -curlDir;

                // Slight fold effect for structural rigidity
                const foldRotation = (i > 10 ? curlShape * 0.05 : 0) * turningTime;

                bone.rotation.y = targetRotation;
                bone.rotation.x = foldRotation;
            }
        }
    });

    const materials = useMemo(() => {
        const whiteMat = new MeshStandardMaterial({ color: "#fdfbf7", roughness: 0.9 });
        return [
            whiteMat, // Right
            whiteMat, // Left
            whiteMat, // Top
            whiteMat, // Bottom
            new MeshStandardMaterial({ color: "#ffffff", map: textureFront, roughness: 0.2 }), // Front
            new MeshStandardMaterial({ color: "#ffffff", map: textureBack, roughness: 0.2 }),  // Back
        ];
    }, [textureFront, textureBack]);

    return (
        <group scale={scale}>
            <skinnedMesh
                ref={meshRef}
                geometry={pageGeometry}
                material={materials}
                skeleton={skeleton}
                castShadow
                receiveShadow
                frustumCulled={false}
            >
                <primitive object={bones[0]} />
            </skinnedMesh>
        </group>
    );
});
PageActor.displayName = "PageActor";
