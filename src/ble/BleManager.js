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
        { allowDuplicates: false },
        (result) => {
          onResult({
            deviceId: result.device.deviceId,
            name: result.localName || result.device.name || 'Desconocido',
            rssi: result.rssi ?? -100,
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
    // Workaround Android: disconnect antes de connect para limpiar GATT handle
    try {
      await BleClient.disconnect(deviceId)
    } catch {
      // Ignorar — puede no estar conectado
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
        const byte = value.getUint8(0)
        onNotification?.(byte)
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
    } catch {
      // Ignorar si ya estaba desconectado
    }

    try {
      await BleClient.disconnect(deviceId)
    } catch {
      // Ignorar
    }

    this.connectedDeviceId = null
  }

  async dispose() {
    try { await this.stopScan() } catch { /* cleanup */ }
    try { await this.disconnect() } catch { /* cleanup */ }
    this.initialized = false
  }
}

export const BleManager = new BleManagerClass()
