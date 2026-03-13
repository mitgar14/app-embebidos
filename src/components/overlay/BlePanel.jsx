// src/components/overlay/BlePanel.jsx
import { useEffect } from 'react'
import { useGestureStore } from '../../store/useGestureStore'
import './BlePanel.css'

function rssiToBars(rssi) {
  if (rssi >= -50) return '\u2582\u2584\u2586'
  if (rssi >= -70) return '\u2582\u2584'
  return '\u2582'
}

function partialMac(deviceId) {
  if (!deviceId) return ''
  const clean = deviceId.replace(/[:-]/g, '')
  return clean.slice(-4).toUpperCase()
}

export default function BlePanel({ onStartScan, onStopScan, onConnect }) {
  const showBlePanel = useGestureStore((s) => s.showBlePanel)
  const setShowBlePanel = useGestureStore((s) => s.setShowBlePanel)
  const bleStatus = useGestureStore((s) => s.bleStatus)
  const bleDevices = useGestureStore((s) => s.bleDevices)

  useEffect(() => {
    if (showBlePanel && bleStatus !== 'connecting') {
      onStartScan().catch((err) => {
        console.warn('BLE scan failed:', err)
      })
    }
    return () => {
      if (showBlePanel) {
        onStopScan()
      }
    }
  }, [showBlePanel])

  if (!showBlePanel) return null

  const handleConnect = async (deviceId) => {
    try {
      await onConnect(deviceId)
    } catch (err) {
      console.error('BLE connect failed:', err)
    }
  }

  const handleClose = () => {
    onStopScan()
    setShowBlePanel(false)
  }

  const handleRetry = () => {
    onStartScan()
  }

  const isScanning = bleStatus === 'scanning'
  const isConnecting = bleStatus === 'connecting'

  return (
    <div className="ble-panel">
      <div className="ble-panel-content">
        <h2 className="ble-panel-title">Dispositivos cercanos</h2>

        {isConnecting ? (
          <p className="ble-panel-status">Conectando...</p>
        ) : (
          <>
            <div className="ble-device-list">
              {bleDevices.map((device) => (
                <button
                  key={device.deviceId}
                  className="ble-device-item"
                  onClick={() => handleConnect(device.deviceId)}
                  disabled={isConnecting}
                >
                  <span className="ble-device-name">{device.name}</span>
                  <span className="ble-device-signal">
                    <span className="ble-device-bars">{rssiToBars(device.rssi)}</span>
                    <span className="ble-device-rssi">{device.rssi} dBm</span>
                  </span>
                  <span className="ble-device-mac">{partialMac(device.deviceId)}</span>
                </button>
              ))}
            </div>

            {isScanning && (
              <p className="ble-panel-status">Buscando...</p>
            )}

            {!isScanning && bleDevices.length === 0 && (
              <div className="ble-panel-empty">
                <p>No se encontraron dispositivos cercanos</p>
                <button className="ble-panel-btn" onClick={handleRetry}>
                  Reintentar
                </button>
              </div>
            )}
          </>
        )}

        <button className="ble-panel-btn ble-panel-btn--cancel" onClick={handleClose}>
          Cancelar
        </button>
      </div>
    </div>
  )
}
