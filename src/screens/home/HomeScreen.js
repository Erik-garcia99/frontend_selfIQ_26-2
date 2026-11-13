import { useEffect, useMemo, useState } from 'react';
import { Image, Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { Nav } from '../../components/ui';
import BranchSwitcher from '../../components/BranchSwitcher';
import { useAuth } from '../../context/AuthContext';
import { useDevices } from '../../context/DeviceContext';
import { apiRequest } from '../../services/http';
import { colors as C } from '../../theme/colors';
import { styles } from '../../theme/styles';
import { navIcons, frameIcons } from '../../theme/assets';
import { canManage } from '../../utils/validation';
import TemperatureIndicator from '../../components/TemperatureIndicator';
import { useTemperature } from '../../utils/useTemperature';
import { useOccupancy } from '../../utils/useOccupancy';
import { occupancyPresentation } from '../../utils/occupancy';

function QuickCard({ title, detail, icon, onPress }) {
  return <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.homeQuickCard, pressed && { opacity: .78 }]}>
    <View style={styles.homeQuickIcon}><Image source={icon} style={styles.quickIconImage} /></View>
    <Text style={styles.homeQuickTitle}>{title}</Text>
    <Text style={styles.homeQuickDetail}>{detail}</Text>
    <Text style={styles.homeQuickArrow}>›</Text>
  </Pressable>;
}

export default function HomeScreen({ go }) {
  const { user, accessToken } = useAuth();
  const d = useDevices();
  const { branchId, branches } = d;
  const [apiOnline, setApiOnline] = useState(null);
  const branch = useMemo(() => branches.find((item) => item.id === branchId), [branches, branchId]);
  const telemetry = useTemperature(accessToken, branchId);
  const occupancy = useOccupancy(accessToken, branchId);
  const occupancyReading = occupancyPresentation(occupancy);
  const [resetOpen, setResetOpen] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [resetMessage, setResetMessage] = useState('');
  const [resetError, setResetError] = useState('');

  const openReset = () => { setResetMessage(''); setResetError(''); setResetOpen(true); };
  const closeReset = () => { if (!resetting) setResetOpen(false); };
  const resetOccupancy = async () => {
    setResetting(true); setResetMessage(''); setResetError('');
    try {
      const devices = await d.request('listDevices');
      const node = devices.find((item) => item.type === 'occupancy');
      if (!node) throw new Error('No hay un nodo de aforo registrado en esta sucursal.');
      await apiRequest(`/branches/${encodeURIComponent(branchId)}/occupancy/adjustments`, {
        method: 'POST', accessToken, timeout: 30000,
        body: { node_id: node.id, value: 0, reason: 'Reset rápido desde inicio' },
      });
      setResetMessage('Aforo restablecido a 0.');
      occupancy.refresh();
    } catch (error) {
      setResetError(error?.message || 'No se pudo resetear el aforo.');
    } finally { setResetting(false); }
  };

  useEffect(() => {
    let active = true;
    apiRequest('/health').then(() => { if (active) setApiOnline(true); }).catch(() => { if (active) setApiOnline(false); });
    return () => { active = false; };
  }, []);

  return <View style={styles.appPage}>
    <ScrollView contentContainerStyle={styles.homeContent}>
      <View style={styles.homeHeader}>
        <View style={{ flex: 1, paddingRight: 10 }}><Text style={styles.homeBrand}>SelfIQ</Text><Text style={styles.homeBranchCaption}>{branch?.name || 'Selecciona una sucursal'}</Text></View>
        <BranchSwitcher />
      </View>

      <View style={styles.hello}><Text style={styles.helloText}>Hola, {user?.first_name || 'usuario'}</Text><Text style={styles.helloSub}>Esto es lo más importante de tu tienda ahora.</Text></View>

      <Text style={styles.homeSectionLabel}>Resumen de la sucursal</Text>
      <View style={styles.current}>
        <View style={styles.homeMetricIcon}><Image source={frameIcons.occupancy || navIcons.panel} style={styles.peopleImage} /></View>
        <View style={styles.currentInfo}><Text style={styles.currentTitle}>Aforo actual</Text>
          {canManage(user) ? <Pressable accessibilityRole="button" accessibilityLabel="Resetear aforo" onPress={openReset}><Text style={styles.currentNumber}>{occupancyReading.label}</Text></Pressable>
            : <Text style={styles.currentNumber}>{occupancyReading.label}</Text>}
          <Text style={styles.quickDetail}>{occupancyReading.status}</Text>
          {canManage(user) ? <Pressable accessibilityRole="button" accessibilityLabel="Resetear aforo" onPress={openReset} style={({ pressed }) => [{ marginTop: 6, alignSelf: 'flex-start' }, pressed && { opacity: .6 }]}>
            <Text style={{ color: C.dangerText, fontSize: 11.5, fontWeight: '800' }}>Resetear aforo</Text>
          </Pressable> : null}
        </View>
        <TemperatureIndicator telemetry={telemetry} />
      </View>

      <View style={styles.cardsRow}>
        {[
          ['Estantes', frameIcons.shelves, 'Sin alertas'],
          ['Inventario', frameIcons.inventory, 'Sin lecturas'],
          ['Sistema', navIcons.settings, apiOnline === null ? 'Revisando…' : apiOnline && branch?.is_online ? 'Operativo' : 'Revisar'],
        ].map(([label, icon, value]) => <View key={label} style={styles.statusCard}><Image source={icon} style={styles.cardIcon} /><Text style={styles.statusTitle}>{label}</Text><Text style={styles.statusValue}>{value}</Text></View>)}
      </View>

      <Text style={styles.homeSectionLabel}>Acciones rápidas</Text>
      <View style={styles.homeQuickGrid}>
        {canManage(user) ? <QuickCard title="Dispositivos" detail="Consulta, agrega y configura equipos." icon={navIcons.settings} onPress={() => go('devices')} /> : null}
        <QuickCard title="Alertas" detail="Revisa eventos que necesitan atención." icon={navIcons.alerts} onPress={() => go('alerts')} />
        <QuickCard title="Panel" detail="Personal, accesos y administración." icon={navIcons.panel} onPress={() => go('panel')} />
        <QuickCard title="Mi cuenta" detail="Perfil, seguridad y preferencias." icon={navIcons.settings} onPress={() => go('settings')} />
      </View>
    </ScrollView>

    <Modal visible={resetOpen} transparent animationType="fade" onRequestClose={closeReset}>
      <View style={{ flex: 1, justifyContent: 'center', padding: 22, backgroundColor: 'rgba(0,29,57,.45)' }}>
        <View style={{ backgroundColor: C.white, borderRadius: 24, padding: 22 }}>
          <Text style={{ color: C.navy, fontSize: 22, fontWeight: '800' }}>Resetear aforo</Text>
          <Text style={{ color: C.text, fontSize: 14, lineHeight: 21, marginTop: 10 }}>
            El contador actual se pondrá en 0. Las entradas y salidas ya registradas no se borran.
          </Text>
          {resetError ? <Text accessibilityRole="alert" style={{ color: C.danger, fontSize: 13, lineHeight: 19, marginTop: 12 }}>{resetError}</Text> : null}
          {resetMessage ? <Text accessibilityLiveRegion="polite" style={{ color: '#18794E', fontSize: 13, lineHeight: 19, marginTop: 12 }}>{resetMessage}</Text> : null}
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 8, marginTop: 18 }}>
            {resetMessage ? <Pressable accessibilityRole="button" onPress={closeReset} style={{ padding: 10 }}>
                <Text style={{ color: C.navy, fontWeight: '800' }}>Cerrar</Text>
              </Pressable>
              : <>
                <Pressable accessibilityRole="button" disabled={resetting} onPress={closeReset} style={{ padding: 10, opacity: resetting ? .5 : 1 }}>
                  <Text style={{ color: C.text, fontWeight: '700' }}>Cancelar</Text>
                </Pressable>
                <Pressable accessibilityRole="button" disabled={resetting} onPress={resetOccupancy} style={{ padding: 10, opacity: resetting ? .5 : 1 }}>
                  <Text style={{ color: C.danger, fontWeight: '800' }}>{resetting ? 'Reseteando…' : 'Resetear aforo'}</Text>
                </Pressable>
              </>}
          </View>
        </View>
      </View>
    </Modal>

    <Nav active="home" go={go} />
  </View>;
}
