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
