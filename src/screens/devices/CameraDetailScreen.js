import { Shell, Copy, ErrorNotice, Wait, LoadState, useData, useSave, useDevices, FieldCard, Primary, Info, NavRow, SectionLabel, deviceLabel, statusLabel, LIGHT_LIMIT } from './DeviceUI';

export default function CameraDetailScreen({ go }) {
const d = useDevices(); return <Shell go={go} title={deviceLabel(d.device)} back="registered-devices">
 <Info title={statusLabel(d.device)}>La edición de cámaras estará disponible próximamente.</Info>
 <FieldCard label="Nombre" value={d.device?.name} /><FieldCard label="Ubicación" value={d.device?.location} />
 <Primary disabled>Configurar cámara</Primary></Shell>;
}
