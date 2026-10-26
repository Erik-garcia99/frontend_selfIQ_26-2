import { useEffect, useState } from 'react';
import { Image, ScrollView, Text, View } from 'react-native';
import { Nav, Action } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { apiRequest } from '../../services/http';
import { styles } from '../../theme/styles';
import { navIcons, frameIcons } from '../../theme/assets';
import { canCreateBranch, canManage } from '../../utils/validation';
export default function HomeScreen({ go }) {
  const { user } = useAuth(); const [online, setOnline] = useState(null);
  useEffect(() => { let active = true; apiRequest('/health').then(() => { if (active) setOnline(true); }).catch(() => { if (active) setOnline(false); }); return () => { active = false; }; }, []);
  return <View style={styles.appPage}><ScrollView contentContainerStyle={styles.homeContent}>
    <View style={styles.homeTop}><View><Text style={styles.brand}>SelfIQ</Text><Text style={styles.branch}>{user?.branch_id ? 'Tu sucursal' : 'Administración de empresa'}</Text></View>
      <View style={styles.online}><Text style={styles.onlineText}>{online === null ? 'Conectando…' : online ? 'API disponible' : 'Sin conexión'}</Text></View></View>
    <View style={styles.hello}><Text style={styles.helloText}>Hola, {user?.first_name || 'usuario'}</Text></View>
    <View style={styles.current}><Image source={navIcons.settings} style={styles.peopleImage} /><View style={[styles.currentInfo, { paddingLeft: 15 }]}><Text style={styles.currentTitle}>Aforo actual</Text><Text style={styles.currentNumber}>—</Text><Text style={styles.quickDetail}>Pendiente de lecturas</Text></View><View style={styles.temp}><Text style={styles.tempTitle}>Temperatura</Text><Text style={styles.tempValue}>— °C</Text></View></View>
    <View style={styles.cardsRow}>{[['Estantes', frameIcons.shelves], ['Inventario', frameIcons.inventory], ['Alertas', navIcons.alerts]].map(([label, icon]) => <View key={label} style={styles.statusCard}><Image source={icon} style={styles.cardIcon} /><Text style={styles.statusTitle}>{label}</Text><Text style={styles.statusValue}>Sin lecturas</Text></View>)}</View>
    <Text style={styles.homeSection}>Acciones rápidas</Text>
    {canCreateBranch(user) && <Action title="Crear sucursal" detail="Usar el token global de empresa" onPress={() => go('branch')} />}
    {canManage(user) && <><Action title="Agregar nodo" detail="Activar AP y TCP de tu Raspberry" onPress={() => go('gateway')} /><Action title="Personal y tokens" detail="Administrar accesos" onPress={() => go('panel')} /></>}
    <Action title="Mi cuenta" detail="Consultar datos y sesión" onPress={() => go('settings')} />
  </ScrollView><Nav active="home" go={go} /></View>;
}
