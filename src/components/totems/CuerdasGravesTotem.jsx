import Totem from './Totem'

export default function CuerdasGravesTotem({ active, ...props }) {
  return (
    <Totem active={active} {...props}>
      {(materialRef, color) => (
        <mesh>
          <torusGeometry args={[1.0, 0.35, 16, 48]} />
          <meshStandardMaterial
            ref={materialRef}
            color={color}
            emissive={color}
            emissiveIntensity={0.12}
            roughness={0.5}
            metalness={0.05}
            transparent
            opacity={0.85}
          />
        </mesh>
      )}
    </Totem>
  )
}
