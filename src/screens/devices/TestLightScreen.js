import { Shell, ErrorNotice, useDevices, Primary, Info } from './DeviceUI';
import { describeError } from '../../utils/errorMessages';
import { useState } from 'react';

export default function TestLightScreen({ go }) {
  const d = useDevices();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function test() {
    setBusy(true); setError(''); setMessage('');
    try {
      const response = await d.mutate('testLight', {
        deviceId: d.device?.id, channel: d.draft.channel, durationSeconds: 5,
      });
      if (response?.status === 'applied' && response.light === 'on') {
        setMessage('Luz activada. Comprueba que sea la luz de la ubicación que quieres configurar.');
      } else if (response?.status === 'rejected') {
        setError('La luz está ocupada por otra guía. Espera a que termine y vuelve a probar.');
      } else {
        setError('No se pudo confirmar que la luz se encendiera. El estado es desconocido; no lo des por apagado.');
      }
    } catch (failure) {
      setError(describeError(failure).message || 'No pudimos completar la prueba. Comprueba que la guía esté conectada.');
    } finally {
      setBusy(false);
    }
  }

  return <Shell go={go} title="Probar luz" back={d.draft.mode === 'add' ? 'add-light' : 'edit-light'} busy={busy}>
    <Info>Se enviará una prueba de cinco segundos. Solo se muestra «Luz activada» cuando el nodo confirma que aplicó la salida; la confirmación del gateway no basta.</Info>
    {message ? <Info title="Prueba aplicada">{message}</Info> : null}
    <ErrorNotice message={error} />
    <Primary loading={busy} disabled={d.draft.channel == null} onPress={test}>Encender unos segundos</Primary>
  </Shell>;
}
