import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import Totem from './Totem'

export default function TuttiTotem({ active, ...props }) {
  const innerRef = useRef()

  useFrame((state) => {
    if (innerRef.current) {
      innerRef.current.rotation.x += 0.003
    }
  })

  return (
    <Totem active={active} {...props}>
      {(materialRef, color) => (
        <group>
          {/* Wireframe shell */}
          <mesh>
            <icosahedronGeometry args={[1.0, 0]} />
            <meshBasicMaterial color={color} wireframe transparent opacity={0.4} />
          </mesh>
          {/* Luminous core */}
          <mesh ref={innerRef} scale={0.5}>
            <icosahedronGeometry args={[1.0, 1]} />
            <meshStandardMaterial
              ref={materialRef}
              color={color}
              emissive={color}
              emissiveIntensity={0.12}
              roughness={0.2}
              metalness={0.0}
            />
          </mesh>
        </group>
      )}
    </Totem>
  )
}
