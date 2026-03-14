# Contrato BLE — Il Podio

Especificación que el Arduino Nano 33 BLE debe cumplir para comunicarse con la app.

---

## Servicio GATT

| Campo | Valor |
|---|---|
| Service UUID | **Por definir** (actualizar en `src/config/ble.js` → `BLE_CONFIG.SERVICE_UUID`) |
| Characteristic UUID | **Por definir** (actualizar en `src/config/ble.js` → `BLE_CONFIG.CHARACTERISTIC_UUID`) |
| Propiedades | `BLERead / BLENotify` |

---

## Formato de datos

- **1 byte** por notificación
- El valor del byte es el **índice de la clase** del modelo TinyML (Edge Impulse)

### Mapeo de índices

| Byte | Gesto | Sección de la app |
|---|---|---|
| 0 | infinito | Violines |
| 1 | m | Cuerdas graves |
| 2 | maracas | Vientos madera |
| 3 | u | Vientos metal |
| 4 | silencio | (silencia todos los stems) |
| 5 | *Por definir* | Tutti |

> Este mapeo **debe coincidir exactamente** con el orden de clases en el proyecto de Edge Impulse.

---

## Comportamiento esperado

### Debounce
Solo enviar una notificación cuando el gesto clasificado **cambie** respecto al anterior. No enviar notificaciones repetidas del mismo gesto.

### Desconexión
Tras una desconexión (por distancia, apagado del dispositivo, etc.), el Arduino debe volver a hacer **advertise automáticamente** para permitir reconexión.

### Confianza
Se recomienda un umbral de confianza >= **0.70** antes de enviar una clasificación. Si ninguna clase supera el umbral, mantener el último gesto (no enviar).

### Connection interval
Para mínima latencia, configurar el connection interval a 7.5ms - 15ms. Los parámetros son múltiplos de 1.25ms:
```cpp
BLE.setConnectionInterval(6, 12); // min=6*1.25=7.5ms, max=12*1.25=15ms
```

---

## Cómo conectar

1. El compañero define los UUIDs del servicio y la característica
2. Actualizar los valores en `src/config/ble.js` (campos `SERVICE_UUID` y `CHARACTERISTIC_UUID`)
3. Ejecutar `npx cap sync` para sincronizar cambios
4. La app detectará el Arduino al escanear y se conectará automáticamente a las notificaciones
