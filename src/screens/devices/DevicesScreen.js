import { Shell, ErrorNotice, Wait, LoadState, useData, useDevices, Primary, Info, NavRow, SectionLabel, statusLabel } from './DeviceUI';

function BranchDevices({ go }) {
 const d = useDevices();
 const state = useData('listGateways');
 return <>
 <SectionLabel>Gateways de la sucursal</SectionLabel>
 <LoadState state={state}>
 {(state.data || []).map(g => <NavRow key={g.id} label={g.name} detail={`${statusLabel(g)} · Ver nodos y editar nombre`} onPress={() => { d.setGateway(g); go('registered-devices'); }} />)}
 {state.data?.length === 0 && <Info>No hay gateways registrados en esta sucursal.</Info>}
 </LoadState>
 <Primary variant="light" onPress={state.reload}>Actualizar estado</Primary>
 <NavRow label="Mis nodos" detail="Consultar todos los nodos de la sucursal" onPress={() => { d.setGateway(null); go('registered-devices'); }} />
 <Primary onPress={() => go('add-device')}>Agregar dispositivo</Primary>
 </>;
}

export default function DevicesScreen({ go }) {
const d = useDevices();
return <Shell go={go} title="Dispositivos" subtitle="Administra los equipos de tu sucursal." back="panel">
 {d.loadingBranches ? <Wait /> : d.branchError ? <><ErrorNotice message={d.branchError} /><Primary onPress={d.reloadBranches}>Reintentar</Primary></> : <>
 <SectionLabel>Sucursal</SectionLabel>
 {d.branches.map(branch => <NavRow key={branch.id} label={`${branch.id === d.branchId ? '✓ ' : ''}${branch.name}`} onPress={() => d.selectBranch(branch.id)} />)}
 {d.branchId ? <BranchDevices key={d.branchId} go={go} /> : <Info>No tienes sucursales disponibles.</Info>}
 </>}
 </Shell>;
}
