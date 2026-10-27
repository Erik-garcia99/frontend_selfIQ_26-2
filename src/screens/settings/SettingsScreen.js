import { Text, View } from 'react-native';
import { Screen, Head, Identity, SectionLabel, NavRow } from '../../components/layout';
import { useAuth } from '../../context/AuthContext';
import { canManage, roleLabel } from '../../utils/validation';
import { APP_NAME, APP_VERSION } from '../../config/appInfo';
import { layoutStyles as L } from '../../theme/layout';

export default function SettingsScreen({ go }) {
  const { user } = useAuth();
  const name = [user?.first_name, user?.last_name].filter(Boolean).join(' ') || user?.email || 'Mi cuenta';
  return <Screen go={go} active="settings">
    <Head big title="Ajustes" subtitle="Preferencias de tu cuenta" />
    <Identity name={name} detail={`${roleLabel(user)}${user?.email ? ` · ${user.email}` : ''}`} />
    <SectionLabel>Cuenta y aplicación</SectionLabel>
    <NavRow label="Datos personales" onPress={() => go('settings-profile')} />
    <NavRow label="Notificaciones" onPress={() => go('settings-notifications')} />
    <NavRow label="Seguridad y contraseña" onPress={() => go('settings-security')} />
    {canManage(user) ? <>
      <SectionLabel>Administración</SectionLabel>
      <NavRow label="Tokens de acceso" detail="Generar o reemplazar tokens" onPress={() => go('tokens')} />
      <NavRow label="Personal y permisos" onPress={() => go('panel')} />
    </> : null}
    <View style={{ height: 28 }} />
    <NavRow label="Cerrar sesión" danger onPress={() => go('settings-logout')} />
    <Text style={[L.note, { marginTop: 12 }]}>{APP_NAME} · v{APP_VERSION}</Text>
  </Screen>;
}
