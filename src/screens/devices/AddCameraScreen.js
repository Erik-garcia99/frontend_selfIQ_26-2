import { Shell, Copy, ErrorNotice, Wait, LoadState, useData, useSave, useDevices, FieldCard, Primary, Info, NavRow, SectionLabel, deviceLabel, statusLabel, LIGHT_LIMIT } from './DeviceUI';

export default function AddCameraScreen({ go }) {
return <Shell go={go} title="Agregar cámara" subtitle="Configuración de cámara" back="device-found">
 <Info title="Prepararemos la cámara paso a paso">Este proceso incluirá conexión, vista de prueba y asignación de estante.</Info>
 <SectionLabel>Próximos pasos</SectionLabel><Copy>1. Conectar la cámara
2. Revisar la imagen
3. Elegir el estante
4. Confirmar la configuración</Copy>
 <Info title="Disponible próximamente">La configuración de cámaras aún no está habilitada.</Info>
 <Primary disabled>Configurar cámara</Primary><Primary variant="light" onPress={() => go('device-found')}>Volver a los resultados</Primary></Shell>;
}
