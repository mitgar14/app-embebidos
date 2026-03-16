# Spec: Rediseño BLE + Protocolo + Lógica acumulativa

**Fecha:** 2026-03-16
**Proyecto:** Il Podio — App de director de orquesta con TinyML

---

## 1. Contexto y problemas actuales

### 1.1 Problemas de UX del panel BLE

- El escaneo BLE descubre **todos** los dispositivos en rango (sin filtro por Service UUID), generando una lista enorme de "Desconocido" en entornos concurridos.
- Los 4 dígitos del MAC y el RSSI en dBm no aportan información comprensible al usuario.
- **No hay forma de cerrar el panel**: no existe botón X ni handler del botón atrás de Android. El gesto atrás cierra la app completa.
- No hay validación de compatibilidad: la app no distingue un Arduino de un smartwatch.

### 1.2 Problemas de protocolo

- `BYTE_TO_GESTURE` asume 6 clases; el modelo Edge Impulse tiene **5**: `[Infinito, M, Maracas, Silencio, U]`.
- Los índices de `u` y `silencio` están **invertidos** respecto al modelo: el código actual tiene `u` en índice 3 y `silencio` en índice 4, pero el modelo Edge Impulse tiene `Silencio` en índice 3 y `U` en índice 4. El nuevo protocolo de 5 bytes elimina este problema al parsear por posición fija.
- Se transmite 1 byte (argmax) descartando las probabilidades del softmax.
- Los UUIDs de servicio y característica son **placeholders**.

### 1.3 Problemas de lógica de juego

- El mapeo actual trata "silencio" como "silenciar todo" y "tutti" como un gesto separado.
- El modelo no tiene clase "tutti" — nunca existió como gesto.
- La lógica es exclusiva (un gesto = una sección activa), no acumulativa.

---

## 2. Protocolo BLE: vector de 5 bytes cuantizado

### 2.1 Formato de datos

El Arduino envía **5 bytes** por notificación BLE. Cada byte representa la probabilidad de una clase, cuantizada como `uint8_t`:

```
Byte[0] = round(P(Infinito) * 255)
Byte[1] = round(P(M)        * 255)
Byte[2] = round(P(Maracas)  * 255)
Byte[3] = round(P(Silencio) * 255)
Byte[4] = round(P(U)        * 255)
```

- Resolución: ~0.4% (suficiente para gestos de dirección).
- Tamaño: 5 bytes, dentro del MTU de 20 bytes de ArduinoBLE.
- El orden de índices **coincide exactamente** con `ei_classifier_inferencing_categories` del modelo exportado.

### 2.2 Configuración BLE

```javascript
// src/config/ble.js
export const BLE_CONFIG = {
  SERVICE_UUID:        '<UUID real del Arduino — pendiente del compañero>',
  CHARACTERISTIC_UUID: '<UUID real — pendiente del compañero>',
  DEVICE_NAME:         'Arduino_BLE',
  KNOWN_MAC:           '31:FB:E1:57:CA:41',
  SCAN_TIMEOUT:        15000,
  RECONNECT_DELAY:     2000,
  RECONNECT_MAX_ATTEMPTS: 5,
  CONFIDENCE_THRESHOLD: 0.60,
  IDLE_TIMEOUT:        3000,  // ms sin gesto → fade out
}
```

### 2.3 Parsing en la app

```javascript
// BleManager.js — onNotification callback
(value) => {
  const probs = Array.from(
    { length: 5 },
    (_, i) => value.getUint8(i) / 255
  )
  onNotification(probs)  // ya no es un byte, es float[5]
}
```

### 2.4 Código Arduino (referencia)

Basado en el sketch existente `sketch_mar16a.ino`, se agrega BLE:

```cpp
#include <ArduinoBLE.h>

BLEService gestureService("SERVICE_UUID_AQUI");
BLECharacteristic gestureChar("CHAR_UUID_AQUI", BLERead | BLENotify, 5);

// Tras run_classifier():
uint8_t probs[5];
for (int i = 0; i < EI_CLASSIFIER_LABEL_COUNT; i++) {
    probs[i] = (uint8_t)(result.classification[i].value * 255.0f);
}
gestureChar.writeValue(probs, 5);
```

---

## 3. Filtrado de escaneo BLE

### 3.1 Estrategia de tres capas

1. **Service UUID** (capa primaria): `requestLEScan({ services: [SERVICE_UUID] })` — solo dispositivos que anuncian el servicio de Il Podio.
2. **Nombre del dispositivo** (capa secundaria): verificar que `localName || device.name` contenga `"Arduino_BLE"`.
3. **MAC conocida** (capa terciaria): `31:FB:E1:57:CA:41` — identifica el Arduino propio entre varios idénticos en el salón de clase.

### 3.2 Comportamiento esperado

- En un salón con 10+ Arduinos corriendo el mismo firmware, solo aparecen los que anuncian el Service UUID correcto.
- El Arduino con MAC conocida se destaca visualmente ("Tu Arduino") y tiene prioridad en la lista.
- Si no se detecta ningún dispositivo compatible en 15 segundos, se muestra mensaje de ayuda.

---

## 4. Panel BLE: modal compacto mejorado (Opción C)

### 4.1 Estructura

```
┌─────────────────────────────────┐
│  Conectar Arduino          [X]  │  ← Header con título y botón cerrar
├─────────────────────────────────┤
│                                 │
│  ┌─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┐  │
│  │ [BLE icon]               │  │
│  │ Arduino_BLE              │  │  ← Tarjeta de dispositivo
│  │ Compatible · -42 dBm     │  │
│  │ Excelente            ▂▄▆ │  │
│  └─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘  │
│                                 │
├─────────────────────────────────┤
│  ● Buscando...       Cancelar  │  ← Footer con estado y botón
└─────────────────────────────────┘
```

### 4.2 Mejoras sobre el panel actual

| Aspecto | Antes | Después |
|---------|-------|---------|
| Filtrado | Ninguno (todos los BLE) | Service UUID + nombre + MAC |
| Cierre | Solo "Cancelar" al fondo | Botón X + botón atrás Android + tap fuera del modal |
| Altura | Sin límite (crece con la lista) | `max-height: 50vh`, scroll interno |
| Dispositivos | Nombre + RSSI crudo + MAC parcial | Nombre + etiqueta compatibilidad + señal legible + barras |
| Señal | Unicode blocks + dBm | Barras SVG + etiqueta ("Excelente"/"Buena"/"Débil") |
| MAC conocida | No distingue | Etiqueta "Tu Arduino" si coincide MAC |
| Estado vacío | "No se encontraron dispositivos" | Mensaje contextual + sugerencias de troubleshooting |
| Conexión | Tap → conecta silenciosamente | Tap → feedback visual de conexión → confirmación |

### 4.3 Botón atrás de Android (Capacitor)

```javascript
import { App } from '@capacitor/app'

App.addListener('backButton', ({ canGoBack }) => {
  const { showBlePanel, setShowBlePanel } = useGestureStore.getState()
  if (showBlePanel) {
    setShowBlePanel(false)
    return  // consumir el evento, no cerrar la app
  }
  if (!canGoBack) {
    App.minimizeApp()  // minimizar en vez de cerrar
  }
})
```

---

## 5. Mapeo de gestos y lógica acumulativa

### 5.1 Mapeo gesto → sección

| Índice | Gesto (modelo EI) | Sección | Stem de audio | Rol |
|--------|--------------------|---------|---------------|-----|
| 0 | Infinito | — | — | **Keep-alive**: mantiene tutti sonando |
| 1 | M | Cuerdas Graves | `stem_cuerdas_graves` | Instrumento acumulativo |
| 2 | Maracas | Vientos Madera | `stem_vientos_madera` | Instrumento acumulativo |
| 3 | Silencio | Vientos Metal | `stem_vientos_metal` | Instrumento acumulativo |
| 4 | U | Violines | `stem_violines` | Instrumento acumulativo |

**Importante:** Los nombres de gesto del modelo ("Silencio", "Infinito") **no reflejan su función en la app**. Son nombres heredados del entrenamiento de Edge Impulse. En la lógica de la app, solo importa el índice.

### 5.2 Flujo acumulativo

```
Estado inicial: ningún instrumento activo, silencio total

1. Usuario hace gesto U
   → activeSections = {violines}
   → stem_violines suena

2. Usuario hace gesto M
   → activeSections = {violines, cuerdas}
   → stem_violines + stem_cuerdas_graves suenan

3. Usuario hace gesto Maracas
   → activeSections = {violines, cuerdas, madera}
   → + stem_vientos_madera

4. Usuario hace gesto Silencio
   → activeSections = {violines, cuerdas, madera, metal}
   → TODOS los instrumentos activos
   → Crossfade a stem_tutti (solo esa pista)

5. Usuario mantiene gesto Infinito
   → tutti sigue sonando (keep-alive activo)
   → Cada inferencia que detecte Infinito resetea el idle timer

6. Usuario deja de hacer gestos
   → Idle timer expira (3 segundos)
   → Fade out de tutto
   → activeSections = {} (reset completo)
```

### 5.3 Reglas de la lógica acumulativa

- **Adición sin orden**: los gestos se pueden hacer en cualquier secuencia. Cada gesto SUMA su sección al conjunto activo.
- **Sin remoción individual**: una vez activado, un instrumento permanece hasta el reset por idle.
- **Transición a tutti**: cuando `activeSections.size === 4` (las 4 secciones instrumentales), se hace crossfade a `stem_tutti` y se silencian los stems individuales.
- **Keep-alive (Infinito)**: mientras el modelo detecte Infinito con confianza >= umbral, el idle timer se resetea. Cualquier otro gesto reconocido también resetea el timer (y además suma su instrumento si no estaba ya activo).
- **Idle timeout**: si pasan `IDLE_TIMEOUT` ms sin ningún gesto reconocido (ninguna clase >= umbral), fade out total y reset de `activeSections`.
- **Confianza**: solo se acepta un gesto si `max(probs) >= CONFIDENCE_THRESHOLD` (0.60, umbral post-dequantización, coincide con el threshold del modelo EI).
- **Desempate**: si dos clases tienen probabilidad idéntica tras cuantización (posible dado que 8 bits = 256 niveles), gana el índice menor (first-index-wins). Esto es aceptable dado nuestro set de gestos — los empates exactos son raros y transitorios.

### 5.4 Determinación del gesto activo

```javascript
function resolveGesture(probs) {
  // probs: float[5] con valores en [0, 1]
  const maxProb = Math.max(...probs)
  if (maxProb < BLE_CONFIG.CONFIDENCE_THRESHOLD) return null  // incierto

  const maxIndex = probs.indexOf(maxProb)
  return {
    index: maxIndex,
    confidence: maxProb,
    label: CLASS_LABELS[maxIndex],  // ['infinito','m','maracas','silencio','u']
  }
}
```

---

## 5bis. Comportamiento ante desconexión BLE mid-session

Cuando el Arduino se desconecta durante una sesión activa (con instrumentos acumulados):

1. **El idle timer arranca inmediatamente**: al dejar de recibir notificaciones, el timer de inactividad expira tras `IDLE_TIMEOUT` ms y ejecuta fade out + reset de `activeSections`.
2. **Se inicia reconexión automática** (lógica existente con backoff exponencial, hasta 5 intentos).
3. **El estado acumulado NO se preserva**: si la reconexión tiene éxito, el usuario arranca de cero. Razón: preservar un estado que ya se desvaneció (fade out) generaría una experiencia inconsistente.
4. **Indicador visual**: el overlay muestra "Reconectando..." durante los intentos. Si falla definitivamente, vuelve a "Sin conexión".
5. **Re-suscripción automática**: `BleManager.connect()` ya re-suscribe a notificaciones como parte del flujo de conexión, por lo que no se requiere lógica adicional.

### Validación del payload BLE

Cada notificación debe validarse antes de procesarse:

```javascript
if (value.byteLength !== 5) return  // payload corrupto o incompatible, ignorar
```

---

## 6. Cambios en el store (Zustand)

### 6.1 Estado reemplazado

```javascript
// ANTES
currentGesture: 'silencio',
activeSection: null,

// DESPUÉS
currentGesture: null,           // gesto detectado actualmente (o null)
gestureConfidence: 0,           // confianza del gesto actual
activeSections: [],             // secciones acumuladas (Array con dedup, no Set — compatible con serialización JSON y devtools de Zustand)
isTutti: false,                 // true cuando las 4 secciones están activas
```

### 6.2 Mapeo actualizado

```javascript
// ANTES
const GESTURE_TO_SECTION = {
  infinito: 'violines',
  m: 'cuerdas',
  maracas: 'madera',
  u: 'metal',
  tutti: 'tutti',
  silencio: null,
}

// DESPUÉS — NOTA: esto NO es un bugfix, es un cambio semántico completo.
// Las asociaciones gesto→sección se redefinen desde cero.
const GESTURE_TO_SECTION = {
  u: 'violines',         // antes: u → metal
  m: 'cuerdas',          // se mantiene
  maracas: 'madera',     // se mantiene
  silencio: 'metal',     // antes: silencio → null (silenciaba todo)
  infinito: null,        // antes: infinito → violines. Ahora es keep-alive.
}

const ALL_INSTRUMENT_SECTIONS = ['violines', 'cuerdas', 'madera', 'metal']
```

### 6.3 Acciones nuevas

```javascript
addSection: (section) => set((state) => {
  if (!section || state.activeSections.includes(section)) return state
  const next = [...state.activeSections, section]
  const isTutti = next.length === ALL_INSTRUMENT_SECTIONS.length
  return { activeSections: next, isTutti }
}),

resetSections: () => set({
  activeSections: [],
  isTutti: false,
  currentGesture: null,
  gestureConfidence: 0,
}),
```

---

## 7. Cambios en el motor de audio

### 7.1 Comportamiento actual

- Un stem suena a la vez según `activeSection`.
- Todos los demás stems están muteados.

### 7.2 Comportamiento nuevo

- **Múltiples stems simultáneos**: cada sección en `activeSections` tiene su stem con volumen > 0.
- **Transición a tutti**: cuando `isTutti === true`, fade out de los 4 stems individuales + fade in de `stem_tutti`.
- **Fade out por idle**: cuando se resetean las secciones, fade out gradual de todos los stems activos.
- **Tiempos de transición**: fade in ~300ms por stem individual, crossfade a tutti ~500ms, fade out idle ~800ms.

---

## 8. Cambios en los Touch Controls

Los touch controls manuales deben reflejar la lógica acumulativa:

- Cada botón de sección funciona como **toggle on** (no exclusivo): tap → añade al conjunto activo.
- Botones ya activos se muestran con fondo relleno (visual feedback).
- Cuando las 4 secciones están activas, los botones individuales se atenúan y se muestra indicador de tutti.
- **No hay botón de "silencio"** como toggle: el silencio ocurre por idle (soltar todo).

---

## 9. Cambios en la escena 3D

- Múltiples secciones pueden estar visualmente activas (emissive encendido en paralelo).
- Estado tutti: todas las secciones con emissive + efecto visual adicional (bloom más intenso o color tutti).
- Fade visual coordinado con el fade de audio en idle.

---

## 10. Archivos impactados

| Archivo | Cambios |
|---------|---------|
| `src/config/ble.js` | UUIDs reales, MAC conocida, nuevo mapeo de clases (5 elementos), idle timeout, confidence threshold, labels del modelo |
| `src/ble/BleManager.js` | Filtro por UUID en `requestLEScan`, parsing de 5 bytes (no 1), validación de `byteLength === 5` |
| `src/hooks/useBle.js` | `resolveGesture()` con probabilidades, idle timer, lógica de acumulación via `addSection`, reset por timeout |
| `src/store/useGestureStore.js` | Reemplazar `activeSection` (string) por `activeSections` (Array con dedup), agregar `isTutti`, `gestureConfidence`, `addSection()`, `resetSections()`. Estado inicial de `currentGesture` pasa de `'silencio'` a `null` |
| `src/components/overlay/BlePanel.jsx` | Rediseño modal compacto (Opción C): botón X, max-height, tarjetas de dispositivo con compatibilidad, señal legible, MAC conocida destacada |
| `src/components/overlay/BlePanel.css` | Estilos del modal rediseñado |
| `src/components/overlay/Overlay.jsx` | Cambiar footer de sección singular a plural (lista de secciones activas). **Fix null safety**: `currentGesture` ahora puede ser `null`, la línea `currentGesture.toUpperCase()` crasheará — usar optional chaining o fallback |
| `src/components/overlay/TouchControls.jsx` | Invertir `GESTURE_MAP` al nuevo mapeo (`violines: 'u'`, `cuerdas: 'm'`, `madera: 'maracas'`, `metal: 'silencio'`). Eliminar botón de silencio (`touch-btn--silence`). Eliminar entrada `tutti` del mapa. Cambiar `activeSection` singular por `activeSections.includes(key)`. Comportamiento: toggle on acumulativo, no exclusivo |
| `src/hooks/useKeyboardGestures.js` | Actualizar `KEY_MAP` al nuevo mapeo: `1→'u'` (violines), `2→'m'` (cuerdas), `3→'maracas'` (madera), `4→'silencio'` (metal), `5→'infinito'` (keep-alive). Eliminar `tutti` y `Escape→silencio`. Adaptar a lógica acumulativa (`addSection` en vez de `setGesture` exclusivo) |
| `src/config/sections.js` | `tutti` permanece como clave de stem en `SECTIONS` (el audio manager lo necesita para iterar stems e inicializar `stem_tutti`), pero se elimina de `SECTION_KEYS` u otros iteradores usados por la UI/3D para posiciones. Alternativa: separar `INSTRUMENT_SECTIONS` (sin tutti) de `ALL_SECTIONS` (con tutti) |
| `src/App.jsx` | Handler del botón atrás de Android via `@capacitor/app`. Registrar en `useEffect`, limpiar con `listener.remove()` en cleanup |
| Motor de audio (componente por identificar) | Soporte para múltiples stems simultáneos, crossfade equal-power a `stem_tutti` (~500ms), fade out por idle (~800ms). `tutti` sigue existiendo como stem, solo cambia cuándo y cómo se activa |
| `sketch_mar16a.ino` → sketch BLE | Agregar BLE: `BLEService`, `BLECharacteristic(5 bytes)`, `BLE.setAdvertisedService()`, loop de inferencia + `writeValue(probs, 5)` |

---

## 11. Dependencias y prerrequisitos

- **Del compañero:** UUIDs reales del Service y Characteristic del Arduino.
- **Del compañero:** Sketch BLE funcional que envíe los 5 bytes de probabilidades. El sketch debe incluir `BLE.setAdvertisedService(gestureService)` para que el UUID aparezca en el advertising packet (no solo en la tabla GATT).
- **Nueva dependencia:** `@capacitor/app` — necesario para el handler del botón atrás de Android. No está instalado actualmente. Instalar con `npm install @capacitor/app`.

---

## 12. Fuera de alcance

- Reentrenamiento del modelo Edge Impulse (los 5 gestos y sus nombres quedan como están).
- Cambios en la escena 3D más allá de soportar múltiples secciones activas.
- UI de configuración de MAC/UUID (se hardcodean en config).
