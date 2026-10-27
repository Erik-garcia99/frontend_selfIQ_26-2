import { Text, View } from 'react-native';
import { AuthScreen, Head, Primary } from '../../components/layout';
import { layoutStyles as L } from '../../theme/layout';

// Funcionamiento original conservado: no hay envío de correo porque el backend
// no tiene endpoint de recuperación. Solo cambió la presentación (frame 02).
export default function RecoveryScreen({ go }) {
  return <AuthScreen>
    <View>
      <View style={L.authHead}>
        <Head title="Recupera tu acceso" subtitle="Contacta al administrador de tu sucursal para recuperar el acceso." />
      </View>
      <View style={L.authCard}>
        <Text style={[L.cardText, { fontSize: 14, lineHeight: 21, marginBottom: 22 }]}>El envío de enlaces de recuperación todavía no está disponible. Tu administrador puede restablecer tu contraseña desde el panel de administración.</Text>
        <Primary tall onPress={() => go('login')}>Volver a iniciar sesión</Primary>
      </View>
    </View>
  </AuthScreen>;
}
