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
- Los índices de `u` (3) y `silencio` (4) están **invertidos** respecto al modelo.
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
- **Confianza**: solo se acepta un gesto si `max(probs) >= CONFIDENCE_THRESHOLD` (0.60, coincide con el threshold del modelo EI).

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

## 6. Cambios en el store (Zustand)

### 6.1 Estado reemplazado

```javascript
// ANTES
currentGesture: 'silencio',
activeSection: null,

// DESPUÉS
currentGesture: null,           // gesto detectado actualmente (o null)
gestureConfidence: 0,           // confianza del gesto actual
activeSections: new Set(),      // secciones acumuladas
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

// DESPUÉS
const GESTURE_TO_SECTION = {
  u: 'violines',
  m: 'cuerdas',
  maracas: 'madera',
  silencio: 'metal',
  infinito: null,  // keep-alive, no suma sección
}

const ALL_INSTRUMENT_SECTIONS = new Set(['violines', 'cuerdas', 'madera', 'metal'])
```

### 6.3 Acciones nuevas

```javascript
addSection: (section) => set((state) => {
  if (!section || state.activeSections.has(section)) return state
  const next = new Set(state.activeSections)
  next.add(section)
  const isTutti = next.size === ALL_INSTRUMENT_SECTIONS.size
  return { activeSections: next, isTutti }
}),

resetSections: () => set({
  activeSections: new Set(),
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
| `src/config/ble.js` | UUIDs reales, MAC conocida, nuevo mapeo de clases, idle timeout, threshold |
| `src/ble/BleManager.js` | Filtro por UUID en scan, parsing de 5 bytes, validación post-conexión |
| `src/hooks/useBle.js` | Lógica de gesto con probabilidades, idle timer, acumulación |
| `src/store/useGestureStore.js` | `activeSections` (Set), `isTutti`, `gestureConfidence`, acciones nuevas |
| `src/components/overlay/BlePanel.jsx` | Rediseño modal compacto (Opción C), botón X, compatibilidad, señal legible |
| `src/components/overlay/BlePanel.css` | Estilos del modal rediseñado |
| `src/components/overlay/Overlay.jsx` | Indicador de sección activa plural (no singular) |
| `src/components/overlay/TouchControls.jsx` | Comportamiento acumulativo (toggle on, no exclusivo) |
| `src/config/sections.js` | Eliminar `tutti` como sección con posición (es estado, no sección) |
| `src/App.jsx` | Handler del botón atrás de Android (Capacitor App plugin) |
| Motor de audio (componente por identificar) | Stems simultáneos, crossfade a tutti, fade idle |
| `sketch_mar16a.ino` → sketch BLE | Agregar BLE con característica de 5 bytes |

---

## 11. Dependencias y prerrequisitos

- **Del compañero:** UUIDs reales del Service y Characteristic del Arduino.
- **Del compañero:** Sketch BLE funcional que envíe los 5 bytes de probabilidades.
- **Existente:** `@capacitor/app` necesario para el handler del botón atrás. Verificar si ya está instalado.
- **Sin nuevas dependencias npm** requeridas para la app.

---

## 12. Fuera de alcance

- Reentrenamiento del modelo Edge Impulse (los 5 gestos y sus nombres quedan como están).
- Cambios en la escena 3D más allá de soportar múltiples secciones activas.
- UI de configuración de MAC/UUID (se hardcodean en config).
