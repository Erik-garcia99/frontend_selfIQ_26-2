import { Text, View } from 'react-native';
import { ClientScreen, Head, Identity, SectionLabel, NavRow } from '../../components/layout';
import { useAuth } from '../../context/AuthContext';
import { APP_NAME, APP_VERSION } from '../../config/appInfo';
import { layoutStyles as L } from '../../theme/layout';

export default function CustomerProfileScreen({ go }) {
  const { user, signOut } = useAuth();
  const name = [user?.first_name, user?.last_name].filter(Boolean).join(' ') || user?.email || 'Mi cuenta';

  return (
    <ClientScreen go={go} active="profile">
      <Head big title="Perfil" subtitle="Datos de tu cuenta de cliente" />
      <Identity name={name} detail={`Cliente · ${user?.email || ''}`} />

      <SectionLabel>Mi cuenta</SectionLabel>
      <NavRow label="Teléfono" detail={user?.phone_number || 'No registrado'} />
      <NavRow label="Correo electrónico" detail={user?.email || ''} />

      <SectionLabel>Ayuda y soporte</SectionLabel>
      <NavRow label="Preguntas frecuentes" detail="Cómo usar la app y guiarte" />

      <View style={{ height: 28 }} />
      <NavRow label="Cerrar sesión" danger onPress={signOut} />
      <Text style={[L.note, { marginTop: 12 }]}>{APP_NAME} · v{APP_VERSION}</Text>
    </ClientScreen>
  );
}
