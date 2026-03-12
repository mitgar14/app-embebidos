import Totem from './Totem'

export default function VientosMaderaTotem({ active, ...props }) {
  return (
    <Totem active={active} {...props}>
      {(materialRef, color) => (
        <mesh scale={[1, 1.8, 1]}>
          <octahedronGeometry args={[1.0, 0]} />
          <meshStandardMaterial
            ref={materialRef}
            color={color}
            emissive={color}
            emissiveIntensity={0.12}
            roughness={0.3}
            metalness={0.15}
            transparent
            opacity={0.85}
          />
        </mesh>
      )}
    </Totem>
  )
}
