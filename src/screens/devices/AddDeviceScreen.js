import { Shell, Copy, ErrorNotice, Wait, LoadState, useData, useSave, useDevices, FieldCard, Primary, Info, NavRow, SectionLabel, deviceLabel, statusLabel, LIGHT_LIMIT } from './DeviceUI';

export default function AddDeviceScreen({ go }) {
const d = useDevices();
 const state = useData('listGateways');
 const gateways = Array.isArray(state.data) ? state.data : [];
 const chosen = gateways.length === 1 ? gateways[0] : gateways.find(g => g.id === d.gateway?.id);
 return <Shell go={go} title="Agregar dispositivo" subtitle="Vamos a encontrarlo.">
 <Info title="Antes de empezar">Conecta el dispositivo a la corriente y déjalo cerca del equipo principal de tu tienda.</Info>
 <LoadState state={state}>
 {gateways.length === 0 ? <Info title="No hay equipos disponibles">Primero necesitas un equipo principal asociado a esta sucursal.</Info> : <>
 <SectionLabel>{gateways.length > 1 ? 'Elige el equipo de tu sucursal' : 'Equipo de tu sucursal'}</SectionLabel>
 {gateways.map((g, index) => <NavRow key={g.id} label={`${chosen?.id === g.id ? '✓ ' : ''}${g.name || `Equipo ${index + 1}`}`} detail={statusLabel(g)} onPress={() => d.setGateway(g)} />)}
 <Primary disabled={!chosen || chosen.online === false} onPress={() => { d.setGateway(chosen); d.setDiscovery(null); d.setResult(null); go('preparing-search'); }}>Iniciar búsqueda</Primary></>}
 </LoadState><Copy>No necesitas escribir nombres de equipos ni cambiar la red de tu teléfono.</Copy>
 </Shell>;
}
