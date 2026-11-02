import { useState } from 'react';
import { Shell, Copy, ErrorNotice, useDevices, FieldCard, Primary, Info, deviceLabel } from './DeviceUI';

export default function DeleteDeviceScreen({ go }) {
  const d = useDevices();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [force, setForce] = useState(false);
  const [confirmForce, setConfirmForce] = useState(false);
  const device = d.device;
  const label = device?.name || (device ? `${deviceLabel(device)} · ${device.displayCode}` : '');

  async function remove(onlyRecord = false) {
    if (!device?.id || busy) return;
    setBusy(true); setError('');
    try {
      const result = await d.mutate('deleteDevice', { deviceId: device.id, force: onlyRecord });
      if (result?.deleted !== true) throw new Error('not confirmed');
      d.selectDevice(null);
      d.setResult(null);
      go('registered-devices');
    } catch (failure) {
      setError(failure.message || 'No pudimos confirmar la eliminación. Comprueba la conexión y vuelve a intentarlo.');
      setForce(true);
    } finally { setBusy(false); }
  }

  return <Shell go={go} title="Eliminar dispositivo" subtitle={label} back="registered-devices" busy={busy}>
    {device ? <FieldCard label="Dispositivo" value={label} /> : <Info>No hay un dispositivo seleccionado.</Info>}
    {device?.macAddress ? <FieldCard label="MAC" value={device.macAddress} /> : null}
    {device?.location ? <FieldCard label="Ubicación" value={device.location} /> : null}
    <Info title="Esta acción no se puede deshacer">Se quitará el registro del dispositivo y su configuración de luces. Algunos registros históricos se conservan sin asociar al nodo.</Info>
    <Copy>Lo normal es que el nodo esté conectado: primero borra su identidad y confirma; después se elimina el registro. Conserva Wi-Fi y firmware para poder agregarlo otra vez.</Copy>
    <ErrorNotice message={error} />
    {force && !confirmForce && <Primary variant="light" disabled={busy} onPress={() => setConfirmForce(true)}>Retirar solo el registro (equipo ausente)</Primary>}
    {confirmForce && <>
      <Info title="El equipo conservará su identidad">Si este nodo sigue guardando la identidad anterior, no volverá a registrarse aunque lo busques. Para reutilizarlo tendrás que borrar esa identidad en el equipo o restablecerlo.</Info>
      <Primary variant="danger" loading={busy} disabled={busy} onPress={() => remove(true)}>Confirmar retiro sin borrar identidad</Primary>
    </>}
    {!confirmForce && <Primary variant="danger" loading={busy} disabled={!device?.id} onPress={() => remove(false)}>Eliminar dispositivo</Primary>}
    {confirmForce && <Primary variant="light" disabled={busy} onPress={() => setConfirmForce(false)}>Cancelar retiro</Primary>}
    <Primary variant="light" disabled={busy} onPress={() => go('registered-devices')}>Volver</Primary>
  </Shell>;
}
