// src/components/overlay/BlePanel.jsx
import { useEffect } from 'react'
import { useGestureStore } from '../../store/useGestureStore'
import { BLE_CONFIG } from '../../config/ble'
import './BlePanel.css'

function rssiToLabel(rssi) {
  if (rssi >= -50) return 'Excelente'
  if (rssi >= -70) return 'Buena'
  return 'Debil'
}

function rssiToBars(rssi) {
  if (rssi >= -50) return 3
  if (rssi >= -70) return 2
  return 1
}

function SignalBars({ rssi }) {
  const bars = rssiToBars(rssi)
  return (
    <svg className="ble-signal-bars" width="16" height="14" viewBox="0 0 16 14" fill="none">
      <rect x="0" y="10" width="3" height="4" rx="0.5"
        fill={bars >= 1 ? 'var(--color-accent)' : 'rgba(237,232,208,0.12)'} />
      <rect x="5" y="6" width="3" height="8" rx="0.5"
        fill={bars >= 2 ? 'var(--color-accent)' : 'rgba(237,232,208,0.12)'} />
      <rect x="10" y="1" width="3" height="13" rx="0.5"
        fill={bars >= 3 ? 'var(--color-accent)' : 'rgba(237,232,208,0.12)'} />
    </svg>
  )
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

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) handleClose()
  }

  const handleRetry = () => {
    onStartScan()
  }

  const isScanning = bleStatus === 'scanning'
  const isConnecting = bleStatus === 'connecting'

  // Ordenar: dispositivos conocidos (MAC match) primero
  const sorted = [...bleDevices].sort((a, b) => {
    if (a.isKnown && !b.isKnown) return -1
    if (!a.isKnown && b.isKnown) return 1
    return b.rssi - a.rssi  // luego por señal
  })

  return (
    <div className="ble-panel" onClick={handleBackdropClick}>
      <div className="ble-modal">
        {/* Header */}
        <div className="ble-modal-header">
          <h2 className="ble-modal-title">Conectar Arduino</h2>
          <button className="ble-modal-close" onClick={handleClose} aria-label="Cerrar">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none"
              stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <line x1="2" y1="2" x2="10" y2="10" />
              <line x1="10" y1="2" x2="2" y2="10" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="ble-modal-body">
          {isConnecting ? (
            <p className="ble-modal-status">Conectando...</p>
          ) : (
            <>
              {sorted.map((device) => (
                <button
                  key={device.deviceId}
                  className={`ble-device-card${device.isKnown ? ' ble-device-card--known' : ''}`}
                  onClick={() => handleConnect(device.deviceId)}
                  disabled={isConnecting}
                >
                  <div className="ble-device-icon">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                      stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M6.5 6.5l11 11M6.5 17.5l11-11M12 2v20M7 7l5-5 5 5M7 17l5 5 5-5" />
                    </svg>
                  </div>
                  <div className="ble-device-info">
                    <span className="ble-device-name">{device.name}</span>
                    <span className="ble-device-meta">
                      {device.isKnown && <span className="ble-device-tag">Tu Arduino</span>}
                      <span className="ble-device-compat">Compatible</span>
                      <span className="ble-device-rssi-label">{rssiToLabel(device.rssi)}</span>
                    </span>
                  </div>
                  <SignalBars rssi={device.rssi} />
                </button>
              ))}

              {!isScanning && bleDevices.length === 0 && (
                <div className="ble-modal-empty">
                  <p>No se encontraron Arduinos cercanos</p>
                  <p className="ble-modal-hint">
                    Verifica que el Arduino este encendido y cerca
                  </p>
                  <button className="ble-modal-btn" onClick={handleRetry}>
                    Reintentar
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="ble-modal-footer">
          {isScanning && (
            <span className="ble-modal-scanning">
              <span className="ble-modal-scanning-dot" />
              Buscando...
            </span>
          )}
          {!isScanning && bleDevices.length > 0 && (
            <span className="ble-modal-scanning ble-modal-scanning--idle">
              Busqueda finalizada
            </span>
          )}
          <button className="ble-modal-btn" onClick={handleClose}>
            Cancelar
          </button>
        </div>
      </div>
    </div>
  )
}
