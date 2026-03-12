# Il Podio — Proceso de implementación del prototipo

## Resumen

Prototipo de diseño funcional (visual + audio) de una aplicación de simulación de director de orquesta. Construido con React + Vite + React Three Fiber, con Web Audio API para la reproducción simultánea de 5 stems de Beethoven (Sinfonía No. 7, II movimiento).

**Fecha de implementación:** 12 de marzo de 2026

**Estado:** Prototipo de diseño completado (Fases 1-9). Pendiente: integración con Capacitor y BLE (Fase 10).

---

## Arquitectura del proyecto

```
app-embebidos/
├── public/
│   └── audio/                    # 5 stems MP3 (Beethoven)
├── src/
│   ├── audio/
│   │   ├── AudioManager.js       # Motor de audio (Web Audio API)
│   │   └── AudioManager.test.js
│   ├── components/
│   │   ├── overlay/
│   │   │   ├── Overlay.jsx       # HUD (estado BLE, gesto, sección)
│   │   │   ├── Overlay.css
│   │   │   ├── StartScreen.jsx   # Pantalla de inicio ("Comenzar")
│   │   │   ├── StartScreen.css
│   │   │   ├── TouchControls.jsx # Botones táctiles para mobile
│   │   │   └── TouchControls.css
│   │   ├── totems/
│   │   │   ├── Totem.jsx         # Componente base (rotación, respiración, escala, emisivo)
│   │   │   ├── ViolinesTotem.jsx
│   │   │   ├── CuerdasGravesTotem.jsx
│   │   │   ├── VientosMaderaTotem.jsx
│   │   │   ├── VientosMetalTotem.jsx
│   │   │   ├── TuttiTotem.jsx
│   │   │   └── index.js
│   │   ├── ConcertHall.jsx       # Escena 3D (luces, totems, partículas)
│   │   ├── DustParticles.jsx     # Partículas de polvo ambiental
│   │   ├── Effects.jsx           # Post-procesamiento (bloom, viñeta, grano)
│   │   ├── Scene.jsx             # Canvas R3F
│   │   └── SectionSpotlight.jsx  # Spotlight por sección
│   ├── config/
│   │   └── sections.js           # Configuración de las 5 secciones
│   ├── hooks/
│   │   ├── useAudio.js           # Hook: conecta audio con estado
│   │   ├── useAudioReactive.js   # Hook: amplitud del audio para visuales
│   │   └── useKeyboardGestures.js # Hook: controles de teclado (prototipo)
│   ├── store/
│   │   ├── useGestureStore.js    # Estado global (Zustand)
│   │   └── useGestureStore.test.js
│   ├── styles/
│   │   ├── variables.css         # Paleta sinestésica, tipografía
│   │   └── global.css            # Reset y estilos base
│   ├── test/
│   │   └── setup.js
│   ├── App.jsx
│   └── main.jsx
├── docs/
│   ├── plans/
│   │   ├── 2026-03-12-il-podio-design.md
│   │   └── 2026-03-12-il-podio-implementation.md
│   ├── ESTADO-PROYECTO.md
│   └── RESULTADOS-MODELO.png
├── index.html
├── vite.config.js
└── package.json
```

---

## Stack tecnológico

| Tecnología | Propósito | Versión |
|---|---|---|
| React | UI framework | 18+ |
| Vite | Build tool / dev server | 8.x |
| Three.js | Motor 3D | vía R3F |
| @react-three/fiber | React renderer para Three.js | - |
| @react-three/drei | Utilidades para R3F | - |
| @react-three/postprocessing | Post-procesamiento eficiente | - |
| Zustand | Estado global | - |
| Web Audio API | Motor de audio (nativo del navegador) | - |
| Vitest | Testing | - |

---

## Decisiones técnicas clave

### 1. MeshStandardMaterial en vez de MeshPhysicalMaterial

MeshPhysicalMaterial con `transmission` presenta bugs documentados en GPUs Adreno (Pixel 3a XL y similares). Se optó por MeshStandardMaterial con emisivos altos y un efecto bloom para simular el brillo cristalino.

### 2. MediaElementAudioSourceNode en vez de AudioBufferSourceNode

5 stems estéreo de ~5 minutos ocuparían ~480 MB en memoria con AudioBufferSourceNode. MediaElementAudioSourceNode transmite desde disco, con un uso de memoria despreciable y un drift de sincronización aceptable (10-50 ms).

### 3. @react-three/postprocessing (pmndrs) en vez de EffectComposer nativo

Los passes fusionados de pmndrs son 2-3x más eficientes en mobile que el EffectComposer nativo de Three.js. Bloom limitado a resolución 256x256 para mantener 30 FPS.

### 4. DPR limitado a [1, 1.5]

En dispositivos Android de gama media, un DPR mayor a 1.5 causa caídas de framerate significativas con post-procesamiento activo.

### 5. Paleta sinestésica (Rimsky-Korsakov / Scriabin)

Los colores de las secciones se derivan de investigación sobre cromestesia musical:
- **Violines**: ámbar dorado `#D4A017`
- **Cuerdas Graves**: caoba `#8B2E2E`
- **Vientos Madera**: teal `#4A7C6F`
- **Vientos Metal**: bronce `#CD7F32`
- **Tutti**: crema cálido `#EDE8D0`

### 6. Tipografía

- **Cormorant Garamond** (display): inspirada en tipografía editorial musical, alto contraste.
- **DM Mono** (datos): para valores técnicos (gesto, estado BLE).
- **DM Sans** (UI): sans-serif humanista para texto funcional.

---

## Fases de implementación

### Fase 1: Scaffolding (Tasks 1-2)

- Proyecto Vite + React inicializado
- Dependencias R3F, Zustand, Vitest instaladas
- Paleta CSS variables definida
- Google Fonts integradas
- Estilos globales: fullscreen, touch-action: none, user-select: none

### Fase 2: Escena 3D (Tasks 3-5)

- Canvas R3F con cámara perspectiva (FOV 55, posición [0, 2, 6])
- ACESFilmicToneMapping para look cinematográfico
- Fog exponencial para profundidad atmosférica
- Luz ambiental tenue + point light ámbar como candilejas
- 5 totems geométricos con formas únicas por sección:
  - Violines → torus delgado (anillo de cuerda)
  - Cuerdas Graves → torus grueso (anillo pesado)
  - Vientos Madera → octaedro elongado (columna de aire)
  - Vientos Metal → torus knot (complejidad del latón)
  - Tutti → icosaedro wireframe + núcleo luminoso
- Cada totem rota, respira (oscilación sinusoidal) y escala entre estados activo/inactivo
- Spotlights por sección con transiciones de intensidad suaves

### Fase 3: Estado (Tasks 6-7)

- Store Zustand con mapeo gesto → sección:
  - `infinito` → violines
  - `m` → cuerdas
  - `maracas` → madera
  - `u` → metal
  - `tutti` → tutti (todas las secciones)
  - `silencio` → null (silenciar todo)
- Controles de teclado (1-5 para secciones, 0/Esc para silencio)
- Estado conectado a totems y spotlights

### Fase 4: Post-procesamiento (Task 8)

- **Bloom**: intensidad 0.8, umbral 0.4, resolución 256x256, mipmapBlur
- **Viñeta**: offset 0.9, oscuridad 1.2
- **Grano**: opacidad 0.06, blend OVERLAY
- **Aberración cromática**: offset 0.001

### Fase 5: Motor de audio (Tasks 9-10)

- AudioManager con 5 GainNodes independientes
- AnalyserNode (fftSize 512) por sección para visuales reactivos
- Mezcla aditiva: sección activa a volumen 1.0, resto a 0.15
- Tutti: todas a 1.0
- Silencio: fade a 0.0 (time constant 0.3s)
- Stems copiados a `public/audio/`
- Hook useAudio conecta el store al motor de audio

### Fase 6: UI overlay (Task 11)

- **StartScreen**: pantalla de inicio con título "Il Podio", subtítulo "Beethoven — Sinfonía No. 7, II", botón "Comenzar". Necesario para satisfacer el requisito de user gesture del Web Audio API.
- **Overlay HUD**: estado BLE (arriba izquierda), información de composición (arriba derecha), nombre de sección activa con su color (abajo centro), gesto actual (abajo centro). Transparente con `pointer-events: none`.

### Fase 7: Visuales audio-reactivos (Task 12)

- Hook useAudioReactive lee amplitud por sección en cada frame
- La intensidad emisiva de cada totem se modula: `targetIntensity * (1 + amplitude * 0.3)`
- Efecto: micro-pulsos sutiles que siguen la música

### Fase 8: Partículas (Task 13)

- 50 motas de polvo ámbar (`#C9972A`, opacidad 0.3)
- InstancedMesh para rendimiento (una sola draw call)
- Movimiento orgánico con sine/cosine y offsets aleatorios

### Fase 9: Controles táctiles (Task 14)

- 6 botones circulares (5 secciones + silencio) fijos en la parte inferior
- Targets de 44px (Apple HIG)
- `onPointerDown` para respuesta instantánea en mobile
- Estado activo: botón se llena con el color de la sección y escala a 1.15x

---

## Revisión de código y correcciones

Tras completar las 14 tareas, se realizó una revisión exhaustiva del código que identificó:

### Correcciones críticas aplicadas

1. **Eliminación de allocaciones por frame en Totem.jsx**: `new THREE.Vector3()` se creaba en cada frame para el lerp de escala. Se pre-aloca con `useMemo`.
2. **Memoización de THREE.Color en Totem.jsx**: se movió a `useMemo(() => new THREE.Color(color), [color])`.
3. **Pre-alocación de Uint8Array en AudioManager**: `getFrequencyData()` creaba un typed array por llamada (5x por frame). Se pre-alocan los buffers en `init()`.

### Correcciones importantes aplicadas

4. **Limpieza de AudioManager**: se añadió método `dispose()` que pausa los elementos de audio y cierra el AudioContext.
5. **Await de resume() antes de playAll()**: se asegura que el AudioContext esté activo antes de iniciar la reproducción.
6. **Imports no utilizados eliminados**: `THREE` en TuttiTotem.jsx, `SECTIONS` en AudioManager.js.
7. **Vector2 constante en Effects.jsx**: se hoisted a nivel de módulo.

---

## Historial de commits

```
4f68953 fix: address code review — eliminate per-frame allocations, add audio cleanup
c144be3 feat: add mobile touch controls for section selection
ffcd601 feat: add floating dust mote particles for concert hall atmosphere
65c2ae2 feat: audio-reactive emissive pulses on totems via AnalyserNode
cc92687 feat: add start screen and HUD overlay with BLE status, gesture display
368ade6 feat: wire audio engine to gesture state, add stem files
5df19c0 feat: implement AudioManager with streaming, gain control, analyser
ccbc795 feat: add post-processing: bloom, vignette, grain, chromatic aberration
b2c9651 feat: wire gesture store to totems, add keyboard controls for prototype
b6932a9 feat: add Zustand gesture store with gesture-to-section mapping
01579c1 feat: add per-section spotlights with fade transitions
eb48a72 feat: add 5 synesthesia-colored 3D totems with breathing animation
19f9755 feat: create R3F canvas with concert hall lighting and fog
a78482c feat: add synesthesia color palette, typography, global styles
0e9bf71 chore: scaffold React + Vite project with R3F dependencies
```

---

## Tests

6 tests pasando:
- `useGestureStore`: 4 tests (estado inicial, setGesture, silencio, BLE)
- `AudioManager`: 2 tests (inicialización, highlightSection)

---

## Cómo ejecutar

```bash
# Instalar dependencias
npm install

# Servidor de desarrollo
npm run dev

# Build de producción
npm run build

# Ejecutar tests
npx vitest run
```

**Interacción:**
1. Abre `localhost:5173`
2. Click en "Comenzar" (activa el audio)
3. Usa teclas 1-5 para activar secciones, 0/Esc para silencio
4. En mobile: usa los botones circulares en la parte inferior

---

## Siguiente fase: Capacitor + BLE (Fase 10)

Pendiente hasta que el Arduino Nano 33 BLE esté listo:

1. Instalar Capacitor 7 y plataforma Android
2. Instalar `@capacitor-community/bluetooth-le`
3. Implementar BleManager.js (escaneo, conexión, suscripción a notificaciones)
4. Build APK y pruebas en dispositivo físico
