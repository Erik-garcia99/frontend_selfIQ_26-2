import { Shell, Copy, ErrorNotice, Wait, LoadState, useData, useSave, useDevices, FieldCard, Primary, Info, NavRow, SectionLabel, deviceLabel, statusLabel, LIGHT_LIMIT } from './DeviceUI';

export default function DeviceAddedScreen({ go }) {
const d = useDevices(); return <Shell go={go} title={d.result ? 'Dispositivo agregado' : 'Sin confirmación'}>
 <Info title={d.result ? deviceLabel(d.result) : undefined}>{d.result ? 'Ya puedes consultarlo en los dispositivos de tu sucursal.' : 'Consulta tus dispositivos para comprobar su estado.'}</Info>
 <Primary onPress={() => go('registered-devices')}>Ver mis dispositivos</Primary></Shell>;
}
