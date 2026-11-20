import { Shell, Copy, LoadState, useData, useDevices, Primary, Info, NavRow, deviceLabel, statusLabel, LIGHT_LIMIT } from './DeviceUI';

export default function GuideScreen({ go }) {
  const d = useDevices();
  const state = useData('getGuide', { deviceId: d.device?.id });
  const channels = useData('listLightChannels', { deviceId: d.device?.id });
  const guide = state.data;
  const lights = guide?.lights || [];
  const declared = (channels.data || []).length > 0;
  const capacity = declared ? channels.data.length : LIGHT_LIMIT;
  const full = lights.length >= capacity;
  return <Shell go={go} title={deviceLabel(d.device)} back="registered-devices"><LoadState state={state}>
    <Info title={statusLabel(guide)}>{`${lights.length} de ${capacity} luces configuradas`}</Info>
    {!declared && <Info>{`Capacidad aún no declarada por el nodo. Puedes configurar luces en los ${LIGHT_LIMIT} canales lógicos; la guía no se activará hasta que el firmware informe su capacidad.`}</Info>}
    {lights.map(light => <NavRow key={light.id} label={light.name || 'Luz sin nombre'} detail={light.shelfName || 'Sin estante asignado'} onPress={() => { d.setDraft({ ...light, mode: 'edit' }); go('edit-light'); }} />)}
    {!lights.length && <Info>Agrega una luz y elige el estante que señalará.</Info>}
    <Primary variant="light" disabled={!lights.length} onPress={() => go('guide-products')}>Asociar productos a las luces</Primary>
    <Primary disabled={full} onPress={() => { d.setDraft({ name: '', shelfId: null, channel: null, mode: 'add' }); go('add-light'); }}>+ Agregar luz</Primary>
    <Copy>{full ? `Llegaste al límite de ${capacity} luces de esta guía.` : 'Cada luz puede señalar un estante diferente.'}</Copy>
    <Primary variant="light" disabled={!guide?.id} onPress={() => { d.selectDevice(guide); go('edit-device'); }}>Editar datos</Primary>
    <Primary variant="danger" disabled={!guide?.id} onPress={() => { d.selectDevice(guide); go('delete-device'); }}>Eliminar dispositivo</Primary>
  </LoadState></Shell>;
}
