import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

export default function Totem({ children, position, color, rotationSpeed = 0.3, active = false, amplitudes, sectionKey }) {
  const groupRef = useRef()
  const materialRef = useRef()

  const colorObj = new THREE.Color(color)

  useFrame((state) => {
    const t = state.clock.elapsedTime
    const group = groupRef.current

    // Rotation
    group.rotation.y += rotationSpeed * 0.01

    // Breathing oscillation
    group.position.y = position[1] + Math.sin(t * 0.5) * 0.02

    // Scale transition (simple lerp for now)
    const targetScale = active ? 1.0 : 0.7
    group.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.05)

    // Emissive intensity transition with audio-reactive micro-pulses
    if (materialRef.current) {
      const targetIntensity = active ? 1.0 : 0.12
      const amp = (amplitudes?.current && sectionKey) ? (amplitudes.current[sectionKey] || 0) : 0
      const pulsedIntensity = targetIntensity * (1 + amp * 0.3)
      materialRef.current.emissiveIntensity += (pulsedIntensity - materialRef.current.emissiveIntensity) * 0.05
    }
  })

  return (
    <group ref={groupRef} position={position}>
      {typeof children === 'function' ? children(materialRef, colorObj) : children}
    </group>
  )
}
