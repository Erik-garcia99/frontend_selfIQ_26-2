import { Shell, Copy, ErrorNotice, Wait, LoadState, useData, useSave, useDevices, FieldCard, Primary, Info, NavRow, SectionLabel, deviceLabel, statusLabel, LIGHT_LIMIT } from './DeviceUI';
import { useEffect, useRef, useState } from 'react';
export default function SearchingScreen({ go }) {
const d = useDevices(); const stoppingRef = useRef(false); const [error, setError] = useState(''); const [stopping, setStopping] = useState(false);
 useEffect(() => { let active = true; let timer;
 async function poll() { try {
 const value = await d.request('getDiscovery', { discoveryId: d.discovery?.id, gatewayId: d.gateway?.id });
 if (!active) return; if (stoppingRef.current) { timer = setTimeout(poll, 2000); return; }
 if (!value || !Array.isArray(value.devices)) throw new Error('invalid search');
 d.setDiscovery(value);
 if (value.status === 'completed') { go(value.devices.length ? 'device-found' : 'no-results'); return; }
 if (value.status === 'failed') throw new Error('search failed');
 timer = setTimeout(poll, 2000);
 } catch { if (active && !stoppingRef.current) { d.setFailure('Se interrumpió la búsqueda. Revisa la conexión de tu tienda.'); go('search-error'); } } }
 poll(); return () => { active = false; clearTimeout(timer); };
 }, []);
 async function stop() { stoppingRef.current = true; setStopping(true); setError(''); try { await d.mutate('stopDiscovery', { discoveryId: d.discovery?.id }); go('add-device'); }
 catch { stoppingRef.current = false; setError('No pudimos detener la búsqueda. Inténtalo de nuevo.'); } finally { setStopping(false); } }
 return <Shell go={go} title="Buscando dispositivos" busy><Wait>Los dispositivos encontrados aparecerán al terminar la búsqueda.</Wait>
 <Copy>Déjalo encendido y cerca del equipo principal.</Copy><ErrorNotice message={error} />
 <Primary loading={stopping} onPress={stop}>Detener búsqueda</Primary></Shell>;
}
