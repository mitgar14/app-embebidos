# Integración BLE — Plan de implementación

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrar conectividad BLE entre la app Il Podio y un Arduino Nano 33 BLE para recibir clasificaciones de gestos TinyML y controlar la experiencia orquestal.

**Architecture:** Singleton `BleManager` envuelve `@capacitor-community/bluetooth-le` v7.3.2. Un hook `useBle` conecta BleManager con el store de Zustand. UI: panel de escaneo con lista de dispositivos, indicador BLE interactivo en el HUD, toggle manual de touch controls. Capacitor 7 + Android para deploy nativo.

**Tech Stack:** React 19, Zustand 5, Capacitor 7, `@capacitor-community/bluetooth-le` v7.3.2, Vite 8, Vitest

**Spec:** `docs/superpowers/specs/2026-03-12-ble-integration-design.md`

---

## Estructura de archivos

### Nuevos
| Archivo | Responsabilidad |
|---|---|
| `src/config/ble.js` | Constantes BLE: UUIDs placeholder, timeouts, mapeo byte→gesto |
| `src/ble/BleManager.js` | Singleton que envuelve el plugin BLE nativo |
| `src/hooks/useBle.js` | Hook React: puente entre BleManager y Zustand store |
| `src/components/overlay/BlePanel.jsx` | Panel modal de escaneo y lista de dispositivos |
| `src/components/overlay/BlePanel.css` | Estilos del panel BLE |
| `src/components/overlay/TouchToggle.jsx` | Botón toggle para mostrar/ocultar touch controls |
| `src/components/overlay/TouchToggle.css` | Estilos del toggle |
| `capacitor.config.ts` | Configuración de Capacitor |
| `docs/BLE-CONTRATO.md` | Contrato BLE para el compañero del Arduino |

### Modificados
| Archivo | Cambio |
|---|---|
| `src/store/useGestureStore.js` | Eliminar `bleConnected`/`setBleConnected`, agregar campos BLE |
| `src/store/useGestureStore.test.js` | Actualizar tests existentes, agregar tests para nuevos campos |
| `src/components/overlay/Overlay.jsx` | BLE status interactivo con 5 estados |
| `src/components/overlay/Overlay.css` | Animación dot parpadeante, pointer-events |
| `src/components/overlay/StartScreen.jsx` | Botón "Conectar Arduino" |
| `src/components/overlay/StartScreen.css` | Estilos del botón secundario |
| `src/components/overlay/TouchControls.jsx` | Visibilidad condicional por BLE status |
| `src/components/overlay/TouchControls.css` | Transiciones mostrar/ocultar |
| `src/App.jsx` | Montar BlePanel, TouchToggle, hook useBle |
| `package.json` | Dependencias Capacitor + plugin BLE |

---

## Chunk 1: Infraestructura BLE central

### Task 1: Configuración BLE

**Files:**
- Create: `src/config/ble.js`

- [ ] **Step 1: Crear el archivo de configuración**

```javascript
// src/config/ble.js
export const BLE_CONFIG = {
  SERVICE_UUID: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  CHARACTERISTIC_UUID: 'a1b2c3d5-e5f6-7890-abcd-ef1234567890',
  SCAN_TIMEOUT: 15000,
  RECONNECT_DELAY: 2000,
  RECONNECT_MAX_ATTEMPTS: 5,
}

// Debe coincidir con el orden de clases de Edge Impulse
// Índice 5: gesto pendiente de definir → mapeará a sección "tutti"
export const BYTE_TO_GESTURE = ['infinito', 'm', 'maracas', 'u', 'silencio', null]
```

- [ ] **Step 2: Commit**

```bash
git add src/config/ble.js
git commit -m "feat(ble): add BLE configuration with UUIDs and byte-to-gesture mapping"
```

---

### Task 2: Migración del Zustand Store

**Files:**
- Modify: `src/store/useGestureStore.js`
- Modify: `src/store/useGestureStore.test.js`

- [ ] **Step 1: Actualizar los tests existentes y agregar nuevos**

Reemplazar el contenido completo de `src/store/useGestureStore.test.js`:

```javascript
import { describe, it, expect, beforeEach } from 'vitest'
import { useGestureStore } from './useGestureStore'

describe('useGestureStore', () => {
  beforeEach(() => {
    // Reset store entre tests
    useGestureStore.setState({
      currentGesture: 'silencio',
      activeSection: null,
      bleStatus: 'idle',
      bleDeviceId: null,
      bleDevices: [],
      showTouchControls: false,
      showBlePanel: false,
      started: false,
    })
  })

  it('starts with idle BLE status and silencio gesture', () => {
    const state = useGestureStore.getState()
    expect(state.activeSection).toBe(null)
    expect(state.currentGesture).toBe('silencio')
    expect(state.bleStatus).toBe('idle')
    expect(state.bleDeviceId).toBe(null)
    expect(state.bleDevices).toEqual([])
    expect(state.showTouchControls).toBe(false)
    expect(state.showBlePanel).toBe(false)
  })

  it('sets active section on gesture', () => {
    useGestureStore.getState().setGesture('infinito')
    const state = useGestureStore.getState()
    expect(state.currentGesture).toBe('infinito')
    expect(state.activeSection).toBe('violines')
  })

  it('clears active section on silencio', () => {
    useGestureStore.getState().setGesture('infinito')
    useGestureStore.getState().setGesture('silencio')
    expect(useGestureStore.getState().activeSection).toBe(null)
  })

  it('tracks BLE status transitions', () => {
    const { setBleStatus } = useGestureStore.getState()
    setBleStatus('scanning')
    expect(useGestureStore.getState().bleStatus).toBe('scanning')
    setBleStatus('connecting')
    expect(useGestureStore.getState().bleStatus).toBe('connecting')
    setBleStatus('connected')
    expect(useGestureStore.getState().bleStatus).toBe('connected')
    setBleStatus('disconnected')
    expect(useGestureStore.getState().bleStatus).toBe('disconnected')
  })

  it('accumulates BLE devices during scan', () => {
    const { addBleDevice, clearBleDevices } = useGestureStore.getState()
    addBleDevice({ deviceId: 'AA:BB:CC', name: 'Arduino', rssi: -42 })
    addBleDevice({ deviceId: 'DD:EE:FF', name: 'Arduino', rssi: -67 })
    expect(useGestureStore.getState().bleDevices).toHaveLength(2)
    expect(useGestureStore.getState().bleDevices[0].rssi).toBe(-42)

    clearBleDevices()
    expect(useGestureStore.getState().bleDevices).toEqual([])
  })

  it('does not duplicate devices with same deviceId', () => {
    const { addBleDevice } = useGestureStore.getState()
    addBleDevice({ deviceId: 'AA:BB:CC', name: 'Arduino', rssi: -42 })
    addBleDevice({ deviceId: 'AA:BB:CC', name: 'Arduino', rssi: -50 })
    const devices = useGestureStore.getState().bleDevices
    expect(devices).toHaveLength(1)
    expect(devices[0].rssi).toBe(-50)
  })

  it('stores connected device id', () => {
    useGestureStore.getState().setBleDeviceId('AA:BB:CC')
    expect(useGestureStore.getState().bleDeviceId).toBe('AA:BB:CC')
  })

  it('toggles touch controls and BLE panel visibility', () => {
    const { setShowTouchControls, setShowBlePanel } = useGestureStore.getState()
    setShowTouchControls(true)
    expect(useGestureStore.getState().showTouchControls).toBe(true)
    setShowBlePanel(true)
    expect(useGestureStore.getState().showBlePanel).toBe(true)
  })
})
```

- [ ] **Step 2: Ejecutar tests — deben fallar**

Run: `npx vitest run src/store/useGestureStore.test.js`
Expected: FAIL — `bleStatus` no existe, `setBleStatus` no definido, `addBleDevice` no definido

- [ ] **Step 3: Implementar la migración del store**

Reemplazar el contenido completo de `src/store/useGestureStore.js`:

```javascript
import { create } from 'zustand'

const GESTURE_TO_SECTION = {
  infinito: 'violines',
  m: 'cuerdas',
  maracas: 'madera',
  u: 'metal',
  tutti: 'tutti',
  silencio: null,
}

export const useGestureStore = create((set) => ({
  currentGesture: 'silencio',
  activeSection: null,
  started: false,

  // BLE state
  bleStatus: 'idle',
  bleDeviceId: null,
  bleDevices: [],
  showTouchControls: false,
  showBlePanel: false,

  setGesture: (gesture) => {
    const section = GESTURE_TO_SECTION[gesture] ?? null
    set({ currentGesture: gesture, activeSection: section })
  },

  setStarted: (started) => set({ started }),

  // BLE actions
  setBleStatus: (bleStatus) => set({ bleStatus }),

  addBleDevice: (device) =>
    set((state) => {
      const exists = state.bleDevices.findIndex((d) => d.deviceId === device.deviceId)
      if (exists >= 0) {
        const updated = [...state.bleDevices]
        updated[exists] = device
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

- [ ] **Step 4: Ejecutar tests — deben pasar**

Run: `npx vitest run src/store/useGestureStore.test.js`
Expected: PASS (8 tests)

- [ ] **Step 5: Commit**

```bash
git add src/store/useGestureStore.js src/store/useGestureStore.test.js
git commit -m "feat(ble): migrate store — replace bleConnected with bleStatus, add BLE fields"
```

---

### Task 3: BleManager — Singleton BLE

**Files:**
- Create: `src/ble/BleManager.js`

**Referencia de API del plugin** (v7.3.2):
- `import { BleClient } from '@capacitor-community/bluetooth-le'`
- `BleClient.initialize(options?)` → `Promise<void>`
- `BleClient.requestLEScan(options, callback)` → `Promise<void>` (callback recibe `ScanResult`)
- `BleClient.stopLEScan()` → `Promise<void>`
- `BleClient.connect(deviceId, onDisconnect?, options?)` → `Promise<void>`
- `BleClient.startNotifications(deviceId, service, characteristic, callback)` → callback recibe `DataView`
- `BleClient.stopNotifications(deviceId, service, characteristic)` → `Promise<void>`
- `BleClient.disconnect(deviceId)` → `Promise<void>`

`ScanResult`: `{ device: { deviceId, name? }, localName?, rssi? }`

- [ ] **Step 1: Crear BleManager**

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
    if (this.scanning) return
    this.scanning = true

    try {
      await BleClient.requestLEScan(
        { allowDuplicates: false },
        (result) => {
          onResult({
            deviceId: result.device.deviceId,
            name: result.localName || result.device.name || 'Desconocido',
            rssi: result.rssi ?? -100,
          })
        },
      )
    } catch (err) {
      this.scanning = false
      throw err
    }
  }

  async stopScan() {
    if (!this.scanning) return
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
        const byte = value.getUint8(0)
        onNotification?.(byte)
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
git commit -m "feat(ble): add BleManager singleton wrapping capacitor-community/bluetooth-le"
```

---

### Task 4: Hook useBle

**Files:**
- Create: `src/hooks/useBle.js`

**Dependencias:** BleManager (Task 3), useGestureStore (Task 2), `src/config/ble.js` (Task 1)

- [ ] **Step 1: Crear el hook**

```javascript
// src/hooks/useBle.js
import { useEffect, useRef, useCallback } from 'react'
import { Capacitor } from '@capacitor/core'
import { useGestureStore } from '../store/useGestureStore'
import { BleManager } from '../ble/BleManager'
import { BLE_CONFIG, BYTE_TO_GESTURE } from '../config/ble'

const isNative = Capacitor.isNativePlatform()

export function useBle() {
  const reconnectAttempts = useRef(0)
  const reconnectTimer = useRef(null)
  const scanTimer = useRef(null)
  const connectRef = useRef(null)

  // connectToDevice como función estable vía ref (evita deps circulares)
  const connectToDevice = useCallback(async (deviceId) => {
    const { setBleStatus, setBleDeviceId, setGesture, setShowBlePanel } =
      useGestureStore.getState()

    setBleStatus('connecting')

    try {
      await BleManager.connect(
        deviceId,
        // onDisconnect
        (disconnectedId) => {
          setBleStatus('disconnected')
          setBleDeviceId(null)
          // Usar ref para evitar dependencia circular
          attemptReconnect(disconnectedId)
        },
        // onNotification
        (byte) => {
          const gesture = BYTE_TO_GESTURE[byte]
          if (gesture) {
            setGesture(gesture)
          }
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
  }, [])

  // Guardar ref estable para uso en attemptReconnect
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

  useEffect(() => {
    if (!isNative) return

    BleManager.initialize().catch((err) => {
      console.warn('BLE init failed:', err)
    })

    return () => {
      clearTimeout(reconnectTimer.current)
      clearTimeout(scanTimer.current)
      BleManager.dispose()
    }
  }, [])

  const startScan = useCallback(async () => {
    const { setBleStatus, clearBleDevices, addBleDevice } =
      useGestureStore.getState()

    clearBleDevices()
    setBleStatus('scanning')

    await BleManager.startScan((device) => {
      addBleDevice(device)
    })

    // Timeout de escaneo — guardar ref para cleanup
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
    reconnectAttempts.current = 0
    await BleManager.disconnect()
    useGestureStore.getState().setBleStatus('idle')
    useGestureStore.getState().setBleDeviceId(null)
  }, [])

  return { startScan, stopScan, connect, disconnect }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/hooks/useBle.js
git commit -m "feat(ble): add useBle hook bridging BleManager to Zustand store"
```

---

## Chunk 2: Componentes de UI

### Task 5: Overlay HUD — BLE status interactivo

**Files:**
- Modify: `src/components/overlay/Overlay.jsx`
- Modify: `src/components/overlay/Overlay.css`

- [ ] **Step 1: Actualizar Overlay.jsx con 5 estados BLE y pointer-events**

Reemplazar el contenido completo de `src/components/overlay/Overlay.jsx`:

```jsx
import { useGestureStore } from '../../store/useGestureStore'
import { SECTIONS } from '../../config/sections'
import './Overlay.css'

const BLE_DISPLAY = {
  idle:         { color: 'var(--color-ble-disconnected)', label: 'Sin conexión' },
  scanning:     { color: 'var(--color-ble-disconnected)', label: 'Buscando...',   blink: true },
  connecting:   { color: 'var(--color-accent)',           label: 'Conectando...' },
  connected:    { color: 'var(--color-ble-connected)',    label: 'Conectado' },
  disconnected: { color: 'var(--color-ble-disconnected)', label: 'Sin conexión' },
}

export default function Overlay() {
  const started = useGestureStore((s) => s.started)
  const bleStatus = useGestureStore((s) => s.bleStatus)
  const currentGesture = useGestureStore((s) => s.currentGesture)
  const activeSection = useGestureStore((s) => s.activeSection)
  const setShowBlePanel = useGestureStore((s) => s.setShowBlePanel)

  if (!started) return null

  const sectionData = activeSection ? SECTIONS[activeSection] : null
  const ble = BLE_DISPLAY[bleStatus] || BLE_DISPLAY.idle

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
        {sectionData && (
          <div className="active-section" style={{ color: sectionData.color }}>
            {sectionData.name}
          </div>
        )}
        <div className="gesture-display">
          <span className="gesture-label">gesto</span>
          <span className="gesture-value">{currentGesture.toUpperCase()}</span>
        </div>
      </footer>
    </div>
  )
}
```

- [ ] **Step 2: Actualizar Overlay.css con animación y pointer-events**

Reemplazar el contenido completo de `src/components/overlay/Overlay.css`:

```css
.overlay {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 10;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 1rem 1.2rem;
}

.overlay-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.ble-status {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  pointer-events: auto;
  cursor: pointer;
  background: none;
  border: none;
  padding: 0.3rem 0.4rem;
  margin: -0.3rem -0.4rem;
  border-radius: 4px;
  transition: background 0.2s;
}

.ble-status:active {
  background: rgba(255, 255, 255, 0.05);
}

.ble-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.ble-dot--blink {
  animation: ble-blink 1s ease-in-out infinite;
}

@keyframes ble-blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.2; }
}

.ble-label {
  font-family: var(--font-mono);
  font-size: 0.65rem;
  color: var(--color-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.composition-info {
  text-align: right;
}

.composition-title {
  display: block;
  font-family: var(--font-display);
  font-weight: 600;
  font-size: 0.85rem;
  color: var(--color-text-primary);
}

.composition-detail {
  display: block;
  font-family: var(--font-display);
  font-weight: 300;
  font-size: 0.7rem;
  color: var(--color-text-secondary);
}

.overlay-footer {
  text-align: center;
  padding-bottom: 5rem;
}

.active-section {
  font-family: var(--font-display);
  font-weight: 600;
  font-size: 1.1rem;
  letter-spacing: 0.05em;
  margin-bottom: 0.3rem;
  transition: color 0.3s;
}

.gesture-display {
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: 0.5rem;
}

.gesture-label {
  font-family: var(--font-mono);
  font-size: 0.6rem;
  color: var(--color-text-secondary);
  text-transform: uppercase;
}

.gesture-value {
  font-family: var(--font-mono);
  font-size: 1rem;
  color: var(--color-accent);
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/overlay/Overlay.jsx src/components/overlay/Overlay.css
git commit -m "feat(ble): make HUD BLE indicator interactive with 5 status states"
```

---

### Task 6: BlePanel — Lista de dispositivos

**Files:**
- Create: `src/components/overlay/BlePanel.jsx`
- Create: `src/components/overlay/BlePanel.css`

- [ ] **Step 1: Crear BlePanel.jsx**

```jsx
// src/components/overlay/BlePanel.jsx
import { useEffect } from 'react'
import { useGestureStore } from '../../store/useGestureStore'
import './BlePanel.css'

function rssiToBars(rssi) {
  if (rssi >= -50) return '\u2582\u2584\u2586'
  if (rssi >= -70) return '\u2582\u2584'
  return '\u2582'
}

function partialMac(deviceId) {
  if (!deviceId) return ''
  const clean = deviceId.replace(/[:-]/g, '')
  return clean.slice(-4).toUpperCase()
}

export default function BlePanel({ onStartScan, onStopScan, onConnect }) {
  const showBlePanel = useGestureStore((s) => s.showBlePanel)
  const setShowBlePanel = useGestureStore((s) => s.setShowBlePanel)
  const bleStatus = useGestureStore((s) => s.bleStatus)
  const bleDevices = useGestureStore((s) => s.bleDevices)

  useEffect(() => {
    if (showBlePanel && bleStatus !== 'connecting') {
      onStartScan()
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

  const handleRetry = () => {
    onStartScan()
  }

  const isScanning = bleStatus === 'scanning'
  const isConnecting = bleStatus === 'connecting'

  return (
    <div className="ble-panel">
      <div className="ble-panel-content">
        <h2 className="ble-panel-title">Dispositivos cercanos</h2>

        {isConnecting ? (
          <p className="ble-panel-status">Conectando...</p>
        ) : (
          <>
            <div className="ble-device-list">
              {bleDevices.map((device) => (
                <button
                  key={device.deviceId}
                  className="ble-device-item"
                  onClick={() => handleConnect(device.deviceId)}
                  disabled={isConnecting}
                >
                  <span className="ble-device-name">{device.name}</span>
                  <span className="ble-device-signal">
                    <span className="ble-device-bars">{rssiToBars(device.rssi)}</span>
                    <span className="ble-device-rssi">{device.rssi} dBm</span>
                  </span>
                  <span className="ble-device-mac">{partialMac(device.deviceId)}</span>
                </button>
              ))}
            </div>

            {isScanning && (
              <p className="ble-panel-status">Buscando...</p>
            )}

            {!isScanning && bleDevices.length === 0 && (
              <div className="ble-panel-empty">
                <p>No se encontraron dispositivos cercanos</p>
                <button className="ble-panel-btn" onClick={handleRetry}>
                  Reintentar
                </button>
              </div>
            )}
          </>
        )}

        <button className="ble-panel-btn ble-panel-btn--cancel" onClick={handleClose}>
          Cancelar
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Crear BlePanel.css**

```css
/* src/components/overlay/BlePanel.css */
.ble-panel {
  position: fixed;
  inset: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(10, 9, 6, 0.85);
  backdrop-filter: blur(8px);
  pointer-events: auto;
}

.ble-panel-content {
  width: 90%;
  max-width: 340px;
  padding: 1.5rem;
}

.ble-panel-title {
  font-family: var(--font-display);
  font-weight: 600;
  font-size: 1.1rem;
  color: var(--color-text-primary);
  margin-bottom: 1.2rem;
}

.ble-panel-status {
  font-family: var(--font-mono);
  font-size: 0.75rem;
  color: var(--color-text-secondary);
  text-align: center;
  padding: 1rem 0;
}

.ble-device-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.ble-device-item {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  width: 100%;
  padding: 0.7rem 0.8rem;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.15s;
  -webkit-tap-highlight-color: transparent;
}

.ble-device-item:active {
  background: rgba(255, 255, 255, 0.08);
}

.ble-device-name {
  font-family: var(--font-display);
  font-size: 0.85rem;
  color: var(--color-text-primary);
  flex: 1;
  text-align: left;
}

.ble-device-signal {
  display: flex;
  align-items: baseline;
  gap: 0.3rem;
}

.ble-device-bars {
  font-size: 0.7rem;
  color: var(--color-accent);
  letter-spacing: 1px;
}

.ble-device-rssi {
  font-family: var(--font-mono);
  font-size: 0.6rem;
  color: var(--color-text-secondary);
}

.ble-device-mac {
  font-family: var(--font-mono);
  font-size: 0.6rem;
  color: var(--color-text-secondary);
  min-width: 2.5rem;
  text-align: right;
}

.ble-panel-empty {
  text-align: center;
  padding: 1.5rem 0;
}

.ble-panel-empty p {
  font-family: var(--font-display);
  font-size: 0.8rem;
  color: var(--color-text-secondary);
  margin-bottom: 0.8rem;
}

.ble-panel-btn {
  font-family: var(--font-mono);
  font-size: 0.75rem;
  color: var(--color-text-secondary);
  background: none;
  border: 1px solid rgba(255, 255, 255, 0.1);
  padding: 0.5rem 1.2rem;
  border-radius: 4px;
  cursor: pointer;
  transition: color 0.15s, border-color 0.15s;
  -webkit-tap-highlight-color: transparent;
}

.ble-panel-btn:active {
  color: var(--color-text-primary);
  border-color: rgba(255, 255, 255, 0.2);
}

.ble-panel-btn--cancel {
  display: block;
  margin: 1.2rem auto 0;
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/overlay/BlePanel.jsx src/components/overlay/BlePanel.css
git commit -m "feat(ble): add BlePanel component with device list, RSSI bars, partial MAC"
```

---

### Task 7: StartScreen — Botón "Conectar Arduino"

**Files:**
- Modify: `src/components/overlay/StartScreen.jsx`
- Modify: `src/components/overlay/StartScreen.css`

- [ ] **Step 1: Agregar botón secundario a StartScreen.jsx**

En `src/components/overlay/StartScreen.jsx`, reemplazar el contenido completo:

```jsx
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
```

- [ ] **Step 2: Agregar estilos del botón secundario a StartScreen.css**

Añadir al final de `src/components/overlay/StartScreen.css`:

```css
.start-ble-link {
  margin-top: 1.2rem;
  font-family: var(--font-mono);
  font-size: 0.75rem;
  color: var(--color-text-secondary);
  background: none;
  border: none;
  cursor: pointer;
  text-decoration: underline;
  text-underline-offset: 3px;
  text-decoration-color: rgba(138, 126, 107, 0.4);
  transition: color 0.2s;
  -webkit-tap-highlight-color: transparent;
}

.start-ble-link:active {
  color: var(--color-text-primary);
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/overlay/StartScreen.jsx src/components/overlay/StartScreen.css
git commit -m "feat(ble): add 'Conectar Arduino' link to StartScreen"
```

---

### Task 8: TouchControls — Visibilidad condicional

**Files:**
- Modify: `src/components/overlay/TouchControls.jsx`
- Modify: `src/components/overlay/TouchControls.css`

- [ ] **Step 1: Agregar lógica de visibilidad a TouchControls.jsx**

Reemplazar el contenido completo de `src/components/overlay/TouchControls.jsx`:

```jsx
import { useGestureStore } from '../../store/useGestureStore'
import { SECTIONS } from '../../config/sections'
import './TouchControls.css'

const GESTURE_MAP = {
  violines: 'infinito',
  cuerdas: 'm',
  madera: 'maracas',
  metal: 'u',
  tutti: 'tutti',
}

export default function TouchControls() {
  const started = useGestureStore((s) => s.started)
  const activeSection = useGestureStore((s) => s.activeSection)
  const setGesture = useGestureStore((s) => s.setGesture)
  const bleStatus = useGestureStore((s) => s.bleStatus)
  const showTouchControls = useGestureStore((s) => s.showTouchControls)

  if (!started) return null

  const visible = bleStatus !== 'connected' || showTouchControls

  return (
    <div className={`touch-controls${visible ? '' : ' touch-controls--hidden'}`}>
      {Object.entries(SECTIONS).map(([key, section]) => (
        <button
          key={key}
          className={`touch-btn ${key === activeSection ? 'touch-btn--active' : ''}`}
          style={{
            '--section-color': section.color,
          }}
          onPointerDown={() => setGesture(GESTURE_MAP[key])}
          aria-label={section.name}
        >
          <span className="touch-btn-label">{section.name.charAt(0)}</span>
        </button>
      ))}
      <button
        className="touch-btn touch-btn--silence"
        onPointerDown={() => setGesture('silencio')}
        aria-label="Silencio"
      >
        <span className="touch-btn-label">&times;</span>
      </button>
    </div>
  )
}
```

- [ ] **Step 2: Agregar transiciones CSS**

Añadir al final de `src/components/overlay/TouchControls.css`:

```css
.touch-controls--hidden {
  opacity: 0;
  transform: translateX(-50%) translateY(1rem);
  pointer-events: none;
  transition: opacity 0.3s, transform 0.3s;
}
```

Y agregar `transition` al selector `.touch-controls` existente. Reemplazar el bloque `.touch-controls`:

```css
.touch-controls {
  position: fixed;
  bottom: 2.5rem;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 0.6rem;
  z-index: 20;
  pointer-events: auto;
  opacity: 1;
  transition: opacity 0.3s, transform 0.3s;
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/overlay/TouchControls.jsx src/components/overlay/TouchControls.css
git commit -m "feat(ble): add conditional visibility to TouchControls based on BLE status"
```

---

### Task 9: TouchToggle — Botón de alternancia manual

**Files:**
- Create: `src/components/overlay/TouchToggle.jsx`
- Create: `src/components/overlay/TouchToggle.css`

- [ ] **Step 1: Crear TouchToggle.jsx**

```jsx
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
```

- [ ] **Step 2: Crear TouchToggle.css**

```css
/* src/components/overlay/TouchToggle.css */
.touch-toggle {
  position: fixed;
  bottom: 1rem;
  right: 1rem;
  z-index: 25;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 50%;
  color: var(--color-text-secondary);
  cursor: pointer;
  pointer-events: auto;
  transition: color 0.15s, border-color 0.15s;
  -webkit-tap-highlight-color: transparent;
}

.touch-toggle:active {
  color: var(--color-text-primary);
  border-color: rgba(255, 255, 255, 0.25);
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/overlay/TouchToggle.jsx src/components/overlay/TouchToggle.css
git commit -m "feat(ble): add TouchToggle button for manual touch controls visibility"
```

---

## Chunk 3: Integración y documentación

### Task 10: Setup de Capacitor + dependencias

**Files:**
- Modify: `package.json` (via npm install)
- Create: `capacitor.config.ts`
- Modify: `android/app/src/main/AndroidManifest.xml` (post cap add)
- Modify: `.gitignore`

> **Nota:** Esta task va antes del cableado en App.jsx porque `useBle.js` importa `@capacitor/core`. Sin estas dependencias instaladas, el build falla.

- [ ] **Step 1: Instalar dependencias de Capacitor**

```bash
npm install @capacitor/core
npm install --save-dev @capacitor/cli
```

`@capacitor/cli` es devDependency (solo se usa durante build/sync, no en runtime).

- [ ] **Step 2: Inicializar Capacitor**

```bash
npx cap init "Il Podio" "com.uao.ilpodio" --web-dir dist
```

Si ya existe `capacitor.config.ts`, omitir este paso. Verificar que el archivo generado tiene `webDir: 'dist'`.

- [ ] **Step 3: Instalar el plugin BLE**

```bash
npm install @capacitor-community/bluetooth-le@^7.3.2
```

- [ ] **Step 4: Agregar plataforma Android**

```bash
npm install @capacitor/android && npx cap add android
```

- [ ] **Step 5: Actualizar .gitignore para Android**

Añadir al final de `.gitignore`:

```
# Capacitor Android build artifacts
android/app/build/
android/.gradle/
```

- [ ] **Step 6: Agregar permisos BLE al AndroidManifest.xml**

Abrir `android/app/src/main/AndroidManifest.xml` y agregar dentro de `<manifest>`, antes de `<application>`:

```xml
<!-- Legacy: Android 11 y menor -->
<uses-permission android:name="android.permission.BLUETOOTH" android:maxSdkVersion="30" />
<uses-permission android:name="android.permission.BLUETOOTH_ADMIN" android:maxSdkVersion="30" />
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" android:maxSdkVersion="30" />

<!-- Android 12+ (API 31+) -->
<uses-permission android:name="android.permission.BLUETOOTH_SCAN"
    android:usesPermissionFlags="neverForLocation" />
<uses-permission android:name="android.permission.BLUETOOTH_CONNECT" />

<!-- BLE como feature opcional -->
<uses-feature android:name="android.hardware.bluetooth_le" android:required="false" />
```

`neverForLocation` en `BLUETOOTH_SCAN` evita pedir permiso de ubicación en API 31+ (la app no usa BLE para localización). Corresponde con `androidNeverForLocation: true` en `BleManager.initialize()`.

- [ ] **Step 7: Sincronizar y verificar**

```bash
npx vite build && npx cap sync
```

Expected: Build de Vite exitoso, sincronización de Capacitor completa.

- [ ] **Step 8: Commit**

```bash
git add package.json package-lock.json capacitor.config.ts android/ .gitignore
git commit -m "feat(ble): add Capacitor 7, Android platform, BLE plugin and permissions"
```

---

### Task 11: Cableado en App.jsx

**Files:**
- Modify: `src/App.jsx`

- [ ] **Step 1: Montar componentes BLE y hook**

Reemplazar el contenido completo de `src/App.jsx`:

```jsx
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
```

- [ ] **Step 2: Verificar build**

Run: `npx vite build`
Expected: Build exitoso (Capacitor ya instalado en Task 10).

- [ ] **Step 3: Commit**

```bash
git add src/App.jsx
git commit -m "feat(ble): wire BlePanel, TouchToggle and useBle hook into App"
```

---

### Task 12: Contrato BLE para el compañero

**Files:**
- Create: `docs/BLE-CONTRATO.md`

- [ ] **Step 1: Crear el documento de contrato**

```markdown
# Contrato BLE — Il Podio

Especificación que el Arduino Nano 33 BLE debe cumplir para comunicarse con la app.

---

## Servicio GATT

| Campo | Valor |
|---|---|
| Service UUID | **Por definir** (actualizar en `src/config/ble.js` → `BLE_CONFIG.SERVICE_UUID`) |
| Characteristic UUID | **Por definir** (actualizar en `src/config/ble.js` → `BLE_CONFIG.CHARACTERISTIC_UUID`) |
| Propiedades | `BLERead \| BLENotify` |

---

## Formato de datos

- **1 byte** por notificación
- El valor del byte es el **índice de la clase** del modelo TinyML (Edge Impulse)

### Mapeo de índices

| Byte | Gesto | Sección de la app |
|---|---|---|
| 0 | infinito | Violines |
| 1 | m | Cuerdas graves |
| 2 | maracas | Vientos madera |
| 3 | u | Vientos metal |
| 4 | silencio | (silencia todos los stems) |
| 5 | *Por definir* | Tutti |

> Este mapeo **debe coincidir exactamente** con el orden de clases en el proyecto de Edge Impulse.

---

## Comportamiento esperado

### Debounce
Solo enviar una notificación cuando el gesto clasificado **cambie** respecto al anterior. No enviar notificaciones repetidas del mismo gesto.

### Desconexión
Tras una desconexión (por distancia, apagado del dispositivo, etc.), el Arduino debe volver a hacer **advertise automáticamente** para permitir reconexión.

### Confianza
Se recomienda un umbral de confianza >= **0.70** antes de enviar una clasificación. Si ninguna clase supera el umbral, mantener el último gesto (no enviar).

### Connection interval
Para mínima latencia, configurar el connection interval a 7.5ms - 15ms. Los parámetros son múltiplos de 1.25ms:
```cpp
BLE.setConnectionInterval(6, 12); // min=6*1.25=7.5ms, max=12*1.25=15ms
```

---

## Cómo conectar

1. El compañero define los UUIDs del servicio y la característica
2. Actualizar los valores en `src/config/ble.js` (campos `SERVICE_UUID` y `CHARACTERISTIC_UUID`)
3. Ejecutar `npx cap sync` para sincronizar cambios
4. La app detectará el Arduino al escanear y se conectará automáticamente a las notificaciones
```

- [ ] **Step 2: Commit**

```bash
git add docs/BLE-CONTRATO.md
git commit -m "docs: add BLE contract specification for Arduino teammate"
```

---

## Ejecutar los tests completos

Tras completar todas las tareas:

```bash
npx vitest run
```

Expected: Todos los tests pasan (store, AudioManager).
