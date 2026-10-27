import { Info, Primary, Screen, Head } from '../../components/layout';
import { useAuth } from '../../context/AuthContext';

export default function LogoutScreen({ go }) {
  const { signOut } = useAuth();
  return <Screen>
    <Head title="Cerrar sesión" back="Ajustes" onBack={() => go('settings')} subtitle="Administra el acceso desde este dispositivo." />
    <Info title="¿Quieres cerrar sesión?">Para volver a entrar a SelfIQ tendrás que iniciar sesión de nuevo. Tus datos y los de tu sucursal se conservarán.</Info>
    <Primary onPress={signOut}>Sí, cerrar sesión</Primary>
    <Primary variant="light" onPress={() => go('settings')}>Cancelar</Primary>
  </Screen>;
}
