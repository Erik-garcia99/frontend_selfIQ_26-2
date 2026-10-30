import { Shell, Copy, ErrorNotice, Wait, LoadState, useData, useSave, useDevices, FieldCard, Primary, Info, NavRow, SectionLabel, deviceLabel, statusLabel, LIGHT_LIMIT } from './DeviceUI';

export default function ConfirmErrorScreen({ go }) {
return <Shell go={go} title="No pudimos confirmar el registro"><Info>Consulta tus dispositivos antes de repetir el registro. Los datos que escribiste se conservan.</Info><Primary onPress={() => go('registered-devices')}>Consultar mis dispositivos</Primary><Primary variant="light" onPress={() => go('confirm-device')}>Volver a los datos</Primary></Shell>;
}
