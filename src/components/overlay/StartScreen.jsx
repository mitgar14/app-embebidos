import { useGestureStore } from '../../store/useGestureStore'
import './StartScreen.css'

export default function StartScreen() {
  const started = useGestureStore((s) => s.started)
  const setStarted = useGestureStore((s) => s.setStarted)
  const setShowBlePanel = useGestureStore((s) => s.setShowBlePanel)
  const bleStatus = useGestureStore((s) => s.bleStatus)

  if (started) return null

  const isConnected = bleStatus === 'connected'

  return (
    <div className="start-screen">
      <h1 className="start-title">Il Podio</h1>
      <p className="start-subtitle">Beethoven — Sinfonía No. 7, II</p>
      <button className="start-button" onClick={() => setStarted(true)}>
        Comenzar
      </button>
      <button
        className="start-ble-link"
        onClick={() => setShowBlePanel(true)}
      >
        {isConnected ? 'Arduino conectado' : 'Conectar Arduino'}
      </button>
    </div>
  )
}
