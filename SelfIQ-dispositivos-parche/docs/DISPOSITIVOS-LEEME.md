# Dispositivos · parche de frontend

## Qué corrige

El panel apuntaba a `gateway`, que abría el formulario antiguo con AP/TCP y un ID de Raspberry escrito a mano. La pantalla de inicio ya apuntaba a otra ruta. Además, los archivos de dispositivos contenían ejemplos fijos y botones de simulación.

Este parche sustituye ambos accesos, conserva una pantalla por archivo y reutiliza la paleta, tarjetas, campos y navegación del sistema visual existente. Los PDF y JSON 06/07 son la referencia; sus datos de ejemplo no se incorporan a producción. No se modificó el archivo remoto de Figma.

## Aplicar en tu proyecto

1. Detén Expo con Ctrl+C y guarda una copia de tus cambios actuales.
2. Extrae este ZIP. Copia su carpeta `src` sobre la carpeta `src` de **tu proyecto real**, combinando carpetas y reemplazando los archivos incluidos. No coloques el parche dentro de otra carpeta `frontend-work`.
3. Abre la terminal en la carpeta que contiene **package.json, App.js y src**.
4. Ejecuta `pnpm exec expo start --clear`. Para web: `pnpm exec expo start --web --clear`.
5. Abre la instancia nueva de Expo y recarga la aplicación. Desde Panel → Agregar dispositivo debe verse «Vamos a encontrarlo», sin campos para ID de Raspberry. En Inicio se muestra «Agregar dispositivo».

No hace falta cambiar dependencias. La limpieza de caché ayuda a recargar el código, pero la causa encontrada fue la ruta al formulario anterior. Si sigue apareciendo, comprueba que copiaste sobre el proyecto desde el que ejecutas pnpm y no sobre otra copia. Las pantallas nuevas requieren permisos de administración, igual que el acceso antiguo.

## Estado real de la integración

Las interfaces y formularios están preparados; **el alta y edición real todavía necesitan conectar el adaptador**. El archivo recibido no incluye endpoints para listas de equipos de sucursal, descubrimiento, estantes o edición de luces. No se inventaron URLs ni se reemplazaron los servicios existentes. Sin adaptador se muestra un estado de función no disponible, no dispositivos falsos ni confirmaciones automáticas.

Implementa el contrato de `src/services/deviceService.js` y llama `configureDeviceAdapter(adapter)` una sola vez al iniciar la aplicación, antes de renderizar AppNavigator. El adaptador debe usar las rutas reales acordadas con el servidor, normalizar sus respuestas y rechazar errores. Todas las operaciones reciben `branchId` y `accessToken`; no se escriben en pantalla ni se registran en consola.

| Operación | Parámetros adicionales | Respuesta normalizada |
| --- | --- | --- |
| listGateways | — | Array de `{id, name?, online?: boolean}` asociados a la sucursal |
| startDiscovery | gatewayId | `{id}`; confirmar inicio real |
| getDiscovery | discoveryId, gatewayId | `{id, status: 'searching' / 'completed' / 'failed', devices: [{id, type, name?, displayCode?}]}` |
| stopDiscovery | discoveryId | Resolver solo tras confirmar detención |
| registerDevice | discoveryId, gatewayId, deviceId, name, location | Dispositivo persistido `{id, type, name, location}` |
| listDevices | — | Array de dispositivos registrados |
| getDevice | deviceId | `{id, type, name, location, online?, lastSeenAt?, readings?}` |
| updateDevice | deviceId, name, location | Dispositivo persistido |
| getGuide | deviceId | `{id, name, online?, lights: [{id, name, shelfId, shelfName?, channel}]}` |
| listLightChannels | deviceId | Array de `{id, label?, available: boolean}`; identidad física estable, no número de fila |
| listShelves | — | Array de `{id, name, location?}` de la sucursal |
| addLight | deviceId, name, shelfId, channel | Luz persistida `{id, name, shelfId, channel}` |
| updateLight | deviceId, lightId, name, shelfId, channel | Luz persistida conservando id y channel |
| testLight | deviceId, channel, durationSeconds | `{confirmed: true}` solo tras confirmación; apagado automático en el equipo |

Tipos: `guide`, `occupancy`, `camera`. Fechas: ISO 8601. Lecturas opcionales: `{occupancy, temperature, humidity, measuredAt}`. Un cero es válido; un dato ausente se presenta como «sin lectura». El estado de conexión ausente nunca se interpreta como conectado. No se convierte una lectura histórica en aforo en vivo.

El servidor debe validar permisos y pertenencia a sucursal de todos los IDs, impedir duplicados, hacer idempotentes las confirmaciones y reintentos, controlar luces disponibles y aplicar el límite provisional de 10 de forma atómica. En edición de luz debe rechazar cambios de identidad física. Una matriz futura podrá ampliar la capacidad desde el contrato; 10 no es una certificación de GPIO disponibles. La búsqueda debe caducar y detenerse en el servidor incluso si se cierra la app. El adaptador debe aplicar timeout a las solicitudes. No basta con ocultar botones para aplicar autorización.

## Pantallas separadas

En `src/screens/devices/`:

- DevicesScreen, AddDeviceScreen: entrada y elección del equipo de sucursal. Uno se selecciona automáticamente; varios requieren elección, sin escribir IDs.
- PreparingSearchScreen, SearchingScreen, DeviceFoundScreen, ConfirmDeviceScreen, AddingDeviceScreen, DeviceAddedScreen: búsqueda y registro, sin avances simulados.
- NoResultsScreen, SearchErrorScreen, ConfirmErrorScreen: vacío, conexión fallida y registro sin confirmar.
- RegisteredDevicesScreen, GuideScreen, AforoDetailScreen, EditAforoScreen, AforoUpdatedScreen: consulta y edición.
- EditLightScreen, SelectShelfScreen, AddLightScreen, TestLightScreen, LightUpdatedScreen, LightAddedScreen: cada luz y su estante, con borrador conservado entre pantallas.
- AddCameraScreen y CameraDetailScreen: apartado de cámara con configuración pendiente. No se simula que una cámara quedó configurada.
- DeviceUI.js contiene solo primitivas y hooks compartidos, no todas las pantallas juntas.

## Verificación realizada

- Análisis de sintaxis JSX de los 73 archivos JavaScript del proyecto y resolución de sus imports relativos.
- Prueba del contrato: sucursal requerida, función no disponible, lista real vacía, canal cero válido, nombre obligatorio y estado de conexión desconocido.
- Pruebas de componentes con sustitutos de React Native: selección automática de un equipo, selección explícita entre varios, bloqueo con 10 luces y ausencia de resultados falsos sin adaptador.
- Ejecuta la prueba del contrato sin dependencias adicionales: `node tests/devices.contract.test.mjs`.

El archivo compartido no incluye package.json, lockfile ni las dependencias del proyecto. No se ejecutó Expo/pnpm ni una prueba visual en teléfono; tampoco se comprobó comunicación con hardware o servidor. Los tests de componentes usaron datos de prueba aislados; no se incluyen en las pantallas de producción.
