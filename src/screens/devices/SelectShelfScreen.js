import { Shell, Copy, ErrorNotice, Wait, LoadState, useData, useSave, useDevices, FieldCard, Primary, Info, NavRow, SectionLabel, deviceLabel, statusLabel, LIGHT_LIMIT } from './DeviceUI';

export default function SelectShelfScreen({ go }) {
const d = useDevices(); const state = useData('listShelves'); const back = d.draft.mode === 'add' ? 'add-light' : 'edit-light';
 return <Shell go={go} title="Seleccionar estante" back={back}><LoadState state={state}>
 {(state.data || []).map(shelf => <NavRow key={shelf.id} label={`${d.draft.shelfId === shelf.id ? '✓ ' : ''}${shelf.name}`} detail={shelf.location} onPress={() => { d.setDraft({ ...d.draft, shelfId: shelf.id, shelfName: shelf.name }); go(back); }} />)}
 {!(state.data || []).length && <Info>No hay estantes registrados en esta sucursal.</Info>}</LoadState>
 <Copy>La selección se aplicará cuando guardes la luz.</Copy></Shell>;
}
