import Scene from './components/Scene'
import StartScreen from './components/overlay/StartScreen'
import Overlay from './components/overlay/Overlay'
import TouchControls from './components/overlay/TouchControls'
import { useKeyboardGestures } from './hooks/useKeyboardGestures'
import { useAudio } from './hooks/useAudio'

export default function App() {
  useKeyboardGestures()
  const audioRef = useAudio()

  return (
    <>
      <Scene audioRef={audioRef} />
      <Overlay />
      <TouchControls />
      <StartScreen />
    </>
  )
}
