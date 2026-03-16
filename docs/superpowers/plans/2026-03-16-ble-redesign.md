# BLE Redesign + Accumulative Logic — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rediseñar el flujo BLE (protocolo de 5 bytes, filtrado por UUID/nombre/MAC, panel compacto) e implementar la lógica acumulativa de instrumentos con transición a tutti.

**Architecture:** El store Zustand pasa de sección exclusiva a array acumulativo. BleManager filtra por Service UUID y parsea vectores de probabilidad. Un idle timer resetea las secciones cuando no se detectan gestos. El AudioManager añade `highlightSections()` para stems simultáneos y crossfade a tutti.

**Tech Stack:** React 19, Zustand 5, Vite 8, @capacitor-community/bluetooth-le 7, @capacitor/app (nueva), Web Audio API

**Spec:** `docs/superpowers/specs/2026-03-16-ble-redesign-spec.md`

---

## File Structure

### Modified files

| File | Responsibility |
|------|----------------|
| `src/config/ble.js` | Configuración BLE: UUIDs, MAC, threshold, idle timeout, mapeo de clases |
| `src/config/sections.js` | Separar `INSTRUMENT_SECTIONS` (4 sin tutti) de `SECTIONS` (5 con tutti) |
| `src/store/useGestureStore.js` | Estado acumulativo: `activeSections[]`, `isTutti`, `addSection()`, `resetSections()` |
| `src/ble/BleManager.js` | Filtro UUID en scan, parsing 5 bytes, validación payload |
| `src/hooks/useBle.js` | `resolveGesture()`, idle timer, acumulación, keep-alive |
| `src/audio/AudioManager.js` | `highlightSections()` multi-stem, crossfade tutti, fade idle |
| `src/hooks/useAudio.js` | Reaccionar a `activeSections[]` e `isTutti` en vez de `activeSection` |
| `src/components/overlay/BlePanel.jsx` | Modal compacto con X, max-height, tarjetas, señal legible |
| `src/components/overlay/BlePanel.css` | Estilos del modal rediseñado |
| `src/components/overlay/Overlay.jsx` | Footer plural + null safety en `currentGesture` |
| `src/components/overlay/TouchControls.jsx` | Mapeo invertido, acumulativo toggle-on, sin botón silencio |
| `src/hooks/useKeyboardGestures.js` | KEY_MAP actualizado, lógica acumulativa |
| `src/App.jsx` | Back button handler via @capacitor/app |

### No new files created — all changes are modifications to existing files.

---

## Chunk 1: Foundation — Config, Store, and Dependency

### Task 1: Install @capacitor/app

**Files:**
- Modify: `package.json` (via npm install)

- [ ] **Step 1: Install the dependency**

```bash
npm install @capacitor/app
```

- [ ] **Step 2: Verify installation**

```bash
node -e "require.resolve('@capacitor/app')" && echo "OK"
```

Expected: prints path + "OK"

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: install @capacitor/app for Android back button handler"
```

---

### Task 2: Update BLE config

**Files:**
- Modify: `src/config/ble.js`

- [ ] **Step 1: Rewrite ble.js with new config structure**

Replace the entire file with:

```javascript
// src/config/ble.js

export const BLE_CONFIG = {
  // UUIDs — actualizar cuando el compañero los defina
  SERVICE_UUID: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  CHARACTERISTIC_UUID: 'a1b2c3d5-e5f6-7890-abcd-ef1234567890',

  // Identificación del Arduino
  DEVICE_NAME: 'Arduino_BLE',
  KNOWN_MAC: '31:FB:E1:57:CA:41',

  // Timing
  SCAN_TIMEOUT: 15000,
  RECONNECT_DELAY: 2000,
  RECONNECT_MAX_ATTEMPTS: 5,
  IDLE_TIMEOUT: 3000,

  // Inferencia
  CONFIDENCE_THRESHOLD: 0.60,
  NUM_CLASSES: 5,
}

// Orden exacto de ei_classifier_inferencing_categories del modelo Edge Impulse
export const CLASS_LABELS = ['infinito', 'm', 'maracas', 'silencio', 'u']

// Mapeo gesto → sección instrumental (null = keep-alive, no suma sección)
export const GESTURE_TO_SECTION = {
  u: 'violines',
  m: 'cuerdas',
  maracas: 'madera',
  silencio: 'metal',
  infinito: null,
}

// Todas las secciones instrumentales (sin tutti — tutti es estado, no sección)
export const ALL_INSTRUMENT_SECTIONS = ['violines', 'cuerdas', 'madera', 'metal']

/**
 * Dado un vector de 5 probabilidades [0..1], retorna el gesto ganador
 * o null si ninguno supera el umbral de confianza.
 */
export function resolveGesture(probs) {
  const maxProb = Math.max(...probs)
  if (maxProb < BLE_CONFIG.CONFIDENCE_THRESHOLD) return null

  const maxIndex = probs.indexOf(maxProb)
  return {
    index: maxIndex,
    confidence: maxProb,
    label: CLASS_LABELS[maxIndex],
  }
}
```

- [ ] **Step 2: Verify the app still builds**

```bash
npx vite build 2>&1 | tail -5
```

Expected: build succeeds (may have warnings from other files referencing old exports like `BYTE_TO_GESTURE` — those will be fixed in later tasks).

- [ ] **Step 3: Commit**

```bash
git add src/config/ble.js
git commit -m "feat(config): rewrite BLE config with 5-byte protocol, gesture mapping, resolveGesture"
```

---

### Task 3: Update sections config

**Files:**
- Modify: `src/config/sections.js`

- [ ] **Step 1: Add INSTRUMENT_SECTIONS export**

Replace the file with:

```javascript
export const SECTIONS = {
  violines: {
    name: 'Violines',
    color: '#D4A017',
    position: [-1.8, 0.3, 1.5],
    rotationSpeed: 0.3,
    stem: 'stem_violines',
  },
  cuerdas: {
    name: 'Cuerdas Graves',
    color: '#8B2E2E',
    position: [1.8, 0.3, 1.5],
    rotationSpeed: 0.2,
    stem: 'stem_cuerdas_graves',
  },
  madera: {
    name: 'Vientos Madera',
    color: '#4A7C6F',
    position: [-1.5, 0.8, 0],
    rotationSpeed: 0.25,
    stem: 'stem_vientos_madera',
  },
  metal: {
    name: 'Vientos Metal',
    color: '#CD7F32',
    position: [1.5, 0.8, 0],
    rotationSpeed: 0.35,
    stem: 'stem_vientos_metal',
  },
  tutti: {
    name: 'Tutti',
    color: '#EDE8D0',
    position: [0, 1.5, -1.5],
    rotationSpeed: 0.15,
    stem: 'stem_tutti',
  },
}

// Todas las claves incluyendo tutti (para AudioManager, iteración de stems)
export const SECTION_KEYS = Object.keys(SECTIONS)

// Solo las 4 secciones instrumentales individuales (para UI, 3D, lógica acumulativa)
export const INSTRUMENT_KEYS = SECTION_KEYS.filter((k) => k !== 'tutti')
```

- [ ] **Step 2: Commit**

```bash
git add src/config/sections.js
git commit -m "feat(config): add INSTRUMENT_KEYS export separating individual sections from tutti"
```

---

### Task 4: Rewrite gesture store for accumulative logic

**Files:**
- Modify: `src/store/useGestureStore.js`

- [ ] **Step 1: Rewrite the store**

```javascript
import { create } from 'zustand'
import { GESTURE_TO_SECTION, ALL_INSTRUMENT_SECTIONS } from '../config/ble'

export const useGestureStore = create((set) => ({
  // Gesture state (accumulative)
  currentGesture: null,
  gestureConfidence: 0,
  activeSections: [],
  isTutti: false,
  started: false,

  // BLE state
  bleStatus: 'idle',
  bleDeviceId: null,
  bleDevices: [],
  showTouchControls: false,
  showBlePanel: false,

  // --- Gesture actions ---

  /**
   * Procesa un gesto reconocido: actualiza el gesto actual y acumula su sección.
   */
  processGesture: (label, confidence) => set((state) => {
    const section = GESTURE_TO_SECTION[label] ?? null
    const updates = { currentGesture: label, gestureConfidence: confidence }

    // keep-alive (infinito) no suma sección
    if (!section) return updates

    // Sección ya activa — solo actualizar gesto actual
    if (state.activeSections.includes(section)) return updates

    const next = [...state.activeSections, section]
    const isTutti = next.length === ALL_INSTRUMENT_SECTIONS.length
    return { ...updates, activeSections: next, isTutti }
  }),

  /**
   * Reset completo por idle timeout o desconexión.
   */
  resetSections: () => set({
    activeSections: [],
    isTutti: false,
    currentGesture: null,
    gestureConfidence: 0,
  }),

  /**
   * Agrega una sección manualmente (touch controls).
   */
  addSection: (section) => set((state) => {
    if (!section || state.activeSections.includes(section)) return state
    const next = [...state.activeSections, section]
    const isTutti = next.length === ALL_INSTRUMENT_SECTIONS.length
    return { activeSections: next, isTutti }
  }),

  setStarted: (started) => set({ started }),

  // --- BLE actions ---
  setBleStatus: (bleStatus) => set({ bleStatus }),

  addBleDevice: (device) =>
    set((state) => {
      const idx = state.bleDevices.findIndex((d) => d.deviceId === device.deviceId)
      if (idx >= 0) {
        const updated = [...state.bleDevices]
        updated[idx] = device
        return { bleDevices: updated }
      }
      return { bleDevices: [...state.bleDevices, device] }
    }),

  clearBleDevices: () => set({ bleDevices: [] }),
  setBleDeviceId: (bleDeviceId) => set({ bleDeviceId }),
  setShowTouchControls: (showTouchControls) => set({ showTouchControls }),
  setShowBlePanel: (showBlePanel) => set({ showBlePanel }),
}))
```

- [ ] **Step 2: Commit**

```bash
git add src/store/useGestureStore.js
git commit -m "feat(store): rewrite for accumulative gesture logic with processGesture, addSection, resetSections"
```

---

## Chunk 2: BLE Protocol — Manager, Hook, Scan Filtering

### Task 5: Update BleManager with 5-byte parsing and UUID filtering

**Files:**
- Modify: `src/ble/BleManager.js`

- [ ] **Step 1: Rewrite BleManager**

```javascript
// src/ble/BleManager.js
import { BleClient } from '@capacitor-community/bluetooth-le'
import { BLE_CONFIG } from '../config/ble'

class BleManagerClass {
  constructor() {
    this.initialized = false
    this.scanning = false
    this.connectedDeviceId = null
  }

  async initialize() {
    if (this.initialized) return
    await BleClient.initialize({ androidNeverForLocation: true })
    this.initialized = true
  }

  async startScan(onResult) {
    if (!this.initialized || this.scanning) return
    this.scanning = true

    try {
      await BleClient.requestLEScan(
        { services: [BLE_CONFIG.SERVICE_UUID], allowDuplicates: false },
        (result) => {
          const name = result.localName || result.device.name || ''

          // Capa secundaria: verificar nombre del dispositivo
          if (!name.includes(BLE_CONFIG.DEVICE_NAME) && name !== '') {
            return  // no es un Arduino compatible
          }

          const isKnown =
            result.device.deviceId.toUpperCase().replace(/[:-]/g, '') ===
            BLE_CONFIG.KNOWN_MAC.replace(/[:-]/g, '')

          onResult({
            deviceId: result.device.deviceId,
            name: name || BLE_CONFIG.DEVICE_NAME,
            rssi: result.rssi ?? -100,
            isKnown,
          })
        },
      )
    } catch (err) {
      this.scanning = false
      throw err
    }
  }

  async stopScan() {
    if (!this.initialized || !this.scanning) return
    await BleClient.stopLEScan()
    this.scanning = false
  }

  async connect(deviceId, onDisconnect, onNotification) {
    // Workaround Android: disconnect antes de connect para limpiar GATT handle
    try {
      await BleClient.disconnect(deviceId)
    } catch {
      // Ignorar — puede no estar conectado
    }

    await BleClient.connect(deviceId, () => {
      this.connectedDeviceId = null
      onDisconnect?.(deviceId)
    })

    this.connectedDeviceId = deviceId

    await BleClient.startNotifications(
      deviceId,
      BLE_CONFIG.SERVICE_UUID,
      BLE_CONFIG.CHARACTERISTIC_UUID,
      (value) => {
        // Validar payload: exactamente 5 bytes
        if (value.byteLength !== BLE_CONFIG.NUM_CLASSES) return

        const probs = Array.from(
          { length: BLE_CONFIG.NUM_CLASSES },
          (_, i) => value.getUint8(i) / 255,
        )
        onNotification?.(probs)
      },
    )
  }

  async disconnect() {
    if (!this.connectedDeviceId) return
    const deviceId = this.connectedDeviceId

    try {
      await BleClient.stopNotifications(
        deviceId,
        BLE_CONFIG.SERVICE_UUID,
        BLE_CONFIG.CHARACTERISTIC_UUID,
      )
    } catch {
      // Ignorar si ya estaba desconectado
    }

    try {
      await BleClient.disconnect(deviceId)
    } catch {
      // Ignorar
    }

    this.connectedDeviceId = null
  }

  async dispose() {
    try { await this.stopScan() } catch { /* cleanup */ }
    try { await this.disconnect() } catch { /* cleanup */ }
    this.initialized = false
  }
}

export const BleManager = new BleManagerClass()
```

- [ ] **Step 2: Commit**

```bash
git add src/ble/BleManager.js
git commit -m "feat(ble): add UUID scan filter, 5-byte parsing, payload validation, known MAC detection"
```

---

### Task 6: Rewrite useBle hook with gesture resolution and idle timer

**Files:**
- Modify: `src/hooks/useBle.js`

- [ ] **Step 1: Rewrite useBle**

```javascript
import { useEffect, useRef, useCallback } from 'react'
import { Capacitor } from '@capacitor/core'
import { useGestureStore } from '../store/useGestureStore'
import { BleManager } from '../ble/BleManager'
import { BLE_CONFIG, resolveGesture, GESTURE_TO_SECTION } from '../config/ble'

const isNative = Capacitor.isNativePlatform()

export function useBle() {
  const reconnectAttempts = useRef(0)
  const reconnectTimer = useRef(null)
  const scanTimer = useRef(null)
  const idleTimer = useRef(null)
  const connectRef = useRef(null)

  // --- Idle timer ---
  const resetIdleTimer = useCallback(() => {
    clearTimeout(idleTimer.current)
    idleTimer.current = setTimeout(() => {
      useGestureStore.getState().resetSections()
    }, BLE_CONFIG.IDLE_TIMEOUT)
  }, [])

  const clearIdleTimer = useCallback(() => {
    clearTimeout(idleTimer.current)
  }, [])

  // --- Connection ---
  const connectToDevice = useCallback(async (deviceId) => {
    const { setBleStatus, setBleDeviceId, setShowBlePanel } =
      useGestureStore.getState()

    setBleStatus('connecting')

    try {
      await BleManager.connect(
        deviceId,
        // onDisconnect
        (disconnectedId) => {
          setBleStatus('disconnected')
          setBleDeviceId(null)
          // Idle timer se encarga del fade out del audio
          attemptReconnect(disconnectedId)
        },
        // onNotification — recibe float[5]
        (probs) => {
          const gesture = resolveGesture(probs)
          if (gesture) {
            useGestureStore.getState().processGesture(gesture.label, gesture.confidence)
            resetIdleTimer()
          }
          // Si gesture es null (incierto), NO resetear idle timer → permitir timeout
        },
      )

      reconnectAttempts.current = 0
      setBleStatus('connected')
      setBleDeviceId(deviceId)
      setShowBlePanel(false)
    } catch (err) {
      setBleStatus('disconnected')
      throw err
    }
  }, [resetIdleTimer])

  connectRef.current = connectToDevice

  const attemptReconnect = useCallback((deviceId) => {
    const store = useGestureStore.getState()
    if (store.bleStatus === 'connected') return
    if (reconnectAttempts.current >= BLE_CONFIG.RECONNECT_MAX_ATTEMPTS) {
      useGestureStore.getState().setBleStatus('disconnected')
      return
    }

    const delay =
      BLE_CONFIG.RECONNECT_DELAY * (reconnectAttempts.current + 1)
    reconnectTimer.current = setTimeout(async () => {
      reconnectAttempts.current++
      try {
        await connectRef.current(deviceId)
      } catch {
        attemptReconnect(deviceId)
      }
    }, delay)
  }, [])

  // --- Initialization ---
  useEffect(() => {
    if (!isNative) return

    BleManager.initialize().catch((err) => {
      console.warn('BLE init failed:', err)
    })

    return () => {
      clearTimeout(reconnectTimer.current)
      clearTimeout(scanTimer.current)
      clearIdleTimer()
      BleManager.dispose()
    }
  }, [clearIdleTimer])

  // --- Scan ---
  const startScan = useCallback(async () => {
    const { setBleStatus, clearBleDevices, addBleDevice } =
      useGestureStore.getState()

    clearBleDevices()
    setBleStatus('scanning')

    try {
      await BleManager.startScan((device) => {
        addBleDevice(device)
      })
    } catch (err) {
      setBleStatus('idle')
      throw err
    }

    clearTimeout(scanTimer.current)
    scanTimer.current = setTimeout(async () => {
      await BleManager.stopScan()
      const state = useGestureStore.getState()
      if (state.bleStatus === 'scanning') {
        setBleStatus('idle')
      }
    }, BLE_CONFIG.SCAN_TIMEOUT)
  }, [])

  const stopScan = useCallback(async () => {
    clearTimeout(scanTimer.current)
    await BleManager.stopScan()
    const state = useGestureStore.getState()
    if (state.bleStatus === 'scanning') {
      useGestureStore.getState().setBleStatus('idle')
    }
  }, [])

  const connect = useCallback(async (deviceId) => {
    clearTimeout(scanTimer.current)
    await BleManager.stopScan()
    await connectToDevice(deviceId)
  }, [connectToDevice])

  const disconnect = useCallback(async () => {
    clearTimeout(reconnectTimer.current)
    clearIdleTimer()
    reconnectAttempts.current = 0
    await BleManager.disconnect()
    useGestureStore.getState().setBleStatus('idle')
    useGestureStore.getState().setBleDeviceId(null)
    useGestureStore.getState().resetSections()
  }, [clearIdleTimer])

  return { startScan, stopScan, connect, disconnect }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/hooks/useBle.js
git commit -m "feat(ble): add resolveGesture integration, idle timer, accumulative processGesture"
```

---

## Chunk 3: Audio Engine — Multi-stem and Tutti Crossfade

### Task 7: Update AudioManager for simultaneous stems

**Files:**
- Modify: `src/audio/AudioManager.js`

- [ ] **Step 1: Add highlightSections() and update existing methods**

Replace the file with:

```javascript
import { SECTION_KEYS } from '../config/sections'

const SOLO_KEYS = SECTION_KEYS.filter((k) => k !== 'tutti')

export class AudioManager {
  constructor() {
    this.ctx = null
    this.gains = {}
    this.analysers = {}
    this.elements = {}
    this.stems = []
    this.freqDataBuffers = {}
  }

  async init(stemPaths) {
    this.ctx = new AudioContext()

    for (const key of SECTION_KEYS) {
      const audio = new Audio()
      audio.src = stemPaths[key]
      audio.loop = true
      audio.crossOrigin = 'anonymous'

      const source = this.ctx.createMediaElementSource(audio)
      const gain = this.ctx.createGain()
      const analyser = this.ctx.createAnalyser()

      gain.gain.value = 0.0
      analyser.fftSize = 512

      source.connect(gain)
      gain.connect(analyser)
      analyser.connect(this.ctx.destination)

      this.gains[key] = gain
      this.analysers[key] = analyser
      this.elements[key] = audio
      this.freqDataBuffers[key] = new Uint8Array(analyser.frequencyBinCount)
      this.stems.push(key)
    }
  }

  async resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      await this.ctx.resume()
    }
  }

  playAll() {
    for (const key of SECTION_KEYS) {
      const el = this.elements[key]
      if (el) {
        el.currentTime = 0
        el.play().catch(() => {})
      }
    }
  }

  /**
   * Activa múltiples secciones simultáneamente (lógica acumulativa).
   * @param {string[]} activeSections - Array de secciones activas
   * @param {boolean} isTutti - true cuando todas las secciones están activas
   */
  highlightSections(activeSections, isTutti) {
    const now = this.ctx?.currentTime ?? 0
    const tuttiGain = this.gains.tutti

    if (isTutti) {
      // Crossfade a tutti: fade in tutti, fade out individuales
      if (tuttiGain) tuttiGain.gain.setTargetAtTime(1.0, now, 0.3)
      for (const key of SOLO_KEYS) {
        const gain = this.gains[key]
        if (gain) gain.gain.setTargetAtTime(0.0, now, 0.3)
      }
    } else {
      // Stems individuales: cada activo a 1.0, inactivos a 0.0, tutti a 0.0
      if (tuttiGain) tuttiGain.gain.setTargetAtTime(0.0, now, 0.15)
      for (const key of SOLO_KEYS) {
        const gain = this.gains[key]
        if (!gain) continue
        const target = activeSections.includes(key) ? 1.0 : 0.0
        gain.gain.setTargetAtTime(target, now, 0.15)
      }
    }
  }

  /**
   * Mantener retrocompatibilidad con highlightSection(string) para touch controls.
   * @deprecated Usar highlightSections() en su lugar.
   */
  highlightSection(sectionKey) {
    this.highlightSections(
      sectionKey === 'tutti' ? SOLO_KEYS : [sectionKey],
      sectionKey === 'tutti',
    )
  }

  /**
   * Fade out total (idle timeout o desconexión).
   */
  silence() {
    const now = this.ctx?.currentTime ?? 0
    for (const key of SECTION_KEYS) {
      const gain = this.gains[key]
      if (gain) {
        gain.gain.setTargetAtTime(0.0, now, 0.5)
      }
    }
  }

  dispose() {
    for (const key of SECTION_KEYS) {
      const el = this.elements[key]
      if (el) {
        el.pause()
        el.src = ''
      }
    }
    this.ctx?.close()
  }

  getFrequencyData(sectionKey) {
    const analyser = this.analysers[sectionKey]
    if (!analyser) return null
    const data = this.freqDataBuffers[sectionKey]
    if (!data) return null
    analyser.getByteFrequencyData(data)
    return data
  }

  getAmplitude(sectionKey) {
    const data = this.getFrequencyData(sectionKey)
    if (!data) return 0
    let sum = 0
    for (let i = 0; i < data.length; i++) sum += data[i]
    return sum / (data.length * 255)
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/audio/AudioManager.js
git commit -m "feat(audio): add highlightSections() for simultaneous stems and tutti crossfade"
```

---

### Task 8: Update useAudio hook for accumulative sections

**Files:**
- Modify: `src/hooks/useAudio.js`

- [ ] **Step 1: Rewrite useAudio to watch activeSections and isTutti**

```javascript
import { useRef, useEffect } from 'react'
import { useGestureStore } from '../store/useGestureStore'
import { AudioManager } from '../audio/AudioManager'

const STEM_PATHS = {
  violines: '/audio/stem_violines.mp3',
  cuerdas: '/audio/stem_cuerdas_graves.mp3',
  madera: '/audio/stem_vientos_madera.mp3',
  metal: '/audio/stem_vientos_metal.mp3',
  tutti: '/audio/stem_tutti.mp3',
}

export function useAudio() {
  const managerRef = useRef(null)
  const activeSections = useGestureStore((s) => s.activeSections)
  const isTutti = useGestureStore((s) => s.isTutti)
  const started = useGestureStore((s) => s.started)

  // Inicialización
  useEffect(() => {
    if (!started || managerRef.current) return

    const manager = new AudioManager()
    managerRef.current = manager

    manager.init(STEM_PATHS).then(async () => {
      await manager.resume()
      manager.playAll()
    })

    return () => {
      managerRef.current?.dispose()
      managerRef.current = null
    }
  }, [started])

  // Reaccionar a cambios en secciones activas
  useEffect(() => {
    const manager = managerRef.current
    if (!manager) return

    if (activeSections.length === 0) {
      manager.silence()
    } else {
      manager.highlightSections(activeSections, isTutti)
    }
  }, [activeSections, isTutti])

  return managerRef
}
```

- [ ] **Step 2: Commit**

```bash
git add src/hooks/useAudio.js
git commit -m "feat(audio): react to activeSections[] and isTutti instead of singular activeSection"
```

---

## Chunk 4: UI — BLE Panel Redesign

### Task 9: Redesign BlePanel component (Option C: compact modal)

**Files:**
- Modify: `src/components/overlay/BlePanel.jsx`
- Modify: `src/components/overlay/BlePanel.css`

- [ ] **Step 1: Rewrite BlePanel.jsx**

```jsx
// src/components/overlay/BlePanel.jsx
import { useEffect } from 'react'
import { useGestureStore } from '../../store/useGestureStore'
import { BLE_CONFIG } from '../../config/ble'
import './BlePanel.css'

function rssiToLabel(rssi) {
  if (rssi >= -50) return 'Excelente'
  if (rssi >= -70) return 'Buena'
  return 'Debil'
}

function rssiToBars(rssi) {
  if (rssi >= -50) return 3
  if (rssi >= -70) return 2
  return 1
}

function SignalBars({ rssi }) {
  const bars = rssiToBars(rssi)
  return (
    <svg className="ble-signal-bars" width="16" height="14" viewBox="0 0 16 14" fill="none">
      <rect x="0" y="10" width="3" height="4" rx="0.5"
        fill={bars >= 1 ? 'var(--color-accent)' : 'rgba(237,232,208,0.12)'} />
      <rect x="5" y="6" width="3" height="8" rx="0.5"
        fill={bars >= 2 ? 'var(--color-accent)' : 'rgba(237,232,208,0.12)'} />
      <rect x="10" y="1" width="3" height="13" rx="0.5"
        fill={bars >= 3 ? 'var(--color-accent)' : 'rgba(237,232,208,0.12)'} />
    </svg>
  )
}

export default function BlePanel({ onStartScan, onStopScan, onConnect }) {
  const showBlePanel = useGestureStore((s) => s.showBlePanel)
  const setShowBlePanel = useGestureStore((s) => s.setShowBlePanel)
  const bleStatus = useGestureStore((s) => s.bleStatus)
  const bleDevices = useGestureStore((s) => s.bleDevices)

  useEffect(() => {
    if (showBlePanel && bleStatus !== 'connecting') {
      onStartScan().catch((err) => {
        console.warn('BLE scan failed:', err)
      })
    }
    return () => {
      if (showBlePanel) {
        onStopScan()
      }
    }
  }, [showBlePanel])

  if (!showBlePanel) return null

  const handleConnect = async (deviceId) => {
    try {
      await onConnect(deviceId)
    } catch (err) {
      console.error('BLE connect failed:', err)
    }
  }

  const handleClose = () => {
    onStopScan()
    setShowBlePanel(false)
  }

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) handleClose()
  }

  const handleRetry = () => {
    onStartScan()
  }

  const isScanning = bleStatus === 'scanning'
  const isConnecting = bleStatus === 'connecting'

  // Ordenar: dispositivos conocidos (MAC match) primero
  const sorted = [...bleDevices].sort((a, b) => {
    if (a.isKnown && !b.isKnown) return -1
    if (!a.isKnown && b.isKnown) return 1
    return b.rssi - a.rssi  // luego por señal
  })

  return (
    <div className="ble-panel" onClick={handleBackdropClick}>
      <div className="ble-modal">
        {/* Header */}
        <div className="ble-modal-header">
          <h2 className="ble-modal-title">Conectar Arduino</h2>
          <button className="ble-modal-close" onClick={handleClose} aria-label="Cerrar">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none"
              stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <line x1="2" y1="2" x2="10" y2="10" />
              <line x1="10" y1="2" x2="2" y2="10" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="ble-modal-body">
          {isConnecting ? (
            <p className="ble-modal-status">Conectando...</p>
          ) : (
            <>
              {sorted.map((device) => (
                <button
                  key={device.deviceId}
                  className={`ble-device-card${device.isKnown ? ' ble-device-card--known' : ''}`}
                  onClick={() => handleConnect(device.deviceId)}
                  disabled={isConnecting}
                >
                  <div className="ble-device-icon">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                      stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M6.5 6.5l11 11M6.5 17.5l11-11M12 2v20M7 7l5-5 5 5M7 17l5 5 5-5" />
                    </svg>
                  </div>
                  <div className="ble-device-info">
                    <span className="ble-device-name">{device.name}</span>
                    <span className="ble-device-meta">
                      {device.isKnown && <span className="ble-device-tag">Tu Arduino</span>}
                      <span className="ble-device-compat">Compatible</span>
                      <span className="ble-device-rssi-label">{rssiToLabel(device.rssi)}</span>
                    </span>
                  </div>
                  <SignalBars rssi={device.rssi} />
                </button>
              ))}

              {!isScanning && bleDevices.length === 0 && (
                <div className="ble-modal-empty">
                  <p>No se encontraron Arduinos cercanos</p>
                  <p className="ble-modal-hint">
                    Verifica que el Arduino este encendido y cerca
                  </p>
                  <button className="ble-modal-btn" onClick={handleRetry}>
                    Reintentar
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="ble-modal-footer">
          {isScanning && (
            <span className="ble-modal-scanning">
              <span className="ble-modal-scanning-dot" />
              Buscando...
            </span>
          )}
          {!isScanning && bleDevices.length > 0 && (
            <span className="ble-modal-scanning ble-modal-scanning--idle">
              Busqueda finalizada
            </span>
          )}
          <button className="ble-modal-btn" onClick={handleClose}>
            Cancelar
          </button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Rewrite BlePanel.css**

```css
/* src/components/overlay/BlePanel.css */

/* Backdrop */
.ble-panel {
  position: fixed;
  inset: 0;
  z-index: 150;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(10, 9, 6, 0.85);
  backdrop-filter: blur(8px);
  pointer-events: auto;
  animation: ble-fade-in 0.2s ease;
}

@keyframes ble-fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

/* Modal */
.ble-modal {
  width: 90%;
  max-width: 340px;
  max-height: 50vh;
  background: #131210;
  border: 1px solid rgba(237, 232, 208, 0.06);
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* Header */
.ble-modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1rem 0.75rem;
  border-bottom: 1px solid rgba(237, 232, 208, 0.06);
  flex-shrink: 0;
}

.ble-modal-title {
  font-family: var(--font-display);
  font-weight: 600;
  font-size: 1rem;
  color: var(--color-text-primary);
}

.ble-modal-close {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(237, 232, 208, 0.08);
  border-radius: 50%;
  background: none;
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: border-color 0.15s, color 0.15s;
  -webkit-tap-highlight-color: transparent;
}

.ble-modal-close:active {
  border-color: rgba(237, 232, 208, 0.2);
  color: var(--color-text-primary);
}

/* Body */
.ble-modal-body {
  padding: 0.75rem;
  overflow-y: auto;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.ble-modal-status {
  font-family: var(--font-mono);
  font-size: 0.75rem;
  color: var(--color-text-secondary);
  text-align: center;
  padding: 1.5rem 0;
}

/* Device card */
.ble-device-card {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  width: 100%;
  padding: 0.7rem 0.75rem;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(237, 232, 208, 0.06);
  border-radius: 8px;
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
  -webkit-tap-highlight-color: transparent;
}

.ble-device-card:active {
  background: rgba(255, 255, 255, 0.06);
}

.ble-device-card--known {
  border-color: rgba(74, 124, 111, 0.25);
}

.ble-device-icon {
  width: 30px;
  height: 30px;
  border-radius: 6px;
  background: rgba(74, 124, 111, 0.1);
  color: var(--color-ble-connected);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.ble-device-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.ble-device-name {
  font-family: var(--font-display);
  font-size: 0.85rem;
  font-weight: 500;
  color: var(--color-text-primary);
  text-align: left;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.ble-device-meta {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-family: var(--font-mono);
  font-size: 0.55rem;
}

.ble-device-tag {
  color: var(--color-ble-connected);
}

.ble-device-tag::after {
  content: '\00b7';
  margin-left: 0.4rem;
  color: var(--color-text-secondary);
}

.ble-device-compat {
  color: var(--color-ble-connected);
}

.ble-device-compat::after {
  content: '\00b7';
  margin-left: 0.4rem;
  color: var(--color-text-secondary);
}

.ble-device-rssi-label {
  color: var(--color-text-secondary);
}

.ble-signal-bars {
  flex-shrink: 0;
}

/* Empty state */
.ble-modal-empty {
  text-align: center;
  padding: 1.5rem 0;
}

.ble-modal-empty p {
  font-family: var(--font-display);
  font-size: 0.8rem;
  color: var(--color-text-secondary);
  margin-bottom: 0.4rem;
}

.ble-modal-hint {
  font-family: var(--font-mono);
  font-size: 0.6rem;
  color: var(--color-text-secondary);
  opacity: 0.6;
  margin-bottom: 1rem;
}

/* Footer */
.ble-modal-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.6rem 1rem 0.75rem;
  border-top: 1px solid rgba(237, 232, 208, 0.06);
  flex-shrink: 0;
}

.ble-modal-scanning {
  font-family: var(--font-mono);
  font-size: 0.6rem;
  color: var(--color-text-secondary);
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.ble-modal-scanning--idle {
  opacity: 0.5;
}

.ble-modal-scanning-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--color-accent);
  animation: ble-blink 1s infinite;
}

@keyframes ble-blink {
  0%, 100% { opacity: 0.2; }
  50% { opacity: 1; }
}

/* Buttons */
.ble-modal-btn {
  font-family: var(--font-mono);
  font-size: 0.65rem;
  color: var(--color-text-secondary);
  background: none;
  border: 1px solid rgba(237, 232, 208, 0.1);
  padding: 0.4rem 1rem;
  border-radius: 4px;
  cursor: pointer;
  transition: color 0.15s, border-color 0.15s;
  -webkit-tap-highlight-color: transparent;
}

.ble-modal-btn:active {
  color: var(--color-text-primary);
  border-color: rgba(237, 232, 208, 0.2);
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/overlay/BlePanel.jsx src/components/overlay/BlePanel.css
git commit -m "feat(ui): redesign BLE panel as compact modal with close button, signal bars, known MAC highlight"
```

---

## Chunk 5: UI — Controls, Overlay, and Back Button

### Task 10: Update TouchControls for accumulative behavior

**Files:**
- Modify: `src/components/overlay/TouchControls.jsx`

- [ ] **Step 1: Rewrite TouchControls**

```jsx
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
```

- [ ] **Step 2: Commit**

```bash
git add src/components/overlay/TouchControls.jsx
git commit -m "feat(ui): update TouchControls for accumulative toggle-on, remove silence button"
```

---

### Task 11: Update useKeyboardGestures

**Files:**
- Modify: `src/hooks/useKeyboardGestures.js`

- [ ] **Step 1: Rewrite keyboard hook**

```javascript
import { useEffect } from 'react'
import { useGestureStore } from '../store/useGestureStore'

// Teclas → secciones (acumulativo, no gestos)
const KEY_TO_SECTION = {
  '1': 'violines',
  '2': 'cuerdas',
  '3': 'madera',
  '4': 'metal',
}

export function useKeyboardGestures() {
  const addSection = useGestureStore((s) => s.addSection)
  const resetSections = useGestureStore((s) => s.resetSections)

  useEffect(() => {
    function handleKeyDown(e) {
      const section = KEY_TO_SECTION[e.key]
      if (section) {
        addSection(section)
        return
      }
      if (e.key === 'Escape') {
        resetSections()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [addSection, resetSections])
}
```

- [ ] **Step 2: Commit**

```bash
git add src/hooks/useKeyboardGestures.js
git commit -m "feat(input): update keyboard shortcuts for accumulative sections, Escape resets"
```

---

### Task 12: Fix Overlay null safety and plural sections

**Files:**
- Modify: `src/components/overlay/Overlay.jsx`

- [ ] **Step 1: Update Overlay for accumulative state**

```jsx
import { useGestureStore } from '../../store/useGestureStore'
import { SECTIONS } from '../../config/sections'
import './Overlay.css'

const BLE_DISPLAY = {
  idle:         { color: 'var(--color-ble-disconnected)', label: 'Sin conexion' },
  scanning:     { color: 'var(--color-ble-disconnected)', label: 'Buscando...',   blink: true },
  connecting:   { color: 'var(--color-accent)',           label: 'Conectando...' },
  connected:    { color: 'var(--color-ble-connected)',    label: 'Conectado' },
  disconnected: { color: 'var(--color-ble-disconnected)', label: 'Reconectando...' },
}

export default function Overlay() {
  const started = useGestureStore((s) => s.started)
  const bleStatus = useGestureStore((s) => s.bleStatus)
  const activeSections = useGestureStore((s) => s.activeSections)
  const isTutti = useGestureStore((s) => s.isTutti)
  const currentGesture = useGestureStore((s) => s.currentGesture)
  const setShowBlePanel = useGestureStore((s) => s.setShowBlePanel)

  if (!started) return null

  const ble = BLE_DISPLAY[bleStatus] || BLE_DISPLAY.idle

  // Última sección añadida para mostrar en el footer
  const lastSection = activeSections.length > 0
    ? SECTIONS[activeSections[activeSections.length - 1]]
    : null

  return (
    <div className="overlay">
      <header className="overlay-header">
        <button
          className="ble-status"
          onClick={() => setShowBlePanel(true)}
          aria-label="Abrir panel Bluetooth"
        >
          <span
            className={`ble-dot${ble.blink ? ' ble-dot--blink' : ''}`}
            style={{ background: ble.color }}
          />
          <span className="ble-label">{ble.label}</span>
        </button>
        <div className="composition-info">
          <span className="composition-title">Beethoven</span>
          <span className="composition-detail">Sinf. No. 7, II</span>
        </div>
      </header>

      <footer className="overlay-footer">
        {isTutti ? (
          <div className="active-section" style={{ color: SECTIONS.tutti.color }}>
            Tutti
          </div>
        ) : lastSection ? (
          <div className="active-section" style={{ color: lastSection.color }}>
            {lastSection.name}
          </div>
        ) : null}
        {currentGesture && (
          <div className="gesture-display">
            <span className="gesture-label">gesto</span>
            <span className="gesture-value">{currentGesture.toUpperCase()}</span>
          </div>
        )}
      </footer>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/overlay/Overlay.jsx
git commit -m "fix(ui): Overlay null safety for currentGesture, show tutti state and plural sections"
```

---

### Task 13: Add Android back button handler in App.jsx

**Files:**
- Modify: `src/App.jsx`

- [ ] **Step 1: Add back button handler**

```jsx
import { lazy, Suspense, useEffect } from 'react'
import { Capacitor } from '@capacitor/core'
import SceneErrorBoundary from './components/SceneErrorBoundary'
import StartScreen from './components/overlay/StartScreen'
import Overlay from './components/overlay/Overlay'
import TouchControls from './components/overlay/TouchControls'
import BlePanel from './components/overlay/BlePanel'
import TouchToggle from './components/overlay/TouchToggle'
import { useKeyboardGestures } from './hooks/useKeyboardGestures'
import { useAudio } from './hooks/useAudio'
import { useBle } from './hooks/useBle'
import { useGestureStore } from './store/useGestureStore'

const Scene = lazy(() => import('./components/Scene'))

export default function App() {
  useKeyboardGestures()
  const audioRef = useAudio()
  const ble = useBle()

  // Android back button handler
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return

    let listener
    import('@capacitor/app').then(({ App: CapApp }) => {
      listener = CapApp.addListener('backButton', ({ canGoBack }) => {
        const { showBlePanel, setShowBlePanel, started } =
          useGestureStore.getState()

        if (showBlePanel) {
          setShowBlePanel(false)
          return
        }

        if (!canGoBack) {
          CapApp.minimizeApp()
        }
      })
    })

    return () => {
      listener?.then?.((l) => l.remove())
    }
  }, [])

  // Remove HTML loader
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
```

- [ ] **Step 2: Commit**

```bash
git add src/App.jsx
git commit -m "feat(app): add Android back button handler to dismiss BLE panel and minimize app"
```

---

## Chunk 6: Integration Verification

### Task 14: Build verification and cap sync

- [ ] **Step 1: Run full build**

```bash
npx vite build
```

Expected: build succeeds with no errors. Warnings about unused vars are acceptable and should be fixed individually.

- [ ] **Step 2: Fix any build errors**

Read the error output. The most likely issues:
- Other components importing removed exports (`BYTE_TO_GESTURE`, `setGesture`, `activeSection`)
- Fix each reference to use the new API

- [ ] **Step 3: Sync Capacitor**

```bash
npx cap sync
```

Expected: syncs android project with new @capacitor/app plugin

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "fix: resolve build errors from BLE/store API migration"
```

---

### Task 15: Manual testing checklist

This is a manual verification on Android device (or web for non-BLE parts):

- [ ] **Web dev server (non-BLE)**
  - Run `npx vite dev` and open in browser
  - Press keys 1-4: sections should accumulate (not replace)
  - When all 4 active: footer shows "Tutti"
  - Press Escape: everything resets to silence
  - Audio: each key adds a stem, all 4 → crossfade to tutti, Escape → fade out

- [ ] **BLE Panel UX**
  - Click BLE status button → modal opens with X button and "Conectar Arduino" title
  - Click X → modal closes
  - Click outside modal → modal closes
  - Modal has max-height and scrolls if needed
  - "Cancelar" button in footer works

- [ ] **BLE on Android** (requires Arduino with BLE firmware)
  - Build APK: `npx cap run android`
  - Open BLE panel → only Arduinos advertising the Service UUID appear
  - Your Arduino (MAC CA:41) shows "Tu Arduino" tag
  - Connect → modal closes, status shows "Conectado"
  - Make gestures → instruments accumulate
  - All 4 instruments → crossfade to tutti
  - Hold "infinito" gesture → tutti keeps playing
  - Stop gestures → 3 second fade out to silence
  - Android back button while BLE panel open → closes panel (not app)
  - Android back button in main app → minimizes (not closes)
