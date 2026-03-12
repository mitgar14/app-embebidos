# Il Podio Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a mobile-first 3D orchestra conductor prototype with React Three Fiber, Web Audio API, and synesthesia-inspired design.

**Architecture:** Single-page React app with a fullscreen R3F Canvas rendering 5 geometric totems in a concert hall scene. HTML overlay for status/controls. Web Audio API streams 5 MP3 stems with additive mixing. Gesture input simulated via touch/keyboard for prototype (BLE integration in Phase 10).

**Tech Stack:** React 18, Vite, @react-three/fiber, @react-three/drei, @react-three/postprocessing, Web Audio API, Capacitor 7

**Design doc:** `docs/plans/2026-03-12-il-podio-design.md`

**Three.js skills:** `.claude/skills/threejs-*` (fundamentals, geometry, materials, lighting, animation, postprocessing, shaders, interaction)

---

## Phase 1: Project Scaffolding

### Task 1: Create Vite + React project

**Files:**
- Create: `package.json`, `vite.config.js`, `index.html`, `src/main.jsx`, `src/App.jsx`

**Step 1: Scaffold project**

Run:
```bash
cd /c/Users/mitgar14/Documentos/app-embebidos
npm create vite@latest . -- --template react
```

If directory not empty, confirm overwrite for config files only. Keep existing docs/ and .claude/ dirs.

**Step 2: Install core dependencies**

Run:
```bash
npm install three @react-three/fiber @react-three/drei @react-three/postprocessing zustand
```

**Step 3: Install dev dependencies**

Run:
```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom
```

**Step 4: Configure Vite for GLSL imports**

Modify: `vite.config.js`

```javascript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  assetsInclude: ['**/*.glsl'],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.js',
  },
})
```

**Step 5: Create test setup**

Create: `src/test/setup.js`

```javascript
import '@testing-library/jest-dom'
```

**Step 6: Verify project runs**

Run: `npm run dev`
Expected: Vite dev server starts on localhost

**Step 7: Commit**

```bash
git init
git add package.json vite.config.js index.html src/ docs/ .gitignore
git commit -m "chore: scaffold React + Vite project with R3F dependencies"
```

---

### Task 2: Set up global styles and fonts

**Files:**
- Create: `src/styles/global.css`
- Create: `src/styles/variables.css`
- Modify: `index.html` (add font links)
- Modify: `src/main.jsx` (import styles)

**Step 1: Add Google Fonts to index.html**

Add to `<head>`:
```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;600&family=DM+Mono:wght@400&family=DM+Sans:wght@400;500&display=swap" rel="stylesheet">
```

**Step 2: Create CSS variables**

Create: `src/styles/variables.css`
```css
:root {
  /* Synesthesia palette */
  --color-bg: #0A0906;
  --color-text-primary: #EDE8D0;
  --color-text-secondary: #8A7E6B;
  --color-accent: #C9972A;

  /* Section colors */
  --color-violines: #D4A017;
  --color-cuerdas: #8B2E2E;
  --color-madera: #4A7C6F;
  --color-metal: #CD7F32;
  --color-tutti: #EDE8D0;

  /* Status */
  --color-ble-connected: #4A7C6F;
  --color-ble-disconnected: #8B2E2E;

  /* Typography */
  --font-display: 'Cormorant Garamond', serif;
  --font-mono: 'DM Mono', monospace;
  --font-sans: 'DM Sans', sans-serif;
}
```

**Step 3: Create global styles**

Create: `src/styles/global.css`
```css
@import './variables.css';

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html, body, #root {
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: var(--color-bg);
  color: var(--color-text-primary);
  font-family: var(--font-sans);
  -webkit-font-smoothing: antialiased;
  touch-action: none;
  user-select: none;
}
```

**Step 4: Import styles in main.jsx**

```javascript
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './styles/global.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
```

**Step 5: Commit**

```bash
git add src/styles/ index.html src/main.jsx
git commit -m "feat: add synesthesia color palette, typography, global styles"
```

---

## Phase 2: 3D Scene Foundation

### Task 3: Create the R3F Canvas shell

**Files:**
- Create: `src/components/Scene.jsx`
- Create: `src/components/ConcertHall.jsx`
- Modify: `src/App.jsx`

**Step 1: Create Scene component with Canvas**

Create: `src/components/Scene.jsx`
```jsx
import { Canvas } from '@react-three/fiber'
import { Preload } from '@react-three/drei'
import ConcertHall from './ConcertHall'

export default function Scene() {
  return (
    <Canvas
      camera={{ position: [0, 2, 6], fov: 55, near: 0.1, far: 50 }}
      dpr={[1, 1.5]}
      gl={{
        antialias: true,
        toneMapping: 3, // ACESFilmicToneMapping
        toneMappingExposure: 1.0,
      }}
      style={{ position: 'fixed', top: 0, left: 0 }}
    >
      <ConcertHall />
      <Preload all />
    </Canvas>
  )
}
```

**Step 2: Create ConcertHall with lighting**

Create: `src/components/ConcertHall.jsx`
```jsx
import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'

export default function ConcertHall() {
  return (
    <>
      {/* Concert hall darkness */}
      <ambientLight color="#0A0906" intensity={0.08} />

      {/* Footlights from below */}
      <pointLight color="#C9972A" intensity={0.3} position={[0, -1, 3]} />

      {/* Atmospheric fog */}
      <fogExp2 attach="fog" color="#0A0906" density={0.08} />
    </>
  )
}
```

**Step 3: Wire up App.jsx**

```jsx
import Scene from './components/Scene'

export default function App() {
  return <Scene />
}
```

**Step 4: Verify black scene renders**

Run: `npm run dev`
Expected: Black canvas fills screen, no errors in console.

**Step 5: Commit**

```bash
git add src/components/ src/App.jsx
git commit -m "feat: create R3F canvas with concert hall lighting and fog"
```

---

### Task 4: Create the 5 totem components

**Files:**
- Create: `src/components/totems/Totem.jsx` (base component)
- Create: `src/components/totems/ViolinesTotem.jsx`
- Create: `src/components/totems/CuerdasGravesTotem.jsx`
- Create: `src/components/totems/VientosMaderaTotem.jsx`
- Create: `src/components/totems/VientosMetalTotem.jsx`
- Create: `src/components/totems/TuttiTotem.jsx`
- Create: `src/components/totems/index.js`
- Create: `src/config/sections.js`
- Modify: `src/components/ConcertHall.jsx`

**Step 1: Create section config**

Create: `src/config/sections.js`
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

export const SECTION_KEYS = Object.keys(SECTIONS)
```

**Step 2: Create base Totem component**

Create: `src/components/totems/Totem.jsx`
```jsx
import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

export default function Totem({ children, position, color, rotationSpeed = 0.3, active = false }) {
  const groupRef = useRef()
  const materialRef = useRef()

  const colorObj = new THREE.Color(color)

  useFrame((state) => {
    const t = state.clock.elapsedTime
    const group = groupRef.current

    // Rotation
    group.rotation.y += rotationSpeed * 0.01

    // Breathing oscillation
    group.position.y = position[1] + Math.sin(t * 0.5) * 0.02

    // Scale transition (simple lerp for now)
    const targetScale = active ? 1.0 : 0.7
    group.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.05)

    // Emissive intensity transition
    if (materialRef.current) {
      const targetIntensity = active ? 1.0 : 0.12
      materialRef.current.emissiveIntensity += (targetIntensity - materialRef.current.emissiveIntensity) * 0.05
    }
  })

  return (
    <group ref={groupRef} position={position}>
      {typeof children === 'function' ? children(materialRef, colorObj) : children}
    </group>
  )
}
```

**Step 3: Create individual totem geometries**

Create: `src/components/totems/ViolinesTotem.jsx`
```jsx
import Totem from './Totem'

export default function ViolinesTotem({ active, ...props }) {
  return (
    <Totem active={active} {...props}>
      {(materialRef, color) => (
        <mesh>
          <torusGeometry args={[1.2, 0.15, 16, 48]} />
          <meshStandardMaterial
            ref={materialRef}
            color={color}
            emissive={color}
            emissiveIntensity={0.12}
            roughness={0.4}
            metalness={0.1}
            transparent
            opacity={0.85}
          />
        </mesh>
      )}
    </Totem>
  )
}
```

Create: `src/components/totems/CuerdasGravesTotem.jsx`
```jsx
import Totem from './Totem'

export default function CuerdasGravesTotem({ active, ...props }) {
  return (
    <Totem active={active} {...props}>
      {(materialRef, color) => (
        <mesh>
          <torusGeometry args={[1.0, 0.35, 16, 48]} />
          <meshStandardMaterial
            ref={materialRef}
            color={color}
            emissive={color}
            emissiveIntensity={0.12}
            roughness={0.5}
            metalness={0.05}
            transparent
            opacity={0.85}
          />
        </mesh>
      )}
    </Totem>
  )
}
```

Create: `src/components/totems/VientosMaderaTotem.jsx`
```jsx
import Totem from './Totem'

export default function VientosMaderaTotem({ active, ...props }) {
  return (
    <Totem active={active} {...props}>
      {(materialRef, color) => (
        <mesh scale={[1, 1.8, 1]}>
          <octahedronGeometry args={[1.0, 0]} />
          <meshStandardMaterial
            ref={materialRef}
            color={color}
            emissive={color}
            emissiveIntensity={0.12}
            roughness={0.3}
            metalness={0.15}
            transparent
            opacity={0.85}
          />
        </mesh>
      )}
    </Totem>
  )
}
```

Create: `src/components/totems/VientosMetalTotem.jsx`
```jsx
import Totem from './Totem'

export default function VientosMetalTotem({ active, ...props }) {
  return (
    <Totem active={active} {...props}>
      {(materialRef, color) => (
        <mesh>
          <torusKnotGeometry args={[0.8, 0.25, 64, 8, 2, 3]} />
          <meshStandardMaterial
            ref={materialRef}
            color={color}
            emissive={color}
            emissiveIntensity={0.12}
            roughness={0.3}
            metalness={0.6}
          />
        </mesh>
      )}
    </Totem>
  )
}
```

Create: `src/components/totems/TuttiTotem.jsx`
```jsx
import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import Totem from './Totem'

export default function TuttiTotem({ active, ...props }) {
  const innerRef = useRef()

  useFrame((state) => {
    if (innerRef.current) {
      innerRef.current.rotation.x += 0.003
    }
  })

  return (
    <Totem active={active} {...props}>
      {(materialRef, color) => (
        <group>
          {/* Wireframe shell */}
          <mesh>
            <icosahedronGeometry args={[1.0, 0]} />
            <meshBasicMaterial color={color} wireframe transparent opacity={0.4} />
          </mesh>
          {/* Luminous core */}
          <mesh ref={innerRef} scale={0.5}>
            <icosahedronGeometry args={[1.0, 1]} />
            <meshStandardMaterial
              ref={materialRef}
              color={color}
              emissive={color}
              emissiveIntensity={0.12}
              roughness={0.2}
              metalness={0.0}
            />
          </mesh>
        </group>
      )}
    </Totem>
  )
}
```

**Step 4: Create barrel export**

Create: `src/components/totems/index.js`
```javascript
export { default as ViolinesTotem } from './ViolinesTotem'
export { default as CuerdasGravesTotem } from './CuerdasGravesTotem'
export { default as VientosMaderaTotem } from './VientosMaderaTotem'
export { default as VientosMetalTotem } from './VientosMetalTotem'
export { default as TuttiTotem } from './TuttiTotem'
```

**Step 5: Add totems to ConcertHall**

Modify: `src/components/ConcertHall.jsx`
```jsx
import { SECTIONS } from '../config/sections'
import {
  ViolinesTotem,
  CuerdasGravesTotem,
  VientosMaderaTotem,
  VientosMetalTotem,
  TuttiTotem,
} from './totems'

const TOTEM_COMPONENTS = {
  violines: ViolinesTotem,
  cuerdas: CuerdasGravesTotem,
  madera: VientosMaderaTotem,
  metal: VientosMetalTotem,
  tutti: TuttiTotem,
}

export default function ConcertHall() {
  return (
    <>
      <ambientLight color="#0A0906" intensity={0.08} />
      <pointLight color="#C9972A" intensity={0.3} position={[0, -1, 3]} />
      <fogExp2 attach="fog" color="#0A0906" density={0.08} />

      {Object.entries(SECTIONS).map(([key, section]) => {
        const Component = TOTEM_COMPONENTS[key]
        return (
          <Component
            key={key}
            position={section.position}
            color={section.color}
            rotationSpeed={section.rotationSpeed}
            active={false}
          />
        )
      })}
    </>
  )
}
```

**Step 6: Verify 5 totems render in the scene**

Run: `npm run dev`
Expected: 5 dimmed geometric totems floating in dark space, slowly rotating and breathing.

**Step 7: Commit**

```bash
git add src/components/totems/ src/config/ src/components/ConcertHall.jsx
git commit -m "feat: add 5 synesthesia-colored 3D totems with breathing animation"
```

---

### Task 5: Add SpotLights per section

**Files:**
- Create: `src/components/SectionSpotlight.jsx`
- Modify: `src/components/ConcertHall.jsx`

**Step 1: Create SectionSpotlight component**

Create: `src/components/SectionSpotlight.jsx`
```jsx
import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

export default function SectionSpotlight({ position, color, active }) {
  const lightRef = useRef()

  useFrame(() => {
    if (lightRef.current) {
      const targetIntensity = active ? 2.0 : 0.0
      lightRef.current.intensity += (targetIntensity - lightRef.current.intensity) * 0.08
    }
  })

  return (
    <spotLight
      ref={lightRef}
      color={color}
      intensity={0}
      position={[position[0], position[1] + 4, position[2]]}
      target-position={position}
      angle={Math.PI / 6}
      penumbra={0.6}
      distance={12}
      decay={2}
    />
  )
}
```

**Step 2: Add spotlights to ConcertHall**

Add SectionSpotlight for each section in ConcertHall.jsx, alongside each totem.

**Step 3: Commit**

```bash
git add src/components/SectionSpotlight.jsx src/components/ConcertHall.jsx
git commit -m "feat: add per-section spotlights with fade transitions"
```

---

## Phase 3: State Management

### Task 6: Create gesture state store with Zustand

**Files:**
- Create: `src/store/useGestureStore.js`
- Create: `src/store/useGestureStore.test.js`

**Step 1: Write the failing test**

Create: `src/store/useGestureStore.test.js`
```javascript
import { describe, it, expect } from 'vitest'
import { useGestureStore } from './useGestureStore'

describe('useGestureStore', () => {
  it('starts with no active section and silencio gesture', () => {
    const state = useGestureStore.getState()
    expect(state.activeSection).toBe(null)
    expect(state.currentGesture).toBe('silencio')
    expect(state.bleConnected).toBe(false)
  })

  it('sets active section on gesture', () => {
    useGestureStore.getState().setGesture('infinito')
    const state = useGestureStore.getState()
    expect(state.currentGesture).toBe('infinito')
    expect(state.activeSection).not.toBe(null)
  })

  it('clears active section on silencio', () => {
    useGestureStore.getState().setGesture('infinito')
    useGestureStore.getState().setGesture('silencio')
    expect(useGestureStore.getState().activeSection).toBe(null)
  })

  it('tracks BLE connection state', () => {
    useGestureStore.getState().setBleConnected(true)
    expect(useGestureStore.getState().bleConnected).toBe(true)
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/store/useGestureStore.test.js`
Expected: FAIL - module not found

**Step 3: Implement the store**

Create: `src/store/useGestureStore.js`
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
  bleConnected: false,
  started: false,

  setGesture: (gesture) => {
    const section = GESTURE_TO_SECTION[gesture] ?? null
    set({ currentGesture: gesture, activeSection: section })
  },

  setBleConnected: (connected) => set({ bleConnected: connected }),

  setStarted: (started) => set({ started }),
}))
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/store/useGestureStore.test.js`
Expected: ALL PASS

**Step 5: Commit**

```bash
git add src/store/
git commit -m "feat: add Zustand gesture store with gesture-to-section mapping"
```

---

### Task 7: Wire gesture state to totems and spotlights

**Files:**
- Modify: `src/components/ConcertHall.jsx`

**Step 1: Connect store to ConcertHall**

```jsx
import { useGestureStore } from '../store/useGestureStore'

// Inside ConcertHall:
const activeSection = useGestureStore((s) => s.activeSection)

// Pass active={key === activeSection} to each totem and spotlight
```

**Step 2: Add keyboard controls for prototype testing**

Create: `src/hooks/useKeyboardGestures.js`
```javascript
import { useEffect } from 'react'
import { useGestureStore } from '../store/useGestureStore'

const KEY_MAP = {
  '1': 'infinito',   // violines
  '2': 'm',          // cuerdas graves
  '3': 'maracas',    // vientos madera
  '4': 'u',          // vientos metal
  '5': 'tutti',      // tutti
  '0': 'silencio',
  Escape: 'silencio',
}

export function useKeyboardGestures() {
  const setGesture = useGestureStore((s) => s.setGesture)

  useEffect(() => {
    function handleKeyDown(e) {
      const gesture = KEY_MAP[e.key]
      if (gesture) setGesture(gesture)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [setGesture])
}
```

**Step 3: Use hook in App.jsx**

Add `useKeyboardGestures()` call inside App component.

**Step 4: Test manually: press 1-5 to activate sections, 0/Esc for silencio**

Expected: Pressing keys makes totems grow/glow and spotlights activate.

**Step 5: Commit**

```bash
git add src/components/ConcertHall.jsx src/hooks/ src/App.jsx
git commit -m "feat: wire gesture store to totems, add keyboard controls for prototype"
```

---

## Phase 4: Post-Processing

### Task 8: Add bloom, vignette, grain, chromatic aberration

**Files:**
- Create: `src/components/Effects.jsx`
- Modify: `src/components/Scene.jsx`

**Step 1: Create Effects component**

Create: `src/components/Effects.jsx`
```jsx
import { EffectComposer, Bloom, Vignette, Noise, ChromaticAberration } from '@react-three/postprocessing'
import { BlendFunction } from 'postprocessing'
import { Vector2 } from 'three'

export default function Effects() {
  return (
    <EffectComposer>
      <Bloom
        intensity={0.8}
        luminanceThreshold={0.4}
        luminanceSmoothing={0.9}
        mipmapBlur
        resolutionX={256}
        resolutionY={256}
      />
      <Vignette offset={0.9} darkness={1.2} />
      <Noise opacity={0.06} blendFunction={BlendFunction.OVERLAY} />
      <ChromaticAberration offset={new Vector2(0.001, 0.001)} />
    </EffectComposer>
  )
}
```

**Step 2: Add Effects to Scene**

Add `<Effects />` inside the Canvas, after `<ConcertHall />`.

**Step 3: Verify bloom glow on active totems**

Run: `npm run dev`, press 1-5.
Expected: Active totems emit visible bloom glow. Scene has vignette darkening at edges, subtle grain, slight chromatic aberration.

**Step 4: Commit**

```bash
git add src/components/Effects.jsx src/components/Scene.jsx
git commit -m "feat: add post-processing: bloom, vignette, grain, chromatic aberration"
```

---

## Phase 5: Audio Engine

### Task 9: Create audio manager

**Files:**
- Create: `src/audio/AudioManager.js`
- Create: `src/audio/AudioManager.test.js`

**Step 1: Write the failing test**

Create: `src/audio/AudioManager.test.js`
```javascript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AudioManager } from './AudioManager'

// Mock Web Audio API
const mockAudioContext = {
  state: 'suspended',
  resume: vi.fn().mockResolvedValue(undefined),
  createGain: vi.fn(() => ({
    gain: { value: 1, setTargetAtTime: vi.fn() },
    connect: vi.fn(),
  })),
  createAnalyser: vi.fn(() => ({
    fftSize: 2048,
    frequencyBinCount: 1024,
    getByteFrequencyData: vi.fn(),
    connect: vi.fn(),
  })),
  createMediaElementSource: vi.fn(() => ({
    connect: vi.fn(),
  })),
  destination: {},
}

globalThis.AudioContext = vi.fn(() => mockAudioContext)

describe('AudioManager', () => {
  let manager

  beforeEach(() => {
    manager = new AudioManager()
  })

  it('initializes with 5 stems', () => {
    expect(manager.stems).toHaveLength(0) // Not loaded yet
  })

  it('highlights a section by setting gain values', () => {
    manager.ctx = mockAudioContext
    manager.gains = {
      violines: mockAudioContext.createGain(),
      cuerdas: mockAudioContext.createGain(),
      madera: mockAudioContext.createGain(),
      metal: mockAudioContext.createGain(),
      tutti: mockAudioContext.createGain(),
    }
    manager.highlightSection('violines')
    expect(manager.gains.violines.gain.setTargetAtTime).toHaveBeenCalled()
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/audio/AudioManager.test.js`
Expected: FAIL

**Step 3: Implement AudioManager**

Create: `src/audio/AudioManager.js`
```javascript
import { SECTIONS, SECTION_KEYS } from '../config/sections'

export class AudioManager {
  constructor() {
    this.ctx = null
    this.gains = {}
    this.analysers = {}
    this.elements = {}
    this.stems = []
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

      gain.gain.value = 0.3 // Start attenuated
      analyser.fftSize = 512

      source.connect(gain)
      gain.connect(analyser)
      analyser.connect(this.ctx.destination)

      this.gains[key] = gain
      this.analysers[key] = analyser
      this.elements[key] = audio
      this.stems.push(key)
    }
  }

  async resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      await this.ctx.resume()
    }
  }

  playAll() {
    const startOffset = 0
    for (const key of SECTION_KEYS) {
      const el = this.elements[key]
      if (el) {
        el.currentTime = startOffset
        el.play().catch(() => {})
      }
    }
  }

  highlightSection(sectionKey) {
    const now = this.ctx?.currentTime ?? 0
    for (const key of SECTION_KEYS) {
      const gain = this.gains[key]
      if (!gain) continue

      if (sectionKey === 'tutti') {
        // Tutti: all at full volume
        gain.gain.setTargetAtTime(1.0, now, 0.15)
      } else if (key === sectionKey) {
        gain.gain.setTargetAtTime(1.0, now, 0.15)
      } else {
        gain.gain.setTargetAtTime(0.15, now, 0.15)
      }
    }
  }

  silence() {
    const now = this.ctx?.currentTime ?? 0
    for (const key of SECTION_KEYS) {
      const gain = this.gains[key]
      if (gain) {
        gain.gain.setTargetAtTime(0.0, now, 0.3)
      }
    }
  }

  getFrequencyData(sectionKey) {
    const analyser = this.analysers[sectionKey]
    if (!analyser) return null
    const data = new Uint8Array(analyser.frequencyBinCount)
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

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/audio/AudioManager.test.js`
Expected: PASS

**Step 5: Commit**

```bash
git add src/audio/
git commit -m "feat: implement AudioManager with streaming, gain control, analyser"
```

---

### Task 10: Wire audio to gesture state

**Files:**
- Create: `src/hooks/useAudio.js`
- Modify: `src/App.jsx`

**Step 1: Create useAudio hook**

Create: `src/hooks/useAudio.js`
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
  const activeSection = useGestureStore((s) => s.activeSection)
  const currentGesture = useGestureStore((s) => s.currentGesture)
  const started = useGestureStore((s) => s.started)

  useEffect(() => {
    if (!started || managerRef.current) return

    const manager = new AudioManager()
    managerRef.current = manager

    manager.init(STEM_PATHS).then(() => {
      manager.resume()
      manager.playAll()
    })

    return () => { managerRef.current = null }
  }, [started])

  useEffect(() => {
    const manager = managerRef.current
    if (!manager) return

    if (currentGesture === 'silencio') {
      manager.silence()
    } else if (activeSection) {
      manager.highlightSection(activeSection)
    }
  }, [activeSection, currentGesture])

  return managerRef
}
```

**Step 2: Copy audio stems to public/audio/**

Run:
```bash
mkdir -p public/audio
cp "/c/Users/mitgar14/Music/beethoven_symphony_no7_2nd-output/stem_violines.mp3" public/audio/
cp "/c/Users/mitgar14/Music/beethoven_symphony_no7_2nd-output/stem_cuerdas_graves.mp3" public/audio/
cp "/c/Users/mitgar14/Music/beethoven_symphony_no7_2nd-output/stem_vientos_madera.mp3" public/audio/
cp "/c/Users/mitgar14/Music/beethoven_symphony_no7_2nd-output/stem_vientos_metal.mp3" public/audio/
cp "/c/Users/mitgar14/Music/beethoven_symphony_no7_2nd-output/stem_tutti.mp3" public/audio/
```

**Step 3: Add useAudio to App, add start button**

The "Comenzar" button triggers `setStarted(true)` which initializes audio (user gesture requirement).

**Step 4: Test manually: click Comenzar, press 1-5**

Expected: Audio plays, pressing keys changes which stem is prominent.

**Step 5: Commit**

```bash
git add src/hooks/useAudio.js src/App.jsx public/audio/
git commit -m "feat: wire audio engine to gesture state, add stem files"
```

---

## Phase 6: HTML Overlay

### Task 11: Create the UI overlay

**Files:**
- Create: `src/components/overlay/Overlay.jsx`
- Create: `src/components/overlay/Overlay.css`
- Create: `src/components/overlay/StartScreen.jsx`
- Create: `src/components/overlay/StartScreen.css`
- Modify: `src/App.jsx`

**Step 1: Create StartScreen (the "Comenzar" gate)**

Create: `src/components/overlay/StartScreen.jsx`
```jsx
import { useGestureStore } from '../../store/useGestureStore'
import './StartScreen.css'

export default function StartScreen() {
  const started = useGestureStore((s) => s.started)
  const setStarted = useGestureStore((s) => s.setStarted)

  if (started) return null

  return (
    <div className="start-screen">
      <h1 className="start-title">Il Podio</h1>
      <p className="start-subtitle">Beethoven — Sinfonia No. 7, II</p>
      <button className="start-button" onClick={() => setStarted(true)}>
        Comenzar
      </button>
    </div>
  )
}
```

Create: `src/components/overlay/StartScreen.css`
```css
.start-screen {
  position: fixed;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: var(--color-bg);
  z-index: 100;
}

.start-title {
  font-family: var(--font-display);
  font-weight: 300;
  font-size: 3rem;
  color: var(--color-text-primary);
  letter-spacing: 0.1em;
}

.start-subtitle {
  font-family: var(--font-display);
  font-weight: 300;
  font-size: 1rem;
  color: var(--color-text-secondary);
  margin-top: 0.5rem;
}

.start-button {
  margin-top: 2rem;
  padding: 0.8rem 2.5rem;
  font-family: var(--font-mono);
  font-size: 0.9rem;
  color: var(--color-bg);
  background: var(--color-accent);
  border: none;
  cursor: pointer;
  letter-spacing: 0.05em;
  transition: opacity 0.2s;
}

.start-button:hover {
  opacity: 0.85;
}
```

**Step 2: Create main Overlay (BLE status, gesture, section label)**

Create: `src/components/overlay/Overlay.jsx`
```jsx
import { useGestureStore } from '../../store/useGestureStore'
import { SECTIONS } from '../../config/sections'
import './Overlay.css'

export default function Overlay() {
  const started = useGestureStore((s) => s.started)
  const bleConnected = useGestureStore((s) => s.bleConnected)
  const currentGesture = useGestureStore((s) => s.currentGesture)
  const activeSection = useGestureStore((s) => s.activeSection)

  if (!started) return null

  const sectionData = activeSection ? SECTIONS[activeSection] : null

  return (
    <div className="overlay">
      <header className="overlay-header">
        <div className="ble-status">
          <span
            className="ble-dot"
            style={{ background: bleConnected ? 'var(--color-ble-connected)' : 'var(--color-ble-disconnected)' }}
          />
          <span className="ble-label">{bleConnected ? 'Conectado' : 'Sin conexion'}</span>
        </div>
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

Create: `src/components/overlay/Overlay.css`
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
}

.ble-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
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

**Step 3: Add overlay components to App.jsx**

**Step 4: Commit**

```bash
git add src/components/overlay/
git commit -m "feat: add start screen and HUD overlay with BLE status, gesture display"
```

---

## Phase 7: Audio-Reactive Visuals

### Task 12: Connect AnalyserNode amplitude to totem emissive pulses

**Files:**
- Create: `src/hooks/useAudioReactive.js`
- Modify: `src/components/totems/Totem.jsx`

**Step 1: Create hook that reads amplitude per section**

Create: `src/hooks/useAudioReactive.js`
```javascript
import { useRef, useCallback } from 'react'

export function useAudioReactive(audioManagerRef) {
  const amplitudes = useRef({})

  const update = useCallback(() => {
    const manager = audioManagerRef.current
    if (!manager) return amplitudes.current

    for (const key of manager.stems) {
      amplitudes.current[key] = manager.getAmplitude(key)
    }
    return amplitudes.current
  }, [audioManagerRef])

  return { amplitudes: amplitudes.current, update }
}
```

**Step 2: Pass amplitude data to totems via R3F useFrame**

This requires threading the audio manager ref into the 3D scene. Use React context or pass via props through Scene.

**Step 3: In Totem.jsx, multiply emissiveIntensity by (1 + amplitude * 0.3) for micro-pulses**

**Step 4: Commit**

```bash
git add src/hooks/useAudioReactive.js src/components/totems/Totem.jsx
git commit -m "feat: audio-reactive emissive pulses on totems via AnalyserNode"
```

---

## Phase 8: Particles

### Task 13: Add floating dust motes

**Files:**
- Create: `src/components/DustParticles.jsx`
- Modify: `src/components/ConcertHall.jsx`

**Step 1: Create particle system with InstancedMesh**

Create: `src/components/DustParticles.jsx`
```jsx
import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

const PARTICLE_COUNT = 50

export default function DustParticles() {
  const meshRef = useRef()
  const dummy = useMemo(() => new THREE.Object3D(), [])

  const particles = useMemo(() => {
    return Array.from({ length: PARTICLE_COUNT }, () => ({
      x: (Math.random() - 0.5) * 8,
      y: Math.random() * 5 - 1,
      z: (Math.random() - 0.5) * 8,
      speed: 0.001 + Math.random() * 0.003,
      offset: Math.random() * Math.PI * 2,
    }))
  }, [])

  useFrame((state) => {
    const t = state.clock.elapsedTime
    particles.forEach((p, i) => {
      dummy.position.set(
        p.x + Math.sin(t * 0.2 + p.offset) * 0.3,
        p.y + Math.sin(t * p.speed * 100 + p.offset) * 0.5,
        p.z + Math.cos(t * 0.15 + p.offset) * 0.3,
      )
      dummy.scale.setScalar(0.01 + Math.sin(t + p.offset) * 0.005)
      dummy.updateMatrix()
      meshRef.current.setMatrixAt(i, dummy.matrix)
    })
    meshRef.current.instanceMatrix.needsUpdate = true
  })

  return (
    <instancedMesh ref={meshRef} args={[null, null, PARTICLE_COUNT]}>
      <sphereGeometry args={[1, 4, 4]} />
      <meshBasicMaterial color="#C9972A" transparent opacity={0.3} />
    </instancedMesh>
  )
}
```

**Step 2: Add to ConcertHall**

**Step 3: Commit**

```bash
git add src/components/DustParticles.jsx src/components/ConcertHall.jsx
git commit -m "feat: add floating dust mote particles for concert hall atmosphere"
```

---

## Phase 9: Touch Controls for Mobile

### Task 14: Add touch-based section selection

**Files:**
- Create: `src/components/overlay/TouchControls.jsx`
- Create: `src/components/overlay/TouchControls.css`

**Step 1: Create touch control buttons (mobile-friendly)**

5 buttons at the bottom of the screen, each with the section's color, that trigger the corresponding gesture when tapped. Plus a "silence" button.

This provides the mobile prototype interaction before BLE is connected.

**Step 2: Commit**

```bash
git add src/components/overlay/TouchControls.jsx src/components/overlay/TouchControls.css
git commit -m "feat: add mobile touch controls for section selection"
```

---

## Phase 10: Capacitor + BLE (Post-Prototype)

### Task 15: Add Capacitor

**Step 1: Install Capacitor**

```bash
npm install @capacitor/core @capacitor/cli
npx cap init "Il Podio" "com.uao.ilpodio"
```

**Step 2: Add Android platform**

```bash
npm install @capacitor/android
npx cap add android
```

**Step 3: Install BLE plugin**

```bash
npm install @capacitor-community/bluetooth-le
npx cap sync
```

**Step 4: Build and sync**

```bash
npm run build
npx cap sync android
```

**Step 5: Commit**

```bash
git add capacitor.config.ts android/ package.json
git commit -m "feat: add Capacitor with Android platform and BLE plugin"
```

---

### Task 16: Implement BLE connection manager

**Files:**
- Create: `src/ble/BleManager.js`

This integrates `@capacitor-community/bluetooth-le` to:
1. Scan for the Arduino device
2. Connect and subscribe to gesture characteristic notifications
3. On notification: parse gesture label and call `useGestureStore.setGesture()`
4. Auto-reconnect on disconnect

Implementation deferred until Arduino BLE service is ready for testing.

---

## Execution Order Summary

| Phase | Tasks | Description |
|---|---|---|
| 1 | 1-2 | Project scaffolding, styles, fonts |
| 2 | 3-5 | 3D scene: canvas, totems, spotlights |
| 3 | 6-7 | State management, keyboard controls |
| 4 | 8 | Post-processing effects |
| 5 | 9-10 | Audio engine, stem playback |
| 6 | 11 | HTML overlay (start screen, HUD) |
| 7 | 12 | Audio-reactive visuals |
| 8 | 13 | Dust particles |
| 9 | 14 | Mobile touch controls |
| 10 | 15-16 | Capacitor + BLE (post-prototype) |
