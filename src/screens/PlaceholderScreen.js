import { Text } from 'react-native';
import { Page, Card } from '../components/ui';
export default function PlaceholderScreen({ go }) {
  return <Page title="Alertas" go={go} active="alerts"><Card><Text>Las alertas aparecerán aquí cuando se conecten los datos del sistema.</Text></Card></Page>;
}
