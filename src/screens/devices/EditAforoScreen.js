import { Shell, Copy, ErrorNotice, Wait, LoadState, useData, useSave, useDevices, FieldCard, Primary, Info, NavRow, SectionLabel, deviceLabel, statusLabel, LIGHT_LIMIT } from './DeviceUI';

export default function EditAforoScreen({ go }) {
const d = useDevices(); const action = useSave(go);
 return <Shell go={go} title="Editar aforo" back="aforo-detail" busy={action.busy}>
 <FieldCard label="Nombre del dispositivo" value={d.draft.name || ''} placeholder="Escribe un nombre" editable={!action.busy} onChangeText={name => d.setDraft({ ...d.draft, name })} />
 <FieldCard label="Ubicación o acceso" value={d.draft.location || ''} placeholder="Indica dónde está" editable={!action.busy} onChangeText={location => d.setDraft({ ...d.draft, location })} />
 <Info>Las mediciones se reciben automáticamente. Aquí solo cambias el nombre y la ubicación.</Info><ErrorNotice message={action.error} />
 <Primary loading={action.busy} disabled={!d.draft.name?.trim() || !d.draft.location?.trim()} onPress={() => action.save('updateDevice', { deviceId: d.device.id, name: d.draft.name.trim(), location: d.draft.location.trim() }, 'aforo-updated')}>Guardar cambios</Primary></Shell>;
}
