import { Shell, Copy, ErrorNotice, Wait, LoadState, useData, useSave, useDevices, FieldCard, Primary, Info, NavRow, SectionLabel, deviceLabel, statusLabel, LIGHT_LIMIT } from './DeviceUI';

export default function AforoDetailScreen({ go }) {
const d = useDevices(); const state = useData('getDevice', { deviceId: d.device?.id }); const device = state.data;
 const reading = device?.readings;
 return <Shell go={go} title={deviceLabel(d.device)} back="registered-devices"><LoadState state={state}>
 <Info title={statusLabel(device)}>{device?.lastSeenAt ? `Última comunicación: ${new Date(device.lastSeenAt).toLocaleString()}` : 'Todavía no hay información de comunicación.'}</Info>
 <Info title="Últimas lecturas"><Copy>{reading?.occupancy != null ? `${reading.occupancy} personas` : 'Aforo: sin lectura'}</Copy>
 <Copy>{reading?.temperature != null ? `Temperatura: ${reading.temperature} °C` : 'Temperatura: sin lectura'}</Copy>
 <Copy>{reading?.humidity != null ? `Humedad: ${reading.humidity} %` : 'Humedad: sin lectura'}</Copy>
 <Copy>{reading?.measuredAt ? `Medido: ${new Date(reading.measuredAt).toLocaleString()}` : 'Sin fecha de medición'}</Copy></Info>
 <FieldCard label="Nombre" value={device?.name} /><FieldCard label="Ubicación" value={device?.location} />
 <Primary disabled={!device?.id} onPress={() => { d.selectDevice(device); go('edit-aforo'); }}>Editar datos</Primary></LoadState></Shell>;
}
