import { create } from 'zustand'

const GESTURE_TO_SECTION = {
  infinito: 'violines',
  m: 'cuerdas',
  maracas: 'madera',
  u: 'metal',
  tutti: 'tutti',
  silencio: null,
}

export const useGestureStore = create((set) => ({
  currentGesture: 'silencio',
  activeSection: null,
  bleConnected: false,
  started: false,

  setGesture: (gesture) => {
    const section = GESTURE_TO_SECTION[gesture] ?? null
    set({ currentGesture: gesture, activeSection: section })
  },

  setBleConnected: (connected) => set({ bleConnected: connected }),

  setStarted: (started) => set({ started }),
}))
