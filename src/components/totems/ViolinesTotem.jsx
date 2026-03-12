import Totem from './Totem'

export default function ViolinesTotem({ active, ...props }) {
  return (
    <Totem active={active} {...props}>
      {(materialRef, color) => (
        <mesh>
          <torusGeometry args={[1.2, 0.15, 16, 48]} />
          <meshStandardMaterial
            ref={materialRef}
            color={color}
            emissive={color}
            emissiveIntensity={0.12}
            roughness={0.4}
            metalness={0.1}
            transparent
            opacity={0.85}
          />
        </mesh>
      )}
    </Totem>
  )
}
