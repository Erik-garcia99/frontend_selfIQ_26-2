import { Shell, Copy, ErrorNotice, Wait, LoadState, useData, useSave, useDevices, FieldCard, Primary, Info, NavRow, SectionLabel, deviceLabel, statusLabel, LIGHT_LIMIT } from './DeviceUI';
import { validLight } from '../../services/deviceService';
export default function EditLightScreen({ go }) {
const d = useDevices(); const action = useSave(go); const adding = false;
 const channels = useData('listLightChannels', { deviceId: d.device?.id });
 return <Shell go={go} title={adding ? 'Agregar luz' : 'Editar luz'} back="guide" busy={action.busy}>
 <FieldCard label="Nombre de la luz" value={d.draft.name || ''} placeholder="Escribe un nombre" editable={!action.busy} onChangeText={name => d.setDraft({ ...d.draft, name })} />
 <Primary variant="light" disabled={action.busy} onPress={() => go('select-shelf')}>{d.draft.shelfName || 'Seleccionar estante'}</Primary>
 {adding ? <LoadState state={channels}><SectionLabel>Elige una luz disponible</SectionLabel>
 {(channels.data || []).filter(c => c.available).map((c, i) => <Primary key={c.id} variant="light" disabled={action.busy} onPress={() => d.setDraft({ ...d.draft, channel: c.id })}>{`${d.draft.channel === c.id ? '✓ ' : ''}${c.label || `Luz ${i + 1}`}`}</Primary>)}
 {!(channels.data || []).some(c => c.available) && <Info>No hay luces disponibles para agregar.</Info>}</LoadState> : <Info>Cambiar el estante conserva la misma luz. Muévela físicamente si es necesario.</Info>}
 <Primary variant="light" disabled={action.busy || d.draft.channel == null} onPress={() => go('test-light')}>Probar luz</Primary>
 <ErrorNotice message={action.error} /><Primary loading={action.busy} disabled={!validLight(d.draft)} onPress={() => action.save(adding ? 'addLight' : 'updateLight', {
 deviceId: d.device.id, lightId: adding ? undefined : d.draft.id, name: d.draft.name.trim(), shelfId: d.draft.shelfId, channel: d.draft.channel }, adding ? 'light-added' : 'light-updated')}>{adding ? 'Agregar luz' : 'Guardar cambios'}</Primary>
 </Shell>;
}
