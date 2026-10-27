# Carpeta de diseño — SelfIQ 2026-2

Aquí vive la referencia visual del rediseño. El código **no** importa nada de esta carpeta;
es material de trabajo para implementar pantallas y para mantener el diseño y el código sincronizados.

## Estructura

```
design/
  screens/        # un PNG por frame, export 2x, nombre = ID (S01-login.png)
  screens/flow/   # (opcional) los mismos frames pero con flechas y notas dibujadas encima
  assets/icons/   # iconos en SVG
  assets/images/  # fotos e ilustraciones en PNG
  flows.md        # qué pantalla lleva a cuál + comportamiento de cada una
  tokens.md       # colores, tipografía, espaciados, radios
```

## Reglas de export

| Qué | Formato | Notas |
|---|---|---|
| Pantallas | PNG @2x | Frame al tamaño real del dispositivo (390×844 o 360×800). Sin recortar, sin sombras externas. |
| Iconos | SVG | Nunca PNG: se convierten a componente con `react-native-svg`. |
| Fotos | PNG @2x | Si pesa más de 300 KB, avísame y lo optimizamos. |
| Tokens | texto | En `tokens.md`, no en una imagen. |

## Nombres de archivo

`S<nn>-<slug>.png` — el ID es la llave que une la imagen con `flows.md`.

Ejemplo: `screens/S01-login.png` ↔ la sección `## S01 · Login` de `flows.md`.

Si un frame es un estado de otro frame (vacío, error, loading), va como sufijo:
`S05-home--empty.png`, `S05-home--error.png`. No como pantalla nueva.

## Qué NO mandar

- Fotos de la pantalla tomadas con el celular.
- Capturas de Figma con el zoom alejado (los textos no se leen).
- Un PDF con todos los frames: sirve como índice, no como fuente de medidas.
- El archivo `.fig`: es binario, no se puede leer.
