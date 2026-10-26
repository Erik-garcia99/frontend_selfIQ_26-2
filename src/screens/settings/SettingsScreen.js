import { Text, View } from 'react-native';
import { Page, Card, Button, Action, Message } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { useAsyncAction } from '../../utils/useAsyncAction';
import { canManage } from '../../utils/validation';
import { styles } from '../../theme/styles';
export default function SettingsScreen({ go }) {
  const { user, signOut, refreshUser } = useAuth(); const task = useAsyncAction();
  return <Page title="Ajustes" go={go} active="settings" busy={task.loading}><Card>
    <Text style={styles.summaryTitle}>{user?.first_name} {user?.last_name}</Text><Text selectable style={{ marginVertical: 14 }}>{user?.email}</Text>
    <Text>Rol: {user?.role || (user?.is_superuser ? 'sudo' : 'usuario')}</Text><Text style={{ marginTop: 8 }}>Cuenta: {user?.account_status}</Text>
    {user?.organization_id && <Text selectable style={{ marginTop: 12 }}>Empresa: {user.organization_id}</Text>}
    {user?.branch_id && <Text selectable style={{ marginTop: 12 }}>Sucursal: {user.branch_id}</Text>}
  </Card>{canManage(user) && <Action title="Tokens de acceso" onPress={() => go('tokens')} />}
    <Message error={task.error} /><Button loading={task.loading} onPress={() => task.run(refreshUser)}>Actualizar mi cuenta</Button>
    <View style={{ marginTop: 28 }}><Button disabled={task.loading} dark={false} onPress={signOut}>Cerrar sesión</Button></View>
  </Page>;
}
