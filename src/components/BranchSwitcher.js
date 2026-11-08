import { Modal, Pressable, Text, View } from 'react-native';
import { useMemo, useState } from 'react';
import { useDevices } from '../context/DeviceContext';
import { branchSwitcherStyles as S } from '../theme/branchSwitcher';

function StatusDot({ online }) {
  return <View style={[S.dot, online ? S.dotOnline : S.dotOffline]} />;
}

export default function BranchSwitcher() {
  const { branchId, branches, selectBranch, loadingBranches, branchError, reloadBranches } = useDevices();
  const [open, setOpen] = useState(false);
  const current = useMemo(() => branches.find((branch) => branch.id === branchId) || branches[0], [branches, branchId]);
  const statusText = current?.is_online ? 'Online' : 'Offline';

  return <>
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Sucursal actual: ${current?.name || 'Sin sucursal'}. Cambiar sucursal`}
      onPress={() => setOpen(true)}
      style={({ pressed }) => [S.trigger, pressed && S.pressed]}
    >
      <Text numberOfLines={1} style={S.triggerName}>{loadingBranches ? 'Cargando…' : current?.name || 'Sin sucursal'}</Text>
      {current ? <><StatusDot online={Boolean(current.is_online)} /><Text style={[S.triggerStatus, !current.is_online && S.offlineText]}>{statusText}</Text></> : null}
      <Text style={S.chevron}>⌄</Text>
    </Pressable>

    <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
      <Pressable style={S.backdrop} onPress={() => setOpen(false)}>
        <Pressable style={S.menu} onPress={(event) => event.stopPropagation()}>
          <Text style={S.menuTitle}>Cambiar sucursal</Text>
          {branchError ? <View style={S.errorBox}><Text style={S.errorText}>{branchError}</Text><Pressable onPress={reloadBranches}><Text style={S.retry}>Reintentar</Text></Pressable></View> : null}
          {!branchError && branches.length === 0 && !loadingBranches ? <Text style={S.empty}>No hay sucursales disponibles.</Text> : null}
          {branches.map((branch) => {
            const selected = branch.id === branchId;
            return <Pressable key={branch.id} onPress={() => { selectBranch(branch.id); setOpen(false); }} style={[S.option, selected && S.optionSelected]}>
              <View style={S.optionTextWrap}>
                <Text numberOfLines={1} style={[S.optionName, selected && S.optionNameSelected]}>{branch.name}</Text>
                <View style={S.statusRow}><StatusDot online={Boolean(branch.is_online)} /><Text style={[S.optionStatus, !branch.is_online && S.offlineText]}>{branch.is_online ? 'Online' : 'Offline'}</Text></View>
              </View>
              {selected ? <Text style={S.check}>✓</Text> : null}
            </Pressable>;
          })}
        </Pressable>
      </Pressable>
    </Modal>
  </>;
}
