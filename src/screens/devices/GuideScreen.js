import { Shell, Copy, ErrorNotice, Wait, LoadState, useData, useSave, useDevices, FieldCard, Primary, Info, NavRow, SectionLabel, deviceLabel, statusLabel, LIGHT_LIMIT } from './DeviceUI';

export default function GuideScreen({ go }) {
const d = useDevices(); const state = useData('getGuide', { deviceId: d.device?.id }); const guide = state.data; const lights = guide?.lights || [];
 return <Shell go={go} title={deviceLabel(d.device)} back="registered-devices"><LoadState state={state}>
 <Info title={statusLabel(guide)}>{`${lights.length} de ${LIGHT_LIMIT} luces configuradas`}</Info>
 {lights.map(light => <NavRow key={light.id} label={light.name || 'Luz sin nombre'} detail={light.shelfName || 'Sin estante asignado'} onPress={() => { d.setDraft({ ...light, mode: 'edit' }); go('edit-light'); }} />)}
 {!lights.length && <Info>Agrega una luz y elige el estante que señalará.</Info>}
 <Primary disabled={lights.length >= LIGHT_LIMIT} onPress={() => { d.setDraft({ name: '', shelfId: null, channel: null, mode: 'add' }); go('add-light'); }}>+ Agregar luz</Primary>
 <Copy>{lights.length >= LIGHT_LIMIT ? 'Llegaste al límite de 10 luces de esta guía.' : 'Cada luz puede señalar un estante diferente.'}</Copy>
 </LoadState></Shell>;
}
