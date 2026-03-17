import { useGestureStore } from '../../store/useGestureStore'
import { SECTIONS, INSTRUMENT_KEYS } from '../../config/sections'
import './TouchControls.css'

export default function TouchControls() {
  const started = useGestureStore((s) => s.started)
  const activeSections = useGestureStore((s) => s.activeSections)
  const isTutti = useGestureStore((s) => s.isTutti)
  const addSection = useGestureStore((s) => s.addSection)
  const bleStatus = useGestureStore((s) => s.bleStatus)
  const showTouchControls = useGestureStore((s) => s.showTouchControls)

  if (!started) return null

  const visible = bleStatus !== 'connected' || showTouchControls

  return (
    <div className={`touch-controls${visible ? '' : ' touch-controls--hidden'}`}>
      {INSTRUMENT_KEYS.map((key) => {
        const section = SECTIONS[key]
        const isActive = activeSections.includes(key)
        return (
          <button
            key={key}
            className={`touch-btn${isActive ? ' touch-btn--active' : ''}${isTutti ? ' touch-btn--tutti' : ''}`}
            style={{ '--section-color': section.color }}
            onPointerDown={() => addSection(key)}
            aria-label={section.name}
          >
            <span className="touch-btn-label">{section.name.charAt(0)}</span>
          </button>
        )
      })}
    </div>
  )
}
