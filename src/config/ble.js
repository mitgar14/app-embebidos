// src/config/ble.js

export const BLE_CONFIG = {
  SERVICE_UUID: '19b10000-e8f2-537e-4f6c-d104768a1214',
  CHARACTERISTIC_UUID: '19b10001-e8f2-537e-4f6c-d104768a1214',

  // Identificación del Arduino
  DEVICE_NAME: 'Arduino',
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
