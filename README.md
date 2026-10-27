# Frontend — SelfIQ

Frontend móvil y web del sistema **SelfIQ**.

Este repositorio contiene exclusivamente la interfaz de usuario encargada de consultar,
visualizar y presentar la información generada por el sistema IoT.

El frontend se comunica con el backend desplegado en la nube y permite al usuario
interactuar con las diferentes funciones del sistema desde una interfaz centralizada.

---

## Descripción

SelfIQ utiliza una arquitectura híbrida Local/Nube.

Los dispositivos ESP32 capturan información del entorno y se comunican dentro de
una red IoT local con una Raspberry Pi Zero 2 W.

La Raspberry Pi actúa como gateway y posteriormente sincroniza la información con
el backend desplegado en la nube.

El frontend consume esta información mediante el backend.

```text
Sensores / ESP32
       │
       ▼
Raspberry Pi Zero 2 W
       │
       ▼
Backend Cloud
       │
       ▼
     API
       │
       ▼
┌─────────────────────┐
│     Frontend        │
│                     │
│ Aplicación móvil    │
│ Aplicación web      │
 └─────────────────────┘

## Integración con el backend

Inicia primero el backend en `http://localhost:8000` y después el frontend:

```bash
npx expo start
```

La aplicación usa `http://localhost:8000` en web/iOS y `http://10.0.2.2:8000`
en el emulador Android. Para un teléfono físico configura la IP del equipo:

```bash
EXPO_PUBLIC_API_URL=http://192.168.1.20:8000 npx expo start
```

El registro requiere un token de sucursal y deja la cuenta pendiente de
aprobación, tal como valida el backend.

## Temperatura en Inicio

La temperatura se muestra exclusivamente en el recuadro original junto a
**Aforo actual**, debajo del saludo. No hay una tarjeta adicional de monitoreo.
Consulta el backend cada 15 s mientras Inicio está activo; el valor es la última
lectura de la sucursal, no un promedio de sensores.

Colores: **azul por debajo de 15 °C**, **verde desde 15 hasta menos de 35 °C**,
**rojo desde 35 °C, inclusive** (umbrales visuales confirmados por el usuario;
F-07 menciona >40 °C para alerta). Los límites están
en `src/config/temperature.js`. Sin datos, con error o lectura desactualizada,
el recuadro es neutro para no indicar falsamente una temperatura agradable.
Al tocar el recuadro puedes consultar la última medición, reintentar o seleccionar
otra sucursal autorizada, sin alterar el diseño de Inicio.

Pruebas de presentación y límites: `node --test tests/temperature.test.mjs`.

Configura `EXPO_PUBLIC_API_URL` en el `.env` del frontend con la URL de Railway
y reinicia Expo después de cambiarla. No pongas tokens de InfluxDB en este
repositorio ni en variables `EXPO_PUBLIC_*`.
La configuración privada se realiza en el backend; consulta su `TELEMETRIA.md`.
