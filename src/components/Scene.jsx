import { Canvas } from '@react-three/fiber'
import { Preload } from '@react-three/drei'
import ConcertHall from './ConcertHall'
import Effects from './Effects'

export default function Scene() {
  return (
    <Canvas
      camera={{ position: [0, 2, 6], fov: 55, near: 0.1, far: 50 }}
      dpr={[1, 1.5]}
      gl={{
        antialias: true,
        toneMapping: 3, // ACESFilmicToneMapping
        toneMappingExposure: 1.0,
      }}
      style={{ position: 'fixed', top: 0, left: 0 }}
    >
      <ConcertHall />
      <Effects />
      <Preload all />
    </Canvas>
  )
}
