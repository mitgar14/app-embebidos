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
  started: false,

  // BLE state
  bleStatus: 'idle',
  bleDeviceId: null,
  bleDevices: [],
  showTouchControls: false,
  showBlePanel: false,

  setGesture: (gesture) => {
    const section = GESTURE_TO_SECTION[gesture] ?? null
    set({ currentGesture: gesture, activeSection: section })
  },

  setStarted: (started) => set({ started }),

  // BLE actions
  setBleStatus: (bleStatus) => set({ bleStatus }),

  addBleDevice: (device) =>
    set((state) => {
      const exists = state.bleDevices.findIndex((d) => d.deviceId === device.deviceId)
      if (exists >= 0) {
        const updated = [...state.bleDevices]
        updated[exists] = device
        return { bleDevices: updated }
      }
      return { bleDevices: [...state.bleDevices, device] }
    }),

  clearBleDevices: () => set({ bleDevices: [] }),

  setBleDeviceId: (bleDeviceId) => set({ bleDeviceId }),

  setShowTouchControls: (showTouchControls) => set({ showTouchControls }),

  setShowBlePanel: (showBlePanel) => set({ showBlePanel }),
}))
