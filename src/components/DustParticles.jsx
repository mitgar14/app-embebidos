import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

const PARTICLE_COUNT = 50

export default function DustParticles() {
  const meshRef = useRef()
  const dummy = useMemo(() => new THREE.Object3D(), [])

  const particles = useMemo(() => {
    return Array.from({ length: PARTICLE_COUNT }, () => ({
      x: (Math.random() - 0.5) * 8,
      y: Math.random() * 5 - 1,
      z: (Math.random() - 0.5) * 8,
      speed: 0.001 + Math.random() * 0.003,
      offset: Math.random() * Math.PI * 2,
    }))
  }, [])

  useFrame((state) => {
    const t = state.clock.elapsedTime
    particles.forEach((p, i) => {
      dummy.position.set(
        p.x + Math.sin(t * 0.2 + p.offset) * 0.3,
        p.y + Math.sin(t * p.speed * 100 + p.offset) * 0.5,
        p.z + Math.cos(t * 0.15 + p.offset) * 0.3,
      )
      dummy.scale.setScalar(0.01 + Math.sin(t + p.offset) * 0.005)
      dummy.updateMatrix()
      meshRef.current.setMatrixAt(i, dummy.matrix)
    })
    meshRef.current.instanceMatrix.needsUpdate = true
  })

  return (
    <instancedMesh ref={meshRef} args={[null, null, PARTICLE_COUNT]}>
      <sphereGeometry args={[1, 4, 4]} />
      <meshBasicMaterial color="#C9972A" transparent opacity={0.3} />
    </instancedMesh>
  )
}
