import { useState } from 'react';
import { Shell, ErrorNotice, LoadState, useData, useDevices, FieldCard, Primary, Info, NavRow, SectionLabel, Copy, deviceLabel, statusLabel } from './DeviceUI';

const PAGE_SIZE = 5;
const GROUPS = [
  { id: 'all', label: 'Todos', types: null },
  { id: 'camera', label: 'Cámaras', types: ['camera'] },
  { id: 'occupancy', label: 'Aforo', types: ['occupancy', 'environment'] },
  { id: 'guide', label: 'Guía LED', types: ['guide'] },
];

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
    } catch (failure) { setError(failure.message); }
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
  const [group, setGroup] = useState('all');
  const [page, setPage] = useState(0);
  const groupKey = `${d.gateway?.id || ''}:${group}`;
  const [lastKey, setLastKey] = useState(groupKey);
  if (groupKey !== lastKey) { setLastKey(groupKey); setPage(0); }

  const current = GROUPS.find(item => item.id === group) || GROUPS[0];
  const filtered = current.types ? devices.filter(device => current.types.includes(device.type)) : devices;
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pages - 1);
  const visible = filtered.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);

  return <Shell go={go} title={d.gateway ? 'Gateway y nodos' : 'Mis nodos'} subtitle={d.gateway ? d.gateway.name : 'Nodos de tu sucursal, agrupados por tipo.'}>
   {d.gateway && <GatewayDetails key={d.gateway.id} gatewayId={d.gateway.id} />}
   <SectionLabel>Tipo de nodo</SectionLabel>
   {GROUPS.map(item => <Primary key={item.id} variant="light"
     onPress={() => setGroup(item.id)}>
     {`${group === item.id ? '✓ ' : ''}${item.label}`}
   </Primary>)}
   <SectionLabel>{`${current.label} (${filtered.length})`}</SectionLabel>
   <LoadState state={state}>
    {visible.length === 0 && <Info title="Sin nodos">
      {current.types ? `No hay nodos de ${current.label.toLowerCase()} en esta vista.` : 'Agrega el primer nodo de tu tienda.'}
    </Info>}
    {visible.map(device => <NavRow key={device.id} label={device.name || `${deviceLabel(device)} · ${device.displayCode}`} detail={`${statusLabel(device)}${device.location ? ' · ' + device.location : ''}`} onPress={() => { d.selectDevice(device); go(device.type === 'guide' ? 'guide' : device.type === 'occupancy' ? 'aforo-detail' : 'camera-detail'); }} />)}
   </LoadState>
   {filtered.length > PAGE_SIZE && <>
     <Copy>{`Página ${safePage + 1} de ${pages}`}</Copy>
     <Primary variant="light" disabled={safePage === 0} onPress={() => setPage(value => Math.max(0, value - 1))}>‹ Anterior</Primary>
     <Primary variant="light" disabled={safePage >= pages - 1} onPress={() => setPage(value => Math.min(pages - 1, value + 1))}>Siguiente ›</Primary>
   </>}
   <Primary variant="light" onPress={state.reload}>Actualizar nodos</Primary>
   <Primary onPress={() => go('add-device')}>Agregar nodo</Primary>
  </Shell>;
}
