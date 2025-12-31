// MouseReactivePage.jsx - Following Mouse-Reactive Guide Exactly
import { Canvas } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useSpring, animated as a, to } from '@react-spring/three';
import { animated } from '@react-spring/web';
import { Html } from '@react-three/drei';
import Card from '../components/Card';
import CardParticles from '../components/CardParticles';

export default function MouseReactivePage() {
  const cardRef = useRef(null);
  
  // Card flip state management
  const [flipped, setFlipped] = useState(false);
  const [password, setPassword] = useState("");
  const [authed, setAuthed] = useState(false);
  const [showVideo, setShowVideo] = useState(false);
  const [isIncorrect, setIsIncorrect] = useState(false);
  const videoRef = useRef();

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

    // Pixel-based detection zone (centered on viewport)
    const viewportCenterX = rect.width / 2;
    const viewportCenterY = rect.height / 2;
    
    const detectionWidth = 1123;  // 561px on each side
    const detectionHeight = 674;  // 337px from top/bottom
    
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    // Check if mouse is within detection zone
    const leftBound = viewportCenterX - detectionWidth / 2;
    const rightBound = viewportCenterX + detectionWidth / 2;
    const topBound = viewportCenterY - detectionHeight / 2;
    const bottomBound = viewportCenterY + detectionHeight / 2;
    
    const isInZone = mouseX >= leftBound && mouseX <= rightBound && 
                     mouseY >= topBound && mouseY <= bottomBound;
    
    // Calculate strength based on distance from zone center
    let finalStrength = 0;
    if (isInZone) {
      const centerDistX = (mouseX - viewportCenterX) / (detectionWidth / 2);
      const centerDistY = (mouseY - viewportCenterY) / (detectionHeight / 2);
      const distanceFromCenter = Math.sqrt(centerDistX * centerDistX + centerDistY * centerDistY);
      
      // Strength from 1.0 at center to 0.2 at edges
      const proximityStrength = Math.max(0.2, 1 - distanceFromCenter);
      const baseStrength = reducedMotion ? 0 : (isTouch ? 0.35 : 1);
      finalStrength = baseStrength * proximityStrength;
    }
    
    cardRef.current?.handlePointer(x, y, finalStrength);
  }, [isPressed, reducedMotion]);

  // Memoized mouse spring config
  const mouseSpringConfig = useMemo(
    () => ({ tension: 180, friction: 18, mass: 1 }),
    []
  );

  // Flip rotation spring: front (0) → back (π) around Y
  const { rotation } = useSpring({
    rotation: flipped ? [0, Math.PI, 0] : [0, 0, 0],
    config: { mass: 1, tension: 140, friction: 30, clamp: true, precision: 0.0001 }
  });

  // Slide spring: center → legacy landing spot when flipped
  const { position, t } = useSpring({
    position: flipped ? [0.3, 0, 0] : [0, 0, 0], // match legacy landing spot
    t: flipped ? 1 : 0,
    config: { mass: 1, tension: 210, friction: 24 }
  });

  // Positioning rotation for angled look when not flipped
  const positioningRotation = useMemo(
    () => to([rotation], () => [
      0,
      flipped ? 0 : 0.2,
      flipped ? 0 : 0.0872665,
    ]),
    [flipped, rotation]
  );

  // Enhanced onToggle 
  const handleCardToggle = useCallback(() => {
    setFlipped(v => !v);
  }, []);

  // Complex multi-directional wiggle with varied patterns
  const idle = useSpring({
    from: { rx: 0, ry: 0, rz: 0 },
    to: async (next) => {
      if (flipped) {
        await next({ rx: 0, ry: 0, rz: 0 });
        return;
      }
      
      while (!flipped) {
        // Pattern 1: Top-right tilt
        await next({ rx: -0.03, ry: 0.12, rz: 0.02 });
        if (flipped) break;
        
        // Pattern 2: Bottom-left tilt  
        await next({ rx: 0.04, ry: -0.15, rz: -0.025 });
        if (flipped) break;
        
        // Pattern 3: Top-left tilt
        await next({ rx: -0.025, ry: -0.1, rz: 0.035 });
        if (flipped) break;
        
        // Pattern 4: Bottom-right tilt
        await next({ rx: 0.035, ry: 0.18, rz: -0.03 });
        if (flipped) break;
        
        // Pattern 5: Pure pitch forward
        await next({ rx: 0.05, ry: 0, rz: 0 });
        if (flipped) break;
        
        // Pattern 6: Pure pitch backward  
        await next({ rx: -0.04, ry: 0, rz: 0 });
        if (flipped) break;
      }
    },
    config: { tension: 18, friction: 12, mass: 0.8 }
  });

  // Convert idle spring to rotation format for Card component
  const idleRotation = to([idle.rx, idle.ry, idle.rz], (x, y, z) => [x, y, z]);

  // Password submission handler (copied from current implementation)
  const handleSubmit = (e) => {
    e.preventDefault();
    const v = (password || "").trim().toLowerCase();
    console.log('Form submitted with password:', v);
    
    if (v === "magic") {
      setAuthed(true);
      setIsIncorrect(false);
      console.log('Correct password "Magic" entered, starting 1 second delay...');
      setTimeout(() => {
        console.log('1 second passed, showing video');
        setShowVideo(true);
        if (videoRef.current) {
          videoRef.current.currentTime = 0;
          videoRef.current.play()
            .then(() => console.log('Video playing successfully'))
            .catch(e => console.error('Video play failed:', e));
        }
      }, 1000);
    } else if (v === "soca" || v === "enter") {
      setAuthed(true);
      setIsIncorrect(false);
    } else if (v.length > 0) {
      setIsIncorrect(true);
      setPassword("");
      setTimeout(() => setIsIncorrect(false), 2000);
    } else {
      setPassword("");
      setIsIncorrect(false);
    }
  };

  const bg = "/textures/texture_red.png";

  return (
    <div className="page-root" style={{
      backgroundImage: `url(${bg})`,
      backgroundSize: "cover",
      backgroundPosition: "center"
    }}>
      <Canvas
        className="absolute inset-0 z-10"
        camera={{ position: [0, 0, 5], fov: 45 }}
        gl={{ alpha: true, antialias: true }}
        dpr={[1, 1.75]}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        style={{ touchAction: 'none' }}
        onCreated={({ gl }) => { gl.setClearColor(0x000000, 0); }}
      >
        <ambientLight intensity={0.85} />
        <directionalLight position={[2, 6, 3]} intensity={1.15} />
        <hemisphereLight intensity={0.35} groundColor={"#553"} />

        <a.group rotation={positioningRotation}>
          <Card
            ref={cardRef}
            flipped={flipped}
            rotation={rotation}
            position={position}
            idleRotation={idleRotation}
            showVideo={showVideo}
            onToggle={handleCardToggle}
            mouseSpringConfig={mouseSpringConfig}
            frontSrc="/textures/O2_FINAL.png"
            backSrc="/textures/BOSS_BACK.png"
            videoSrc="/video/boss_flip_no_audio.mp4"
            videoRef={videoRef}
          >
            {/* Particles sit *behind* the card; fade/stop as t -> 1 */}
            <CardParticles
              flipProgress={t}
              offset={[0, 0.02, 0.2]}
              scale={0.3}
            />
          </Card>
        </a.group>

        {/* Password field under the card; fades in as the card opens */}
        <Html
          position={[0, -0.10, 0]}
          center
          style={{ pointerEvents: "auto" }}
        >
          <animated.div
            style={{
              // Magical fade-in with enhanced transparency progression
              opacity: t.to((val) => {
                const start = 0.65, end = 0.95;
                const a = (val - start) / (end - start);
                const progress = a < 0 ? 0 : a > 1 ? 1 : a;
                return Math.pow(progress, 0.7);
              }),
              transform: t.to((val) => {
                const start = 0.65, end = 0.95;
                const a = (val - start) / (end - start);
                const clamped = a < 0 ? 0 : a > 1 ? 1 : a;
                const y = (1 - clamped) * 12;
                const scale = 0.8 + (clamped * 0.2);
                return `translateY(${y}px) scale(${scale})`;
              }),
              pointerEvents: t.to((val) => (val > 0.88 ? 'auto' : 'none'))
            }}
          >
            <style>{`
              @keyframes goldShimmer {
                0% { background-position: -200% 0; }
                100% { background-position: 200% 0; }
              }
            `}</style>
            <div>
              <input
                id="pw"
                type="text"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleSubmit(e);
                  }
                }}
                placeholder={authed ? "ACCESS GRANTED" : isIncorrect ? "INCORRECT - TRY AGAIN" : "PASSWORD"}
                disabled={authed}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck="false"
                data-1p-ignore
                data-lpignore="true"
                name="search-field"
                style={{
                  width: "212px",
                  padding: "12px 16px",
                  textAlign: "center",
                  letterSpacing: "0.25em",
                  fontWeight: 800,
                  fontSize: "16px",
                  color: isIncorrect ? "#CD5C5C" : "#B8860B",
                  background: isIncorrect ? "rgba(255,0,0,0.1)" : "rgba(255,248,220,0.05)",
                  borderRadius: "12px",
                  border: isIncorrect ? "1px solid rgba(255,0,0,0.4)" : "1px solid rgba(255,215,0,0.4)",
                  boxShadow: isIncorrect 
                    ? "inset 2px 2px 4px rgba(139,0,0,0.3), inset -2px -2px 4px rgba(255,100,100,0.2), 0 0 12px rgba(255,0,0,0.15)"
                    : "inset 2px 2px 4px rgba(139,69,19,0.3), inset -2px -2px 4px rgba(255,215,0,0.2), 0 0 12px rgba(255,215,0,0.15)",
                  textShadow: "1px 1px 0 rgba(255,215,0,0.3), -1px -1px 0 rgba(139,69,19,0.5), 0 0 6px rgba(255,215,0,0.2)",
                  outline: "none",
                  backgroundImage: "linear-gradient(90deg, rgba(255,215,0,0.1), rgba(255,248,220,0.15), rgba(255,215,0,0.1))",
                  backgroundSize: "200% 100%",
                  animation: "goldShimmer 3s ease-in-out infinite",
                }}
                autoFocus
              />
              {!authed && (
                <div style={{
                  fontFamily: "Poppins, sans-serif",
                  letterSpacing: "0.3em",
                  fontWeight: 700,
                  fontSize: "11px",
                  color: "rgba(184,134,11,0.7)",
                  textTransform: "uppercase",
                  textShadow: "1px 1px 0 rgba(255,215,0,0.25), -1px -1px 0 rgba(139,69,19,0.4), 0 0 4px rgba(255,215,0,0.2)",
                  userSelect: "none",
                  marginTop: "8px"
                }}>
                  Press Enter
                </div>
              )}
            </div>
          </animated.div>
        </Html>
      </Canvas>
    </div>
  );
}