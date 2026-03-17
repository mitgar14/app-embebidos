import { describe, it, expect, beforeEach } from 'vitest'
import { useGestureStore } from './useGestureStore'

describe('useGestureStore', () => {
  beforeEach(() => {
    useGestureStore.setState({
      currentGesture: null,
      gestureConfidence: 0,
      activeSections: [],
      isTutti: false,
      bleStatus: 'idle',
      bleDeviceId: null,
      bleDevices: [],
      showTouchControls: false,
      showBlePanel: false,
      started: false,
    })
  })

  it('starts with idle BLE status and null gesture', () => {
    const state = useGestureStore.getState()
    expect(state.activeSections).toEqual([])
    expect(state.currentGesture).toBe(null)
    expect(state.isTutti).toBe(false)
    expect(state.bleStatus).toBe('idle')
    expect(state.bleDeviceId).toBe(null)
    expect(state.bleDevices).toEqual([])
  })

  it('accumulates sections via processGesture', () => {
    useGestureStore.getState().processGesture('u', 0.95)
    expect(useGestureStore.getState().activeSections).toEqual(['violines'])
    expect(useGestureStore.getState().currentGesture).toBe('u')

    useGestureStore.getState().processGesture('m', 0.88)
    expect(useGestureStore.getState().activeSections).toEqual(['violines', 'cuerdas'])
  })

  it('does not duplicate sections', () => {
    useGestureStore.getState().processGesture('u', 0.9)
    useGestureStore.getState().processGesture('u', 0.85)
    expect(useGestureStore.getState().activeSections).toEqual(['violines'])
  })

  it('sets isTutti when all 4 sections are active', () => {
    const { processGesture } = useGestureStore.getState()
    processGesture('u', 0.9)
    processGesture('m', 0.9)
    processGesture('maracas', 0.9)
    expect(useGestureStore.getState().isTutti).toBe(false)
    processGesture('silencio', 0.9)
    expect(useGestureStore.getState().isTutti).toBe(true)
  })

  it('infinito is keep-alive (does not add section)', () => {
    useGestureStore.getState().processGesture('infinito', 0.95)
    expect(useGestureStore.getState().activeSections).toEqual([])
    expect(useGestureStore.getState().currentGesture).toBe('infinito')
  })

  it('resetSections clears everything', () => {
    useGestureStore.getState().processGesture('u', 0.9)
    useGestureStore.getState().processGesture('m', 0.9)
    useGestureStore.getState().resetSections()
    expect(useGestureStore.getState().activeSections).toEqual([])
    expect(useGestureStore.getState().isTutti).toBe(false)
    expect(useGestureStore.getState().currentGesture).toBe(null)
  })

  it('addSection works for touch controls', () => {
    useGestureStore.getState().addSection('madera')
    expect(useGestureStore.getState().activeSections).toEqual(['madera'])
    useGestureStore.getState().addSection('madera')
    expect(useGestureStore.getState().activeSections).toEqual(['madera'])
  })

  it('tracks BLE status transitions', () => {
    const { setBleStatus } = useGestureStore.getState()
    setBleStatus('scanning')
    expect(useGestureStore.getState().bleStatus).toBe('scanning')
    setBleStatus('connecting')
    expect(useGestureStore.getState().bleStatus).toBe('connecting')
    setBleStatus('connected')
    expect(useGestureStore.getState().bleStatus).toBe('connected')
  })

  it('accumulates BLE devices during scan', () => {
    const { addBleDevice, clearBleDevices } = useGestureStore.getState()
    addBleDevice({ deviceId: 'AA:BB:CC', name: 'Arduino', rssi: -42 })
    addBleDevice({ deviceId: 'DD:EE:FF', name: 'Arduino', rssi: -67 })
    expect(useGestureStore.getState().bleDevices).toHaveLength(2)

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
})
