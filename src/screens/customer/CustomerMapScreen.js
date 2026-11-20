import { View } from 'react-native';
import { ClientScreen, Head, Info } from '../../components/layout';

export default function CustomerMapScreen({ go }) {
  return (
    <ClientScreen go={go} active="map">
      <Head big title="Mapa" subtitle="Distribución del local y estantes" />
      <View style={{ marginTop: 16 }}>
        <Info
          title="Mapa del local"
          text="El mapa de distribución y ubicación de repisas estará disponible aquí."
        />
      </View>
    </ClientScreen>
  );
}
