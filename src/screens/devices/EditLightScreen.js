import { Shell, Copy, ErrorNotice, LoadState, useData, useSave, useDevices, FieldCard, Primary, Info, SectionLabel, LIGHT_LIMIT } from './DeviceUI';
import { validLight } from '../../services/deviceService';

export default function EditLightScreen({ go }) {
  const d = useDevices();
  const action = useSave(go);
  const adding = false;
  const channels = useData('listLightChannels', { deviceId: d.device?.id });
  const guideState = useData('getGuide', { deviceId: d.device?.id });
  const shelves = useData('listShelves');
  const used = new Set((guideState.data?.lights || []).map(light => light.channel));
  const options = (channels.data || []).map(channel => ({ ...channel, available: channel.available && !used.has(channel.id) }));
  return <Shell go={go} title={adding ? 'Agregar luz' : 'Editar luz'} back="guide" busy={action.busy}>
    <FieldCard label="Nombre de la luz" value={d.draft.name || ''} placeholder="Escribe un nombre" editable={!action.busy}
      onChangeText={name => d.setDraft({ ...d.draft, name })} />

    {/* El estante se elige aquí mismo: el hub de repisas ya no necesita una
        pantalla intermedia (`select-shelf`) para esta tarea. */}
    <SectionLabel>Estante de la luz</SectionLabel>
    <LoadState state={shelves}>
      {(shelves.data || []).map(shelf => <Primary key={shelf.id} variant="light" disabled={action.busy}
        onPress={() => d.setDraft({ ...d.draft, shelfId: shelf.id, shelfName: shelf.name })}>
        {`${d.draft.shelfId === shelf.id ? '✓ ' : ''}${shelf.name}${shelf.location ? ` · ${shelf.location}` : ''}`}
      </Primary>)}
      {!(shelves.data || []).length ? <Info>No hay repisas registradas. Créalas desde Estantes.</Info> : null}
    </LoadState>

    {adding ? <LoadState state={channels}><SectionLabel>Elige una luz disponible</SectionLabel>
      {options.filter(c => c.available).map(c => <Primary key={c.id} variant="light" disabled={action.busy}
        onPress={() => d.setDraft({ ...d.draft, channel: c.id })}>
        {`${d.draft.channel === c.id ? '✓ ' : ''}${c.label || `Luz ${c.id + 1}`}`}</Primary>)}
      {!options.some(c => c.available) && <Info>No hay luces disponibles para agregar.</Info>}</LoadState>
      : <Info>Cambiar el estante conserva la misma luz. Muévela físicamente si es necesario. Hay hasta {LIGHT_LIMIT} canales por nodo.</Info>}

    <Primary variant="light" disabled={action.busy || d.draft.channel == null} onPress={() => go('test-light')}>Probar luz</Primary>
    <ErrorNotice message={action.error} />
    <Primary loading={action.busy} disabled={!validLight(d.draft)} onPress={() => action.save(adding ? 'addLight' : 'updateLight', {
      deviceId: d.device.id, lightId: adding ? undefined : d.draft.id, name: d.draft.name.trim(), shelfId: d.draft.shelfId, channel: d.draft.channel,
    }, adding ? 'light-added' : 'light-updated')}>{adding ? 'Agregar luz' : 'Guardar cambios'}</Primary>
    <Copy>Para asignar el producto que enciende este LED, abre la repisa en Estantes.</Copy>
  </Shell>;
}
