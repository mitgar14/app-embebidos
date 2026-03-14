# Il Podio

**Aplicacion interactiva que convierte gestos manuales en direccion orquestal.** Un dispositivo Arduino con TinyML reconoce los movimientos del usuario y transmite via BLE la seccion de la orquesta que debe sonar, mientras una escena 3D inmersiva responde visualmente al audio de la Sinfonia No. 7 (II) de Beethoven.

> *Il Podio* — «El podio» en italiano: la plataforma donde el director de orquesta dirige a los musicos.

---

## Tabla de contenidos

1. [Descripcion general](#descripcion-general)
2. [Stack tecnologico](#stack-tecnologico)
3. [Requisitos previos](#requisitos-previos)
4. [Instalacion](#instalacion)
5. [Uso](#uso)
6. [Estructura del proyecto](#estructura-del-proyecto)
7. [Arquitectura](#arquitectura)
8. [Sistema de gestos](#sistema-de-gestos)
9. [Sistema de audio](#sistema-de-audio)
10. [Escena 3D](#escena-3d)
11. [Conexion BLE con Arduino](#conexion-ble-con-arduino)
12. [Testing](#testing)

---

## Descripcion general

Il Podio es una aplicacion hibrida (web + Android) desarrollada como proyecto de sistemas embebidos. El usuario asume el rol de director de orquesta: sus gestos manuales, reconocidos por un modelo TinyML desplegado en un Arduino Nano 33 BLE, controlan que seccion instrumental suena y como responde la visualizacion 3D.

### Flujo principal

```
Gesto manual
    |
Arduino Nano 33 BLE (TinyML / Edge Impulse)
    |
BLE Notification (1 byte = indice de clase)
    |
App Il Podio (Capacitor + React)
    |
    +---> Audio: destaca el stem de la seccion activa
    +---> Visual: anima el totem 3D correspondiente
    +---> UI: muestra seccion y gesto en el overlay
```

### Secciones de la orquesta

| Seccion | Gesto | Color | Geometria 3D |
|---------|-------|-------|--------------|
| Violines | Infinito | `#D4A017` Dorado | Torus |
| Cuerdas Graves | M | `#8B2E2E` Rojo profundo | Torus |
| Vientos Madera | Maracas | `#4A7C6F` Verde azulado | Octaedro |
| Vientos Metal | U | `#CD7F32` Bronce | Nudo toroidal |
| Tutti | Tutti | `#EDE8D0` Crema | Icosaedro |

---

## Stack tecnologico

| Capa | Tecnologia | Version |
|------|------------|---------|
| UI | React | 19.2 |
| 3D | Three.js + React Three Fiber | 0.183 / 9.5 |
| Efectos | R3F Postprocessing | 3.0 |
| Estado | Zustand | 5.0 |
| Build | Vite (Rolldown) | 8.0 |
| Mobile | Capacitor | 8.2 |
| BLE | @capacitor-community/bluetooth-le | 7.3 |
| Testing | Vitest + Testing Library | 3.2 / 16.3 |
| Hardware | Arduino Nano 33 BLE + Edge Impulse | --- |

---

## Requisitos previos

### Software

- **Node.js** >= 20
- **Android Studio** con SDK 36 (para despliegue movil)
- **ADB** configurado en el PATH (incluido en Android SDK Platform-Tools)

### Hardware (opcional para desarrollo web)

- **Arduino Nano 33 BLE** con modelo TinyML desplegado
- **Dispositivo Android** con Bluetooth 4.0+ y USB debugging habilitado

> Sin el Arduino, la app funciona con controles tactiles en pantalla o con el teclado (teclas 1-5 para secciones, 0 para silencio).

---

## Instalacion

```bash
# Clonar el repositorio
git clone <url-del-repositorio>
cd app-embebidos

# Instalar dependencias
npm install
```

---

## Uso

### Desarrollo web

```bash
npm run dev
```

Abre `http://localhost:5173` en el navegador. Usa las teclas **1-5** para activar secciones o **0/Esc** para silenciar.

### Build de produccion

```bash
npm run build
```

Genera la carpeta `dist/` con los archivos optimizados.

### Tests

```bash
npm test
```

Ejecuta los tests unitarios con Vitest (AudioManager y GestureStore).

### Despliegue a Android

```bash
npm run build              # Compilar la app web
npx cap sync android       # Sincronizar con el proyecto Android
```

Desde ahi existen dos opciones:

**Opcion A — Android Studio:**

```bash
npx cap open android       # Abre el proyecto en Android Studio
```

Build > Run desde el IDE.

**Opcion B — Linea de comandos:**

```bash
cd android && ./gradlew assembleDebug                    # Compilar APK
adb install app/build/outputs/apk/debug/app-debug.apk   # Instalar en dispositivo
```

---

## Estructura del proyecto

```
src/
 |- main.jsx                    Punto de entrada, error boundary raiz
 |- App.jsx                     Componente principal (escena + overlays)
 |
 |- components/
 |   |- Scene.jsx               Canvas de Three.js (carga lazy)
 |   |- ConcertHall.jsx         Escena 3D: totems, luces, niebla
 |   |- CameraRig.jsx           Camara dinamica con seguimiento de seccion
 |   |- Effects.jsx             Postprocesado: bloom, vineta, ruido, aberracion
 |   |- SectionSpotlight.jsx    Spotlight por seccion orquestal
 |   |- DustParticles.jsx       Particulas ambientales (50 instancias)
 |   |- SceneErrorBoundary.jsx  Error boundary para la escena 3D
 |   |
 |   |- overlay/
 |   |   |- StartScreen.jsx     Pantalla de inicio
 |   |   |- Overlay.jsx         HUD: estado BLE, seccion activa, gesto
 |   |   |- TouchControls.jsx   Botones tactiles para entrada de gestos
 |   |   |- BlePanel.jsx        Panel de escaneo/conexion BLE
 |   |   |- TouchToggle.jsx     Toggle de controles tactiles
 |   |
 |   |- totems/
 |       |- Totem.jsx           Componente base con animacion reactiva al audio
 |       |- ViolinesTotem.jsx   Torus dorado
 |       |- CuerdasGravesTotem  Torus rojo
 |       |- VientosMaderaTotem  Octaedro verde azulado
 |       |- VientosMetalTotem   Nudo toroidal bronce
 |       |- TuttiTotem.jsx      Icosaedro wireframe + nucleo
 |
 |- hooks/
 |   |- useAudio.js             Inicializacion y control de stems de audio
 |   |- useAudioReactive.js     Lectura de amplitud por seccion (cada frame)
 |   |- useBle.js               Ciclo de vida BLE: escaneo, conexion, reconexion
 |   |- useKeyboardGestures.js  Mapeo de teclado para desarrollo/testing
 |
 |- audio/
 |   |- AudioManager.js         Web Audio API: gain, analyser, crossfade
 |
 |- ble/
 |   |- BleManager.js           Wrapper sobre Capacitor BLE
 |
 |- store/
 |   |- useGestureStore.js      Estado global (Zustand): gesto, seccion, BLE
 |
 |- config/
 |   |- sections.js             Definiciones: posicion, color, velocidad, stem
 |   |- ble.js                  UUIDs de servicio/caracteristica, mapeo byte-gesto
 |
 |- styles/
     |- variables.css           Tokens de diseno: colores, tipografias
     |- global.css              Reset y estilos base

public/audio/                   Stems de audio (5 archivos MP3)
docs/                           Documentacion del proyecto
android/                        Proyecto nativo Android (generado por Capacitor)
```

---

## Arquitectura

```
+------------------------------------------------------------------+
|                        main.jsx                                   |
|                    RootErrorBoundary                              |
|                          |                                        |
|                       App.jsx                                     |
|          +---------------+----------------+                       |
|          |               |                |                       |
|    useKeyboard      useAudio          useBle                     |
|    Gestures()        ()                ()                         |
|          |               |                |                       |
|          +-------+-------+--------+-------+                       |
|                  |                 |                               |
|           useGestureStore    AudioManager                         |
|           (Zustand)          (Web Audio)                          |
|                  |                 |                               |
|     +------------+------------+   |                               |
|     |            |            |   |                               |
|  StartScreen  Overlay   TouchControls                            |
|     |                         |                                   |
|     +-------Scene (lazy)------+                                   |
|             |                                                     |
|     +-------+--------+                                            |
|     |       |        |                                            |
|  CameraRig  |    Effects                                         |
|          ConcertHall                                              |
|     +--------+--------+                                           |
|     |        |        |                                           |
|   Totems  Spotlights  DustParticles                              |
+------------------------------------------------------------------+
```

### Flujo de datos

1. **Entrada** (teclado, touch o BLE) invoca `setGesture(gesture)` en el store.
2. **Store** mapea el gesto a una seccion orquestal (`GESTURE_TO_SECTION`).
3. **Audio** reacciona al cambio de seccion: destaca el stem correspondiente, atenua los demas.
4. **3D** cada totem lee `activeSection` y `amplitudes` para animar escala, emision y rotacion.
5. **Overlay** muestra el estado actual: seccion activa, gesto reconocido, estado BLE.

---

## Sistema de gestos

La app acepta gestos desde tres fuentes de entrada:

### Teclado (desarrollo)

| Tecla | Gesto | Seccion |
|-------|-------|---------|
| 1 | infinito | Violines |
| 2 | m | Cuerdas Graves |
| 3 | maracas | Vientos Madera |
| 4 | u | Vientos Metal |
| 5 | tutti | Tutti |
| 0 / Esc | silencio | Ninguna |

### Controles tactiles (mobile)

Seis botones circulares en la parte inferior de la pantalla. Visibles cuando no hay conexion BLE o cuando se activan manualmente con el toggle.

### BLE (Arduino)

El Arduino envia un byte por notificacion BLE. El mapeo se define en `src/config/ble.js`:

```
Byte 0 -> infinito  -> Violines
Byte 1 -> m         -> Cuerdas Graves
Byte 2 -> maracas   -> Vientos Madera
Byte 3 -> u         -> Vientos Metal
Byte 4 -> silencio  -> Ninguna
```

---

## Sistema de audio

Cinco stems de audio independientes (Beethoven, Sinfonia No. 7, II) se cargan como elementos `<audio>` y se conectan a un grafo de Web Audio API:

```
HTMLAudioElement  ->  MediaElementSource  ->  GainNode  ->  AnalyserNode  ->  Destino
```

### Comportamiento

- **Estado inicial:** solo el stem *tutti* suena a volumen bajo (0.15).
- **Seccion activa:** el stem correspondiente sube a 1.0; el resto baja a 0.15; *tutti* se silencia.
- **Silencio:** todos los stems bajan a 0.0.
- **Transiciones:** suavizadas con `setTargetAtTime()` (constante de tiempo 0.15s).
- **Reactividad visual:** cada `AnalyserNode` (FFT 512 bins) alimenta la amplitud que usan los totems para pulsar.

---

## Escena 3D

La escena simula una sala de conciertos oscura con iluminacion dramatica:

- **Iluminacion ambiental:** tono calido oscuro (`#1A1810`), intensidad 0.15.
- **Luces de escenario:** punto de luz dorado desde abajo (`#C9972A`).
- **Niebla exponencial:** densidad 0.05, color `#0A0906`.
- **Particulas de polvo:** 50 esferas doradas flotantes (instanciadas para rendimiento).

### Totems

Cada seccion orquestal tiene un totem — una forma geometrica 3D que reacciona al audio:

- **Rotacion continua** en el eje Y a velocidad unica por seccion.
- **Oscilacion vertical** suave (onda senoidal).
- **Escala:** 1.0 cuando esta activo, 0.7 cuando no (transicion interpolada).
- **Emision:** pulsa con la amplitud del audio de su seccion.

### Camara

El `CameraRig` ajusta la posicion, el FOV y el objetivo de la camara:

- Se desplaza suavemente hacia la seccion activa.
- Adapta distancia y FOV segun la orientacion del dispositivo (portrait vs. landscape).
- Interpolacion independiente del framerate (`1 - exp(-speed * delta)`).

### Postprocesado

| Efecto | Parametros |
|--------|-----------|
| Bloom | intensidad 0.8, umbral 0.4, mipmap blur |
| Vineta | offset 0.6, oscuridad 0.5 |
| Ruido (film grain) | opacidad 0.06, modo overlay |
| Aberracion cromatica | desplazamiento (0.001, 0.001) |

---

## Conexion BLE con Arduino

### Protocolo

El contrato completo esta en [`docs/BLE-CONTRATO.md`](docs/BLE-CONTRATO.md).

**Resumen:**

- **Servicio UUID:** `a1b2c3d4-e5f6-7890-abcd-ef1234567890` (placeholder)
- **Caracteristica UUID:** `a1b2c3d5-e5f6-7890-abcd-ef1234567890` (placeholder)
- **Formato:** 1 byte por notificacion = indice de clase de Edge Impulse.
- **Debounce:** el Arduino solo envia cuando el gesto cambia.
- **Confianza minima:** >= 0.70 recomendado.

### Reconexion automatica

Si la conexion se pierde, la app intenta reconectarse hasta 5 veces con backoff lineal (2s, 4s, 6s, 8s, 10s).

### Permisos Android

El `AndroidManifest.xml` declara permisos duales:

- **Android <= 11:** `BLUETOOTH`, `BLUETOOTH_ADMIN`, `ACCESS_FINE_LOCATION`.
- **Android 12+:** `BLUETOOTH_SCAN` (con `neverForLocation`), `BLUETOOTH_CONNECT`.

---

## Testing

```bash
npm test          # Ejecutar todos los tests
npm test -- --ui  # Interfaz visual de Vitest
```

### Tests existentes

| Archivo | Cobertura |
|---------|-----------|
| `AudioManager.test.js` | Inicializacion de stems, cambio de ganancia por seccion |
| `useGestureStore.test.js` | Estado inicial, mapeo gesto-seccion, ciclo BLE, deduplicacion de dispositivos, toggles de UI |

**Entorno:** Vitest + jsdom + @testing-library/jest-dom.

---

## Contexto academico

Proyecto desarrollado para la asignatura de **Sistemas Embebidos** en la Universidad Autonoma de Occidente (UAO), Cali, Colombia. Combina TinyML (reconocimiento de gestos en el edge), comunicacion BLE, y visualizacion 3D interactiva en una experiencia de direccion orquestal.
