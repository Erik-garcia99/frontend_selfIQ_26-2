import { Shell, useDevices, FieldCard, Primary, Info, deviceLabel } from './DeviceUI';

export default function DeviceUpdatedScreen({ go }) {
  const d = useDevices();
  return <Shell go={go} title={d.result ? 'Dispositivo actualizado' : 'Sin confirmación'} back="registered-devices">
    <Info>{d.result ? 'Los cambios se guardaron correctamente.' : 'Consulta los datos guardados para comprobar su estado.'}</Info>
    {d.result && <FieldCard label="Nombre" value={deviceLabel(d.result)} />}
    {d.device?.type === 'guide' && <Primary onPress={() => go('guide')}>Volver a la guía</Primary>}
    <Primary variant={d.device?.type === 'guide' ? 'light' : 'dark'} onPress={() => go('registered-devices')}>Volver a mis dispositivos</Primary>
  </Shell>;
}
