// LandingPage.jsx - Interactive Card with Mouse Reactivity (Fixed Position)
import { Canvas } from "@react-three/fiber";
import * as THREE from "three";
import { useTexture, Html } from "@react-three/drei";
import { useSpring, animated as a, to } from "@react-spring/three";
import { animated as aHtml } from "@react-spring/web";
import { useMemo, useState, useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from "react";
import { useNavigate } from "react-router-dom";
import { useFrame } from "@react-three/fiber";
import { easing } from "maath";

/* ================================================================
  =========         GEOMETRY & TEXTURE HELPERS           =========
  ================================================================ */

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
    uv[2 * i] = (p.getX(i) - min.x) / dx;
    uv[2 * i + 1] = (p.getY(i) - min.y) / dy;
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
    t.offset.set(0, 0);
    t.center.set(0.5, 0.5);
    t.anisotropy = 8;
  });
  return { front, back };
}

/* ================================================================
  =========               CARD MESHES COMPONENT          =========
  ================================================================ */
function CardMeshes({
  w, h, d, r,
  front, back,
  showVideo, videoTexture,
  onToggle,
  removeHinge = false
}) {
  const { bodyGeom, faceGeom } = useMemo(() => {
    const shape = roundedRectShape(w, h, r);
    const body = new THREE.ExtrudeGeometry(shape, { depth: d, bevelEnabled: false, steps: 1, curveSegments: 64 });
    body.translate(0, 0, -d / 2);
    const face = makeRoundedFaceGeometry(w, h, r, 64);
    return { bodyGeom: body, faceGeom: face };
  }, [w, h, r, d]);

  const eps = 0.002, faceScale = 1.003;

  const faceMat = (map) => new THREE.MeshStandardMaterial({
    map,
    roughness: 0.95, metalness: 0, side: THREE.DoubleSide,
    transparent: true, alphaTest: 0.001, polygonOffset: true,
    polygonOffsetFactor: -2
  });
  
  // If removeHinge is true, don't add hinge positioning (handled by parent)
  if (removeHinge) {
    return (
      <group>
        {/* Sides */}
        <mesh geometry={bodyGeom}>
          <meshStandardMaterial color="#97876A" roughness={0.92} />
        </mesh>
        {/* Front Face */}
        <mesh geometry={faceGeom} position={[0, 0, d / 2 + eps]} scale={[faceScale, faceScale, 1]}>
          <primitive object={faceMat(front)} />
        </mesh>
        {/* Back Face (with video) */}
        <mesh geometry={faceGeom} position={[0, 0, -d / 2 - eps]} scale={[-faceScale, faceScale, 1]}>
          <primitive object={faceMat(showVideo ? videoTexture : back)} />
        </mesh>
      </group>
    );
  }
  
  // Original version with hinge positioning for backwards compatibility
  const hingeX = w / 2;
  return (
    <group position={[hingeX, 0, 0]} onClick={(e) => { e.stopPropagation(); onToggle(); }}>
      <group position={[-hingeX, 0, 0]}>
        {/* Sides */}
        <mesh geometry={bodyGeom}>
          <meshStandardMaterial color="#97876A" roughness={0.92} />
        </mesh>
        {/* Front Face */}
        <mesh geometry={faceGeom} position={[0, 0, d / 2 + eps]} scale={[faceScale, faceScale, 1]}>
          <primitive object={faceMat(front)} />
        </mesh>
        {/* Back Face (with video) */}
        <mesh geometry={faceGeom} position={[0, 0, -d / 2 - eps]} scale={[-faceScale, faceScale, 1]}>
          <primitive object={faceMat(showVideo ? videoTexture : back)} />
        </mesh>
      </group>
    </group>
  );
}

/* ================================================================
  =========             SLIDING VIDEO COMPONENT          =========
  ================================================================ */

const SlidingVideo = ({ videoUrl, trigger = false, onVideoEnd }) => {
  const meshRef = useRef();
  const backgroundRef = useRef();
  const [video] = useState(() => {
    const vid = document.createElement('video');
    vid.src = videoUrl;
    vid.crossOrigin = 'anonymous';
    vid.loop = false; // Play once
    vid.muted = true;
    vid.playsInline = true;
    vid.autoplay = false;
    vid.preload = 'auto';
    return vid;
  });

  const [texture] = useState(() => {
    const tex = new THREE.VideoTexture(video);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.flipY = true; // Fix upside down video
    tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
    return tex;
  });

  // Start off-screen to the right
  useEffect(() => {
    if (meshRef.current) {
      meshRef.current.position.x = 15; // Start position off-screen right
    }
    if (backgroundRef.current) {
      backgroundRef.current.position.x = 15; // Start position off-screen right
    }
  }, []);

  // Play video when triggered and set up end handler
  useEffect(() => {
    if (trigger && video) {
      console.log('Triggering video play...');
      video.currentTime = 0;
      video.play()
        .then(() => console.log('Video started playing'))
        .catch(e => console.error('Video play failed:', e));
    }
    
    // Add event listener for when video ends
    const handleVideoEnd = () => {
      console.log('Wonder video ended, returning to menu');
      if (onVideoEnd) {
        onVideoEnd();
      }
    };
    
    video.addEventListener('ended', handleVideoEnd);
    
    // Cleanup event listener
    return () => {
      video.removeEventListener('ended', handleVideoEnd);
    };
  }, [trigger, video, onVideoEnd]);

  useFrame((state, delta) => {
    if (!meshRef.current || !backgroundRef.current) return;
    
    // Calculate viewport dimensions for fullscreen background
    const { camera, size } = state;
    const distance = camera.position.z;
    const vFOV = (camera.fov * Math.PI) / 180;
    const screenHeight = 2 * Math.tan(vFOV / 2) * distance;
    const screenWidth = screenHeight * (size.width / size.height);
    
    // Calculate 16:9 video dimensions that fit within viewport
    const videoAspect = 16 / 9;
    const screenAspect = size.width / size.height;
    
    let videoWidth, videoHeight;
    if (screenAspect > videoAspect) {
      // Screen is wider than 16:9, fit to height
      videoHeight = screenHeight * 0.8; // 80% of screen height for some padding
      videoWidth = videoHeight * videoAspect;
    } else {
      // Screen is taller than 16:9, fit to width
      videoWidth = screenWidth * 0.8; // 80% of screen width for some padding
      videoHeight = videoWidth / videoAspect;
    }
    
    // Slide in when triggered, slide out when not triggered
    const targetX = trigger ? 0 : 15;
    easing.damp3(
      meshRef.current.position,
      [targetX, 0, 2], // z: 2 to be in front of card
      0.3, // damping factor - lower = slower
      delta
    );
    easing.damp3(
      backgroundRef.current.position,
      [targetX, 0, 1.9], // slightly behind video
      0.3,
      delta
    );
    
    // Update scales - background fullscreen, video 16:9 with proper aspect
    meshRef.current.scale.set(videoWidth, videoHeight, 1);
    backgroundRef.current.scale.set(screenWidth, screenHeight, 1);
  });

  return (
    <group>
      {/* Black background */}
      <mesh ref={backgroundRef} position={[0, 0, 1.9]}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial color="#000000" />
      </mesh>
      
      {/* Video plane */}
      <mesh ref={meshRef} position={[0, 0, 2]}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial map={texture} toneMapped={false} />
      </mesh>
    </group>
  );
};

/* ================================================================
  =========      REBUILT CARD COMPONENT (WITH MOUSE FX)  =========
  ================================================================ */

const Card = forwardRef(function Card(props, ref) {
  const {
    w = 1.162, h = 1.75, d = 0.008, r = 0.07,
    frontSrc = "/textures/1162x1750_front.png",
    backSrc = "/textures/1162_back.png",
    videoSrc = "/video/1162_back_transparent_frame.mp4",
    flipped, onToggle, showVideo,
    videoRef, position, rotation, idleRotation,
    locked = false,
  } = props;

  // --- MOUSE-REACTIVE SPRING LOGIC ---
  const [{ mouseRx, mouseRy, mousePx, mousePy }, mouseApi] = useSpring(() => ({
    mouseRx: 0, mouseRy: 0, mousePx: 0, mousePy: 0,
    config: { mass: 1, tension: 180, friction: 18 }
  }));

  const rafId = useRef(0);
  const latest = useRef({ mouseRx: 0, mouseRy: 0, mousePx: 0, mousePy: 0 });

  const scheduleUpdate = useCallback(() => {
    if (rafId.current) return;
    rafId.current = requestAnimationFrame(() => {
      rafId.current = 0;
      mouseApi.start(latest.current);
    });
  }, [mouseApi]);

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
      scheduleUpdate();
    }
  }), [flipped, scheduleUpdate]);

  useEffect(() => () => {
    if (rafId.current) cancelAnimationFrame(rafId.current);
  }, []);
  
  // --- TEXTURE & VIDEO LOGIC ---
  const { front, back } = useCardTextures(frontSrc, backSrc);

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
    const texture = new THREE.VideoTexture(video);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.flipY = false;
    texture.wrapS = texture.wrapT = THREE.ClampToEdgeWrapping;
    texture.repeat.set(1, -1);
    texture.center.set(0.5, 0.5);
    return texture;
  }, [videoSrc, videoRef]);

  // --- RENDER WITH COMPOSED ANIMATIONS ---
  const hingeX = w / 2; // Right edge hinge position
  
  return (
    // 1. Position (Fixed center - no slide)
    <a.group position={position}>
      {/* 2. Angled positioning when not flipped */}
      <a.group rotation={[0, flipped ? 0 : 0.35, flipped ? 0 : 0.0872665]}>
        {/* 3. Idle Wiggle */}
        <a.group rotation={idleRotation}>
          {/* 4. Mouse-Reactive Layer */}
          <a.group
            position={to([mousePx, mousePy], (x, y) => [x, y, 0])}
            rotation={to([mouseRx, mouseRy], (x, y) => [x, y, 0])}
          >
            {/* 5. HINGE PIVOT - Move to right edge, apply flip rotation, move back */}
            <a.group position={[hingeX, 0, 0]} rotation={rotation}>
              <group 
                position={[-hingeX, 0, 0]} 
                onClick={(e) => { 
                  e.stopPropagation(); 
                  if (!locked) onToggle(); 
                }}
                style={{ cursor: locked ? 'not-allowed' : 'pointer' }}
              >
                {/* 6. Meshes without hinge positioning (handled above) */}
                <CardMeshes
                    w={w} h={h} d={d} r={r}
                    front={front} back={back}
                    showVideo={showVideo}
                    videoTexture={videoTexture}
                    onToggle={onToggle}
                    removeHinge={true}
                />
              </group>
            </a.group>
          </a.group>
        </a.group>
      </a.group>
    </a.group>
  );
});

/* ================================================================
  =========           MAIN PAGE COMPONENT                =========
  ================================================================ */
export default function LandingPage() {
  const navigate = useNavigate();
  const [flipped, setFlipped] = useState(false);
  const [password, setPassword] = useState("");
  const [authed, setAuthed] = useState(false);
  const [showVideo, setShowVideo] = useState(false);
  const [videoCompleted, setVideoCompleted] = useState(false);
  const [isIncorrect, setIsIncorrect] = useState(false);
  const [showWonderVideo, setShowWonderVideo] = useState(false);
  const videoRef = useRef();
  const cardRef = useRef(null);

  // --- CORE ANIMATIONS - FIXED POSITION (NO SLIDE) ---
  const { rotation, t, position } = useSpring({
    rotation: flipped ? [0, Math.PI, 0] : [0, 0, 0],
    position: [0, 0, 0], // Always centered - no slide when flipped
    t: flipped ? 1 : 0,
    config: { mass: 1, tension: 140, friction: 30, clamp: true, precision: 0.0001 }
  });

  // Idle wiggle - optimized to avoid infinite loops
  const idle = useSpring({
    from: { rx: 0, ry: 0, rz: 0 },
    to: async (next) => {
      if (flipped) {
        await next({ rx: 0, ry: 0, rz: 0 });
        return;
      }
      
      while (!flipped) {
        await next({ rx: 0.03, ry: -0.15, rz: 0.02 });
        if (flipped) break;
        await next({ rx: -0.03, ry: 0.15, rz: -0.02 });
        if (flipped) break;
      }
    },
    config: { tension: 14, friction: 12, mass: 1.2 }
  });
  
  // Convert separate idle axes into a single rotation prop
  const idleRotation = to([idle.rx, idle.ry, idle.rz], (rx, ry, rz) => [rx, ry, rz]);

  // --- POINTER HANDLING & ACCESSIBILITY ---
  const [reducedMotion, setReducedMotion] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    const set = () => setReducedMotion(!!mq.matches);
    set();
    mq.addEventListener?.('change', set);
    return () => mq.removeEventListener?.('change', set);
  }, []);

  const [isPressed, setIsPressed] = useState(false);
  
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
  
  const handlePointerLeave = useCallback(() => {
    setIsPressed(false);
    if (!flipped) cardRef.current?.handlePointer(0, 0, 1);
  }, [flipped]);
  
  // --- PASSWORD LOGIC WITH NAVIGATION ---
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
          
          // Set video as completed when it ends (no navigation)
          videoRef.current.addEventListener('ended', () => {
            console.log('Video ended, setting videoCompleted');
            setVideoCompleted(true);
          });
        }
      }, 1000);
    } else if (v === "soca" || v === "enter") {
      setAuthed(true);
      setIsIncorrect(false);
      // Navigate directly to menu for these passwords
      setTimeout(() => {
        navigate('/menu');
      }, 1000);
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
    <div className="page-root" style={{ backgroundImage: `url(${bg})`, backgroundSize: "cover", backgroundPosition: "center" }}>
      <Canvas
        className="absolute inset-0 z-10"
        camera={{ position: [0, 0, 5], fov: 45 }}
        gl={{ alpha: true, antialias: true }}
        dpr={[1, 1.75]}
        onCreated={({ gl }) => { gl.setClearColor(0x000000, 0); }}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
        onPointerDown={() => setIsPressed(true)}
        onPointerUp={() => setIsPressed(false)}
        onPointerCancel={handlePointerLeave}
        style={{ touchAction: 'none' }}
      >
        <ambientLight intensity={0.85} />
        <directionalLight position={[2, 6, 3]} intensity={1.15} />
        <hemisphereLight intensity={0.35} groundColor={"#553"} />
        
        <Card
          ref={cardRef}
          flipped={flipped}
          onToggle={() => {
            // Lock card flip after video completes
            if (!videoCompleted) {
              setFlipped(v => !v);
            }
          }}
          showVideo={showVideo}
          videoRef={videoRef}
          locked={videoCompleted}
          // Pass down the core animation springs
          position={position}
          rotation={rotation}
          idleRotation={idleRotation}
        />
        
        {/* SLIDING WONDER VIDEO */}
        <SlidingVideo 
          videoUrl="/video/Sequence 01_1.mp4" 
          trigger={showWonderVideo}
          onVideoEnd={() => setShowWonderVideo(false)}
        />
        
        {/* PASSWORD FIELD - Hide when video completes */}
        {!videoCompleted && (
          <Html position={[0, -0.10, 0]} center style={{ pointerEvents: "auto" }}>
            <aHtml.div
              style={{
                opacity: t.to(v => Math.pow(Math.max(0, Math.min(1, (v - 0.65) / 0.3)), 0.7)),
                transform: t.to(v => {
                  const clamped = Math.max(0, Math.min(1, (v - 0.65) / 0.3));
                  return `translateY(${(1 - clamped) * 12}px) scale(${0.8 + (clamped * 0.2)})`;
                }),
                pointerEvents: t.to(v => (v > 0.88 ? 'auto' : 'none'))
              }}
            >
            <style>{`@keyframes goldShimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }`}</style>
            <div>
              <input
                id="pw"
                type="text" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(e); }}
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
          </aHtml.div>
        </Html>
        )}

        {/* TEXT OVERLAY ON CARD - Show when video completes and Wonder video is not showing */}
        {videoCompleted && !showWonderVideo && (
          <a.group position={position}>
            <a.group rotation={[0, flipped ? 0 : 0.35, flipped ? 0 : 0.0872665]}>
              <a.group rotation={idleRotation}>
                <a.group position={[0.581, 0, 0]} rotation={rotation}>
                  <group position={[-0.581, 0, 0]}>
                    <Html position={[0, 0, 0.01]} center style={{ pointerEvents: "auto" }}>
                      <div style={{ 
                        position: 'relative',
                        width: '280px',
                        height: '420px',
                        pointerEvents: 'auto'
                      }}>
                      
                      {/* MENU Title */}
                      <div style={{
                        position: 'absolute',
                        top: '60px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        fontFamily: 'serif',
                        fontSize: '31.68px',
                        fontWeight: '900',
                        color: '#8B6914',
                        letterSpacing: '0.8px',
                        textShadow: 'none'
                      }}>
                        MENU
                      </div>

                      {/* WONDER */}
                      <img 
                        src="/wonder.svg"
                        onClick={() => setShowWonderVideo(true)}
                        style={{
                          position: 'absolute',
                          top: '140px',
                          left: '50%',
                          transform: 'translateX(-50%)',
                          height: '18px',
                          width: 'auto',
                          cursor: 'pointer',
                          transition: 'all 0.3s ease',
                          filter: 'drop-shadow(2px 2px 4px rgba(255,255,255,0.8))'
                        }}
                        onMouseEnter={(e) => {
                          e.target.style.transform = 'translateX(-50%) scale(1.1)';
                          e.target.style.filter = 'drop-shadow(3px 3px 8px rgba(255,215,0,0.8))';
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.transform = 'translateX(-50%) scale(1)';
                          e.target.style.filter = 'drop-shadow(2px 2px 4px rgba(255,255,255,0.8))';
                        }}
                      />

                      {/* Heart Symbol */}
                      <img 
                        src="/suit-heart.svg"
                        style={{
                          position: 'absolute',
                          top: '180px',
                          left: '50%',
                          transform: 'translateX(-50%)',
                          width: '20px',
                          height: '20px',
                          filter: 'drop-shadow(2px 2px 4px rgba(255,255,255,0.8))'
                        }}
                      />

                      {/* DREAM */}
                      <img 
                        src="/dream.svg"
                        onClick={() => navigate('/dream')}
                        style={{
                          position: 'absolute',
                          top: '220px',
                          left: '50%',
                          transform: 'translateX(-50%)',
                          height: '18px',
                          width: 'auto',
                          cursor: 'pointer',
                          transition: 'all 0.3s ease',
                          filter: 'drop-shadow(2px 2px 4px rgba(255,255,255,0.8))'
                        }}
                        onMouseEnter={(e) => {
                          e.target.style.transform = 'translateX(-50%) scale(1.1)';
                          e.target.style.filter = 'drop-shadow(3px 3px 8px rgba(255,215,0,0.8))';
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.transform = 'translateX(-50%) scale(1)';
                          e.target.style.filter = 'drop-shadow(2px 2px 4px rgba(255,255,255,0.8))';
                        }}
                      />

                      {/* Spade Symbol */}
                      <img 
                        src="/suit-spade.svg"
                        style={{
                          position: 'absolute',
                          top: '260px',
                          left: '50%',
                          transform: 'translateX(-50%)',
                          width: '20px',
                          height: '20px',
                          filter: 'drop-shadow(2px 2px 4px rgba(255,255,255,0.8))'
                        }}
                      />

                      {/* BELIEVE */}
                      <img 
                        src="/believe.svg"
                        onClick={() => window.open('https://drive.google.com/file/d/17LxHLsJR9s2hfmISg5AKd_E80x6Pjiqg/view?usp=drive_link', '_blank')}
                        style={{
                          position: 'absolute',
                          top: '300px',
                          left: '50%',
                          transform: 'translateX(-50%)',
                          height: '18px',
                          width: 'auto',
                          cursor: 'pointer',
                          transition: 'all 0.3s ease',
                          filter: 'drop-shadow(2px 2px 4px rgba(255,255,255,0.8))'
                        }}
                        onMouseEnter={(e) => {
                          e.target.style.transform = 'translateX(-50%) scale(1.1)';
                          e.target.style.filter = 'drop-shadow(3px 3px 8px rgba(255,215,0,0.8))';
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.transform = 'translateX(-50%) scale(1)';
                          e.target.style.filter = 'drop-shadow(2px 2px 4px rgba(255,255,255,0.8))';
                        }}
                      />
                      </div>
                    </Html>
                  </group>
                </a.group>
              </a.group>
            </a.group>
          </a.group>
        )}

      </Canvas>
    </div>
  );
}