import * as THREE from "three"
import { useRef, useState, useMemo } from "react"
import { useFrame } from "@react-three/fiber"
import { Clouds, Cloud } from "@react-three/drei"
import { CuboidCollider, BallCollider, Physics, RigidBody } from "@react-three/rapier"
import { random } from "maath"
import { folder, useControls } from "leva"

function Puffycloud({ seed, vec = new THREE.Vector3(), cloudProps, lightningProps, physicsProps, ...props }) {
    const api = useRef()
    const light = useRef()
    const [flash] = useState(() => new random.FlashGen({ count: 10, minDuration: 40, maxDuration: 200 }))
    const contact = (payload) => payload.other.rigidBodyObject.userData?.cloud && payload.totalForceMagnitude / 1000 > 100 && flash.burst()
    useFrame((state, delta) => {
        const impulse = flash.update(state.clock.elapsedTime, delta)
        light.current.intensity = impulse * 15000 * lightningProps.intensity
        if (physicsProps.mouseEnabled) {
            api.current?.applyImpulse(vec.copy(api.current.translation()).negate().multiplyScalar(physicsProps.restoringForce))
        }
    })
    return (
        <RigidBody
            ref={api}
            userData={{ cloud: true }}
            onContactForce={contact}
            linearDamping={physicsProps.linearDamping}
            angularDamping={physicsProps.angularDamping}
            friction={physicsProps.friction}
            {...props}
            colliders={false}
        >
            <BallCollider args={[4]} />
            <Cloud seed={seed} fade={30} speed={0.1} growth={4} segments={40} volume={6} opacity={0.6} bounds={[4, 3, 1]} {...cloudProps} />
            <Cloud seed={seed + 1} fade={30} position={[0, 1, 0]} speed={0.5} growth={4} volume={10} opacity={1} bounds={[6, 2, 1]} {...cloudProps} />
            <pointLight position={[0, 0, 0.5]} ref={light} color={lightningProps.color} />
        </RigidBody>
    )
}

function Pointer({ vec = new THREE.Vector3(), dir = new THREE.Vector3() }) {
    const ref = useRef()
    useFrame(({ pointer, viewport, camera }) => {
        vec.set(pointer.x, pointer.y, 0.5).unproject(camera)
        dir.copy(vec).sub(camera.position).normalize()
        vec.add(dir.multiplyScalar(camera.position.length()))
        ref.current?.setNextKinematicTranslation(vec)
    })
    return (
        <RigidBody userData={{ cloud: true }} type="kinematicPosition" colliders={false} ref={ref}>
            <BallCollider args={[4]} />
        </RigidBody>
    )
}

export function CloudFog() {
    const {
        // Clouds
        seed, color, opacity, growth, volume, speed, fade, segments,
        // Position
        x, y, z,
        // Physics
        mouseEnabled, restoringForce, linearDamping, angularDamping, friction
    } = useControls("Fog", {
        Clouds: folder({
            seed: { value: 10, min: 1, max: 100, step: 1 },
            color: { value: "#ffffff" },
            opacity: { value: 0.6, min: 0, max: 1, step: 0.05 },
            growth: { value: 4, min: 0, max: 20, step: 1 },
            volume: { value: 6, min: 0, max: 20, step: 0.1 },
            speed: { value: 0.1, min: 0, max: 2, step: 0.01 },
            fade: { value: 30, min: 0, max: 100, step: 1 },
            segments: { value: 40, min: 1, max: 100, step: 1 },
        }),
        Position: folder({
            x: { value: 0, min: -100, max: 100, step: 1 },
            y: { value: 0, min: -50, max: 50, step: 1 },
            z: { value: 0, min: -100, max: 100, step: 1 },
        }),
        Physics: folder({
            mouseEnabled: { value: true, label: "Mouse Interaction" },
            restoringForce: { value: 10, min: 0, max: 50, step: 0.5, label: "Spring Force" },
            linearDamping: { value: 4, min: 0, max: 20, step: 0.1, label: "Damping" },
            angularDamping: { value: 1, min: 0, max: 10, step: 0.1, label: "Ang. Damping" },
            friction: { value: 0.1, min: 0, max: 1, step: 0.05, label: "Friction" },
        })
    }, { collapsed: true, order: 10 })

    const lightningProps = useControls("Lightning", {
        color: { value: "#0000ff", label: "Color" },
        intensity: { value: 0, min: 0, max: 10, step: 0.1, label: "Intensity Multiplier" },
    }, { collapsed: true, order: 11 })

    // Reconstruct objects for passing to Puffycloud
    const cloudProps = { seed, color, opacity, growth, volume, speed, fade, segments };
    const physicsProps = { mouseEnabled, restoringForce, linearDamping, angularDamping, friction };
    const puffycloudProps = { cloudProps, lightningProps, physicsProps };

    return (
        <Clouds limit={400}>
            <Physics gravity={[0, 0, 0]}>
                <Pointer />
                <Puffycloud seed={20} position={[0 + cloudProps.x, 50 + cloudProps.y, 0 + cloudProps.z]} {...puffycloudProps} />
                <Puffycloud seed={30} position={[50 + cloudProps.x, 0 + cloudProps.y, 50 + cloudProps.z]} {...puffycloudProps} />
                <Puffycloud seed={40} position={[0 + cloudProps.x, 0 + cloudProps.y, -50 + cloudProps.z]} {...puffycloudProps} />
                <CuboidCollider position={[0, -15, 0]} args={[400, 10, 400]} />
            </Physics>
        </Clouds>
    )
}
