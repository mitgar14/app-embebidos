# Il Podio — Integración BLE: Spec de diseño

## Resumen

Integrar conectividad Bluetooth Low Energy entre la app Il Podio (React + Capacitor) y un Arduino Nano 33 BLE que envía clasificaciones de gestos TinyML. Incluye: BleManager, panel de escaneo con lista de dispositivos, UI de conexión en StartScreen y HUD, auto-reconnect, setup de Capacitor + Android, y documento de contrato BLE.

---

## Alcance

- **Incluido**: Todo el lado de la app (BleManager.js, hook, UI de conexión, Capacitor setup, permisos Android, contrato BLE documentado)
- **Excluido**: Sketch de Arduino (.ino) — lo implementa otro miembro del equipo
- **Plugin**: `@capacitor-community/bluetooth-le` v7.3.2 (para Capacitor 7)

---

## 1. Arquitectura

### Nuevo módulo: `src/ble/BleManager.js`

Clase singleton que encapsula toda la lógica de `@capacitor-community/bluetooth-le`:

```
BleManager
  ├── initialize()          → permisos + init del plugin
  ├── startScan(callback)   → escaneo con resultados en tiempo real
  ├── stopScan()
  ├── connect(deviceId)     → connect + startNotifications
  ├── disconnect()
  └── dispose()             → limpieza total
```

### Flujo de datos

```
Arduino BLE notify (1 byte: índice 0-4)
  → BleManager.startNotifications() callback
  → parsear byte → nombre de gesto (0→"infinito", 1→"m", 2→"maracas", 3→"u", 4→"silencio")
  → useGestureStore.setGesture(gesture)
  → totems + audio reaccionan (ya implementado)
```

### Configuración externalizada: `src/config/ble.js`

```javascript
export const BLE_CONFIG = {
  SERVICE_UUID: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',       // placeholder
  CHARACTERISTIC_UUID: 'a1b2c3d5-e5f6-7890-abcd-ef1234567890', // placeholder
  SCAN_TIMEOUT: 15000,        // ms
  RECONNECT_DELAY: 2000,      // ms base
  RECONNECT_MAX_ATTEMPTS: 5,
}

export const BYTE_TO_GESTURE = ['infinito', 'm', 'maracas', 'u', 'silencio']
```

UUIDs son placeholder. El compañero los reemplaza con los definitivos cuando defina su servicio GATT.

El mapeo `BYTE_TO_GESTURE` debe coincidir con el orden de clases de Edge Impulse.

**Nota sobre "tutti"**: El gesto `tutti` NO es una clase del modelo TinyML (que solo clasifica movimientos físicos). `Tutti` solo es alcanzable mediante los touch controls de la app. El mapeo BLE cubre exclusivamente las clases que el Arduino clasifica.

### Detección de plataforma

```javascript
import { Capacitor } from '@capacitor/core'
const isNative = Capacitor.isNativePlatform()
```

Si no es nativo (dev en browser), BLE no está disponible → solo touch controls. Esto permite seguir usando `npm run dev` sin que BLE rompa nada.

### Hook: `src/hooks/useBle.js`

Puente entre BleManager y el store de Zustand. Se invoca en `App.jsx`.

```javascript
export function useBle() {
  // En mount: BleManager.initialize() si plataforma nativa
  // Suscribe callbacks de BleManager → setBleStatus, addBleDevice, setGesture
  // En unmount: BleManager.dispose()
  // Retorna: { startScan, stopScan, connect, disconnect }
}
```

- **`startScan()`**: limpia lista de dispositivos → `clearBleDevices()`, llama `BleManager.startScan()` con callback que ejecuta `addBleDevice()`
- **`stopScan()`**: delega a `BleManager.stopScan()`
- **`connect(deviceId)`**: llama `BleManager.connect()`, registra callback de notificación que parsea byte → `setGesture()`
- **`disconnect()`**: llama `BleManager.disconnect()`, resetea `bleStatus` a `'idle'`

El hook no retorna estado; los componentes leen directamente del store.

---

## 2. Modificaciones al Zustand Store

### Nuevos campos en `useGestureStore`

```javascript
bleStatus: 'idle',          // 'idle' | 'scanning' | 'connecting' | 'connected' | 'disconnected'
bleDeviceId: null,          // ID del dispositivo conectado
bleDevices: [],             // [{deviceId, name, rssi}] encontrados durante scan
showTouchControls: false,   // toggle manual de touch controls
showBlePanel: false,        // visibilidad del panel de escaneo
```

### Nuevas acciones

```javascript
setBleStatus: (status) => ...,
addBleDevice: (device) => ...,
clearBleDevices: () => ...,
setBleDeviceId: (id) => ...,
setShowTouchControls: (show) => ...,
setShowBlePanel: (show) => ...,
```

### Cambios a estado existente

- `bleConnected` se elimina, reemplazado por `bleStatus === 'connected'` (derivado)
- `setBleConnected` se elimina, reemplazado por `setBleStatus`

### Migración en consumidores

**`Overlay.jsx`** (línea 7): cambiar `useGestureStore((s) => s.bleConnected)` por `useGestureStore((s) => s.bleStatus)`. Actualizar la lógica de renderizado del dot y label para manejar los 5 estados (`idle`, `scanning`, `connecting`, `connected`, `disconnected`) en lugar del booleano actual.

No hay otros consumidores de `bleConnected` en el codebase actual.

### Lógica de visibilidad de touch controls

```javascript
const touchControlsVisible = (bleStatus !== 'connected') || showTouchControls
```

Se ocultan automáticamente al conectar BLE, reaparecen al desconectar, y el usuario puede forzarlos con el toggle manual.

---

## 3. Componentes de UI

### 3a. StartScreen — Botón secundario "Conectar Arduino"

```
+-----------------------------------+
|                                   |
|          Il Podio                 |
|   Beethoven — Sinfonía No. 7, II |
|                                   |
|        [ Comenzar ]               |  ← botón principal (accent gold)
|                                   |
|      Conectar Arduino             |  ← texto link, font-mono, color secondary
|                                   |
+-----------------------------------+
```

- Estilo: texto sin fondo, `font-mono`, `color: var(--color-text-secondary)`, underline sutil
- Al tocar: abre BlePanel superpuesto sobre StartScreen
- Si conecta y luego toca "Comenzar": entra con BLE activo
- Si toca "Comenzar" sin conectar: entra con touch controls

### Punto de montaje de BlePanel

`<BlePanel />` se monta en `App.jsx`, no dentro de `Overlay.jsx`. Razón: Overlay retorna `null` cuando `started === false`, pero BlePanel debe funcionar tanto antes de empezar (desde StartScreen) como después (desde el HUD). Montarlo en App garantiza disponibilidad en ambos escenarios.

```jsx
// App.jsx (estructura resultante)
<>
  <Scene audioRef={audioRef} />
  <Overlay />
  <TouchControls />
  <BlePanel />        {/* ← siempre montado, visibilidad controlada por showBlePanel */}
  <TouchToggle />     {/* ← visible solo cuando bleStatus === 'connected' */}
  <StartScreen />
</>
```

### 3b. BlePanel — Lista de dispositivos

Panel modal centrado con la estética de Il Podio:

```
+-----------------------------------+
|                                   |
|   Dispositivos cercanos           |  ← font-display, color primary
|                                   |
|   ○ Arduino          ▂▄▆  -42dB  |  ← nombre + barras RSSI + MAC parcial
|                                   |     (AA:BB)
|   ○ Arduino          ▂▄   -67dB  |
|                                   |
|   Buscando...                     |  ← spinner durante scan (font-mono)
|                                   |
|          [ Cancelar ]             |
+-----------------------------------+
```

- **Fondo**: semi-transparente `var(--color-bg)` con `backdrop-filter: blur(8px)`
- **Dispositivos**: cada uno es un botón tocable con `pointer-events: auto`
- **RSSI**: 1-3 barras según intensidad + valor numérico en dBm
- **MAC parcial**: últimos 4 caracteres, `font-mono`, `color: var(--color-text-secondary)`
- **Timeout**: 15 segundos de scan, luego "No se encontraron dispositivos cercanos" con botón "Reintentar"
- **Estado "Conectando..."**: reemplaza la lista mientras se conecta al dispositivo seleccionado
- **z-index**: 50 (ver pila completa abajo)
- Se usa tanto desde StartScreen como desde el HUD (mismo componente)

### Pila de z-index

| Capa | z-index | Componente |
|---|---|---|
| Escena 3D (Canvas) | 0 (flujo normal) | `Scene` |
| Overlay HUD | 10 | `.overlay` |
| Touch controls | 20 | `.touch-controls` |
| BlePanel | 50 | `.ble-panel` |
| StartScreen | 100 | `.start-screen` |

BlePanel usa z-index 50 para quedar sobre el HUD y los touch controls, pero debajo de StartScreen. Cuando se abre desde StartScreen, StartScreen sigue visible detrás gracias a la transparencia del panel.

### 3c. Overlay HUD — Icono BLE interactivo

El indicador BLE del header se convierte en botón tocable:

```
Antes:   ● Sin conexión          (solo visual)
Ahora:   ● Sin conexión          (tocable, abre BlePanel)
```

- `pointer-events: auto` en el área del BLE status
- Al tocar: abre BlePanel (sobre la escena 3D)
- Estados visuales del dot + label:
  - `idle` / `disconnected`: dot rojo `var(--color-ble-disconnected)` + "Sin conexión"
  - `scanning`: dot parpadeante (animación CSS) + "Buscando..."
  - `connecting`: dot ámbar `var(--color-accent)` + "Conectando..."
  - `connected`: dot teal `var(--color-ble-connected)` + "Conectado"

### 3d. Toggle de touch controls

Botón pequeño visible solo cuando `bleStatus === 'connected'`:
- Posición: esquina inferior derecha, sobre los touch controls ocultos
- Icono: SVG monolinea de mano (stroke 1.5px, `color: var(--color-text-secondary)`)
- Al tocar: alterna `showTouchControls` en el store
- Transición suave de opacidad + translate en los touch controls

---

## 4. Capacitor + Permisos Android

### Setup

```bash
npm install @capacitor/core @capacitor/cli
npx cap init "Il Podio" "com.uao.ilpodio"
npm install @capacitor/android
npx cap add android
npm install @capacitor-community/bluetooth-le@^7.3.2
npx cap sync
```

### Permisos en AndroidManifest.xml

```xml
<!-- Legacy: Android 11 y menor -->
<uses-permission android:name="android.permission.BLUETOOTH" android:maxSdkVersion="30" />
<uses-permission android:name="android.permission.BLUETOOTH_ADMIN" android:maxSdkVersion="30" />
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" android:maxSdkVersion="30" />

<!-- Android 12+ (API 31+) -->
<uses-permission android:name="android.permission.BLUETOOTH_SCAN" />
<uses-permission android:name="android.permission.BLUETOOTH_CONNECT" />

<!-- BLE como feature opcional -->
<uses-feature android:name="android.hardware.bluetooth_le" android:required="false" />
```

`android:required="false"` para que la app funcione en dispositivos sin BLE (usando solo touch controls).

---

## 5. Auto-reconnect y manejo de errores

### Estrategia de reconexión

1. `bleStatus` cambia a `'disconnected'`, touch controls reaparecen
2. Tras 2 segundos, intento de reconexión al mismo `deviceId`
3. Patrón "disconnect antes de connect" (workaround Android para limpiar GATT handle sucio)
4. Hasta 5 intentos con backoff incremental: 2s, 4s, 6s, 8s, 10s
5. Si todos fallan: `bleStatus` queda en `'disconnected'`, el usuario reconecta manualmente

### Mensajes de error

| Situación | Mensaje | Acción |
|---|---|---|
| Bluetooth apagado | "Activa el Bluetooth de tu dispositivo" | Botón que abre ajustes del sistema |
| Permisos denegados | "Se necesitan permisos de Bluetooth para conectar" | Botón de reintentar permisos |
| Scan sin resultados | "No se encontraron dispositivos cercanos" | Botón "Reintentar" |
| Conexión fallida | "No se pudo conectar. Asegúrate de que el Arduino esté encendido y cerca." | Vuelve a la lista |
| Desconexión inesperada | "Conexión perdida. Reconectando..." | Auto-reconnect silencioso |
| Auto-reconnect agotado | "No se pudo reconectar" | Indicador BLE rojo, reconectar manual |

---

## 6. Contrato BLE

Se genera `docs/BLE-CONTRATO.md` con la especificación que el compañero debe respetar:

- **UUIDs**: placeholder (los define el compañero y los pone en `src/config/ble.js`)
- **Formato**: 1 byte por notificación, valor = índice de la clase (0-4)
- **Mapeo**: 0=infinito, 1=m, 2=maracas, 3=u, 4=silencio (debe coincidir con orden de Edge Impulse)
- **Propiedades**: `BLERead | BLENotify`
- **Debounce**: solo enviar cuando el gesto cambia respecto al anterior
- **Desconexión**: re-advertise automático para permitir reconexión
- **Recomendaciones**: umbral de confianza >= 0.70, `BLE.setConnectionInterval(6, 12)` para mínima latencia

---

## 7. Archivos nuevos y modificados

### Nuevos
- `src/config/ble.js` — configuración BLE (UUIDs, timeouts)
- `src/ble/BleManager.js` — singleton de gestión BLE
- `src/hooks/useBle.js` — hook React que conecta BleManager con el store
- `src/components/overlay/BlePanel.jsx` — panel de escaneo/lista de dispositivos
- `src/components/overlay/BlePanel.css`
- `src/components/overlay/TouchToggle.jsx` — botón toggle de touch controls
- `src/components/overlay/TouchToggle.css`
- `capacitor.config.ts` — configuración de Capacitor
- `docs/BLE-CONTRATO.md` — contrato para el compañero
- `android/` — plataforma Android generada por Capacitor

### Modificados
- `src/store/useGestureStore.js` — nuevos campos BLE, eliminar `bleConnected`
- `src/components/overlay/StartScreen.jsx` — botón "Conectar Arduino"
- `src/components/overlay/StartScreen.css`
- `src/components/overlay/Overlay.jsx` — BLE status interactivo, estados visuales
- `src/components/overlay/Overlay.css` — animación de dot parpadeante, pointer-events
- `src/components/overlay/TouchControls.jsx` — lógica de visibilidad condicional
- `src/components/overlay/TouchControls.css` — transiciones de mostrar/ocultar
- `src/App.jsx` — agregar hook `useBle` + montar `<BlePanel />`
- `package.json` — nuevas dependencias (Capacitor, plugin BLE)
- `android/app/src/main/AndroidManifest.xml` — permisos BLE

---

## 8. Investigación de respaldo

### Hallazgos técnicos clave

- **Plugin**: `@capacitor-community/bluetooth-le` v7.3.2. Mantenido activamente (último push: 11 marzo 2026). API modelada sobre Web Bluetooth. Cola interna serializa operaciones para prevenir condiciones de carrera en el GATT stack de Android.
- **Latencia**: 30-60 ms end-to-end (sensor → inferencia → BLE notify → app callback). Muy por debajo del umbral de percepción humana (~100 ms).
- **Connection interval**: 7.5-15 ms recomendado. Android puede negociar hasta 15 ms en la práctica.
- **Web Bluetooth**: NO funciona en Android WebView (issue Chromium #1100993, abierto desde 2020). El plugin nativo es la única vía.
- **Seguridad**: Sin pairing es suficiente (datos no sensibles).
- **Formato**: Notifications (no indications) para mínima latencia. MTU 23 bytes es suficiente para 1 byte.
- **Nombre por defecto**: `"Arduino"` (hardcodeado en ArduinoBLE `GATT.cpp`). Por eso la lista de escaneo muestra nombre + RSSI + MAC parcial.
- **Bug conocido**: GATT handle corrupto tras toggle Bluetooth OFF→ON. Mitigación: "disconnect antes de connect" en el flujo de reconexión.
- **Background**: JS event loop se detiene tras 5 min en background. No es crítico para esta app (pantalla activa durante uso).

### Fuentes principales

| Fuente | URL |
|---|---|
| capacitor-community/bluetooth-le (GitHub) | https://github.com/capacitor-community/bluetooth-le |
| ArduinoBLE source — GATT.cpp | https://github.com/arduino-libraries/ArduinoBLE/blob/master/src/utility/GATT.cpp |
| BLE Latency Analysis (PMC, paper académico) | https://pmc.ncbi.nlm.nih.gov/articles/PMC4327007/ |
| BLE Throughput Primer (Memfault/Interrupt) | https://interrupt.memfault.com/blog/ble-throughput-primer |
| BLE Connection Intervals (Novel Bits) | https://novelbits.io/ble-connection-intervals/ |
| BLE Security Guide 2025 (Argenox) | https://argenox.com/blog/bluetooth-low-energy-ble-security-privacy-a-2025-guide |
| Chromium WebView BLE Issue #1100993 | https://bugs.chromium.org/p/chromium/issues/detail?id=1100993 |
| Android BLE Permissions (Nordic DevZone) | https://devzone.nordicsemi.com/ |
