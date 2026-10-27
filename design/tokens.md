# Tokens de diseño

Extraídos de Figma (`SelfIQ-2026-2`, frame base **430×932** = iPhone 14 Pro Max) y
contrastados con `src/theme/colors.js`. Cuando el diseño trae un valor nuevo, se agrega acá
primero y después al theme.

## Color

| Token | Hex | Uso en Figma | En código |
|---|---|---|---|
| `bg` | `#BDD8E9` | fondo de todas las pantallas | `C.bg` ✓ |
| `white` | `#F7FBFD` | tarjetas, inputs, botón "volver" | `C.white` ✓ |
| `navy` | `#001D39` | títulos, iconos, texto de botón | `C.navy` ✓ |
| `text` | `#1E1E1E` | etiquetas y celdas de tabla | `C.text` ≈ `#0A4174` ⚠ |
| `muted` | `#757575` | descripciones, placeholders | `C.muted` ≈ `#587991` ⚠ |
| `mutedSoft` | `#B3B3B3` | campo deshabilitado, borde | falta |
| `border` | `#D9D9D9` | borde de input | `C.border` ≈ `#D3E5F0` ⚠ |
| `dialog` | `#49769F` | tarjeta de éxito/error | `C.dialog` ✓ |
| `dialogText` | `#F7FBFD` | texto sobre la tarjeta | `C.dialogText` ✓ (nuevo) |
| `dialogMuted` | `#D5E6F2` | código de error / texto secundario | `C.dialogMuted` ✓ (nuevo) |
| `successLight` | `#86FF79` | título "registro con éxito" | `C.successLight` ✓ (nuevo) |
| `dangerLight` | `#FC0307` | título "error" | `C.dangerLight` ✓ (nuevo) |
| `success` | `#2E7D67` | punto "Online", texto Online | `C.green` ⚠ |
| `nav.active` | `#0A4174` | tab activo | `C.text` ✓ |
| `nav.idle` | `#58758A` | tabs inactivos | `C.muted` ≈ |
| `button.dark` | `#2C2C2C` | CTA principal y botón del diálogo | `C.navy` ⚠ |
| `list.bg` | `#F5EFEB` | contenedor de tabla de personal | falta |
| `overlay` | `rgba(0,29,57,.65)` | fondo detrás de un modal | `C.overlay` ✓ (nuevo) |

⚠ = el diseño y el código no coinciden. Hay que decidir cuál manda (ver notas abajo).

## Tipografía — Inter

| Rol | Peso | Tamaño / alto | Uso |
|---|---|---|---|
| `title` | 700 | 29 / 35 | título de pantalla ("creación de sucursal") |
| `dialogTitle` | 700 | 24 / 28 | título dentro de la tarjeta de resultado |
| `label` | 400 | 20 / 28 | label de campo |
| `body` | 400 | 16 / 22 | descripciones, celdas |
| `button` | 400 | 16 / 16 | texto de botón |
| `cell` | 400 | 15 / 21 | filas de la tabla de personal |
| `caption` | 400 | 16 / 22 | texto de apoyo bajo el input |
| `hint` | 400 | 14 / 16 | placeholder de ejemplo ("ej: marrones centro") |
| `pill` | 600 | 12 / 15 | "Sucursal Central · Online" |
| `tab` | 500–600 | 10 / 12 | etiquetas del bottom nav |

## Componentes medidos

| Componente | Medidas |
|---|---|
| Bottom nav | 400×70, radio 24, blanco, sombra y10 b26, 24px desde el borde inferior |
| Botón volver | 46×46, radio 15, `#F7FBFD` |
| Input | altura 40, radio 8, borde 1px `#D9D9D9`, padding 12/16 |
| CTA principal | 193×40, radio 8, `#2C2C2C`, gap 8, padding 12 |
| Tarjeta de resultado | 384×299 (éxito) / 381×366 (error), radio 10, `#49769F` |
| Contenedor de tabla | 374×568, radio 10, `#F5EFEB`, margen lateral 21 |
| Pill de estado | 190×32, radio 16, sombra y4 b4 |

## Espaciado

- Margen lateral de pantalla: **35** (títulos y contenido), **21** (contenedor de tabla).
- Título de pantalla: `y=120`.
- Separación entre campos: 21 (el bloque de campo mide 76 de alto y arranca cada 99).
- Padding interno de tarjeta: 24.

## Notas y decisiones pendientes

1. **El diseño mezcla dos familias.** Los títulos de la tarjeta de resultado usan **Roboto** y el resto **Inter**.
   Recomendación: Inter en todo (ya está en el resto del archivo) y una sola escala.
2. **Medidas inconsistentes en la tarjeta de resultado.** Éxito 384×299 en (17,246); error 381×366 en (20,247).
   Debería ser el mismo componente con alto automático. Ya está implementado así (`FeedbackDialog`).
3. **Contraste.** `#86FF79` sobre `#49769F` da ~2.6:1 y `#FC0307` sobre `#49769F` da ~2.9:1.
   Para texto de 22px hace falta 3:1 (AA para texto grande), así que está al límite.
   Opciones: aclarar el texto (`#B9FFB0` / `#FF8A8A`) o separar título y fondo con una franja.
   Hoy el componente usa los colores tal como están en Figma.
4. **Textos de ejemplo.** "error fatal", "NO. error 404" y lorem ipsum son de relleno.
   El componente real muestra código `E-xxx` + mensaje en lenguaje normal (ver `src/utils/errorMessages.js`).
5. **Color de texto.** Figma usa `#1E1E1E` para etiquetas y `#757575` para descripciones;
   el código actual usa `#0A4174` y `#587991`. Falta decidir si el rediseño reemplaza la paleta actual.
