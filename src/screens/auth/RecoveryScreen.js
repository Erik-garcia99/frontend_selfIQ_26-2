import { Text } from 'react-native';
import { Page, Card, Button } from '../../components/ui';
import { styles } from '../../theme/styles';
export default function RecoveryScreen({ go }) {
  return <Page auth title="Recupera tu acceso" go={go} back="login"><Card>
    <Text style={[styles.authDescription, { marginBottom: 24 }]}>Contacta al administrador de tu sucursal para recuperar el acceso. El envío de enlaces de recuperación todavía no está disponible.</Text>
    <Button onPress={() => go('login')}>Volver a iniciar sesión</Button>
  </Card></Page>;
}
