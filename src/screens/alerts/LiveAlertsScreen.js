import { useEffect, useRef, useState } from 'react';
import { TextInput } from 'react-native';
import { Head, Screen } from '../../components/layout';
import { useAuth } from '../../context/AuthContext';
import { useDevices } from '../../context/DeviceContext';
import { acknowledgeAlert, listAlertLocations, listAlerts } from '../../services/alertsService';
import { Action, Card, Copy, Pair, Tabs, styles as S } from './AlertsUI';
import { pollAlerts } from './alertsPolling';
import { canManage } from '../../utils/validation';

export const typeLabels = {
  stock_low: 'Repisa baja', stock_empty: 'Repisa agotada', discrepancy: 'Discrepancia',
  environment: 'Ambiente', battery_low: 'Batería baja',
  node_offline: 'Sin heartbeat', gateway_offline: 'Gateway',
};
const statuses = { open: 'Abierta', acknowledged: 'Reconocida', resolved: 'Recuperada' };
const severities = { info: 'Informativa', warning: 'Advertencia', critical: 'Crítica' };

export default function LiveAlertsScreen({ go }) {
  const { branchId } = useDevices();
  const { accessToken, user } = useAuth();
  // Identidad de sesión y sucursal: nunca reutilizar filas de otra selección.
  return <ConnectedAlerts key={`${user?.id || ''}:${branchId}:${accessToken || ''}`}
    branchId={branchId} accessToken={accessToken} go={go} canEditLocations={canManage(user)} />;
}

function ConnectedAlerts({ branchId, accessToken, go, canEditLocations }) {
  const [filters, setFilters] = useState({ status: 'active', alert_type: '', offset: 0 });
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [locationsVisible, setLocationsVisible] = useState(false);
  const generation = useRef(0);
  const alive = useRef(true);
  const mutation = useRef(false);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  useEffect(() => {
    const own = ++generation.current;
    if (!branchId || !accessToken) return;
    return pollAlerts({
      load: async () => {
        const [alerts, locations] = await Promise.all([
          listAlerts(accessToken, branchId, filters), listAlertLocations(accessToken, branchId),
        ]);
        return { ...alerts, locations };
      },
      onData: data => {
        if (own === generation.current) { setResult(data); setError(''); }
      },
      onError: failure => {
        if (own === generation.current) {
          setResult(null); setError(failure.message);
        }
      },
      onBusy: value => { if (own === generation.current) setBusy(value); },
    });
  }, [accessToken, branchId, filters, attempt]);

  function change(value) {
    ++generation.current;
    setResult(null);
    setError('');
    setFilters(previous => ({ ...previous, ...value, offset: value.offset ?? 0 }));
  }
  async function acknowledge(id) {
    if (mutation.current) return;
    mutation.current = true;
    const own = generation.current;
    setBusy(true);
    try {
      await acknowledgeAlert(accessToken, branchId, id);
      if (alive.current && own === generation.current) setAttempt(value => value + 1);
    } catch (failure) {
      if (alive.current && own === generation.current) setError(failure.message);
    } finally {
      mutation.current = false;
      if (alive.current && own === generation.current) setBusy(false);
    }
  }
  return <LiveAlertsView go={go} branchId={branchId} filters={filters} result={result}
    error={error} busy={busy} onChange={change} onAcknowledge={acknowledge}
    locationsVisible={locationsVisible} onLocations={() => setLocationsVisible(value => !value)}
    canEditLocations={canEditLocations}
    onRefresh={() => setAttempt(value => value + 1)} />;
}

export function LiveAlertsView({ go, branchId, filters, result, error, busy,
  onChange, onRefresh, onAcknowledge, locationsVisible, onLocations, canEditLocations }) {
  return <Screen go={go} active="alerts">
    <Head title="Alertas" subtitle="Monitoreo y eventos Must · Personal" />
    {!branchId ? <Card title="Selecciona una sucursal"><Copy muted>Elige la sucursal desde Panel antes de consultar sus alertas.</Copy></Card> : <>
      <Tabs items={[
        { label: 'Activas', active: filters.status === 'active', onPress: () => onChange({ status: 'active' }) },
        { label: 'Historial', active: filters.status === 'all', onPress: () => onChange({ status: 'all' }) },
        { label: 'Recuperadas', active: filters.status === 'resolved', onPress: () => onChange({ status: 'resolved' }) },
      ]} />
      <Tabs items={[['', 'Todas'], ...Object.entries(typeLabels)].map(([value, label]) => ({
        label, active: filters.alert_type === value, onPress: () => onChange({ alert_type: value }),
      }))} />
      <Card title="Filtros de eventos">
        <Copy muted>Fechas ISO con zona horaria; nodo y producto por UUID. No se filtran ejemplos locales.</Copy>
        {[['since', 'Desde (ISO)'], ['until', 'Hasta (ISO)'], ['node_id', 'Nodo (UUID)'],
          ['product_id', 'Producto (UUID)']].map(([name, label]) =>
          <TextInput key={name} accessibilityLabel={label} placeholder={label} style={S.input}
            autoCapitalize="none" value={filters[name] || ''}
            onChangeText={value => onChange({ [name]: value })} />)}
        <Tabs items={[['', 'Cualquier severidad'], ['warning', 'Advertencia'], ['critical', 'Crítica'], ['info', 'Informativa']]
          .map(([severity, label]) => ({ label, active: (filters.severity || '') === severity,
            onPress: () => onChange({ severity }) }))} />
      </Card>
      {error ? <Card title="No se pudieron actualizar las alertas" tone="warning"><Copy>{error}</Copy></Card> : null}
      {!result && !error ? <Card title="Cargando alertas…"><Copy muted>Consultando el backend; aún no hay un resultado.</Copy></Card> : null}
      {result ? <>
        <Card title="Cobertura de fuentes" tone="warning">
          <Copy>Solo la pérdida de heartbeat tiene productor implementado en esta entrega. No identifica por sí sola la causa de la desconexión.</Copy>
          <Copy muted>{result.monitor?.error ? 'El monitor falló; los estados pueden estar desactualizados.' :
            result.monitor?.last_success_at ? `Última evaluación: ${result.monitor.last_success_at}` :
              'El monitor aún no confirmó ninguna evaluación.'}</Copy>
          <Copy muted>Repisa, discrepancia, ambiente, batería y gateway: generación de alertas pendiente. Una bandeja vacía no significa que estén normales.</Copy>
        </Card>
        <Action secondary onPress={onLocations}>{locationsVisible ? 'Ocultar ubicaciones' : 'Ver lista de estantes y luces'}</Action>
        {locationsVisible ? <>
          {(result.locations || []).map(shelf => <Card key={shelf.id} title={shelf.name}>
            <Copy muted>{shelf.location || 'Sin ubicación textual'}</Copy>
            {!shelf.lights.length ? <Copy muted>Sin nodo guía y luz confirmados.</Copy> :
              shelf.lights.map(light => <Pair key={`${light.node_id}:${light.channel}`}
                label={light.node_name} value={light.name || `Luz ${light.channel + 1}`} />)}
          </Card>)}
          {!result.locations?.length ? <Card title="Sin estantes configurados" /> : null}
          {canEditLocations ? <Action secondary onPress={() => go?.('registered-devices')}>Administrar asociaciones en Dispositivos</Action> : null}
        </> : null}
        {!result.items.length ? <Card title="Sin alertas registradas para este filtro">
          <Copy muted>No se han recibido eventos coincidentes. No equivale a una validación de hardware ni de todas las fuentes.</Copy>
        </Card> : result.items.map(alert => <Card key={alert.id} title={typeLabels[alert.alert_type] || alert.alert_type}
          eyebrow={`${severities[alert.severity] || alert.severity} · ${statuses[alert.status] || alert.status}`}
          tone={alert.severity === 'critical' ? 'danger' : 'warning'}>
          <Copy>{alert.message || 'Sin descripción'}</Copy>
          <Pair label="Detectada" value={alert.triggered_at} />
          {alert.resolved_at ? <Pair label="Recuperada" value={alert.resolved_at} /> : null}
          {alert.node_id ? <Pair label="Nodo" value={alert.metadata?.node_name || alert.node_id} /> : null}
          {alert.metadata?.product_name ? <Pair label="Producto" value={alert.metadata.product_name} /> : null}
          {alert.metadata?.shelf_name ? <Pair label="Estante" value={alert.metadata.shelf_name} /> : null}
          {alert.metadata?.occupancy_pct != null ? <Pair label="Ocupación visual" value={`${alert.metadata.occupancy_pct} %`} /> : null}
          {alert.status === 'open' ? <Action disabled={busy} onPress={() => onAcknowledge(alert.id)}>Reconocer alerta</Action> : null}
          <Copy muted>Reconocer no resuelve la condición ni modifica inventario.</Copy>
        </Card>)}
        <Action secondary disabled={busy || !filters.offset} onPress={() => onChange({ offset: Math.max(0, filters.offset - 50) })}>Página anterior</Action>
        <Action secondary disabled={busy || !result.has_more} onPress={() => onChange({ offset: filters.offset + 50 })}>Página siguiente</Action>
      </> : null}
      <Action disabled={busy} onPress={onRefresh}>Actualizar</Action>
    </>}
  </Screen>;
}
