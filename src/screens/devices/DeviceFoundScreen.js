import { Shell, Copy, ErrorNotice, Wait, LoadState, useData, useSave, useDevices, FieldCard, Primary, Info, NavRow, SectionLabel, deviceLabel, statusLabel, LIGHT_LIMIT } from './DeviceUI';

export default function DeviceFoundScreen({ go }) {
const d = useDevices(); const devices = d.discovery?.devices || [];
 return <Shell go={go} title="Dispositivos encontrados" subtitle="Elige el dispositivo que encendiste." back="add-device">
 {devices.length === 0 && <Info>No hay dispositivos disponibles. Inicia una nueva búsqueda.</Info>}
 {devices.map((device, i) => <NavRow key={device.id} label={deviceLabel(device)} detail={device.displayCode || `Encontrado ${i + 1}`} onPress={() => { d.selectDevice(device); go(device.type === 'camera' ? 'add-camera' : 'confirm-device'); }} />)}
 <Primary variant="light" onPress={() => go('add-device')}>Buscar de nuevo</Primary></Shell>;
}
