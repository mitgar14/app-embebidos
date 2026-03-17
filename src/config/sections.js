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
