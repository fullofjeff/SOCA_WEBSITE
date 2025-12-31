# Mouse-Based Card Animation Implementation Plan

## Overview
Add responsive mouse cursor tracking to the SOCA website card that creates smooth position and rotation changes when the cursor interacts with it. Animation behavior differs between flipped and unflipped states.

## Technical Specifications

### Animation Behavior
- **Unflipped State**: More pronounced mouse following with full 3D rotation including yaw
- **Flipped State**: Subtle effects only, NO yaw rotation, minimal movement
- **Preserved Functionality**: All existing animations, state management, and interactions remain intact

### Mouse Position Mapping Strategy

#### Coordinate Normalization
```javascript
// Screen to normalized coordinates (-1 to 1)
const normalizedX = (clientX / window.innerWidth) * 2 - 1;
const normalizedY = -(clientY / window.innerHeight) * 2 + 1; // Inverted Y
```

#### Natural Feel Interpolation
```javascript
// Quadratic easing for natural response
const dampenedX = normalizedX * Math.abs(normalizedX);
const dampenedY = normalizedY * Math.abs(normalizedY);

// Smooth step function for entrance/exit
const smoothStep = (x) => x * x * (3 - 2 * x);
const easedX = smoothStep(Math.abs(dampenedX)) * Math.sign(dampenedX);
const easedY = smoothStep(Math.abs(dampenedY)) * Math.sign(dampenedY);
```

### Animation Limits

#### Unflipped State Limits
```javascript
const unfoldedLimits = {
  rotationX: 0.1,     // ±0.1 radians (±5.7°) - pitch
  rotationY: 0.12,    // ±0.12 radians (±6.9°) - yaw
  rotationZ: 0.04,    // ±0.04 radians (±2.3°) - roll/banking
  translationX: 0.05, // ±0.05 units horizontal
  translationY: 0.05, // ±0.05 units vertical
  translationZ: 0.015 // ±0.015 units depth
};
```

#### Flipped State Limits
```javascript
const flippedLimits = {
  rotationX: 0.03,    // ±0.03 radians (±1.7°) - pitch only
  rotationY: 0.03,    // ±0.03 radians (±1.7°) - yaw only
  rotationZ: 0,       // NO roll/banking when flipped
  translationX: 0.02, // ±0.02 units horizontal
  translationY: 0.02, // ±0.02 units vertical
  translationZ: 0     // NO depth change when flipped
};
```

### Spring Configuration
```javascript
const mouseSpringConfig = {
  tension: 120,  // Responsive but not twitchy
  friction: 25,  // Smooth settling
  mass: 0.8      // Light feel
};
```

## Implementation Changes

### File: `/src/pages/LandingPage.jsx`

#### 1. New State Variables (Add after line 177)
```javascript
// Mouse tracking state
const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
const [isHovering, setIsHovering] = useState(false);
const mouseRef = useRef({ x: 0, y: 0 });
```

#### 2. Mouse Event Handlers (Add after existing useEffect)
```javascript
// Mouse tracking with throttling and cleanup
useEffect(() => {
  let frameId;
  
  const handleMouseMove = useCallback((event) => {
    if (frameId) return; // Throttle to animation frame
    
    frameId = requestAnimationFrame(() => {
      const normalizedX = (event.clientX / window.innerWidth) * 2 - 1;
      const normalizedY = -(event.clientY / window.innerHeight) * 2 + 1;
      
      mouseRef.current = { x: normalizedX, y: normalizedY };
      setMousePosition({ x: normalizedX, y: normalizedY });
      frameId = null;
    });
  }, []);
  
  const handleMouseEnter = useCallback(() => setIsHovering(true), []);
  const handleMouseLeave = useCallback(() => {
    setIsHovering(false);
    setMousePosition({ x: 0, y: 0 });
  }, []);
  
  // Add listeners to canvas container
  const canvasElement = document.querySelector('canvas');
  if (canvasElement) {
    canvasElement.addEventListener('pointermove', handleMouseMove);
    canvasElement.addEventListener('pointerenter', handleMouseEnter);
    canvasElement.addEventListener('pointerleave', handleMouseLeave);
  }
  
  return () => {
    if (canvasElement) {
      canvasElement.removeEventListener('pointermove', handleMouseMove);
      canvasElement.removeEventListener('pointerenter', handleMouseEnter);
      canvasElement.removeEventListener('pointerleave', handleMouseLeave);
    }
    if (frameId) cancelAnimationFrame(frameId);
  };
}, []);
```

#### 3. Mouse Animation Spring (Add after existing rotation spring)
```javascript
// Mouse-responsive animation spring
const mouseLimits = useMemo(() => 
  flipped ? flippedLimits : unfoldedLimits, [flipped]);

const mouseSpring = useSpring({
  mouseRotX: isHovering ? 
    (mousePosition.y * Math.abs(mousePosition.y)) * mouseLimits.rotationX : 0,
  mouseRotY: isHovering ? 
    (mousePosition.x * Math.abs(mousePosition.x)) * mouseLimits.rotationY : 0,
  mouseRotZ: isHovering ? 
    (mousePosition.x * Math.abs(mousePosition.x)) * mouseLimits.rotationZ : 0,
  mousePosX: isHovering ? 
    (mousePosition.x * Math.abs(mousePosition.x)) * mouseLimits.translationX : 0,
  mousePosY: isHovering ? 
    (mousePosition.y * Math.abs(mousePosition.y)) * mouseLimits.translationY : 0,
  mousePosZ: isHovering ? 
    (mousePosition.y * Math.abs(mousePosition.y)) * mouseLimits.translationZ : 0,
  config: mouseSpringConfig
});
```

#### 4. Updated Animated Group Structure (Replace lines 238-248)
```javascript
{/* Enhanced animation wrapper with mouse responsiveness */}
<animated.group 
  position={position.to((pos, mousePos) => [
    pos[0] + mouseSpring.mousePosX.get(),
    pos[1] + mouseSpring.mousePosY.get(),
    pos[2] + mouseSpring.mousePosZ.get()
  ])}
  rotation={mouseSpring.mouseRotX.to((rotX, rotY, rotZ) => [
    rotX, rotY, rotZ
  ])}
>
  <Card
    flipped={flipped}
    onToggle={() => setFlipped(v => !v)}
    frontSrc="/textures/O2_FINAL.png"
    backSrc="/textures/BOSS_BACK.png"
    rotation={rotation}
    showVideo={showVideo}
    videoRef={videoRef}
  />
</animated.group>
```

#### 5. Import Additions (Add to existing imports)
```javascript
import { useMemo, useState, useEffect, useRef, useCallback } from "react";
```

## Performance Considerations

### Memory Leak Prevention
- ✅ Proper event listener cleanup in `useEffect`
- ✅ `useCallback` for event handlers to prevent recreation
- ✅ `requestAnimationFrame` throttling for mouse move events
- ✅ `useRef` for mouse position to avoid unnecessary re-renders

### Animation Performance
- ✅ Separate mouse spring from flip animation
- ✅ Conditional limits based on flip state
- ✅ Optimized spring configuration values
- ✅ Frame-throttled mouse updates

## Integration Requirements

### Preserved Functionality
- ✅ All existing card flip animations
- ✅ Password form behavior and timing
- ✅ Video playback triggers
- ✅ Idle wiggle animation (continues for unflipped state)
- ✅ All click handlers and state management
- ✅ Error states and authentication flow

### Animation Layering
```
Base Card Group
├── Mouse Position Animation (new)
│   ├── Mouse Rotation Animation (new)
│   │   ├── Flip Animation Group (existing)
│   │   │   ├── Idle Wiggle Group (existing)
│   │   │   │   └── Card Component (existing)
```

## Testing Checklist

### Functional Tests
- [ ] Card flips correctly with mouse effects
- [ ] Password form appears and functions normally
- [ ] Video plays when "magic" password entered
- [ ] Idle wiggle continues when unflipped
- [ ] Mouse effects stop when flipped (except subtle movement)
- [ ] No yaw rotation when flipped
- [ ] Smooth mouse enter/exit transitions

### Performance Tests
- [ ] No memory leaks after extended use
- [ ] Smooth 60fps animation performance
- [ ] Proper event listener cleanup
- [ ] No excessive re-renders

### Edge Cases
- [ ] Mouse effects work across different screen sizes
- [ ] Proper behavior when switching between flipped states
- [ ] Clean transitions when mouse leaves canvas area
- [ ] No conflicts with existing video/form interactions

## Success Criteria

1. **Responsive Animation**: Card follows mouse cursor smoothly with natural physics
2. **State-Aware Behavior**: Different animation intensity for flipped vs unflipped
3. **Performance**: Maintains 60fps with no memory leaks
4. **Preserved Functionality**: All existing features work identically
5. **Natural Feel**: Animation feels magical and enhances user experience

---

**Implementation Note**: All changes will be made exclusively to `/src/pages/LandingPage.jsx`. No other files require modification. The implementation will be additive - no existing functionality will be removed or significantly altered.