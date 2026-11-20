import { Shell, Copy, LoadState, useData, useDevices, Primary, Info, SectionLabel, deviceLabel } from './DeviceUI';

export default function GuideNodeScreen({ go }) {
  const d = useDevices();
  const device = d.device;
  const lightsState = useData('getGuide', { deviceId: device?.id });
  const channelsState = useData('listLightChannels', { deviceId: device?.id });
  const associations = useData('listGuideAssociations');
  const lights = lightsState.data?.lights || [];
  const rows = associations.data || [];
  const channels = channelsState.data || [];
  const configured = channels.filter(channel => lights.some(light => light.channel === channel.id));
  const assigned = configured.filter(channel => {
    const light = lights.find(item => item.channel === channel.id);
    return rows.some(row => row.guidePointId === light.id);
  });

  function configure(channel) {
    d.setDraft({ name: `Luz ${channel.id + 1}`, shelfId: null, channel: channel.id, mode: 'add' });
    go('add-light');
  }

  return <Shell go={go} title={deviceLabel(device)} back="registered-devices">
    <Info title="Guía LED">
      Cada número corresponde a un LED físico de este ESP32. Asignar otro producto no mueve el LED: comprueba que esté junto al producto correcto.
    </Info>
    <LoadState state={channelsState}><LoadState state={lightsState}><LoadState state={associations}>
      <Copy>{`${channels.length} LED · ${assigned.length} ocupados · ${configured.length - assigned.length} configurados sin producto · ${channels.length - configured.length} sin configurar`}</Copy>
      {channels.some(channel => channel.declared === false) &&
        <Info>El nodo aún no informa su capacidad. Se muestran los 8 canales previstos; el encendido requiere que el firmware confirme los canales reales.</Info>}
      <SectionLabel>LED de este nodo</SectionLabel>
      {channels.map(channel => {
        const light = lights.find(item => item.channel === channel.id);
        const products = light ? rows.filter(row => row.guidePointId === light.id) : [];
        return <Info key={channel.id} title={`LED ${channel.id + 1} · ${!light ? 'Sin configurar' : products.length ? 'Ocupado' : 'Sin producto'}`}>
          {light ? <>
            <Copy>{`${light.name} · ${light.shelfName || 'Sin estante asignado'}`}</Copy>
            <Copy>{products.length ? products.map(row => `${row.productName}${row.sku ? ` (${row.sku})` : ''}`).join(', ') : 'Ningún producto asociado.'}</Copy>
            <Primary variant="light" onPress={() => { d.setDraft(light); go('guide-products'); }}>
              {products.length ? 'Cambiar o quitar producto' : 'Asignar producto'}
            </Primary>
            <Primary variant="light" onPress={() => { d.setDraft({ ...light, mode: 'edit' }); go('edit-light'); }}>Editar nombre / estante</Primary>
          </> : <Primary disabled={!channel.available} onPress={() => configure(channel)}>Configurar LED {channel.id + 1}</Primary>}
        </Info>;
      })}
      {configured.length === channels.length && channels.length > 0 &&
        <Info>Todos los LED están configurados. Para reutilizar uno, elige “Cambiar o quitar producto”; no necesitas agregar otra luz.</Info>}
    </LoadState></LoadState></LoadState>
    <Primary variant="light" disabled={!assigned.length} onPress={() => {
      d.setDraft({ controlNodeId: device.id, controlBack: 'guide' });
      go('test-product-light');
    }}>Control de LED · ON / OFF</Primary>
    <Primary variant="light" onPress={() => go('edit-device')}>Editar nodo</Primary>
    <Primary variant="danger" onPress={() => go('delete-device')}>Eliminar nodo</Primary>
  </Shell>;
}
