// src/components/overlay/TouchToggle.jsx
import { useGestureStore } from '../../store/useGestureStore'
import './TouchToggle.css'

export default function TouchToggle() {
  const started = useGestureStore((s) => s.started)
  const bleStatus = useGestureStore((s) => s.bleStatus)
  const showTouchControls = useGestureStore((s) => s.showTouchControls)
  const setShowTouchControls = useGestureStore((s) => s.setShowTouchControls)

  if (!started || bleStatus !== 'connected') return null

  return (
    <button
      className="touch-toggle"
      onClick={() => setShowTouchControls(!showTouchControls)}
      aria-label={showTouchControls ? 'Ocultar controles' : 'Mostrar controles'}
    >
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M18 11V6a2 2 0 0 0-2-2a2 2 0 0 0-2 2" />
        <path d="M14 10V4a2 2 0 0 0-2-2a2 2 0 0 0-2 2v6" />
        <path d="M10 10.5V6a2 2 0 0 0-2-2a2 2 0 0 0-2 2v8" />
        <path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.9-5.7-2.4" />
        <path d="M3 15.1c-.5-.3-1-.7-1.3-1.2" />
      </svg>
    </button>
  )
}
