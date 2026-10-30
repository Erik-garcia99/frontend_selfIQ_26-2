import { Shell, Copy, ErrorNotice, Wait, LoadState, useData, useSave, useDevices, FieldCard, Primary, Info, NavRow, SectionLabel, deviceLabel, statusLabel, LIGHT_LIMIT } from './DeviceUI';

export default function CameraDetailScreen({ go }) {
const d = useDevices(); return <Shell go={go} title={deviceLabel(d.device)} back="registered-devices">
 <Info title={statusLabel(d.device)}>La configuración de imagen de la cámara estará disponible próximamente.</Info>
 <FieldCard label="Nombre" value={d.device?.name} /><FieldCard label="Ubicación" value={d.device?.location} />
 <Primary disabled={!d.device?.id} onPress={() => { d.selectDevice(d.device); go('edit-device'); }}>Editar datos</Primary>
 <Primary variant="danger" disabled={!d.device?.id} onPress={() => { d.selectDevice(d.device); go('delete-device'); }}>Eliminar dispositivo</Primary>
 <Primary variant="light" disabled onPress={() => {}}>Configurar cámara</Primary></Shell>;
}
