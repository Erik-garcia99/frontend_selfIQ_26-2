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
