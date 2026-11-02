import { Shell, Copy, ErrorNotice, Wait, LoadState, useData, useSave, useDevices, FieldCard, Primary, Info, NavRow, SectionLabel, deviceLabel, statusLabel, LIGHT_LIMIT } from './DeviceUI';

export default function NoResultsScreen({ go }) {
return <Shell go={go} title="No encontramos dispositivos"><Info>Comprueba que esté encendido y cerca del equipo principal.</Info><Primary onPress={() => go('add-device')}>Volver a buscar</Primary></Shell>;
}
