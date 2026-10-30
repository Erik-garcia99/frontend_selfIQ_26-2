import { Shell, Copy, ErrorNotice, Wait, LoadState, useData, useSave, useDevices, FieldCard, Primary, Info, NavRow, SectionLabel, deviceLabel, statusLabel, LIGHT_LIMIT } from './DeviceUI';
import { useState } from 'react';
export default function TestLightScreen({ go }) {
const d = useDevices(); const [busy, setBusy] = useState(false); const [message, setMessage] = useState(''); const [error, setError] = useState('');
 async function test() { setBusy(true); setError(''); setMessage(''); try {
 const response = await d.mutate('testLight', { deviceId: d.device?.id, channel: d.draft.channel, durationSeconds: 5 });
 if (response?.confirmed !== true) throw new Error('not confirmed'); setMessage('La prueba fue enviada. Comprueba que sea la luz que quieres configurar.');
 } catch { setError('No pudimos confirmar la prueba. Comprueba que la guía esté conectada.'); } finally { setBusy(false); } }
 return <Shell go={go} title="Probar luz" back={d.draft.mode === 'add' ? 'add-light' : 'edit-light'} busy={busy}>
 <Info>Se enviará una prueba de cinco segundos. El firmware básico solo recibe el comando; encender la luz requiere implementar su control. La confirmación corresponde al broker de la Raspberry.</Info>{message ? <Info>{message}</Info> : null}<ErrorNotice message={error} />
 <Primary loading={busy} disabled={d.draft.channel == null} onPress={test}>Encender unos segundos</Primary></Shell>;
}
