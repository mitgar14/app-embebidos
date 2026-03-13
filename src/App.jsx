import Scene from './components/Scene'
import StartScreen from './components/overlay/StartScreen'
import Overlay from './components/overlay/Overlay'
import TouchControls from './components/overlay/TouchControls'
import BlePanel from './components/overlay/BlePanel'
import TouchToggle from './components/overlay/TouchToggle'
import { useKeyboardGestures } from './hooks/useKeyboardGestures'
import { useAudio } from './hooks/useAudio'
import { useBle } from './hooks/useBle'

export default function App() {
  useKeyboardGestures()
  const audioRef = useAudio()
  const ble = useBle()

  return (
    <>
      <Scene audioRef={audioRef} />
      <Overlay />
      <TouchControls />
      <BlePanel
        onStartScan={ble.startScan}
        onStopScan={ble.stopScan}
        onConnect={ble.connect}
      />
      <TouchToggle />
      <StartScreen />
    </>
  )
}
