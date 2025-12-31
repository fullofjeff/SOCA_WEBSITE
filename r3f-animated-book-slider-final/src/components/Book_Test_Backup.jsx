import { useCursor, useTexture, Text } from "@react-three/drei";
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
  MeshStandardMaterial,
  Skeleton,
  SkinnedMesh,
  SRGBColorSpace,
  Uint16BufferAttribute,
  Vector3,
  Euler,
} from "three";
import { degToRad } from "three/src/math/MathUtils.js";
import { pageAtom, pages } from "./UI";

const easingFactor = 0.5;
const easingFactorFold = 0.3;
const insideCurveStrength = 0.18;
const outsideCurveStrength = 0.05;

const FAKE_PAGE_COUNT = 16;
const COVER_THICKNESS_MULT = 6;
const BASE_THICKNESS_MULT = 1;

const COVER_STIFFNESS_SCALE = 0.15;
const BASE_STIFFNESS_SCALE = 1.0;

const PAGE_WIDTH = 1.28;
const PAGE_HEIGHT = 1.71;
const PAGE_DEPTH = 0.003;
const PAGE_SEGMENTS = 30;
const SEGMENT_WIDTH = PAGE_WIDTH / PAGE_SEGMENTS;
const Z_EPS = PAGE_DEPTH * 0.5;

/**
 * BookRig
 * Simple kinematic wrapper with gravity, bounce, and spin.
 *
 * Props:
 *  - fall: boolean (start/stop the fall)
 *  - onRest?: () => void
 *  - initialPosition?: [x,y,z]
 *  - initialRotation?: [rx,ry,rz] in radians
 *  - groundY?: number (default 0)
 *  - restitution?: number 0..1 (bounce, default 0.28)
 *  - friction?: number 0..1 (ground slide damping, default 0.85)
 *  - linDrag?: number 0..1 (air drag per second, default 0.15)
 *  - angDrag?: number 0..1 (angular drag per second, default 0.2)
 *  - impulse?: { v: [vx,vy,vz], w: [wx,wy,wz] }  // initial push
 */
export function BookRig({
  fall,
  children,
  onRest,
  initialPosition = [0, 1.2, 0],      // up on a shelf
  initialRotation = [0, 0, 0],
  groundY = 0,
  restitution = 0.28,
  friction = 0.85,
  linDrag = 0.15,
  angDrag = 0.2,
  impulse = { v: [0.6, 1.2, -0.3], w: [0.0, 3.0, 0.0] }, // shove + spin
}) {
  const g = useRef();
  const pos = useRef(new Vector3(...initialPosition));
  const rot = useRef(new Euler(...initialRotation, "YXZ"));
  const vel = useRef(new Vector3(0, 0, 0));
  const w   = useRef(new Vector3(0, 0, 0)); // angular velocity (rad/s)
  const GRAV = -9.8;                        // world units per second^2
  const REST_EPS = 0.02;                    // rest threshold

  // start/stop
  useEffect(() => {
    if (fall) {
      pos.current.set(...initialPosition);
      rot.current.set(...initialRotation);
      vel.current.set(...impulse.v);
      w.current.set(...impulse.w);
    } else {
      // if you toggle false, freeze at current state
      vel.current.set(0, 0, 0);
      w.current.set(0, 0, 0);
    }
  }, [fall]);

  useFrame((_state, dt) => {
    if (!g.current) return;

    // cap dt for stability
    const h = Math.min(dt, 1 / 30);

    if (fall) {
      // integrate
      vel.current.y += GRAV * h;

      // linear air drag
      vel.current.multiplyScalar(1 - linDrag * h);

      // update position
      pos.current.addScaledVector(vel.current, h);

      // ground collision (simple plane at groundY)
      if (pos.current.y <= groundY) {
        pos.current.y = groundY;
        // bounce on Y, apply friction on XZ
        vel.current.y *= -restitution;
        vel.current.x *= friction;
        vel.current.z *= friction;

        // add a little angular kick from impact if moving
        const speed = Math.hypot(vel.current.x, vel.current.z);
        if (speed > 0.01) {
          w.current.x += (vel.current.z > 0 ? -1 : 1) * speed * 0.05;
          w.current.z += (vel.current.x > 0 ?  1 : -1) * speed * 0.05;
        }
      }

      // angular drag + integrate
      w.current.multiplyScalar(1 - angDrag * h);
      rot.current.y += w.current.y * h;
      rot.current.x += w.current.x * h;
      rot.current.z += w.current.z * h;

      // settle detection
      if (
        Math.abs(vel.current.x) < REST_EPS &&
        Math.abs(vel.current.y) < REST_EPS &&
        Math.abs(vel.current.z) < REST_EPS &&
        Math.abs(w.current.x)   < REST_EPS &&
        Math.abs(w.current.y)   < REST_EPS &&
        Math.abs(w.current.z)   < REST_EPS &&
        pos.current.y === groundY
      ) {
        vel.current.set(0, 0, 0);
        w.current.set(0, 0, 0);
        onRest?.();
      }
    }

    // write transform
    const obj = g.current;
    obj.position.copy(pos.current);
    // Euler -> rotation: copy directly (no toVector3)
    obj.rotation.copy(rot.current);
  });

  return <group ref={g}>{children}</group>;
}

const pageGeometry = new BoxGeometry(PAGE_WIDTH, PAGE_HEIGHT, PAGE_DEPTH, PAGE_SEGMENTS, 2);
pageGeometry.translate(PAGE_WIDTH / 2, 0, 0);

const position = pageGeometry.attributes.position;
const vertex = new Vector3();
const skinIndexes = [];
const skinWeights = [];
for (let i = 0; i < position.count; i++) {
  vertex.fromBufferAttribute(position, i);
  const x = vertex.x;
  const skinIndex = Math.max(0, Math.floor(x / SEGMENT_WIDTH));
  let skinWeight = (x % SEGMENT_WIDTH) / SEGMENT_WIDTH;
  skinIndexes.push(skinIndex, skinIndex + 1, 0, 0);
  skinWeights.push(1 - skinWeight, skinWeight, 0, 0);
}
pageGeometry.setAttribute("skinIndex", new Uint16BufferAttribute(skinIndexes, 4));
pageGeometry.setAttribute("skinWeight", new Float32BufferAttribute(skinWeights, 4));

const coverGeometry = new BoxGeometry(PAGE_WIDTH, PAGE_HEIGHT, PAGE_DEPTH * COVER_THICKNESS_MULT, PAGE_SEGMENTS, 2);
coverGeometry.translate(PAGE_WIDTH / 2, 0, 0);

const coverPosition = coverGeometry.attributes.position;
const coverVertex = new Vector3();
const coverSkinIndexes = [];
const coverSkinWeights = [];
for (let i = 0; i < coverPosition.count; i++) {
  coverVertex.fromBufferAttribute(coverPosition, i);
  const x = coverVertex.x;
  const skinIndex = Math.max(0, Math.floor(x / SEGMENT_WIDTH));
  let skinWeight = (x % SEGMENT_WIDTH) / SEGMENT_WIDTH;
  coverSkinIndexes.push(skinIndex, skinIndex + 1, 0, 0);
  coverSkinWeights.push(1 - skinWeight, skinWeight, 0, 0);
}
coverGeometry.setAttribute("skinIndex", new Uint16BufferAttribute(coverSkinIndexes, 4));
coverGeometry.setAttribute("skinWeight", new Float32BufferAttribute(coverSkinWeights, 4));

const whiteColor = new Color("white");
const emissiveColor = new Color("orange");

const edgePaperMat = new MeshStandardMaterial({ color: "#d8d1c5", roughness: 0.9, metalness: 0.0 });
const edgeCoverMat = new MeshStandardMaterial({ color: "#4a3b2b", roughness: 0.8, metalness: 0.05 });

function coverMat({ map, roughnessMap }) {
  const opts = {
    color: whiteColor,
    map,
    roughness: 0.8,
    metalness: 0.1,
    emissive: emissiveColor,
    emissiveIntensity: 0,
  };
  // Only add roughnessMap if present
  if (roughnessMap) opts.roughnessMap = roughnessMap;
  return new MeshStandardMaterial(opts);
}

function innerPageMat(map) {
  return new MeshStandardMaterial({
    color: whiteColor,
    map,
    roughness: 0.1,
    metalness: 0.0,
    emissive: emissiveColor,
    emissiveIntensity: 0,
  });
}

// --- helpers: treat index 0 as BACK cover, last as FRONT cover
const isBackCover = (i) => i === 0;
const isFrontCover = (i, count) => i === count - 1;
const isCover = (index, count) => isBackCover(index) || isFrontCover(index, count);

// When the book is CLOSED: back cover left; everyone else right
function closedSide(index, count) {
  return isBackCover(index) ? "left" : "right";
}

// When the book is OPEN: split around the middle; back+first half left, second half+front right
function openSide(index, count) {
  const mid = Math.floor(count / 2);
  return index <= mid ? "left" : "right";
}

// Which side should a sheet live on right now?
function currentSide(index, count, open) {
  return open ? openSide(index, count) : closedSide(index, count);
}

function getThicknessMultiplier(index, count) { return isCover(index, count) ? COVER_THICKNESS_MULT : BASE_THICKNESS_MULT; }
function getStiffnessScale(index, count) { return isCover(index, count) ? COVER_STIFFNESS_SCALE : BASE_STIFFNESS_SCALE; }

function sheetThickness(i, count) { return PAGE_DEPTH * getThicknessMultiplier(i, count); }
function totalBookThickness(count) {
  let t = 0;
  for (let i = 0; i < count; i++) t += sheetThickness(i, count) + Z_EPS;
  return t;
}
function cumulativeBefore(index, count) {
  let t = 0;
  for (let i = 0; i < index; i++) t += sheetThickness(i, count) + Z_EPS;
  return t;
}
function calculatePageZPosition(index, count) {
  const T = totalBookThickness(count);
  return -T / 2 + cumulativeBefore(index, count) + sheetThickness(index, count) / 2;
}

const Spine = ({ totalCount, title }) => {
  const T = useMemo(() => totalBookThickness(totalCount), [totalCount]);
  return (
    <>
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[PAGE_DEPTH * 2, PAGE_HEIGHT, T]} />
        <meshStandardMaterial color="#3a2f25" roughness={0.9} metalness={0.05} />
      </mesh>
      {title && (
        <Text position={[-PAGE_DEPTH - 0.001, 0, 0]} rotation={[0, Math.PI / 2, Math.PI / 2]} fontSize={0.08} color="#8B7355" anchorX="center" anchorY="middle">{title}</Text>
      )}
    </>
  );
};

const Page = ({ number, front, back, open, totalCount, stiffnessScale, ...props }) => {
  const [picture, picture2, pictureRoughness] = useTexture([
    `/textures/${front}.jpg`,
    `/textures/${back}.jpg`,
    ...(isCover(number, totalCount) ? [`/textures/book-cover-roughness.jpg`] : []),
  ]);
  picture.colorSpace = picture2.colorSpace = SRGBColorSpace;

  const group = useRef();
  const turnedAt = useRef(0);
  const lastOpened = useRef(open);
  const skinnedMeshRef = useRef();

  const materialsMemo = useMemo(() => {
    const cover = isBackCover(number) || isFrontCover(number, totalCount);
    const edgeMat = cover ? edgeCoverMat : edgePaperMat;

    const frontCoverMat = new MeshStandardMaterial({
      color: whiteColor, map: picture, roughness: 0.8, metalness: 0.1,
      emissive: emissiveColor, emissiveIntensity: 0,
      ...(pictureRoughness ? { roughnessMap: pictureRoughness } : {})
    });
    const backCoverMat = new MeshStandardMaterial({
      color: whiteColor, map: picture2, roughness: 0.8, metalness: 0.1,
      emissive: emissiveColor, emissiveIntensity: 0,
      ...(pictureRoughness ? { roughnessMap: pictureRoughness } : {})
    });

    const innerFront = new MeshStandardMaterial({ color: whiteColor, map: picture, roughness: 0.1, metalness: 0.0, emissive: emissiveColor, emissiveIntensity: 0 });
    const innerBack = new MeshStandardMaterial({ color: whiteColor, map: picture2, roughness: 0.1, metalness: 0.0, emissive: emissiveColor, emissiveIntensity: 0 });

    return [
      edgeMat, edgeMat, edgeMat, edgeMat,
      isFrontCover(number, totalCount) ? frontCoverMat : innerFront, // +Z face
      isBackCover(number) ? backCoverMat : innerBack,  // -Z face
    ];
  }, [number, totalCount, picture, picture2, pictureRoughness]);

  const manualSkinnedMesh = useMemo(() => {
    const bones = [];
    for (let i = 0; i <= PAGE_SEGMENTS; i++) {
      const bone = new Bone();
      bone.rotation.order = "YXZ";
      bones.push(bone);
      bone.position.x = i === 0 ? 0 : SEGMENT_WIDTH;
      if (i > 0) bones[i - 1].add(bone);
    }
    const skeleton = new Skeleton(bones);
    const geometry = isCover(number, totalCount) ? coverGeometry : pageGeometry;
    const mesh = new SkinnedMesh(geometry, materialsMemo);
    mesh.castShadow = !isCover(number, totalCount);
    mesh.receiveShadow = true;
    mesh.frustumCulled = false;
    mesh.add(skeleton.bones[0]);
    mesh.bind(skeleton);
    return mesh;
  }, [materialsMemo, number, totalCount]);

  const [highlighted, setHighlighted] = useState(false);
  useCursor(highlighted);

  useFrame((_, delta) => {
    if (!skinnedMeshRef.current) return;
    const bones = skinnedMeshRef.current.skeleton.bones;

    if (lastOpened.current !== open) {
      turnedAt.current = +new Date();
      lastOpened.current = open;
    }

    // side = left(+π/2) or right(−π/2)
    const side = currentSide(number, totalCount, open);
    let targetRotation = side === "left" ? Math.PI / 2 : -Math.PI / 2;

    // inner pages keep a tiny buffer so they never clip the covers
    if (!isBackCover(number) && !isFrontCover(number, totalCount)) {
      const CLOSE_BUF = degToRad(3);
      if (side === "left") targetRotation = Math.min(targetRotation, Math.PI / 2 - CLOSE_BUF);
      else targetRotation = Math.max(targetRotation, -Math.PI / 2 + CLOSE_BUF);
    }

    // drive bones: bone[0] = hinge Y, others add bend/fold
    easing.dampAngle(bones[0].rotation, "y", targetRotation * stiffnessScale, easingFactor, delta);

    for (let i = 1; i < bones.length; i++) {
      const b = bones[i];
      const t = i / (bones.length - 1);
      const foldMask = Math.max(0, (t - 0.25)) / 0.75;
      const turningTime = Math.sin(Math.min(1, (new Date() - turnedAt.current) / 400) * Math.PI);
      const foldX = degToRad(Math.sign(targetRotation) * 2) * stiffnessScale * foldMask * turningTime;
      easing.dampAngle(b.rotation, "x", foldX, easingFactorFold, delta);

      const bendY = (insideCurveStrength - outsideCurveStrength) * stiffnessScale * Math.sin(t * Math.PI) * targetRotation * 0.08;
      easing.dampAngle(b.rotation, "y", bendY, easingFactor, delta);
    }

    if (isCover(number, totalCount)) {
      for (let i = 1; i < bones.length; i++) easing.dampAngle(bones[i].rotation, "x", 0, 0.2, delta);
    }
  });

  return (
    <group {...props} ref={group} onPointerEnter={(e) => { e.stopPropagation(); setHighlighted(true); }} onPointerLeave={(e) => { e.stopPropagation(); setHighlighted(false); }}>
      <primitive object={manualSkinnedMesh} ref={skinnedMeshRef} position-z={calculatePageZPosition(number, totalCount)} />
    </group>
  );
};

export const Book = ({ title, ...props }) => {
  const [open, setOpen] = useState(false); // closed by default
  const visibleCount = Math.min(FAKE_PAGE_COUNT, pages.length);

  return (
    <group
      {...props}
      rotation-y={-Math.PI / 2}
      // click anywhere on the book to toggle open/close
      onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}
    >
      <Spine totalCount={visibleCount} title={title} />
      {pages.slice(0, visibleCount).map((pageData, index) => (
        <Page
          key={index}
          number={index}
          totalCount={visibleCount}
          open={open} // <-- pass boolean
          stiffnessScale={getStiffnessScale(index, visibleCount)}
          {...pageData}
        />
      ))}
    </group>
  );
};

// Example usage with BookRig wrapper:
// <BookRig
//   fall={true}
//   initialPosition={[0.4, 1.4, -0.2]}
//   initialRotation={[0, Math.PI * 0.1, 0]}
//   groundY={0}
//   restitution={0.25}
//   friction={0.8}
//   impulse={{ v: [0.7, 1.4, -0.4], w: [0.2, 3.2, 0.1] }}
// >
//   <Book title="Codex" position={[0, 0, 0]} />
// </BookRig>