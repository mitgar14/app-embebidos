import { useRef, useCallback } from 'react'

export function useAudioReactive(audioManagerRef) {
  const amplitudes = useRef({})

  const update = useCallback(() => {
    const manager = audioManagerRef?.current
    if (!manager) return amplitudes.current

    for (const key of manager.stems) {
      amplitudes.current[key] = manager.getAmplitude(key)
    }
    return amplitudes.current
  }, [audioManagerRef])

  return { amplitudes, update }
}
