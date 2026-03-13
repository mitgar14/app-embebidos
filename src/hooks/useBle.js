import { useEffect, useRef, useCallback } from 'react'
import { Capacitor } from '@capacitor/core'
import { useGestureStore } from '../store/useGestureStore'
import { BleManager } from '../ble/BleManager'
import { BLE_CONFIG, BYTE_TO_GESTURE } from '../config/ble'

const isNative = Capacitor.isNativePlatform()

export function useBle() {
  const reconnectAttempts = useRef(0)
  const reconnectTimer = useRef(null)
  const scanTimer = useRef(null)
  const connectRef = useRef(null)

  // connectToDevice como función estable vía ref (evita deps circulares)
  const connectToDevice = useCallback(async (deviceId) => {
    const { setBleStatus, setBleDeviceId, setGesture, setShowBlePanel } =
      useGestureStore.getState()

    setBleStatus('connecting')

    try {
      await BleManager.connect(
        deviceId,
        // onDisconnect
        (disconnectedId) => {
          setBleStatus('disconnected')
          setBleDeviceId(null)
          // Usar ref para evitar dependencia circular
          attemptReconnect(disconnectedId)
        },
        // onNotification
        (byte) => {
          const gesture = BYTE_TO_GESTURE[byte]
          if (gesture) {
            setGesture(gesture)
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
  }, [])

  // Guardar ref estable para uso en attemptReconnect
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
      BleManager.dispose()
    }
  }, [])

  const startScan = useCallback(async () => {
    const { setBleStatus, clearBleDevices, addBleDevice } =
      useGestureStore.getState()

    clearBleDevices()
    setBleStatus('scanning')

    await BleManager.startScan((device) => {
      addBleDevice(device)
    })

    // Timeout de escaneo — guardar ref para cleanup
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
    reconnectAttempts.current = 0
    await BleManager.disconnect()
    useGestureStore.getState().setBleStatus('idle')
    useGestureStore.getState().setBleDeviceId(null)
  }, [])

  return { startScan, stopScan, connect, disconnect }
}
