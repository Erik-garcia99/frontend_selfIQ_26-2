import { View } from 'react-native';
import { ClientScreen, Head, Info } from '../../components/layout';

export default function CustomerSearchScreen({ go }) {
  return (
    <ClientScreen go={go} active="search">
      <Head big title="Buscar" subtitle="Encuentra productos en la tienda" />
      <View style={{ marginTop: 16 }}>
        <Info
          title="Búsqueda de productos"
          text="El catálogo de productos por sucursal se activará próximamente."
        />
      </View>
    </ClientScreen>
  );
}
