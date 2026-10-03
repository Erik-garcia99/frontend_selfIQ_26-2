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
