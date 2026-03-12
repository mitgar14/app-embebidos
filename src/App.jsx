import Scene from './components/Scene'
import { useKeyboardGestures } from './hooks/useKeyboardGestures'
import { useAudio } from './hooks/useAudio'
import { useGestureStore } from './store/useGestureStore'

export default function App() {
  useKeyboardGestures()
  useAudio()

  const started = useGestureStore((s) => s.started)
  const setStarted = useGestureStore((s) => s.setStarted)

  return (
    <div onClick={() => !started && setStarted(true)} style={{ width: '100%', height: '100%' }}>
      <Scene />
    </div>
  )
}
