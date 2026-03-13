import { useGestureStore } from '../../store/useGestureStore'
import { SECTIONS } from '../../config/sections'
import './Overlay.css'

const BLE_DISPLAY = {
  idle:         { color: 'var(--color-ble-disconnected)', label: 'Sin conexión' },
  scanning:     { color: 'var(--color-ble-disconnected)', label: 'Buscando...',   blink: true },
  connecting:   { color: 'var(--color-accent)',           label: 'Conectando...' },
  connected:    { color: 'var(--color-ble-connected)',    label: 'Conectado' },
  disconnected: { color: 'var(--color-ble-disconnected)', label: 'Sin conexión' },
}

export default function Overlay() {
  const started = useGestureStore((s) => s.started)
  const bleStatus = useGestureStore((s) => s.bleStatus)
  const currentGesture = useGestureStore((s) => s.currentGesture)
  const activeSection = useGestureStore((s) => s.activeSection)
  const setShowBlePanel = useGestureStore((s) => s.setShowBlePanel)

  if (!started) return null

  const sectionData = activeSection ? SECTIONS[activeSection] : null
  const ble = BLE_DISPLAY[bleStatus] || BLE_DISPLAY.idle

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
        {sectionData && (
          <div className="active-section" style={{ color: sectionData.color }}>
            {sectionData.name}
          </div>
        )}
        <div className="gesture-display">
          <span className="gesture-label">gesto</span>
          <span className="gesture-value">{currentGesture.toUpperCase()}</span>
        </div>
      </footer>
    </div>
  )
}
