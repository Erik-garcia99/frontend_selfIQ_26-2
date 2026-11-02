import { Text } from 'react-native';
import { Page, Card, Action } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { canManage, canCreateBranch } from '../utils/validation';
export default function PanelScreen({ go }) {
  const { user } = useAuth();
  return <Page title="Panel de personal" go={go} active="panel">
    {canManage(user) ? <><Action title="Aprobar usuario" detail="Activar una cuenta pendiente" onPress={() => go('approve')} />
      <Action title="Tokens de acceso" detail="Generar o reemplazar tokens" onPress={() => go('tokens')} />
      <Action title="Dispositivos" detail="Consultar gateways, administrar nodos y agregar equipos" onPress={() => go('devices')} />
      {canCreateBranch(user) && <Action title="Crear sucursal" onPress={() => go('branch')} />}</> : <Card><Text>Tu cuenta no tiene permisos para administrar personal.</Text></Card>}
  </Page>;
}
