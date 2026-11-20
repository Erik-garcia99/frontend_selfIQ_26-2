import { Text, View } from 'react-native';
import { ClientScreen, Head, Info } from '../../components/layout';
import { useAuth } from '../../context/AuthContext';
import { layoutStyles as L } from '../../theme/layout';

export default function CustomerHomeScreen({ go }) {
  const { user } = useAuth();
  const firstName = user?.first_name || 'Cliente';

  return (
    <ClientScreen go={go} active="home">
      <Head big title={`Hola, ${firstName}`} subtitle="Bienvenido a SelfIQ" />
      <View style={{ marginTop: 16 }}>
        <Info
          title="Aforo de la sucursal"
          text="Selecciona una tienda para consultar el aforo y la disponibilidad en tiempo real."
        />
      </View>
      <View style={{ marginTop: 8 }}>
        <Info
          title="Catálogo y productos"
          text="Usa la sección Buscar para explorar productos o solicitar la guía luminosa LED."
        />
      </View>
    </ClientScreen>
  );
}
