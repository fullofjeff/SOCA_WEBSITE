// Card.jsx - Mouse-Reactive Implementation (fixed flip + hinge, no internal angled wrapper)
import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef } from 'react';
import { a, useSpring, to } from '@react-spring/three';
import { useTexture } from '@react-three/drei';
import * as THREE from "three";

/**
 * @typedef {Object} MouseSpringConfig
 * @property {number} [tension]  // 100–500 (default: 180)
 * @property {number} [friction] // 10–50   (default: 18)
 * @property {number} [mass]     // 0.5–5   (default: 1)
 */

/* ---------- helpers ---------- */
function roundedRectShape(w, h, r) {
  const s = new THREE.Shape();
  const x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r);
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h);
  s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r);
  s.quadraticCurveTo(x, y, x + r, y);
  return s;
}

function makeRoundedFaceGeometry(w, h, r, segments = 64) {
  const shape = roundedRectShape(w, h, r);
  const g = new THREE.ShapeGeometry(shape, segments);
  g.computeBoundingBox();
  const { min, max } = g.boundingBox;
  const dx = (max.x - min.x) || 1, dy = (max.y - min.y) || 1;
  const p = g.attributes.position, uv = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i++) {
    uv[2*i]   = (p.getX(i) - min.x) / dx;
    uv[2*i+1] = (p.getY(i) - min.y) / dy;
  }
  g.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  return g;
}

function useCardTextures(frontSrc, backSrc) {
  const [front, back] = useTexture([frontSrc, backSrc]);
  [front, back].forEach(t => {
    if (!t) return;
    t.colorSpace = THREE.SRGBColorSpace;
    t.flipY = false;
    t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
    t.repeat.set(1, -1);
    t.offset.set(0,0);
    t.center.set(0.5,0.5);
    t.anisotropy = 8;
  });
  return { front, back };
}

/**
 * @param {Object} props
 * @param {boolean} props.flipped
 * @param {any} props.rotation          // <- spring: [0, π, 0] when flipped
 * @param {any} props.position          // <- spring: [0.3, 0, 0] when flipped (legacy)
 * @param {any} props.idleRotation
 * @param {boolean} props.showVideo
 * @param {Function} props.onToggle
 * @param {MouseSpringConfig} [props.mouseSpringConfig]
 * @param {string} [props.frontSrc]
 * @param {string} [props.backSrc]
 * @param {string} [props.videoSrc]
 * @param {React.MutableRefObject<HTMLVideoElement>} [props.videoRef]
 */
const Card = forwardRef(function Card({
  flipped,
  rotation,
  position,
  idleRotation,
  showVideo,
  onToggle,
  mouseSpringConfig,
  frontSrc = "/textures/O2_FINAL.png",
  backSrc = "/textures/BOSS_BACK.png",
  videoSrc = "/video/boss_flip_no_audio.mp4",
  videoRef,
  children
}, ref) {
  // Optional flag
  const mouseEnabled = true;

  // Geometry constants used both for geometry and hinge
  const w = 1.25, h = 1.75, d = 0.008, r = 0.07;
  const hingeX = w / 2; // right-edge hinge

  // Mouse spring (scalar components)
  const springCfg = useMemo(() => ({
    mass: 1, tension: 180, friction: 18,
    ...(mouseSpringConfig || {})
  }), [mouseSpringConfig]);

  const [{ mouseRx, mouseRy, mousePx, mousePy }, mouseApi] = useSpring(() => ({
    mouseRx: 0, mouseRy: 0, mousePx: 0, mousePy: 0,
    config: springCfg
  }), [springCfg]);

  // RAF throttle
  const rafId = useRef(0);
  const latest = useRef({ mouseRx: 0, mouseRy: 0, mousePx: 0, mousePy: 0 });

  const schedule = useCallback(() => {
    if (rafId.current) return;
    rafId.current = requestAnimationFrame(() => {
      rafId.current = 0;
      mouseApi.start(latest.current);
    });
  }, [mouseApi]);

  useImperativeHandle(ref, () => ({
    handlePointer(xNorm, yNorm, strength = 1) {
      // Attenuate mouse when flipped if desired; set to 0 to freeze when flipped
      const maxRot = flipped ? 0 : 0.2;
      const maxPos = flipped ? 0 : 0.08;
      latest.current = {
        mouseRx: yNorm * maxRot * strength,
        mouseRy: xNorm * maxRot * strength,
        mousePx: xNorm * maxPos * strength,
        mousePy: yNorm * maxPos * strength
      };
      if (mouseEnabled) schedule();
    }
  }), [flipped, mouseEnabled, schedule]);

  useEffect(() => () => {
    if (rafId.current) {
      cancelAnimationFrame(rafId.current);
      rafId.current = 0;
    }
  }, []);

  return (
    // 1) Slide/position (legacy: [0.3,0,0] when flipped)
    <a.group position={position}>
      {/* 2) RIGHT-EDGE HINGE + SPRING ROTATION (root cause fix): use `rotation` prop */}
      <a.group position={[hingeX, 0, 0]} rotation={rotation}
               onClick={(e) => { e.stopPropagation(); onToggle?.(); }}>
        {/* 3) Translate back so subsequent transforms are around the card center */}
        <group position={[-hingeX, 0, 0]}>
          {/* 4) Mouse layer (center-based) */}
          {mouseEnabled ? (
            <a.group
              position={to([mousePx, mousePy], (x, y) => [x, y, 0])}
              rotation={to([mouseRx, mouseRy], (x, y) => [x, y, 0])}
            >
              {/* 5) Idle wiggle (neutral when flipped if you pass [0,0,0]) */}
              <a.group rotation={idleRotation ?? [0, 0, 0]}>
                <CardMeshes
                  showVideo={showVideo}
                  frontSrc={frontSrc}
                  backSrc={backSrc}
                  videoSrc={videoSrc}
                  videoRef={videoRef}
                  w={w} h={h} d={d} r={r}
                />
                {children}
              </a.group>
            </a.group>
          ) : (
            <a.group rotation={idleRotation ?? [0, 0, 0]}>
              <CardMeshes
                showVideo={showVideo}
                frontSrc={frontSrc}
                backSrc={backSrc}
                videoSrc={videoSrc}
                videoRef={videoRef}
                w={w} h={h} d={d} r={r}
              />
              {children}
            </a.group>
          )}
        </group>
      </a.group>
    </a.group>
  );
});

function CardMeshes({ showVideo, frontSrc, backSrc, videoSrc, videoRef, w, h, d, r }) {
  const { front, back } = useCardTextures(frontSrc, backSrc);

  // Video texture
  const videoTexture = useMemo(() => {
    const video = document.createElement('video');
    video.src = videoSrc;
    video.loop = false;
    video.muted = true;
    video.playsInline = true;
    video.autoplay = true;
    video.crossOrigin = 'anonymous';
    video.preload = 'auto';
    if (videoRef) videoRef.current = video;

    const tex = new THREE.VideoTexture(video);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.flipY = false;
    tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.repeat.set(1, -1);
    tex.center.set(0.5, 0.5);
    return tex;
  }, [videoSrc, videoRef]);

  // Geometries
  const { bodyGeom, faceGeom } = useMemo(() => {
    const shape = roundedRectShape(w, h, r);
    const body  = new THREE.ExtrudeGeometry(shape, { depth: d, bevelEnabled: false, steps: 1, curveSegments: 64 });
    body.translate(0, 0, -d/2); // center thickness
    const face  = makeRoundedFaceGeometry(w, h, r, 64);
    return { bodyGeom: body, faceGeom: face };
  }, [w, h, r, d]);

  const eps = 0.002, faceScale = 1.003;

  const faceMat = (map) => new THREE.MeshStandardMaterial({
    map,
    roughness: 0.95,
    metalness: 0,
    side: THREE.DoubleSide,
    transparent: true,
    alphaTest: 0.001,
    polygonOffset: true,
    polygonOffsetFactor: -2
  });

  // Faces only — no transforms here (hinge/flip handled in parent groups)
  return (
    <group>
      {/* sealed solid sides */}
      <mesh geometry={bodyGeom}>
        <meshStandardMaterial color="#97876A" roughness={0.92} />
      </mesh>

      {/* FRONT face */}
      <mesh geometry={faceGeom} position={[0, 0,  d/2 + eps]} rotation={[0, 0, 0]} scale={[faceScale, faceScale, 1]}>
        <primitive object={faceMat(front)} />
      </mesh>

      {/* BACK face — shows video when flipped */}
      <mesh geometry={faceGeom} position={[0, 0, -d/2 - eps]} rotation={[0, 0, 0]} scale={[-faceScale, faceScale, 1]}>
        <primitive object={faceMat(showVideo ? videoTexture : back)} />
      </mesh>
    </group>
  );
}

export default Card;