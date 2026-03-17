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

    try {
      await BleClient.requestLEScan(
        { services: [BLE_CONFIG.SERVICE_UUID], allowDuplicates: false },
        (result) => {
          const name = result.localName || result.device.name || ''

          if (!name.includes(BLE_CONFIG.DEVICE_NAME) && name !== '') {
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
    try {
      await BleClient.disconnect(deviceId)
    } catch {
      // Ignorar
    }

    await BleClient.connect(deviceId, () => {
      this.connectedDeviceId = null
      onDisconnect?.(deviceId)
    })

    this.connectedDeviceId = deviceId

    await BleClient.startNotifications(
      deviceId,
      BLE_CONFIG.SERVICE_UUID,
      BLE_CONFIG.CHARACTERISTIC_UUID,
      (value) => {
        if (value.byteLength !== BLE_CONFIG.NUM_CLASSES) return

        const probs = Array.from(
          { length: BLE_CONFIG.NUM_CLASSES },
          (_, i) => value.getUint8(i) / 255,
        )
        onNotification?.(probs)
      },
    )
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
