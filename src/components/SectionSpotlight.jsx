import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

export default function SectionSpotlight({ position, color, active }) {
  const lightRef = useRef()
  const target = useMemo(() => {
    const obj = new THREE.Object3D()
    obj.position.set(position[0], position[1], position[2])
    return obj
  }, [position])

  useFrame(() => {
    if (lightRef.current) {
      const targetIntensity = active ? 2.0 : 0.0
      lightRef.current.intensity +=
        (targetIntensity - lightRef.current.intensity) * 0.08
    }
  })

  return (
    <>
      <primitive object={target} />
      <spotLight
        ref={lightRef}
        color={color}
        intensity={0}
        position={[position[0], position[1] + 4, position[2]]}
        target={target}
        angle={Math.PI / 6}
        penumbra={0.6}
        distance={12}
        decay={2}
      />
    </>
  )
}
