import { create } from 'zustand'
import { GESTURE_TO_SECTION, ALL_INSTRUMENT_SECTIONS } from '../config/ble'

export const useGestureStore = create((set) => ({
  // Gesture state (accumulative)
  currentGesture: null,
  gestureConfidence: 0,
  activeSections: [],
  isTutti: false,
  started: false,

  // BLE state
  bleStatus: 'idle',
  bleDeviceId: null,
  bleDevices: [],
  showTouchControls: false,
  showBlePanel: false,

  // --- Gesture actions ---

  processGesture: (label, confidence) => set((state) => {
    const section = GESTURE_TO_SECTION[label] ?? null
    const updates = { currentGesture: label, gestureConfidence: confidence }

    if (!section) return updates

    if (state.activeSections.includes(section)) return updates

    const next = [...state.activeSections, section]
    const isTutti = next.length === ALL_INSTRUMENT_SECTIONS.length
    return { ...updates, activeSections: next, isTutti }
  }),

  resetSections: () => set({
    activeSections: [],
    isTutti: false,
    currentGesture: null,
    gestureConfidence: 0,
  }),

  addSection: (section) => set((state) => {
    if (!section || state.activeSections.includes(section)) return state
    const next = [...state.activeSections, section]
    const isTutti = next.length === ALL_INSTRUMENT_SECTIONS.length
    return { activeSections: next, isTutti }
  }),

  setStarted: (started) => set({ started }),

  // --- BLE actions ---
  setBleStatus: (bleStatus) => set({ bleStatus }),

  addBleDevice: (device) =>
    set((state) => {
      const idx = state.bleDevices.findIndex((d) => d.deviceId === device.deviceId)
      if (idx >= 0) {
        const updated = [...state.bleDevices]
        updated[idx] = device
        return { bleDevices: updated }
      }
      return { bleDevices: [...state.bleDevices, device] }
    }),

  clearBleDevices: () => set({ bleDevices: [] }),
  setBleDeviceId: (bleDeviceId) => set({ bleDeviceId }),
  setShowTouchControls: (showTouchControls) => set({ showTouchControls }),
  setShowBlePanel: (showBlePanel) => set({ showBlePanel }),
}))
