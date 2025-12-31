
⸻

Mouse-Reactive 3D Card — Deployment & Integration Guide (Master)

What You’re Shipping
	•	A pure 3D mouse/touch reactive layer in React-Three-Fiber.
	•	Uses React Spring scalar springs + to(...) to compose vec3s (no arrays of springs in props).
	•	Keeps your existing flip (rotation), slide (position), idle wiggle, video, password, and click handlers.
	•	Imperative + RAF updates (no per-pixel React state churn).
	•	Feature-flag-ready rollout control.
	•	Accessible: honors prefers-reduced-motion.

⸻

Architecture

Unchanged (prop-driven)
	•	position: existing animated slide.
	•	rotation: existing animated flip.
	•	idleRotation: existing wiggle (vec3 or scalar).
	•	If scalar, wrap to vec3:

const idleRotation = to([idle], r => [0, r, 0]);


	•	showVideo, onToggle, … (existing UI/handlers).

Added (mouse layer, internal to Card)
	•	Local spring: { mouseRx, mouseRy, mousePx, mousePy }.
	•	Imperative API: ref.handlePointer(xNorm, yNorm, strength?).
	•	Layered groups (compose, don’t sum):

<position> → <rotation> → <mouse> → <idle> → <meshes>


⸻

LandingPage.jsx (Pointer Model + Dynamic Reduced-Motion)

// LandingPage.jsx
import { Canvas } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import Card from './Card';

export default function LandingPage({
  flipped,            // boolean: source of truth for flip
  rotation,           // a.vec3 or to([...]) rotation spring (flip)
  position,           // a.vec3 position spring (slide)
  idleRotation,       // vec3 or scalar (wrap scalar to vec3)
  showVideo,
  onToggle,           // mesh click handler to flip
  mouseSpringConfig,  // optional: { tension, friction, mass }
}) {
  const cardRef = useRef(null);

  // Dynamic prefers-reduced-motion (live)
  const [reducedMotion, setReducedMotion] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (!mq) return;
    const set = () => setReducedMotion(!!mq.matches);
    set();
    mq.addEventListener?.('change', set);
    return () => mq.removeEventListener?.('change', set);
  }, []);

  // Touch press/drag model
  const [isPressed, setIsPressed] = useState(false);

  const handlePointerDown = useCallback((e) => {
    if (e.pointerType === 'touch') setIsPressed(true);
  }, []);
  const handlePointerUp = useCallback((e) => {
    if (e.pointerType === 'touch') setIsPressed(false);
  }, []);
  const handlePointerCancel = useCallback((e) => {
    if (e.pointerType === 'touch') setIsPressed(false);
    if (!flipped) cardRef.current?.handlePointer(0, 0, 1);
  }, [flipped]);

  // Ease back unless flipped
  const handlePointerLeave = useCallback(() => {
    setIsPressed(false);
    if (!flipped) cardRef.current?.handlePointer(0, 0, 1);
  }, [flipped]);

  const handlePointerMove = useCallback((e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
    const isTouch = e.pointerType === 'touch';

    // Touch requires press/drag; Desktop reacts on hover
    if (isTouch && !isPressed) return;

    const strength = reducedMotion ? 0 : (isTouch ? 0.35 : 1);
    cardRef.current?.handlePointer(x, y, strength);
  }, [isPressed, reducedMotion]);

  return (
    <Canvas
      className="absolute inset-0 z-10"
      camera={{ position: [0, 0, 5], fov: 45 }}
      dpr={[1, 1.75]}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      style={{ touchAction: 'none' }} // improves mobile interaction
    >
      {/* lights / env … */}
      <Card
        ref={cardRef}
        flipped={flipped}
        rotation={rotation}
        position={position}
        idleRotation={idleRotation}
        showVideo={showVideo}
        onToggle={onToggle}
        mouseSpringConfig={mouseSpringConfig}
      />
    </Canvas>
  );
}


⸻

Card.jsx (Mouse Spring + RAF Throttle + Cleanup + Feature Flag)

// Card.jsx
import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef } from 'react';
import { a, useSpring, to } from '@react-spring/three';
// import { useFeatureFlag } from '@/lib/flags'; // optional feature flag hook

/**
 * @typedef {Object} MouseSpringConfig
 * @property {number} [tension]  // 100–500 (default: 180)
 * @property {number} [friction] // 10–50   (default: 18)
 * @property {number} [mass]     // 0.5–5   (default: 1)
 */

/**
 * @param {Object} props
 * @param {boolean} props.flipped
 * @param {any} props.rotation
 * @param {any} props.position
 * @param {any} props.idleRotation
 * @param {boolean} props.showVideo
 * @param {Function} props.onToggle
 * @param {MouseSpringConfig} [props.mouseSpringConfig]
 */
const Card = forwardRef(function Card({
  flipped,
  rotation,
  position,
  idleRotation,
  showVideo,
  onToggle,
  mouseSpringConfig
}, ref) {
  // Optional feature flag (default enabled if no hook)
  // const mouseEnabled = useFeatureFlag?.('card-mouse-fx') ?? true;
  const mouseEnabled = true;

  // Memoized spring config
  const springCfg = useMemo(() => ({
    mass: 1, tension: 180, friction: 18,
    ...(mouseSpringConfig || {})
  }), [mouseSpringConfig]);

  // Mouse offsets as scalar springs
  const [{ mouseRx, mouseRy, mousePx, mousePy }, mouseApi] = useSpring(() => ({
    mouseRx: 0, mouseRy: 0, mousePx: 0, mousePy: 0,
    config: springCfg
  }), [springCfg]);

  // RAF throttle (one update per frame)
  const rafId = useRef(0);
  const latest = useRef({ mouseRx: 0, mouseRy: 0, mousePx: 0, mousePy: 0 });

  const schedule = useCallback(() => {
    if (rafId.current) return;
    rafId.current = requestAnimationFrame(() => {
      rafId.current = 0;
      mouseApi.start(latest.current);
    });
  }, [mouseApi]);

  // Expose normalized-pointer entry point
  useImperativeHandle(ref, () => ({
    handlePointer(xNorm, yNorm, strength = 1) {
      const maxRot = flipped ? 0.03 : 0.12; // radians
      const maxPos = flipped ? 0.02 : 0.05; // world units
      latest.current = {
        mouseRx: yNorm * maxRot * strength,
        mouseRy: xNorm * maxRot * strength,
        mousePx: xNorm * maxPos * strength,
        mousePy: yNorm * maxPos * strength
      };
      if (mouseEnabled) schedule();
    }
  }), [flipped, mouseEnabled, schedule]);

  // RAF cleanup
  useEffect(() => () => {
    if (rafId.current) {
      cancelAnimationFrame(rafId.current);
      rafId.current = 0;
    }
  }, []);

  return (
    // 1) Position (slide)
    <a.group position={position}>
      {/* 2) Flip (rotation) */}
      <a.group rotation={rotation}>
        {/* 3) Mouse layer (feature-flag-ready) */}
        {mouseEnabled ? (
          <a.group
            position={to([mousePx, mousePy], (x, y) => [x, y, 0])}
            rotation={to([mouseRx, mouseRy], (x, y) => [x, y, 0])}
          >
            {/* 4) Idle (wiggle) */}
            <a.group rotation={idleRotation ?? [0, 0, 0]}>
              {/* 5) Meshes / materials / video / click */}
              <CardMeshes showVideo={showVideo} onToggle={onToggle} />
            </a.group>
          </a.group>
        ) : (
          <a.group rotation={idleRotation ?? [0, 0, 0]}>
            <CardMeshes showVideo={showVideo} onToggle={onToggle} />
          </a.group>
        )}
      </a.group>
    </a.group>
  );
});

function CardMeshes({ showVideo, onToggle }) {
  return (
    <group>
      {/* Your existing geometry/materials/video */}
      {/* Example clickable mesh: */}
      {/* <mesh onClick={onToggle}> ... </mesh> */}
    </group>
  );
}

export default Card;


⸻

Feature Flag Wrapper (Optional)

If you have a flag system, toggle the mouse layer without altering other animations:

// In Card.jsx (replace mouseEnabled line)
import { useFeatureFlag } from '@/lib/flags';
const mouseEnabled = useFeatureFlag?.('card-mouse-fx') ?? true;


⸻

Parent Usage Example (Memoized Config)

// App.jsx
import { useMemo } from 'react';
import LandingPage from './LandingPage';

export default function App() {
  const mouseConfig = useMemo(
    () => ({ tension: 220, friction: 20, mass: 1 }),
    []
  );

  return (
    <LandingPage
      mouseSpringConfig={mouseConfig}
      flipped={false}
      rotation={/* flip spring */}
      position={/* slide spring */}
      idleRotation={/* idle spring or to([idle], r=>[0,r,0]) */}
      showVideo
      onToggle={() => {}}
    />
  );
}


⸻

QA Checklist
	•	Composition: flip + mouse + idle compose correctly (no double-rotation/snapping).
	•	Desktop UX: hover moves; click flips; leave eases back (unless flipped).
	•	Mobile UX: press/drag required to move; lift stops; cancel/leave eases back (unless flipped).
	•	Clicks: mesh onClick still fires while onPointerMove is active (no stopPropagation in move).
	•	Reduced motion: toggling OS setting disables motion live.
	•	Profiler: during pointer move, 0 React re-renders and ≤ 1 RAF update per frame.
	•	RAF cleanup: unmount without console errors or lingering RAF tasks.
	•	Spring tuning: try { tension: 140, friction: 26 } and { tension: 240, friction: 16 }; confirm feel changes and stability.
	•	Performance: ≥55 FPS on mid-tier device; if not, reduce dpr, shadows, or mouse strength.

⸻

Config, Ranges & Versions

Spring config (JSDoc/TS):

/**
 * @param {Object} mouseSpringConfig
 * @param {number} [mouseSpringConfig.tension=180]  // 100–500
 * @param {number} [mouseSpringConfig.friction=18]  // 10–50
 * @param {number} [mouseSpringConfig.mass=1]       // 0.5–5
 */

export interface MouseSpringConfig {
  tension?: number;  // 100–500
  friction?: number; // 10–50
  mass?: number;     // 0.5–5
}

Assumptions: React 18+, @react-three/fiber v8+, @react-spring/three v9+.

⸻

Notes & Decisions
	•	Touch strength: default 0.35 (tunable).
	•	Flipped attenuation: lower maxRot/maxPos when flipped (0.03/0.02) for steadier feel.
	•	Pointerleave policy: ease back unless flipped (implemented in LandingPage).
	•	Freeze-on-lift (optional): if desired, stop at last pose on pointerup and recenter only on pointerleave.

