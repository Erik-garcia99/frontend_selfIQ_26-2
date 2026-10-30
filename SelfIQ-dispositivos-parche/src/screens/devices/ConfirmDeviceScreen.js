import { Shell, Copy, ErrorNotice, Wait, LoadState, useData, useSave, useDevices, FieldCard, Primary, Info, NavRow, SectionLabel, deviceLabel, statusLabel, LIGHT_LIMIT } from './DeviceUI';

export default function ConfirmDeviceScreen({ go }) {
const d = useDevices(); const supported = ['guide', 'occupancy'].includes(d.device?.type);
 return <Shell go={go} title="Agregar dispositivo" subtitle={deviceLabel(d.device)} back="device-found">
 <FieldCard label="Nombre del dispositivo" placeholder="Escribe un nombre fácil de reconocer" value={d.draft.name || ''} onChangeText={name => d.setDraft({ ...d.draft, name })} />
 <FieldCard label="Ubicación" placeholder="Indica dónde estará" value={d.draft.location || ''} onChangeText={location => d.setDraft({ ...d.draft, location })} />
 <Info>Se agregará a tu sucursal. Podrás editar estos datos después.</Info>
 {!supported && <Info>Este tipo de dispositivo todavía no está disponible.</Info>}
 <Primary disabled={!supported || !d.draft.name?.trim() || !d.draft.location?.trim()} onPress={() => go('adding-device')}>Agregar dispositivo</Primary></Shell>;
}
