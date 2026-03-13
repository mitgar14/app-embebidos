import { describe, it, expect, beforeEach } from 'vitest'
import { useGestureStore } from './useGestureStore'

describe('useGestureStore', () => {
  beforeEach(() => {
    // Reset store entre tests
    useGestureStore.setState({
      currentGesture: 'silencio',
      activeSection: null,
      bleStatus: 'idle',
      bleDeviceId: null,
      bleDevices: [],
      showTouchControls: false,
      showBlePanel: false,
      started: false,
    })
  })

  it('starts with idle BLE status and silencio gesture', () => {
    const state = useGestureStore.getState()
    expect(state.activeSection).toBe(null)
    expect(state.currentGesture).toBe('silencio')
    expect(state.bleStatus).toBe('idle')
    expect(state.bleDeviceId).toBe(null)
    expect(state.bleDevices).toEqual([])
    expect(state.showTouchControls).toBe(false)
    expect(state.showBlePanel).toBe(false)
  })

  it('sets active section on gesture', () => {
    useGestureStore.getState().setGesture('infinito')
    const state = useGestureStore.getState()
    expect(state.currentGesture).toBe('infinito')
    expect(state.activeSection).toBe('violines')
  })

  it('clears active section on silencio', () => {
    useGestureStore.getState().setGesture('infinito')
    useGestureStore.getState().setGesture('silencio')
    expect(useGestureStore.getState().activeSection).toBe(null)
  })

  it('tracks BLE status transitions', () => {
    const { setBleStatus } = useGestureStore.getState()
    setBleStatus('scanning')
    expect(useGestureStore.getState().bleStatus).toBe('scanning')
    setBleStatus('connecting')
    expect(useGestureStore.getState().bleStatus).toBe('connecting')
    setBleStatus('connected')
    expect(useGestureStore.getState().bleStatus).toBe('connected')
    setBleStatus('disconnected')
    expect(useGestureStore.getState().bleStatus).toBe('disconnected')
  })

  it('accumulates BLE devices during scan', () => {
    const { addBleDevice, clearBleDevices } = useGestureStore.getState()
    addBleDevice({ deviceId: 'AA:BB:CC', name: 'Arduino', rssi: -42 })
    addBleDevice({ deviceId: 'DD:EE:FF', name: 'Arduino', rssi: -67 })
    expect(useGestureStore.getState().bleDevices).toHaveLength(2)
    expect(useGestureStore.getState().bleDevices[0].rssi).toBe(-42)

    clearBleDevices()
    expect(useGestureStore.getState().bleDevices).toEqual([])
  })

  it('does not duplicate devices with same deviceId', () => {
    const { addBleDevice } = useGestureStore.getState()
    addBleDevice({ deviceId: 'AA:BB:CC', name: 'Arduino', rssi: -42 })
    addBleDevice({ deviceId: 'AA:BB:CC', name: 'Arduino', rssi: -50 })
    const devices = useGestureStore.getState().bleDevices
    expect(devices).toHaveLength(1)
    expect(devices[0].rssi).toBe(-50)
  })

  it('stores connected device id', () => {
    useGestureStore.getState().setBleDeviceId('AA:BB:CC')
    expect(useGestureStore.getState().bleDeviceId).toBe('AA:BB:CC')
  })

  it('toggles touch controls and BLE panel visibility', () => {
    const { setShowTouchControls, setShowBlePanel } = useGestureStore.getState()
    setShowTouchControls(true)
    expect(useGestureStore.getState().showTouchControls).toBe(true)
    setShowBlePanel(true)
    expect(useGestureStore.getState().showBlePanel).toBe(true)
  })
})
