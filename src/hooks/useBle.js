import { useEffect, useRef, useCallback } from 'react'
import { Capacitor } from '@capacitor/core'
import { useGestureStore } from '../store/useGestureStore'
import { BleManager } from '../ble/BleManager'
import { BLE_CONFIG, resolveGesture } from '../config/ble'

const isNative = Capacitor.isNativePlatform()

export function useBle() {
  const reconnectAttempts = useRef(0)
  const reconnectTimer = useRef(null)
  const scanTimer = useRef(null)
  const idleTimer = useRef(null)
  const connectRef = useRef(null)

  const resetIdleTimer = useCallback(() => {
    clearTimeout(idleTimer.current)
    idleTimer.current = setTimeout(() => {
      useGestureStore.getState().resetSections()
    }, BLE_CONFIG.IDLE_TIMEOUT)
  }, [])

  const clearIdleTimer = useCallback(() => {
    clearTimeout(idleTimer.current)
  }, [])

  const connectToDevice = useCallback(async (deviceId) => {
    const { setBleStatus, setBleDeviceId, setShowBlePanel } =
      useGestureStore.getState()

    setBleStatus('connecting')

    try {
      await BleManager.connect(
        deviceId,
        (disconnectedId) => {
          setBleStatus('disconnected')
          setBleDeviceId(null)
          attemptReconnect(disconnectedId)
        },
        (probs) => {
          const gesture = resolveGesture(probs)
          if (gesture) {
            useGestureStore.getState().processGesture(gesture.label, gesture.confidence)
            resetIdleTimer()
          }
        },
      )

      reconnectAttempts.current = 0
      setBleStatus('connected')
      setBleDeviceId(deviceId)
      setShowBlePanel(false)
    } catch (err) {
      setBleStatus('disconnected')
      throw err
    }
  }, [resetIdleTimer])

  connectRef.current = connectToDevice

  const attemptReconnect = useCallback((deviceId) => {
    const store = useGestureStore.getState()
    if (store.bleStatus === 'connected') return
    if (reconnectAttempts.current >= BLE_CONFIG.RECONNECT_MAX_ATTEMPTS) {
      useGestureStore.getState().setBleStatus('disconnected')
      return
    }

    const delay =
      BLE_CONFIG.RECONNECT_DELAY * (reconnectAttempts.current + 1)
    reconnectTimer.current = setTimeout(async () => {
      reconnectAttempts.current++
      try {
        await connectRef.current(deviceId)
      } catch {
        attemptReconnect(deviceId)
      }
    }, delay)
  }, [])

  useEffect(() => {
    if (!isNative) return

    BleManager.initialize().catch((err) => {
      console.warn('BLE init failed:', err)
    })

    return () => {
      clearTimeout(reconnectTimer.current)
      clearTimeout(scanTimer.current)
      clearIdleTimer()
      BleManager.dispose()
    }
  }, [clearIdleTimer])

  const startScan = useCallback(async () => {
    const { setBleStatus, clearBleDevices, addBleDevice } =
      useGestureStore.getState()

    clearBleDevices()
    setBleStatus('scanning')

    try {
      await BleManager.startScan((device) => {
        addBleDevice(device)
      })
    } catch (err) {
      setBleStatus('idle')
      throw err
    }

    clearTimeout(scanTimer.current)
    scanTimer.current = setTimeout(async () => {
      await BleManager.stopScan()
      const state = useGestureStore.getState()
      if (state.bleStatus === 'scanning') {
        setBleStatus('idle')
      }
    }, BLE_CONFIG.SCAN_TIMEOUT)
  }, [])

  const stopScan = useCallback(async () => {
    clearTimeout(scanTimer.current)
    await BleManager.stopScan()
    const state = useGestureStore.getState()
    if (state.bleStatus === 'scanning') {
      useGestureStore.getState().setBleStatus('idle')
    }
  }, [])

  const connect = useCallback(async (deviceId) => {
    clearTimeout(scanTimer.current)
    await BleManager.stopScan()
    await connectToDevice(deviceId)
  }, [connectToDevice])

  const disconnect = useCallback(async () => {
    clearTimeout(reconnectTimer.current)
    clearIdleTimer()
    reconnectAttempts.current = 0
    await BleManager.disconnect()
    useGestureStore.getState().setBleStatus('idle')
    useGestureStore.getState().setBleDeviceId(null)
    useGestureStore.getState().resetSections()
  }, [clearIdleTimer])

  return { startScan, stopScan, connect, disconnect }
}
