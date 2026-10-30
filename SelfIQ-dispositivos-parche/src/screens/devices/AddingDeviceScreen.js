import { Shell, Copy, ErrorNotice, Wait, LoadState, useData, useSave, useDevices, FieldCard, Primary, Info, NavRow, SectionLabel, deviceLabel, statusLabel, LIGHT_LIMIT } from './DeviceUI';
import { useEffect, useRef } from 'react';
export default function AddingDeviceScreen({ go }) {
const d = useDevices(); const started = useRef(false);
 useEffect(() => { if (started.current) return; started.current = true;
 if (!d.device || !d.draft.name?.trim() || !d.draft.location?.trim()) { go('confirm-device'); return; }
 d.mutate('registerDevice', { discoveryId: d.discovery?.id, gatewayId: d.gateway?.id, deviceId: d.device.id,
 name: d.draft.name.trim(), location: d.draft.location.trim() }).then(value => {
 if (!value?.id) throw new Error('missing confirmation'); d.setResult(value); go('device-added');
 }).catch(() => go('confirm-error'));
 }, []);
 return <Shell go={go} title="Agregando dispositivo" busy><Wait>Espera la confirmación antes de desconectar el dispositivo.</Wait></Shell>;
}
