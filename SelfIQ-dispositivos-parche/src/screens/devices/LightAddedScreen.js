import { Shell, Copy, ErrorNotice, Wait, LoadState, useData, useSave, useDevices, FieldCard, Primary, Info, NavRow, SectionLabel, deviceLabel, statusLabel, LIGHT_LIMIT } from './DeviceUI';

export default function LightAddedScreen({ go }) {
const d = useDevices(); return <Shell go={go} title={d.result ? 'Luz agregada' : 'Sin confirmación'} back="guide">
 <Info>{d.result ? 'Los cambios se guardaron correctamente.' : 'Consulta los datos guardados para comprobar su estado.'}</Info>
 {d.result && <FieldCard label="Nombre" value={d.result.name} />}<Primary onPress={() => go('guide')}>Volver a mis dispositivos</Primary></Shell>;
}
