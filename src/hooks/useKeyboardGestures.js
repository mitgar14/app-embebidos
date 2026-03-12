import { useEffect } from 'react'
import { useGestureStore } from '../store/useGestureStore'

const KEY_MAP = {
  '1': 'infinito',   // violines
  '2': 'm',          // cuerdas graves
  '3': 'maracas',    // vientos madera
  '4': 'u',          // vientos metal
  '5': 'tutti',      // tutti
  '0': 'silencio',
  Escape: 'silencio',
}

export function useKeyboardGestures() {
  const setGesture = useGestureStore((s) => s.setGesture)

  useEffect(() => {
    function handleKeyDown(e) {
      const gesture = KEY_MAP[e.key]
      if (gesture) setGesture(gesture)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [setGesture])
}
