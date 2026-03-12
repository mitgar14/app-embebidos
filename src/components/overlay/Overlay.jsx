import { useGestureStore } from '../../store/useGestureStore'
import { SECTIONS } from '../../config/sections'
import './Overlay.css'

export default function Overlay() {
  const started = useGestureStore((s) => s.started)
  const bleConnected = useGestureStore((s) => s.bleConnected)
  const currentGesture = useGestureStore((s) => s.currentGesture)
  const activeSection = useGestureStore((s) => s.activeSection)

  if (!started) return null

  const sectionData = activeSection ? SECTIONS[activeSection] : null

  return (
    <div className="overlay">
      <header className="overlay-header">
        <div className="ble-status">
          <span
            className="ble-dot"
            style={{ background: bleConnected ? 'var(--color-ble-connected)' : 'var(--color-ble-disconnected)' }}
          />
          <span className="ble-label">{bleConnected ? 'Conectado' : 'Sin conexión'}</span>
        </div>
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
