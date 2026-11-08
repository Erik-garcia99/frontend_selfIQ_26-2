import { Image, Pressable, ScrollView, Text, View } from 'react-native';
import { Nav } from '../components/ui';
import BranchSwitcher from '../components/BranchSwitcher';
import { useAuth } from '../context/AuthContext';
import { canManage, canCreateBranch } from '../utils/validation';
import { navIcons, frameIcons } from '../theme/assets';
import { styles } from '../theme/styles';

function PanelTile({ title, detail, icon, onPress }) {
  return <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.panelTile, pressed && { opacity: .78 }]}>
    <View style={styles.panelTileIcon}><Image source={icon} style={styles.quickIconImage} /></View>
    <Text style={styles.panelTileTitle}>{title}</Text>
    <Text style={styles.panelTileDetail}>{detail}</Text>
    <Text style={styles.panelTileArrow}>›</Text>
  </Pressable>;
}

export default function PanelScreen({ go }) {
  const { user } = useAuth();
  return <View style={styles.appPage}>
    <ScrollView contentContainerStyle={styles.panelContent}>
      <View style={styles.homeHeader}>
        <View style={{ flex: 1, paddingRight: 10 }}><Text style={styles.homeBrand}>Panel</Text><Text style={styles.homeBranchCaption}>Administración de la tienda</Text></View>
        <BranchSwitcher />
      </View>

      <View style={styles.panelHero}><Text style={styles.panelHeroTitle}>Gestiona tu sucursal</Text><Text style={styles.panelHeroText}>Accede a las herramientas de operación sin mezclar configuración, personal y dispositivos en una sola lista.</Text></View>

      {canManage(user) ? <>
        <Text style={styles.homeSectionLabel}>Operación</Text>
        <View style={styles.panelGrid}>
          <PanelTile title="Dispositivos" detail="Equipos, búsqueda y configuración." icon={navIcons.settings} onPress={() => go('devices')} />
          <PanelTile title="Productos" detail="Catálogo usado por estantes y cámaras." icon={frameIcons.inventory} onPress={() => go('products')} />
        </View>

        <Text style={styles.homeSectionLabel}>Personal y acceso</Text>
        <View style={styles.panelGrid}>
          <PanelTile title="Aprobar usuarios" detail="Revisa cuentas pendientes." icon={navIcons.panel} onPress={() => go('approve')} />
          <PanelTile title="Tokens" detail="Administra accesos de registro." icon={navIcons.settings} onPress={() => go('tokens')} />
          {canCreateBranch(user) ? <PanelTile title="Nueva sucursal" detail="Agrega otra tienda a la empresa." icon={frameIcons.shelves} onPress={() => go('branch')} /> : null}
        </View>
      </> : <View style={styles.panelEmpty}><Text style={styles.panelEmptyTitle}>Sin herramientas administrativas</Text><Text style={styles.panelEmptyText}>Tu cuenta puede consultar la operación disponible, pero no administrar personal o dispositivos.</Text></View>}
    </ScrollView>
    <Nav active="panel" go={go} />
  </View>;
}
