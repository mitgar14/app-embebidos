import Totem from './Totem'

export default function VientosMetalTotem({ active, ...props }) {
  return (
    <Totem active={active} {...props}>
      {(materialRef, color) => (
        <mesh>
          <torusKnotGeometry args={[0.8, 0.25, 64, 8, 2, 3]} />
          <meshStandardMaterial
            ref={materialRef}
            color={color}
            emissive={color}
            emissiveIntensity={0.12}
            roughness={0.3}
            metalness={0.6}
          />
        </mesh>
      )}
    </Totem>
  )
}
