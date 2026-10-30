import { Shell, Copy, ErrorNotice, Wait, LoadState, useData, useSave, useDevices, FieldCard, Primary, Info, NavRow, SectionLabel, deviceLabel, statusLabel, LIGHT_LIMIT } from './DeviceUI';

export default function RegisteredDevicesScreen({ go }) {
const d = useDevices(); const state = useData('listDevices'); const devices = Array.isArray(state.data) ? state.data : [];
 return <Shell go={go} title="Mis dispositivos" subtitle="Equipos registrados en tu sucursal.">
 <LoadState state={state}>{devices.length === 0 && <Info title="Todavía no hay dispositivos">Agrega el primer equipo de tu tienda.</Info>}
 {devices.map(device => <NavRow key={device.id} label={deviceLabel(device)} detail={`${statusLabel(device)}${device.location ? ' · ' + device.location : ''}`} onPress={() => { d.selectDevice(device); go(device.type === 'guide' ? 'guide' : device.type === 'occupancy' ? 'aforo-detail' : 'camera-detail'); }} />)}</LoadState>
 <Primary onPress={() => go('add-device')}>Agregar dispositivo</Primary></Shell>;
}
