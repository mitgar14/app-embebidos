import { useFrame } from '@react-three/fiber'
import { SECTIONS } from '../config/sections'
import {
  ViolinesTotem,
  CuerdasGravesTotem,
  VientosMaderaTotem,
  VientosMetalTotem,
  TuttiTotem,
} from './totems'
import SectionSpotlight from './SectionSpotlight'
import DustParticles from './DustParticles'
import { useGestureStore } from '../store/useGestureStore'
import { useAudioReactive } from '../hooks/useAudioReactive'

const TOTEM_COMPONENTS = {
  violines: ViolinesTotem,
  cuerdas: CuerdasGravesTotem,
  madera: VientosMaderaTotem,
  metal: VientosMetalTotem,
  tutti: TuttiTotem,
}

export default function ConcertHall({ audioRef }) {
  const activeSections = useGestureStore((s) => s.activeSections)
  const isTutti = useGestureStore((s) => s.isTutti)
  const { amplitudes, update } = useAudioReactive(audioRef)

  useFrame(() => {
    update()
  })

  return (
    <>
      {/* Concert hall darkness */}
      <ambientLight color="#1A1810" intensity={0.15} />

      {/* Footlights from below */}
      <pointLight color="#C9972A" intensity={0.4} position={[0, -1, 3]} />

      {/* Atmospheric fog */}
      <fogExp2 attach="fog" color="#0A0906" density={0.05} />

      {Object.entries(SECTIONS).map(([key, section]) => {
        const Component = TOTEM_COMPONENTS[key]
        return (
          <group key={key}>
            <Component
              position={section.position}
              color={section.color}
              rotationSpeed={section.rotationSpeed}
              active={key === 'tutti' ? isTutti : activeSections.includes(key)}
              amplitudes={amplitudes}
              sectionKey={key}
            />
            <SectionSpotlight
              position={section.position}
              color={section.color}
              active={key === 'tutti' ? isTutti : activeSections.includes(key)}
            />
          </group>
        )
      })}

      <DustParticles />
    </>
  )
}
