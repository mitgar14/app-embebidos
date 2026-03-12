import { useRef, useEffect } from 'react'
import { useGestureStore } from '../store/useGestureStore'
import { AudioManager } from '../audio/AudioManager'

const STEM_PATHS = {
  violines: '/audio/stem_violines.mp3',
  cuerdas: '/audio/stem_cuerdas_graves.mp3',
  madera: '/audio/stem_vientos_madera.mp3',
  metal: '/audio/stem_vientos_metal.mp3',
  tutti: '/audio/stem_tutti.mp3',
}

export function useAudio() {
  const managerRef = useRef(null)
  const activeSection = useGestureStore((s) => s.activeSection)
  const currentGesture = useGestureStore((s) => s.currentGesture)
  const started = useGestureStore((s) => s.started)

  useEffect(() => {
    if (!started || managerRef.current) return

    const manager = new AudioManager()
    managerRef.current = manager

    manager.init(STEM_PATHS).then(async () => {
      await manager.resume()
      manager.playAll()
    })

    return () => {
      managerRef.current?.dispose()
      managerRef.current = null
    }
  }, [started])

  useEffect(() => {
    const manager = managerRef.current
    if (!manager) return

    if (currentGesture === 'silencio') {
      manager.silence()
    } else if (activeSection) {
      manager.highlightSection(activeSection)
    }
  }, [activeSection, currentGesture])

  return managerRef
}
