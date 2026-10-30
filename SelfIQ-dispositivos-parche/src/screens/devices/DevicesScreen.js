import { Shell, Copy, ErrorNotice, Wait, LoadState, useData, useSave, useDevices, FieldCard, Primary, Info, NavRow, SectionLabel, deviceLabel, statusLabel, LIGHT_LIMIT } from './DeviceUI';

export default function DevicesScreen({ go }) {
return <Shell go={go} title="Dispositivos" subtitle="Administra los equipos de tu sucursal." back="panel">
 <Info title="Conecta tu tienda">Agrega un control de aforo, una guía de luces o una cámara.</Info>
 <Primary onPress={() => go('add-device')}>Agregar dispositivo</Primary>
 <NavRow label="Mis dispositivos" detail="Consultar y editar los equipos registrados" onPress={() => go('registered-devices')} />
 </Shell>;
}
