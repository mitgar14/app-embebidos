import { lazy, Suspense, useEffect } from 'react'
import SceneErrorBoundary from './components/SceneErrorBoundary'
import StartScreen from './components/overlay/StartScreen'
import Overlay from './components/overlay/Overlay'
import TouchControls from './components/overlay/TouchControls'
import BlePanel from './components/overlay/BlePanel'
import TouchToggle from './components/overlay/TouchToggle'
import { useKeyboardGestures } from './hooks/useKeyboardGestures'
import { useAudio } from './hooks/useAudio'
import { useBle } from './hooks/useBle'

const Scene = lazy(() => import('./components/Scene'))

export default function App() {
  useKeyboardGestures()
  const audioRef = useAudio()
  const ble = useBle()

  // Remove the HTML loader after React has painted the DOM.
  // useEffect fires AFTER the browser paint, so UI behind the loader is visible.
  useEffect(() => {
    const loader = document.getElementById('app-loader')
    if (!loader) return
    loader.classList.add('fade-out')
    loader.addEventListener('transitionend', () => loader.remove(), { once: true })
  }, [])

  return (
    <>
      <SceneErrorBoundary>
        <Suspense fallback={null}>
          <Scene audioRef={audioRef} />
        </Suspense>
      </SceneErrorBoundary>
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
