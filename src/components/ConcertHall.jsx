import { SECTIONS } from '../config/sections'
import {
  ViolinesTotem,
  CuerdasGravesTotem,
  VientosMaderaTotem,
  VientosMetalTotem,
  TuttiTotem,
} from './totems'
import SectionSpotlight from './SectionSpotlight'
import { useGestureStore } from '../store/useGestureStore'

const TOTEM_COMPONENTS = {
  violines: ViolinesTotem,
  cuerdas: CuerdasGravesTotem,
  madera: VientosMaderaTotem,
  metal: VientosMetalTotem,
  tutti: TuttiTotem,
}

export default function ConcertHall() {
  const activeSection = useGestureStore((s) => s.activeSection)

  return (
    <>
      {/* Concert hall darkness */}
      <ambientLight color="#0A0906" intensity={0.08} />

      {/* Footlights from below */}
      <pointLight color="#C9972A" intensity={0.3} position={[0, -1, 3]} />

      {/* Atmospheric fog */}
      <fogExp2 attach="fog" color="#0A0906" density={0.08} />

      {Object.entries(SECTIONS).map(([key, section]) => {
        const Component = TOTEM_COMPONENTS[key]
        return (
          <group key={key}>
            <Component
              position={section.position}
              color={section.color}
              rotationSpeed={section.rotationSpeed}
              active={key === activeSection}
            />
            <SectionSpotlight
              position={section.position}
              color={section.color}
              active={key === activeSection}
            />
          </group>
        )
      })}
    </>
  )
}
