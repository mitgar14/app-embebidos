# Il Podio - Conductor Simulation App Design

## Overview

A mobile-first web application (React + Vite + React Three Fiber) that simulates an orchestra conductor experience. The user's gestures are detected by an Arduino Nano 33 BLE running a TinyML model, and each classified gesture activates/highlights a different instrument section from Beethoven's Symphony No. 7, 2nd movement.

**Deployment**: Capacitor wrapping a React+Vite web app into an Android APK.

## Context

- **Course**: Inteligencia Artificial en Dispositivos Moviles y Embebidos (UAO)
- **Model**: TinyML on Arduino Nano 33 BLE, 5 gesture classes (Infinito, M, Maracas, U + 1 TBD) + Silencio
- **Accuracy**: 90.9% on validation set (Edge Impulse)
- **Communication**: BLE from Arduino to Android app

## Audio Stems (5)

1. `stem_cuerdas_graves.mp3` - Low strings (cello, contrabass)
2. `stem_tutti.mp3` - All instruments together
3. `stem_vientos_madera.mp3` - Woodwinds
4. `stem_vientos_metal.mp3` - Brass
5. `stem_violines.mp3` - Violins

(Timbales removed from original 6)

## Audio Behavior: Additive Mixing

All 5 stems play simultaneously. Each gesture HIGHLIGHTS one section (volume up) and attenuates the others. Tutti = all sections at max volume. Silencio = fade out all.

---

## Visual Design

### Concept: "Il Podio"

The screen IS the stage viewed from the conductor's podium. 5 instrument sections are 3D geometric objects (totems) floating in a dark concert hall environment, arranged in a semicircular arc like a real orchestra.

### Screen Layout (Mobile Vertical)

```
+------------------------------+
|  BLE status       Beethoven  |  <- subtle header overlay
|                   Sinf. No.7 |
|                              |
|         [TUTTI]              |  <- back of stage (smaller, perspective)
|        icosahedron           |
|                              |
|    [V.MADERA]  [V.METAL]    |  <- middle row
|    octahedron   torusKnot    |
|                              |
|  [VIOLINES]    [C.GRAVES]   |  <- front row (larger, closer)
|    torus         torus       |
|                              |
|  ========================    |  <- podium edge
|  gesture: INFINITO           |  <- current gesture
|  [mini waveform]             |
+------------------------------+
```

### 3D Totems (per instrument section)

| Section | Geometry | Color (Synesthesia) | Personality |
|---|---|---|---|
| Violines | `TorusGeometry(1.2, 0.15)` - thin ring | Amber gold `#D4A017` | Elegant, slow Y rotation |
| Cuerdas graves | `TorusGeometry(1.0, 0.35)` - thick ring | Mahogany `#8B2E2E` | Heavy, slower rotation |
| Vientos madera | `OctahedronGeometry(1.0)` scaled Y 1.8x | Teal `#4A7C6F` | Vertical, precise |
| Vientos metal | `TorusKnotGeometry(0.8, 0.25, 64, 8, 2, 3)` | Bronze `#CD7F32` | Dynamic, complex |
| Tutti | `IcosahedronGeometry(1.0, 0)` wireframe + core | Warm cream `#EDE8D0` | Majestic, dual-axis rotation |

### Color Palette

Based on chromesthesia research (Rimsky-Korsakov, Scriabin):

- **Background**: Warm ebony `#0A0906`
- **Primary text**: Warm cream `#EDE8D0`
- **Secondary text**: Muted cream `#8A7E6B`
- **Accent**: Antique gold `#C9972A`
- **BLE connected**: Teal `#4A7C6F`
- **BLE disconnected**: Mahogany `#8B2E2E`

### Typography

- **Title/section names**: Cormorant Garamond (Light 300 / SemiBold 600)
- **Data/status**: DM Mono (Regular 400)
- **UI labels**: DM Sans (Regular 400 / Medium 500)

### SVG Icons

Monoline instrument icons (stroke 1.5px) in each section's color. Animated with `stroke-dashoffset` draw-in effect when section activates. Sources: SVG Repo, The Noun Project (monoline style).

---

## Technical Architecture

### Stack

- **Frontend**: React 18+ with Vite
- **3D**: React Three Fiber (@react-three/fiber) + @react-three/drei
- **Post-processing**: @react-three/postprocessing (pmndrs - fused passes)
- **Audio**: Web Audio API with MediaElementAudioSourceNode
- **BLE**: @capacitor-community/bluetooth-le v7.x
- **Deployment**: Capacitor 7 -> Android APK

### Materials (Optimized for Android)

**NOT using** MeshPhysicalMaterial with transmission (buggy on Adreno GPUs).

Instead:
- `MeshStandardMaterial` with high `emissive` + `emissiveIntensity`
- Custom fresnel shader for crystalline edge glow (rim lighting)
- Custom noise-based vertex displacement for "breathing" effect

```
Inactive: emissiveIntensity 0.12, scale 0.7
Active:   emissiveIntensity 1.0, scale 1.0, SpotLight on
```

### Lighting

- `AmbientLight(0x0A0906, 0.08)` - concert hall darkness
- 5x `SpotLight` per section, `penumbra: 0.6` - stage reflectors (toggle on/off per gesture)
- `PointLight(0xC9972A, 0.3)` below - footlights
- `FogExp2(0x0A0906, 0.08)` - atmosphere

### Post-Processing Pipeline (Single Fused Pass via pmndrs)

- Bloom: `resolution 256`, `intensity 0.8`, `luminanceThreshold 0.4`
- Vignette: `offset 0.9`, `darkness 1.2`
- Noise (grain): `opacity 0.06`
- Chromatic Aberration: subtle, `offset [0.001, 0.001]`

Performance target: 30 FPS on mid-range Android (Snapdragon 6-series).

### Renderer Settings

```javascript
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.outputColorSpace = THREE.SRGBColorSpace;
```

### Audio Architecture

```
                    +--> GainNode (violines) --> AnalyserNode
<audio> elements -->+--> GainNode (cuerdas)  --> AnalyserNode
  connected via     +--> GainNode (madera)   --> AnalyserNode  --> destination
  MediaElement      +--> GainNode (metal)    --> AnalyserNode
  SourceNode        +--> GainNode (tutti)    --> AnalyserNode
```

- 5 `<audio>` elements with `MediaElementAudioSourceNode`
- Individual `GainNode` per stem for volume control
- Shared or individual `AnalyserNode` for waveform visualization
- `fftSize: 512` for low latency analysis
- Sync: `.currentTime = 0` on all elements simultaneously (drift ~10-50ms, acceptable)

**Memory**: Streaming instead of AudioBuffer saves ~480MB RAM.

### BLE Architecture

```
Arduino Nano 33 BLE
  - Custom GATT Service (UUID 128-bit)
  - Characteristic: BLERead | BLENotify
  - Writes gesture label on classification change
  - Debounce: 100ms between same-gesture notifications

    ↓ BLE GATT Notification

@capacitor-community/bluetooth-le
  - startNotifications() on characteristic UUID
  - Auto-reconnect logic on disconnect
  - Foreground service for background stability

    ↓ JavaScript callback

React state update → gesture change → UI/audio response
```

**Latency**: 70-150ms end-to-end (sensor → inference → BLE → app). Acceptable for musical interaction (<200ms threshold).

### UX Flow

1. **App opens** → 3D scene loads with all totems dimmed, audio silent
2. **"Comenzar" button** → user gesture unlocks AudioContext + starts BLE scan
3. **BLE connects** → indicator turns teal, waiting for gestures
4. **Gesture detected** → target section illuminates, audio mix adjusts
5. **Silencio gesture** → all totems dim, audio fades out
6. **BLE disconnects** → indicator turns mahogany, auto-reconnect attempts

### Animations

- **Totem active**: Spring physics (stiffness 100, damping 10) for scale 0.7→1.0
- **SpotLight**: Fade in 150ms on target section
- **Breathing**: `sin(time * 0.5) * 0.02` vertical oscillation on all totems
- **Rotation**: Each totem rotates at its own speed on Y axis
- **Audio-reactive**: AnalyserNode amplitude modulates emissiveIntensity micro-pulses
- **Particles**: Subtle dust motes floating in spotlights (InstancedMesh, ~50 particles)

---

## Android Viability Assessment

### Confirmed Working
- Three.js/R3F in Android WebView (Capacitor)
- MeshStandardMaterial with emissive
- Web Audio API with 5 simultaneous MediaElement streams
- @capacitor-community/bluetooth-le for BLE
- @react-three/postprocessing fused passes

### Risks Mitigated
- MeshPhysicalMaterial transmission → removed, using shader-based alternatives
- AudioBuffer RAM → streaming with MediaElementAudioSourceNode
- Web Bluetooth → native plugin
- Post-processing cost → fused passes + reduced bloom resolution
- WebGL context loss → listener + resource reconstruction logic

### Minimum Device Requirements
- Android 9+ (API 28)
- GPU: Adreno 512+ or Mali-G52+
- RAM: 3GB+
- WebView: Chromium 90+

---

## Screens

**Single screen**: Immersive 3D director view with HTML overlay.

No navigation, no settings screen, no info screen. Connection status and gesture display are overlaid directly on the 3D canvas.
