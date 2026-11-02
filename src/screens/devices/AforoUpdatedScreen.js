import { Shell, Copy, ErrorNotice, Wait, LoadState, useData, useSave, useDevices, FieldCard, Primary, Info, NavRow, SectionLabel, deviceLabel, statusLabel, LIGHT_LIMIT } from './DeviceUI';

export default function AforoUpdatedScreen({ go }) {
const d = useDevices(); return <Shell go={go} title={d.result ? 'Aforo actualizado' : 'Sin confirmación'} back="registered-devices">
 <Info>{d.result ? 'Los cambios se guardaron correctamente.' : 'Consulta los datos guardados para comprobar su estado.'}</Info>
 {d.result && <FieldCard label="Nombre" value={d.result.name} />}<Primary onPress={() => go('registered-devices')}>Volver a mis dispositivos</Primary></Shell>;
}
