import { useEffect } from 'react'
import { useGestureStore } from '../store/useGestureStore'

const KEY_TO_SECTION = {
  '1': 'violines',
  '2': 'cuerdas',
  '3': 'madera',
  '4': 'metal',
}

export function useKeyboardGestures() {
  const addSection = useGestureStore((s) => s.addSection)
  const resetSections = useGestureStore((s) => s.resetSections)

  useEffect(() => {
    function handleKeyDown(e) {
      const section = KEY_TO_SECTION[e.key]
      if (section) {
        addSection(section)
        return
      }
      if (e.key === 'Escape') {
        resetSections()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [addSection, resetSections])
}
