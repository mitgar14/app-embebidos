// il_podio_ble.ino
// Sketch para Arduino Nano 33 BLE Sense
// Edge Impulse inference + BLE notifications (5 bytes de probabilidades)

#include <Clase-3-03-2026_inferencing.h>
#include <Arduino_LSM9DS1.h>
#include <ArduinoBLE.h>

// ─── Constantes ─────────────────────────────────────────────
#define CONVERT_G_TO_MS2   9.80665f
#define MAX_ACCEPTED_RANGE 2.0f

// UUIDs del servicio GATT de Il Podio
// IMPORTANTE: deben coincidir con src/config/ble.js en la app
#define SERVICE_UUID        "19b10000-e8f2-537e-4f6c-d104768a1214"
#define CHARACTERISTIC_UUID "19b10001-e8f2-537e-4f6c-d104768a1214"

// ─── Variables globales ─────────────────────────────────────
static const bool debug_nn = false;
static float buffer[EI_CLASSIFIER_DSP_INPUT_FRAME_SIZE];

// BLE
BLEService gestureService(SERVICE_UUID);
BLECharacteristic gestureChar(CHARACTERISTIC_UUID, BLERead | BLENotify, 5);

bool deviceConnected = false;

// ─── Funciones auxiliares ───────────────────────────────────

float clamp_and_convert(float val) {
    if (fabs(val) > MAX_ACCEPTED_RANGE) {
        val = (val >= 0.0f ? 1.0f : -1.0f) * MAX_ACCEPTED_RANGE;
    }
    return val * CONVERT_G_TO_MS2;
}

void onConnect(BLEDevice central) {
    deviceConnected = true;
    Serial.print("Conectado: ");
    Serial.println(central.address());
}

void onDisconnect(BLEDevice central) {
    deviceConnected = false;
    Serial.print("Desconectado: ");
    Serial.println(central.address());
    // ArduinoBLE retoma advertising automaticamente
}

// ─── Setup ──────────────────────────────────────────────────

void setup() {
    Serial.begin(115200);

    // No bloquear si no hay Serial (para operacion standalone sin PC)
    unsigned long serialTimeout = millis();
    while (!Serial && millis() - serialTimeout < 3000);

    Serial.println("=== Il Podio — BLE + Edge Impulse ===\n");

    // IMU
    if (!IMU.begin()) {
        Serial.println("ERR: No se pudo inicializar el IMU!");
        while (1);
    }
    Serial.print("Acelerometro: ");
    Serial.print(IMU.accelerationSampleRate());
    Serial.println(" Hz");
    Serial.print("Giroscopio:   ");
    Serial.print(IMU.gyroscopeSampleRate());
    Serial.println(" Hz");

    // BLE
    if (!BLE.begin()) {
        Serial.println("ERR: No se pudo inicializar BLE!");
        while (1);
    }

    BLE.setLocalName("Arduino");
    BLE.setDeviceName("Arduino");

    // Registrar servicio y caracteristica
    gestureService.addCharacteristic(gestureChar);
    BLE.addService(gestureService);

    // Valor inicial: 5 bytes en cero
    uint8_t zeros[5] = {0, 0, 0, 0, 0};
    gestureChar.writeValue(zeros, 5);

    // Anunciar el servicio para que la app lo encuentre por UUID
    BLE.setAdvertisedService(gestureService);

    // Callbacks de conexion
    BLE.setEventHandler(BLEConnected, onConnect);
    BLE.setEventHandler(BLEDisconnected, onDisconnect);

    // Iniciar advertising
    BLE.advertise();
    Serial.println("\nBLE listo. Esperando conexion...\n");
}

// ─── Loop ───────────────────────────────────────────────────

void loop() {
    // Procesar eventos BLE (CRITICO: debe llamarse frecuentemente)
    BLE.poll();

    // Solo hacer inferencia si hay un central conectado
    if (!deviceConnected) {
        delay(100);  // Espera corta para no consumir CPU innecesariamente
        return;
    }

    // ─── Muestreo IMU ───────────────────────────────────────
    memset(buffer, 0, sizeof(buffer));

    for (int sample = 0; sample < EI_CLASSIFIER_RAW_SAMPLE_COUNT; sample++) {
        int64_t next_tick = (int64_t)micros() + ((int64_t)EI_CLASSIFIER_INTERVAL_MS * 1000);

        // Espera bloqueante: garantiza que ambos sensores tengan dato
        while (!IMU.accelerationAvailable() || !IMU.gyroscopeAvailable()) {
            // Mantener BLE vivo durante la espera del sensor
            BLE.poll();
        }

        float ax, ay, az, gx, gy, gz;
        IMU.readAcceleration(ax, ay, az);
        IMU.readGyroscope(gx, gy, gz);

        int base = sample * EI_CLASSIFIER_RAW_SAMPLES_PER_FRAME;

        buffer[base + 0] = clamp_and_convert(ax);
        buffer[base + 1] = clamp_and_convert(ay);
        buffer[base + 2] = clamp_and_convert(az);
        buffer[base + 3] = gx;
        buffer[base + 4] = gy;
        buffer[base + 5] = gz;

        int64_t wait_time = next_tick - (int64_t)micros();
        if (wait_time > 0) {
            delayMicroseconds(wait_time);
        }

        // Cada 50 muestras, hacer poll BLE para mantener la conexion
        if (sample % 50 == 0) {
            BLE.poll();
        }
    }

    // ─── Inferencia ─────────────────────────────────────────
    signal_t signal;
    int err = numpy::signal_from_buffer(buffer, EI_CLASSIFIER_DSP_INPUT_FRAME_SIZE, &signal);
    if (err != 0) {
        Serial.print("ERR signal_from_buffer: ");
        Serial.println(err);
        return;
    }

    ei_impulse_result_t result = {0};
    err = run_classifier(&signal, &result, debug_nn);
    if (err != EI_IMPULSE_OK) {
        Serial.print("ERR run_classifier: ");
        Serial.println(err);
        return;
    }

    // ─── Enviar por BLE ─────────────────────────────────────
    // Cuantizar probabilidades a uint8 (0-255)
    uint8_t probs[EI_CLASSIFIER_LABEL_COUNT];
    float max_val = 0.0f;
    const char* best_label = "";

    for (size_t i = 0; i < EI_CLASSIFIER_LABEL_COUNT; i++) {
        float val = result.classification[i].value;
        probs[i] = (uint8_t)(val * 255.0f);

        if (val > max_val) {
            max_val = val;
            best_label = result.classification[i].label;
        }
    }

    // Enviar notificacion BLE con los 5 bytes
    gestureChar.writeValue(probs, EI_CLASSIFIER_LABEL_COUNT);

    // Debug por Serial
    Serial.print("DSP: ");
    Serial.print(result.timing.dsp);
    Serial.print("ms | Cls: ");
    Serial.print(result.timing.classification);
    Serial.print("ms | ");
    Serial.print(best_label);
    Serial.print(" (");
    Serial.print(max_val * 100, 1);
    Serial.print("%) | BLE: [");
    for (size_t i = 0; i < EI_CLASSIFIER_LABEL_COUNT; i++) {
        if (i > 0) Serial.print(",");
        Serial.print(probs[i]);
    }
    Serial.println("]");

    // Poll BLE despues de enviar
    BLE.poll();
}
