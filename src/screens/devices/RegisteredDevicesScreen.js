import { useState } from 'react';
import { Shell, ErrorNotice, LoadState, useData, useDevices, FieldCard, Primary, Info, NavRow, SectionLabel, deviceLabel, statusLabel } from './DeviceUI';

function GatewayEditor({ gateway }) {
 const d = useDevices();
 const [name, setName] = useState(gateway.name);
 const [savedName, setSavedName] = useState(gateway.name);
 const [busy, setBusy] = useState(false);
 const [error, setError] = useState('');
 const [saved, setSaved] = useState(false);
 async function save() {
  if (busy) return;
  setBusy(true); setError(''); setSaved(false);
  try {
   const result = await d.mutate('updateGateway', { gatewayId: gateway.id, name: name.trim() });
   d.setGateway(result); setName(result.name); setSavedName(result.name); setSaved(true);
  } catch (error) { setError(error.message); }
  finally { setBusy(false); }
 }
 return <>
  <Info title={savedName}>{statusLabel(gateway)}</Info>
  <FieldCard label="Nombre del gateway" value={name} editable={!busy} onChangeText={value => { setName(value); setSaved(false); }} />
  <ErrorNotice message={error} />
  {saved && <Info>Nombre guardado.</Info>}
  <Primary loading={busy} disabled={busy || !name.trim() || name.trim().length > 120 || name.trim() === savedName} onPress={save}>Guardar nombre</Primary>
 </>;
}

function GatewayDetails({ gatewayId }) {
 const state = useData('getGateway', { gatewayId });
 return <><LoadState state={state}>{state.data && <GatewayEditor gateway={state.data} />}</LoadState>
  <Primary variant="light" onPress={state.reload}>Actualizar gateway</Primary></>;
}

export default function RegisteredDevicesScreen({ go }) {
 const d = useDevices();
 const state = useData('listDevices', { gatewayId: d.gateway?.id });
 const devices = Array.isArray(state.data) ? state.data : [];
 return <Shell go={go} title={d.gateway ? 'Gateway y nodos' : 'Mis nodos'} subtitle={d.gateway ? d.gateway.name : 'Todos los nodos de tu sucursal.'}>
  {d.gateway && <GatewayDetails key={d.gateway.id} gatewayId={d.gateway.id} />}
  <SectionLabel>{d.gateway ? 'Nodos asociados a este gateway' : 'Nodos de la sucursal'}</SectionLabel>
  <LoadState state={state}>
   {devices.length === 0 && <Info title="Todavía no hay nodos">{d.gateway ? 'Este gateway aún no tiene nodos asociados.' : 'Agrega el primer nodo de tu tienda.'}</Info>}
   {devices.map(device => <NavRow key={device.id} label={device.name || `${deviceLabel(device)} · ${device.displayCode}`} detail={`${statusLabel(device)}${device.location ? ' · ' + device.location : ''}${device.macAddress ? ' · ' + device.macAddress : ''}`} onPress={() => { d.selectDevice(device); go(device.type === 'guide' ? 'guide' : device.type === 'occupancy' ? 'aforo-detail' : 'camera-detail'); }} />)}
  </LoadState>
  <Primary variant="light" onPress={state.reload}>Actualizar nodos</Primary>
  <Primary onPress={() => go('add-device')}>Agregar nodo</Primary>
 </Shell>;
}
