import { useGestureStore } from '../../store/useGestureStore'
import { SECTIONS } from '../../config/sections'
import './TouchControls.css'

const GESTURE_MAP = {
  violines: 'infinito',
  cuerdas: 'm',
  madera: 'maracas',
  metal: 'u',
  tutti: 'tutti',
}

export default function TouchControls() {
  const started = useGestureStore((s) => s.started)
  const activeSection = useGestureStore((s) => s.activeSection)
  const setGesture = useGestureStore((s) => s.setGesture)

  if (!started) return null

  return (
    <div className="touch-controls">
      {Object.entries(SECTIONS).map(([key, section]) => (
        <button
          key={key}
          className={`touch-btn ${key === activeSection ? 'touch-btn--active' : ''}`}
          style={{
            '--section-color': section.color,
          }}
          onPointerDown={() => setGesture(GESTURE_MAP[key])}
          aria-label={section.name}
        >
          <span className="touch-btn-label">{section.name.charAt(0)}</span>
        </button>
      ))}
      <button
        className="touch-btn touch-btn--silence"
        onPointerDown={() => setGesture('silencio')}
        aria-label="Silencio"
      >
        <span className="touch-btn-label">&times;</span>
      </button>
    </div>
  )
}
