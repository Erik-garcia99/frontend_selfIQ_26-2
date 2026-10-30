import { Shell, ErrorNotice, useDevices, useSave, FieldCard, Primary, Info } from './DeviceUI';

export default function EditDeviceScreen({ go }) {
  const d = useDevices();
  const action = useSave(go);
  const type = d.device?.type;
  const title = type === 'camera' ? 'Editar cámara' : type === 'guide' ? 'Editar guía' : 'Editar dispositivo';
  const back = type === 'camera' ? 'camera-detail' : type === 'guide' ? 'guide' : 'aforo-detail';
  return <Shell go={go} title={title} back={back} busy={action.busy}>
    <FieldCard label="Nombre del dispositivo" value={d.draft.name || ''} placeholder="Escribe un nombre" editable={!action.busy} onChangeText={name => d.setDraft({ ...d.draft, name })} />
    <FieldCard label="Ubicación" value={d.draft.location || ''} placeholder="Indica dónde está" editable={!action.busy} onChangeText={location => d.setDraft({ ...d.draft, location })} />
    <Info>Se guardarán el nombre y la ubicación del equipo. Las mediciones y las luces no cambian.</Info>
    <ErrorNotice message={action.error} />
    <Primary loading={action.busy} disabled={!d.draft.name?.trim() || !d.draft.location?.trim()}
      onPress={() => action.save('updateDevice', { deviceId: d.device.id, name: d.draft.name.trim(), location: d.draft.location.trim() }, 'device-updated')}>Guardar cambios</Primary>
  </Shell>;
}
