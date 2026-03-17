import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Vector3, MathUtils } from 'three'
import { useGestureStore } from '../store/useGestureStore'
import { SECTIONS } from '../config/sections'

const LERP_SPEED = 1.5

export default function CameraRig() {
  const activeSections = useGestureStore((s) => s.activeSections)
  const lookAt = useRef(new Vector3(0, 0.5, 0))

  useFrame(({ camera, size }, delta) => {
    const aspect = size.width / size.height
    const isPortrait = aspect < 1

    // Portrait needs more distance and wider FOV to fit all totems
    const baseZ = isPortrait ? 9 : 6
    const baseY = isPortrait ? 3 : 2
    const baseFov = isPortrait ? 65 : 55

    // Bias camera slightly toward active section
    let biasX = 0
    let lookX = 0
    let lookY = 0.5
    let lookZ = 0

    // Bias toward the last activated section
    const lastSection = activeSections.length > 0
      ? activeSections[activeSections.length - 1]
      : null

    if (lastSection && SECTIONS[lastSection]) {
      const [sx, sy, sz] = SECTIONS[lastSection].position
      biasX = sx * 0.15
      lookX = sx * 0.25
      lookY = sy * 0.4 + 0.3
      lookZ = sz * 0.2
    }

    // Frame-rate independent smoothing
    const t = 1 - Math.exp(-LERP_SPEED * delta)

    camera.position.x += (biasX - camera.position.x) * t
    camera.position.y += (baseY - camera.position.y) * t
    camera.position.z += (baseZ - camera.position.z) * t

    // Smooth FOV transition when orientation changes
    if (Math.abs(camera.fov - baseFov) > 0.1) {
      camera.fov = MathUtils.lerp(camera.fov, baseFov, t)
      camera.updateProjectionMatrix()
    }

    // Smooth lookAt target
    lookAt.current.x += (lookX - lookAt.current.x) * t
    lookAt.current.y += (lookY - lookAt.current.y) * t
    lookAt.current.z += (lookZ - lookAt.current.z) * t
    camera.lookAt(lookAt.current)
  })

  return null
}
