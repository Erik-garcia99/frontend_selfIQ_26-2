import { useEffect, useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, Text, View } from 'react-native';
import { Nav } from '../../components/ui';
import BranchSwitcher from '../../components/BranchSwitcher';
import { useAuth } from '../../context/AuthContext';
import { useDevices } from '../../context/DeviceContext';
import { apiRequest } from '../../services/http';
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
  const { branchId, branches } = useDevices();
  const [apiOnline, setApiOnline] = useState(null);
  const branch = useMemo(() => branches.find((item) => item.id === branchId), [branches, branchId]);
  const telemetry = useTemperature(accessToken, branchId);
  const occupancy = useOccupancy(accessToken, branchId);
  const occupancyReading = occupancyPresentation(occupancy);

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
        <View style={styles.currentInfo}><Text style={styles.currentTitle}>Aforo actual</Text><Text style={styles.currentNumber}>{occupancyReading.label}</Text><Text style={styles.quickDetail}>{occupancyReading.status}</Text></View>
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
    <Nav active="home" go={go} />
  </View>;
}
