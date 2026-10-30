import { Shell, Copy, ErrorNotice, Wait, LoadState, useData, useSave, useDevices, FieldCard, Primary, Info, NavRow, SectionLabel, deviceLabel, statusLabel, LIGHT_LIMIT } from './DeviceUI';

export default function SearchErrorScreen({ go }) {
return <Shell go={go} title="No pudimos buscar"><Info>Comprueba la conexión y vuelve a intentarlo.</Info><Primary onPress={() => go('add-device')}>Revisar e intentar de nuevo</Primary></Shell>;
}
