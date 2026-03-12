export default function ConcertHall() {
  return (
    <>
      {/* Concert hall darkness */}
      <ambientLight color="#0A0906" intensity={0.08} />

      {/* Footlights from below */}
      <pointLight color="#C9972A" intensity={0.3} position={[0, -1, 3]} />

      {/* Atmospheric fog */}
      <fogExp2 attach="fog" color="#0A0906" density={0.08} />
    </>
  )
}
