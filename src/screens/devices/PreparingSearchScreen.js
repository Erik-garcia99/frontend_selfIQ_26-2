import { Shell, Copy, ErrorNotice, Wait, LoadState, useData, useSave, useDevices, FieldCard, Primary, Info, NavRow, SectionLabel, deviceLabel, statusLabel, LIGHT_LIMIT } from './DeviceUI';
import { useEffect, useRef } from 'react';
export default function PreparingSearchScreen({ go }) {
const d = useDevices(); const started = useRef(false);
 useEffect(() => { if (started.current) return; started.current = true;
 if (!d.gateway) { go('add-device'); return; }
 d.mutate('startDiscovery', { gatewayId: d.gateway.id }).then(value => {
 if (!value?.id) throw new Error('missing search'); d.setDiscovery(value); go('searching');
 }).catch(() => { d.setFailure('No pudimos iniciar la búsqueda. Comprueba que el equipo de tu tienda esté encendido.'); go('search-error'); });
 }, []);
 return <Shell go={go} title="Preparando búsqueda" busy><Wait>Estamos preparando la conexión de tu tienda.</Wait><Copy>Mantén el dispositivo encendido.</Copy></Shell>;
}
