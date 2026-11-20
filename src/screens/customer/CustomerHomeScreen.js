import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { ClientScreen, Head, Info, NavRow, Primary, SectionLabel } from '../../components/layout';
import { useAuth } from '../../context/AuthContext';
import { getCustomerBranches, getCustomerHome } from '../../services/customerService';
import { colors as C } from '../../theme/colors';
import { layoutStyles as L } from '../../theme/layout';

const AFORO_CONFIG = {
  available: {
    title: 'Aforo disponible',
    badge: 'Disponible',
    color: '#1B873F',
    bg: '#EAF8EE',
    desc: 'Puedes ingresar con comodidad. Hay espacio suficiente en la tienda.',
  },
  near: {
    title: 'Cerca del límite',
    badge: 'Afluencia alta',
    color: '#B45309',
    bg: '#FEF3C7',
    desc: 'Afluencia elevada en el local. Podrías encontrar filas o demoras.',
  },
  full: {
    title: 'Aforo lleno',
    badge: 'Lleno',
    color: C.danger,
    bg: '#FDE8E8',
    desc: 'Capacidad máxima alcanzada. Te sugerimos esperar unos minutos antes de ingresar.',
  },
  no_data: {
    title: 'Sin información reciente',
    badge: 'Sin datos',
    color: C.muted,
    bg: '#EEF3F7',
    desc: 'No hay lectura reciente de aforo en este momento.',
  },
};

export default function CustomerHomeScreen({ go }) {
  const { user, accessToken } = useAuth();
  const firstName = user?.first_name || 'Cliente';

  const [branches, setBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState(null);
  const [loadingBranches, setLoadingBranches] = useState(true);
  const [selectingBranch, setSelectingBranch] = useState(false);

  const [aforo, setAforo] = useState(null);
  const [loadingAforo, setLoadingAforo] = useState(false);
  const [error, setError] = useState(null);

  // Cargar sucursales del cliente
  const loadBranches = useCallback(async () => {
    if (!accessToken) return;
    setLoadingBranches(true);
    setError(null);
    try {
      const data = await getCustomerBranches(accessToken, { page: 1, pageSize: 5 });
      const items = data.items || [];
      setBranches(items);
      if (items.length === 1) {
        setSelectedBranch(items[0]);
      } else if (items.length > 1 && !selectedBranch) {
        // Seleccionar la primera por defecto o pedir elegir
        setSelectedBranch(items[0]);
      }
    } catch (err) {
      setError(err.message || 'No se pudieron cargar las sucursales.');
    } finally {
      setLoadingBranches(false);
    }
  }, [accessToken, selectedBranch]);

  // Cargar aforo de la sucursal seleccionada
  const loadAforo = useCallback(async (branchId) => {
    if (!accessToken || !branchId) return;
    setLoadingAforo(true);
    setError(null);
    try {
      const data = await getCustomerHome(accessToken, branchId);
      setAforo(data);
    } catch (err) {
      setError(err.message || 'No se pudo consultar el aforo de la sucursal.');
    } finally {
      setLoadingAforo(false);
    }
  }, [accessToken]);

  useEffect(() => {
    loadBranches();
  }, [loadBranches]);

  useEffect(() => {
    if (selectedBranch?.id) {
      loadAforo(selectedBranch.id);
    }
  }, [selectedBranch, loadAforo]);

  // Determinar nivel de aforo para presentación
  const levelKey = (aforo && aforo.status === 'ok' && aforo.occupancy_level)
    ? aforo.occupancy_level
    : 'no_data';
  const aforoView = AFORO_CONFIG[levelKey] || AFORO_CONFIG.no_data;

  return (
    <ClientScreen go={go} active="home">
      <Head big title={`Hola, ${firstName}`} subtitle="Bienvenido a SelfIQ" />

      {/* Selector / Barra de sucursal */}
      <View style={{ marginTop: 18 }}>
        <SectionLabel>Tu tienda</SectionLabel>
        {loadingBranches ? (
          <View style={[L.cardSoft, styles.centerRow]}>
            <ActivityIndicator size="small" color={C.navy} />
            <Text style={[L.cardText, { marginLeft: 10 }]}>Buscando sucursales…</Text>
          </View>
        ) : branches.length === 0 ? (
          <Info
            title="Sin sucursales disponibles"
            text="No encontramos sucursales activas asociadas a tu cuenta en este momento."
          />
        ) : selectingBranch ? (
          <View style={L.cardSoft}>
            <Text style={[L.cardTitle, { marginBottom: 12 }]}>Selecciona una sucursal</Text>
            {branches.map((b) => (
              <Pressable
                key={b.id}
                onPress={() => {
                  setSelectedBranch(b);
                  setSelectingBranch(false);
                }}
                style={({ pressed }) => [
                  styles.branchOption,
                  selectedBranch?.id === b.id && styles.branchOptionActive,
                  pressed && { opacity: 0.7 },
                ]}
              >
                <Text
                  style={[
                    styles.branchOptionName,
                    selectedBranch?.id === b.id && styles.branchOptionNameActive,
                  ]}
                >
                  {b.name}
                </Text>
                {b.address ? (
                  <Text style={styles.branchOptionAddress}>{b.address}</Text>
                ) : null}
              </Pressable>
            ))}
            <Primary variant="light" onPress={() => setSelectingBranch(false)}>
              Cerrar lista
            </Primary>
          </View>
        ) : (
          <View style={L.cardSoft}>
            <View style={styles.storeHeaderRow}>
              <View style={{ flex: 1 }}>
                <Text style={L.cardTitle}>{selectedBranch?.name || 'Sucursal'}</Text>
                {selectedBranch?.address ? (
                  <Text style={L.cardText}>{selectedBranch.address}</Text>
                ) : null}
              </View>
              {branches.length > 1 ? (
                <Pressable
                  onPress={() => setSelectingBranch(true)}
                  style={styles.changeStoreButton}
                  accessibilityRole="button"
                  accessibilityLabel="Cambiar de tienda"
                >
                  <Text style={styles.changeStoreText}>Cambiar</Text>
                </Pressable>
              ) : null}
            </View>
          </View>
        )}
      </View>

      {/* Tarjeta de Aforo en tiempo real (F-14, P-03, U-02) */}
      <View style={{ marginTop: 8 }}>
        <SectionLabel>Aforo en el local</SectionLabel>

        {error ? (
          <View style={[L.cardSoft, { borderColor: C.danger, borderWidth: 1 }]}>
            <Text style={[L.cardTitle, { color: C.danger }]}>Aviso</Text>
            <Text style={L.cardText}>{error}</Text>
            <Primary
              variant="light"
              onPress={() => selectedBranch?.id && loadAforo(selectedBranch.id)}
            >
              Reintentar
            </Primary>
          </View>
        ) : loadingAforo ? (
          <View style={[L.cardSoft, styles.centerRow, { paddingVertical: 28 }]}>
            <ActivityIndicator size="small" color={C.navy} />
            <Text style={[L.cardText, { marginLeft: 10 }]}>Actualizando aforo…</Text>
          </View>
        ) : selectedBranch ? (
          <View style={[L.cardSoft, { backgroundColor: aforoView.bg, borderColor: aforoView.color, borderWidth: 1 }]}>
            <View style={styles.aforoHeaderRow}>
              <Text style={[L.cardTitle, { color: aforoView.color, marginBottom: 0 }]}>
                {aforoView.title}
              </Text>
              <View style={[styles.badgePill, { backgroundColor: aforoView.color }]}>
                <Text style={styles.badgeText}>{aforoView.badge}</Text>
              </View>
            </View>

            <Text style={[L.cardText, { marginTop: 8, color: C.ink }]}>
              {aforoView.desc}
            </Text>

            {/* Datos cuantitativos si la lectura es válida */}
            {aforo && aforo.status === 'ok' && aforo.occupancy !== null ? (
              <View style={styles.metricsRow}>
                <View style={styles.metricBlock}>
                  <Text style={styles.metricNumber}>{aforo.occupancy}</Text>
                  <Text style={styles.metricLabel}>
                    {aforo.max_capacity_people
                      ? `Personas estimadas (capacidad: ${aforo.max_capacity_people})`
                      : 'Personas estimadas en tienda'}
                  </Text>
                </View>
              </View>
            ) : null}

            {/* Aviso de antigüedad/calidad */}
            {aforo?.age_seconds !== null && aforo?.age_seconds !== undefined ? (
              <Text style={styles.ageNote}>
                {aforo.status === 'stale'
                  ? `Lectura previa (hace ${aforo.age_seconds} s) · Esperando actualización`
                  : `Actualizado hace ${aforo.age_seconds} s`}
              </Text>
            ) : null}

            <View style={{ marginTop: 14 }}>
              <Pressable
                onPress={() => loadAforo(selectedBranch.id)}
                style={styles.refreshButton}
                accessibilityRole="button"
                accessibilityLabel="Actualizar aforo"
              >
                <Text style={styles.refreshButtonText}>Actualizar aforo</Text>
              </Pressable>
            </View>
          </View>
        ) : null}
      </View>

      {/* Accesos directos para el cliente (U-02) */}
      <View style={{ marginTop: 14 }}>
        <SectionLabel>¿Qué deseas hacer?</SectionLabel>
        <NavRow
          label="Buscar productos"
          detail="Consulta disponibilidad en repisa y precios"
          onPress={() => go('search')}
        />
        <NavRow
          label="Estantes y ubicaciones"
          detail="Ubica los pasillos y repisas de la tienda"
          onPress={() => go('map')}
        />
      </View>
    </ClientScreen>
  );
}

const styles = StyleSheet.create({
  centerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  storeHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  changeStoreButton: {
    backgroundColor: C.white,
    borderColor: C.border,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginLeft: 10,
  },
  changeStoreText: {
    color: C.navy,
    fontSize: 12,
    fontWeight: '600',
  },
  branchOption: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: C.field,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: C.border,
  },
  branchOptionActive: {
    borderColor: C.navy,
    backgroundColor: '#EDF5FA',
  },
  branchOptionName: {
    fontSize: 14,
    fontWeight: '600',
    color: C.ink,
  },
  branchOptionNameActive: {
    color: C.navy,
  },
  branchOptionAddress: {
    fontSize: 12,
    color: C.muted,
    marginTop: 2,
  },
  aforoHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  badgePill: {
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: {
    color: C.white,
    fontSize: 11,
    fontWeight: '700',
  },
  metricsRow: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.06)',
  },
  metricBlock: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  metricNumber: {
    fontSize: 28,
    fontWeight: '700',
    color: C.navy,
  },
  metricLabel: {
    fontSize: 12,
    color: C.muted,
    fontWeight: '500',
  },
  ageNote: {
    fontSize: 11,
    color: C.muted,
    marginTop: 6,
  },
  refreshButton: {
    alignSelf: 'flex-start',
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: C.white,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.border,
  },
  refreshButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: C.navy,
  },
});
