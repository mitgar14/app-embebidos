// src/ble/BleManager.js
import { BleClient } from '@capacitor-community/bluetooth-le'
import { BLE_CONFIG } from '../config/ble'

class BleManagerClass {
  constructor() {
    this.initialized = false
    this.scanning = false
    this.connectedDeviceId = null
  }

  async initialize() {
    if (this.initialized) return
    await BleClient.initialize({ androidNeverForLocation: true })
    this.initialized = true
  }

  async startScan(onResult) {
    if (!this.initialized || this.scanning) return
    this.scanning = true
    console.log('[BLE] Starting scan, filtering by name:', BLE_CONFIG.DEVICE_NAME)

    try {
      await BleClient.requestLEScan(
        { allowDuplicates: false },
        (result) => {
          const name = result.localName || result.device.name || ''
          console.log('[BLE] Scan found:', name || '(sin nombre)', result.device.deviceId, 'RSSI:', result.rssi)

          if (!name.includes(BLE_CONFIG.DEVICE_NAME)) {
            return
          }

          const isKnown =
            result.device.deviceId.toUpperCase().replace(/[:-]/g, '') ===
            BLE_CONFIG.KNOWN_MAC.replace(/[:-]/g, '')

          onResult({
            deviceId: result.device.deviceId,
            name: name || BLE_CONFIG.DEVICE_NAME,
            rssi: result.rssi ?? -100,
            isKnown,
          })
        },
      )
    } catch (err) {
      this.scanning = false
      throw err
    }
  }

  async stopScan() {
    if (!this.initialized || !this.scanning) return
    await BleClient.stopLEScan()
    this.scanning = false
  }

  async connect(deviceId, onDisconnect, onNotification) {
    console.log('[BLE] Connecting to:', deviceId)

    // Limpiar GATT handle previo (workaround Android GATT 133)
    try {
      console.log('[BLE] Pre-disconnect cleanup...')
      await BleClient.disconnect(deviceId)
      console.log('[BLE] Pre-disconnect done')
    } catch (e) {
      console.log('[BLE] Pre-disconnect skipped:', e.message)
    }

    // Pausa para que Android libere el GATT handle
    await new Promise((r) => setTimeout(r, 1000))

    console.log('[BLE] Calling BleClient.connect...')
    await BleClient.connect(deviceId, () => {
      console.warn('[BLE] DISCONNECTED by peripheral:', deviceId)
      this.connectedDeviceId = null
      onDisconnect?.(deviceId)
    })
    console.log('[BLE] Connected! Starting service discovery...')

    this.connectedDeviceId = deviceId

    console.log('[BLE] Subscribing to notifications on', BLE_CONFIG.SERVICE_UUID, BLE_CONFIG.CHARACTERISTIC_UUID)
    try {
      await BleClient.startNotifications(
        deviceId,
        BLE_CONFIG.SERVICE_UUID,
        BLE_CONFIG.CHARACTERISTIC_UUID,
        (value) => {
          console.log('[BLE] Notification received, bytes:', value.byteLength)
          if (value.byteLength !== BLE_CONFIG.NUM_CLASSES) {
            console.warn('[BLE] Unexpected payload size:', value.byteLength, '(expected', BLE_CONFIG.NUM_CLASSES, ')')
            return
          }

          const probs = Array.from(
            { length: BLE_CONFIG.NUM_CLASSES },
            (_, i) => value.getUint8(i) / 255,
          )
          console.log('[BLE] Probs:', probs.map(p => p.toFixed(2)).join(', '))
          onNotification?.(probs)
        },
      )
      console.log('[BLE] Notifications subscribed successfully')
    } catch (e) {
      console.error('[BLE] startNotifications FAILED:', e.message)
      throw e
    }
  }

  async disconnect() {
    if (!this.connectedDeviceId) return
    const deviceId = this.connectedDeviceId

    try {
      await BleClient.stopNotifications(
        deviceId,
        BLE_CONFIG.SERVICE_UUID,
        BLE_CONFIG.CHARACTERISTIC_UUID,
      )
    } catch { /* ignore */ }

    try {
      await BleClient.disconnect(deviceId)
    } catch { /* ignore */ }

    this.connectedDeviceId = null
  }

  async dispose() {
    try { await this.stopScan() } catch { /* cleanup */ }
    try { await this.disconnect() } catch { /* cleanup */ }
    this.initialized = false
  }
}

export const BleManager = new BleManagerClass()
