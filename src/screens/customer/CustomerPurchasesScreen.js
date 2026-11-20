import { View } from 'react-native';
import { ClientScreen, Head, Info } from '../../components/layout';

export default function CustomerPurchasesScreen({ go }) {
  return (
    <ClientScreen go={go} active="purchases">
      <Head big title="Mis compras" subtitle="Historial de compras registradas" />
      <View style={{ marginTop: 16 }}>
        <Info
          title="Historial de compras"
          text="Tus compras realizadas en caja aparecerán en esta sección."
        />
      </View>
    </ClientScreen>
  );
}
