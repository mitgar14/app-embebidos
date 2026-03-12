import Scene from './components/Scene'
import { useKeyboardGestures } from './hooks/useKeyboardGestures'

export default function App() {
  useKeyboardGestures()
  return <Scene />
}
