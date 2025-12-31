import { useCursor, useTexture } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useAtom } from "jotai";
import { easing } from "maath";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Bone,
  BoxGeometry,
  Color,
  Float32BufferAttribute,
  MathUtils,
  Mesh,
  MeshStandardMaterial,
  Skeleton,
  SkinnedMesh,
  SRGBColorSpace,
  Uint16BufferAttribute,
  Vector3,
} from "three";
import { degToRad } from "three/src/math/MathUtils.js";
import { pageAtom, pages } from "./UI";

const easingFactor = 0.5; // Controls the speed of the easing
const easingFactorFold = 0.3; // Controls the speed of the easing
const insideCurveStrength = 0.18; // Controls the strength of the curve
const outsideCurveStrength = 0.05; // Controls the strength of the curve
const turningCurveStrength = 0.09; // Controls the strength of the curve

const PAGE_WIDTH = 1.28;
const PAGE_HEIGHT = 1.71; // 4:3 aspect ratio
const PAGE_DEPTH = 0.003;
const COVER_DEPTH = 0.02; // Thick hardcover
const FILLER_DEPTH = 0.15; // Thick filler block for depth
const PAGE_SEGMENTS = 30;
const SEGMENT_WIDTH = PAGE_WIDTH / PAGE_SEGMENTS;

// Bendable page geometry (for interior content pages)
const pageGeometry = new BoxGeometry(
  PAGE_WIDTH,
  PAGE_HEIGHT,
  PAGE_DEPTH,
  PAGE_SEGMENTS,
  2
);

pageGeometry.translate(PAGE_WIDTH / 2, 0, 0);

// Rigid cover geometry (thick, no segments)
const coverGeometry = new BoxGeometry(
  PAGE_WIDTH,
  PAGE_HEIGHT,
  COVER_DEPTH,
  1, // No segments - rigid
  2
);

coverGeometry.translate(PAGE_WIDTH / 2, 0, 0);

// Rigid filler geometry (very thick, no segments)
const fillerGeometry = new BoxGeometry(
  PAGE_WIDTH,
  PAGE_HEIGHT,
  FILLER_DEPTH,
  1, // No segments - rigid
  2
);

fillerGeometry.translate(PAGE_WIDTH / 2, 0, 0);

const position = pageGeometry.attributes.position;
const vertex = new Vector3();
const skinIndexes = [];
const skinWeights = [];

for (let i = 0; i < position.count; i++) {
  // ALL VERTICES
  vertex.fromBufferAttribute(position, i); // get the vertex
  const x = vertex.x; // get the x position of the vertex

  const skinIndex = Math.max(0, Math.floor(x / SEGMENT_WIDTH)); // calculate the skin index
  let skinWeight = (x % SEGMENT_WIDTH) / SEGMENT_WIDTH; // calculate the skin weight

  skinIndexes.push(skinIndex, skinIndex + 1, 0, 0); // set the skin indexes
  skinWeights.push(1 - skinWeight, skinWeight, 0, 0); // set the skin weights
}

pageGeometry.setAttribute(
  "skinIndex",
  new Uint16BufferAttribute(skinIndexes, 4)
);
pageGeometry.setAttribute(
  "skinWeight",
  new Float32BufferAttribute(skinWeights, 4)
);

const whiteColor = new Color("white");
const creamColor = new Color("#F5F5DC"); // Cream color for fillers
const emissiveColor = new Color("orange");

const pageMaterials = [
  new MeshStandardMaterial({
    color: whiteColor,
  }),
  new MeshStandardMaterial({
    color: "#111",
  }),
  new MeshStandardMaterial({
    color: whiteColor,
  }),
  new MeshStandardMaterial({
    color: whiteColor,
  }),
];

const fillerMaterials = [
  new MeshStandardMaterial({ color: creamColor }),
  new MeshStandardMaterial({ color: creamColor }),
  new MeshStandardMaterial({ color: creamColor }),
  new MeshStandardMaterial({ color: creamColor }),
  new MeshStandardMaterial({ color: creamColor }),
  new MeshStandardMaterial({ color: creamColor }),
];

// COMMENTED OUT - This module-level execution was causing the freeze
// pages.forEach((page) => {
//   useTexture.preload(`/textures/${page.front}.jpg`);
//   useTexture.preload(`/textures/${page.back}.jpg`);
//   useTexture.preload(`/textures/book-cover-roughness.jpg`);
// });

const Page = ({ number, front, back, page, opened, bookClosed, pageType = "content", ...props }) => {
  // For filler pages, skip texture loading
  const shouldLoadTextures = pageType !== "filler";

  const textures = shouldLoadTextures ? useTexture([
    `/textures/${front}.jpg`,
    `/textures/${back}.jpg`,
    ...(number === 0 || number === pages.length - 1
      ? [`/textures/book-cover-roughness.jpg`]
      : []),
  ]) : [null, null, null];

  const [picture, picture2, pictureRoughness] = textures;

  if (picture && picture2) {
    picture.colorSpace = picture2.colorSpace = SRGBColorSpace;
  }

  const group = useRef();
  const turnedAt = useRef(0);
  const lastOpened = useRef(opened);

  const skinnedMeshRef = useRef();

  const manualSkinnedMesh = useMemo(() => {
    // Select geometry based on page type
    const geometry = pageType === "cover" ? coverGeometry
      : pageType === "filler" ? fillerGeometry
        : pageGeometry;

    // For filler pages, use simple mesh without skeleton
    if (pageType === "filler") {
      const mesh = new Mesh(geometry, fillerMaterials);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.frustumCulled = false;
      return mesh;
    }

    // For covers and content pages, create full bone structure
    const boneCount = pageType === "cover" ? 1 : PAGE_SEGMENTS;
    const bones = [];
    for (let i = 0; i <= boneCount; i++) {
      let bone = new Bone();
      bones.push(bone);
      if (i === 0) {
        bone.position.x = 0;
      } else {
        bone.position.x = pageType === "cover" ? PAGE_WIDTH : SEGMENT_WIDTH;
      }
      if (i > 0) {
        bones[i - 1].add(bone);
      }
    }
    const skeleton = new Skeleton(bones);

    const materials = [
      ...pageMaterials,
      new MeshStandardMaterial({
        color: whiteColor,
        map: picture,
        ...(number === 0
          ? {
            roughnessMap: pictureRoughness,
          }
          : {
            roughness: 0.1,
          }),
        emissive: emissiveColor,
        emissiveIntensity: 0,
      }),
      new MeshStandardMaterial({
        color: whiteColor,
        map: picture2,
        ...(number === pages.length - 1
          ? {
            roughnessMap: pictureRoughness,
          }
          : {
            roughness: 0.1,
          }),
        emissive: emissiveColor,
        emissiveIntensity: 0,
      }),
    ];
    const mesh = new SkinnedMesh(geometry, materials);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.frustumCulled = false;
    mesh.add(skeleton.bones[0]);
    mesh.bind(skeleton);
    return mesh;
  }, [picture, picture2, pictureRoughness, pageType]);

  // useHelper(skinnedMeshRef, SkeletonHelper, "red");

  useFrame((_, delta) => {
    if (!skinnedMeshRef.current) {
      return;
    }

    // Update emissive intensity for highlighting (skip for fillers)
    if (pageType !== "filler" && skinnedMeshRef.current.material[4] && skinnedMeshRef.current.material[5]) {
      const emissiveIntensity = highlighted ? 0.22 : 0;
      skinnedMeshRef.current.material[4].emissiveIntensity =
        skinnedMeshRef.current.material[5].emissiveIntensity = MathUtils.lerp(
          skinnedMeshRef.current.material[4].emissiveIntensity,
          emissiveIntensity,
          0.1
        );
    }

    if (lastOpened.current !== opened) {
      turnedAt.current = +new Date();
      lastOpened.current = opened;
    }
    let turningTime = Math.min(400, new Date() - turnedAt.current) / 400;
    turningTime = Math.sin(turningTime * Math.PI);

    let targetRotation = opened ? -Math.PI / 2 : Math.PI / 2;
    if (!bookClosed) {
      targetRotation += degToRad(number * 0.8);
    }

    // Skip deformation for filler pages - they just rotate as a solid block
    if (pageType === "filler") {
      const target = group.current;
      easing.dampAngle(
        target.rotation,
        "y",
        bookClosed ? targetRotation : targetRotation,
        easingFactor,
        delta
      );
      return;
    }

    const bones = skinnedMeshRef.current.skeleton.bones;

    for (let i = 0; i < bones.length; i++) {
      const target = i === 0 ? group.current : bones[i];

      // Covers should only rotate at root, no curving
      if (pageType === "cover") {
        if (i === 0) {
          easing.dampAngle(
            target.rotation,
            "y",
            targetRotation,
            easingFactor,
            delta
          );
        }
        continue;
      }

      // Content pages get full deformation
      const insideCurveIntensity = i < 8 ? Math.sin(i * 0.2 + 0.25) : 0;
      const outsideCurveIntensity = i >= 8 ? Math.cos(i * 0.3 + 0.09) : 0;
      const turningIntensity =
        Math.sin(i * Math.PI * (1 / bones.length)) * turningTime;
      let rotationAngle =
        insideCurveStrength * insideCurveIntensity * targetRotation -
        outsideCurveStrength * outsideCurveIntensity * targetRotation +
        turningCurveStrength * turningIntensity * targetRotation;
      let foldRotationAngle = degToRad(Math.sign(targetRotation) * 2);
      if (bookClosed) {
        if (i === 0) {
          rotationAngle = targetRotation;
          foldRotationAngle = 0;
        } else {
          rotationAngle = 0;
          foldRotationAngle = 0;
        }
      }
      easing.dampAngle(
        target.rotation,
        "y",
        rotationAngle,
        easingFactor,
        delta
      );

      const foldIntensity =
        i > 8
          ? Math.sin(i * Math.PI * (1 / bones.length) - 0.5) * turningTime
          : 0;
      easing.dampAngle(
        target.rotation,
        "x",
        foldRotationAngle * foldIntensity,
        easingFactorFold,
        delta
      );
    }
  });

  const [_, setPage] = useAtom(pageAtom);
  const [highlighted, setHighlighted] = useState(false);
  useCursor(highlighted);

  return (
    <group
      {...props}
      ref={group}
      onPointerEnter={(e) => {
        e.stopPropagation();
        setHighlighted(true);
      }}
      onPointerLeave={(e) => {
        e.stopPropagation();
        setHighlighted(false);
      }}
      onClick={(e) => {
        e.stopPropagation();
        setPage(opened ? number : number + 1);
        setHighlighted(false);
      }}
    >
      <primitive
        object={manualSkinnedMesh}
        ref={skinnedMeshRef}
      />
    </group>
  );
};

export const Book = ({ ...props }) => {
  const [page] = useAtom(pageAtom);
  const [delayedPage, setDelayedPage] = useState(page);

  useEffect(() => {
    let timeout;
    const goToPage = () => {
      setDelayedPage((delayedPage) => {
        if (page === delayedPage) {
          return delayedPage;
        } else {
          timeout = setTimeout(
            () => {
              goToPage();
            },
            Math.abs(page - delayedPage) > 2 ? 50 : 150
          );
          if (page > delayedPage) {
            return delayedPage + 1;
          }
          if (page < delayedPage) {
            return delayedPage - 1;
          }
        }
      });
    };
    goToPage();
    return () => {
      clearTimeout(timeout);
    };
  }, [page]);

  // Build book structure with proper types and z-positions
  const bookStructure = useMemo(() => {
    const structure = [];
    let currentZ = 0;

    // Front Cover (index 0)
    structure.push({
      ...pages[0],
      pageType: "cover",
      zPosition: currentZ,
      originalIndex: 0,
    });
    currentZ -= COVER_DEPTH;

    // Front Filler
    structure.push({
      front: "filler",
      back: "filler",
      pageType: "filler",
      zPosition: currentZ,
      originalIndex: -1, // Not clickable
    });
    currentZ -= FILLER_DEPTH;

    // Interior content pages (all pages except first and last)
    for (let i = 1; i < pages.length - 1; i++) {
      structure.push({
        ...pages[i],
        pageType: "content",
        zPosition: currentZ,
        originalIndex: i,
      });
      currentZ -= PAGE_DEPTH;
    }

    // Back Filler
    structure.push({
      front: "filler",
      back: "filler",
      pageType: "filler",
      zPosition: currentZ,
      originalIndex: -1, // Not clickable
    });
    currentZ -= FILLER_DEPTH;

    // Back Cover (last page)
    structure.push({
      ...pages[pages.length - 1],
      pageType: "cover",
      zPosition: currentZ,
      originalIndex: pages.length - 1,
    });

    return structure;
  }, []);

  return (
    <group {...props} rotation-y={-Math.PI / 2}>
      {bookStructure.map((pageData, index) => (
        <Page
          key={index}
          page={delayedPage}
          number={pageData.originalIndex >= 0 ? pageData.originalIndex : index}
          opened={delayedPage > pageData.originalIndex}
          bookClosed={delayedPage === 0 || delayedPage === pages.length}
          pageType={pageData.pageType}
          front={pageData.front}
          back={pageData.back}
          position-z={pageData.zPosition}
        />
      ))}
    </group>
  );
};