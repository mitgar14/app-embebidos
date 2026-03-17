import { useGestureStore } from '../../store/useGestureStore'
import { SECTIONS } from '../../config/sections'
import './Overlay.css'

const BLE_DISPLAY = {
  idle:         { color: 'var(--color-ble-disconnected)', label: 'Sin conexion' },
  scanning:     { color: 'var(--color-ble-disconnected)', label: 'Buscando...',   blink: true },
  connecting:   { color: 'var(--color-accent)',           label: 'Conectando...' },
  connected:    { color: 'var(--color-ble-connected)',    label: 'Conectado' },
  disconnected: { color: 'var(--color-ble-disconnected)', label: 'Reconectando...' },
}

export default function Overlay() {
  const started = useGestureStore((s) => s.started)
  const bleStatus = useGestureStore((s) => s.bleStatus)
  const activeSections = useGestureStore((s) => s.activeSections)
  const isTutti = useGestureStore((s) => s.isTutti)
  const currentGesture = useGestureStore((s) => s.currentGesture)
  const setShowBlePanel = useGestureStore((s) => s.setShowBlePanel)

  if (!started) return null

  const ble = BLE_DISPLAY[bleStatus] || BLE_DISPLAY.idle

  const lastSection = activeSections.length > 0
    ? SECTIONS[activeSections[activeSections.length - 1]]
    : null

  return (
    <div className="overlay">
      <header className="overlay-header">
        <button
          className="ble-status"
          onClick={() => setShowBlePanel(true)}
          aria-label="Abrir panel Bluetooth"
        >
          <span
            className={`ble-dot${ble.blink ? ' ble-dot--blink' : ''}`}
            style={{ background: ble.color }}
          />
          <span className="ble-label">{ble.label}</span>
        </button>
        <div className="composition-info">
          <span className="composition-title">Beethoven</span>
          <span className="composition-detail">Sinf. No. 7, II</span>
        </div>
      </header>

      <footer className="overlay-footer">
        {isTutti ? (
          <div className="active-section" style={{ color: SECTIONS.tutti.color }}>
            Tutti
          </div>
        ) : lastSection ? (
          <div className="active-section" style={{ color: lastSection.color }}>
            {lastSection.name}
          </div>
        ) : null}
        {currentGesture && (
          <div className="gesture-display">
            <span className="gesture-label">gesto</span>
            <span className="gesture-value">{currentGesture.toUpperCase()}</span>
          </div>
        )}
      </footer>
    </div>
  )
}
