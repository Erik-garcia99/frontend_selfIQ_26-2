import { useState } from 'react';
import { Shell, Copy, ErrorNotice, useDevices, FieldCard, Primary, Info, deviceLabel } from './DeviceUI';

export default function DeleteDeviceScreen({ go }) {
  const d = useDevices();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const device = d.device;

  async function remove() {
    if (!device?.id || busy) return;
    setBusy(true); setError('');
    try {
      const result = await d.mutate('deleteDevice', { deviceId: device.id });
      if (result?.deleted !== true) throw new Error('not confirmed');
      d.selectDevice(null);
      d.setResult(null);
      go('registered-devices');
    } catch {
      setError('No pudimos eliminar el dispositivo. Comprueba la conexión y vuelve a intentarlo.');
    } finally { setBusy(false); }
  }

  return <Shell go={go} title="Eliminar dispositivo" subtitle={deviceLabel(device)} back="registered-devices" busy={busy}>
    {device ? <FieldCard label="Dispositivo" value={deviceLabel(device)} /> : <Info>No hay un dispositivo seleccionado.</Info>}
    {device?.location ? <FieldCard label="Ubicación" value={device.location} /> : null}
    <Info title="Esta acción no se puede deshacer">Se quitará el registro del dispositivo y su configuración de luces. Algunos registros históricos se conservan sin asociar al nodo.</Info>
    <Copy>Esto no borra la identidad guardada en el ESP32. Para registrarlo nuevamente tendrás que restablecer esa identidad en el equipo.</Copy>
    <ErrorNotice message={error} />
    <Primary variant="danger" loading={busy} disabled={!device?.id} onPress={remove}>Eliminar dispositivo</Primary>
    <Primary variant="light" disabled={busy} onPress={() => go('registered-devices')}>Cancelar</Primary>
  </Shell>;
}
