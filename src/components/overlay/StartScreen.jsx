import { useGestureStore } from '../../store/useGestureStore'
import './StartScreen.css'

export default function StartScreen() {
  const started = useGestureStore((s) => s.started)
  const setStarted = useGestureStore((s) => s.setStarted)

  if (started) return null

  return (
    <div className="start-screen">
      <h1 className="start-title">Il Podio</h1>
      <p className="start-subtitle">Beethoven — Sinfonía No. 7, II</p>
      <button className="start-button" onClick={() => setStarted(true)}>
        Comenzar
      </button>
    </div>
  )
}
