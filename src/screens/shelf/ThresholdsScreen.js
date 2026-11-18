import { useCallback, useEffect, useState } from 'react';
import { Head, Info, Primary, Screen, TextField } from '../../components/layout';
import { useAuth } from '../../context/AuthContext';
import { useDevices } from '../../context/DeviceContext';
import { listRoiConfigs, saveRoiConfig } from '../../services/physicalConfigService';
import { getShelfStates } from '../../services/roiStateService';
import { canManage } from '../../utils/validation';
import { validateThresholds } from '../../utils/thresholdValidation';

function draftsFrom(items) {
  const result = {};
  for (const item of items) {
    const c = item.config;
    result[item.roi_id] = {
      empty: String(c.threshold_empty_pct),
      low: String(c.threshold_low_pct),
      medium: String(c.threshold_medium_pct),
      samples: String(c.confirm_samples),
    };
  }
  return result;
}

export default function ThresholdsScreen({ go }) {
  const { user, accessToken } = useAuth();
  const { branchId } = useDevices();
  const editable = canManage(user);
  const [items, setItems] = useState([]);
  const [drafts, setDrafts] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!branchId || !accessToken) return;
    setLoading(true);
    setError('');
    try {
      const states = await getShelfStates(accessToken, branchId);
      const products = [...new Set(states.map(s => s.product_id).filter(Boolean))];
      const configs = (await Promise.all(products.map(id => listRoiConfigs(accessToken, branchId, id)))).flat();
      const byRoi = new Map(configs.map(c => [c.id, c]));
      const found = states.filter(s => byRoi.has(s.roi_id)).map(s => ({
        ...s, config: byRoi.get(s.roi_id).config,
      }));
      setItems(found);
      setDrafts(draftsFrom(found));
    } catch (failure) {
      setError(failure.message || 'No se pudieron cargar los umbrales.');
    } finally {
      setLoading(false);
    }
  }, [branchId, accessToken]);

  useEffect(() => {
    let alive = true;
    queueMicrotask(() => { if (alive) void load(); });
    return () => { alive = false; };
  }, [load]);

  const change = (roiId, field, text) => setDrafts(previous => ({
    ...previous, [roiId]: { ...(previous[roiId] || {}), [field]: text },
  }));

  const save = async (item) => {
    if (!editable) return;
    setMessage('');
    const result = validateThresholds(drafts[item.roi_id] || {});
    if (result.error) { setError(result.error); return; }
    setSaving(true);
    try {
      await saveRoiConfig(accessToken, branchId, item.roi_id, {
        base_version: Number(item.config.version),
        expected_product_id: item.product_id,
        visual_capacity_units: item.config.visual_capacity_units ?? null,
        threshold_empty_pct: result.values.empty,
        threshold_low_pct: result.values.low,
        threshold_medium_pct: result.values.medium,
        confirm_samples: result.values.samples,
        virtual_slots_enabled: Boolean(item.config.virtual_slots_enabled),
        slots_rows: item.config.slots_rows ?? null,
        slots_cols: item.config.slots_cols ?? null,
      });
      setMessage('Guardado en el sistema. Esto todavía no se aplica a la cámara.');
      await load();
    } catch (failure) {
      if (failure.status === 409) {
        setError('Otra persona modificó la configuración. Recarga antes de guardar.');
        await load();
      } else {
        setError(failure.message || 'No se pudo guardar la configuración.');
      }
    } finally {
      setSaving(false);
    }
  };

  return <Screen go={go} active="home">
    <Head title="Umbrales de ocupación" subtitle="Define cuándo una zona es media, baja o agotada." big />
    {!editable ? <Info title="Sin permisos">Tu rol puede consultar estados, pero no ajustar umbrales.</Info> : null}
    {message ? <Info title="Resultado">{message}</Info> : null}
    {error ? <Info title="Revisa esto">{error}</Info> : null}
    {loading ? <Info title="Cargando">Consultando la configuración guardada…</Info> : null}
    {items.map(item => {
      const draft = drafts[item.roi_id] || {};
      return <Info key={item.roi_id} title={`${item.roi_name || 'Zona'} · ${item.sku || 'sin SKU'}`}>
        <TextField label="Agotado hasta (%)" value={draft.empty} editable={editable}
          keyboardType="decimal-pad" onChangeText={text => change(item.roi_id, 'empty', text)} />
        <TextField label="Bajo hasta (%)" value={draft.low} editable={editable}
          keyboardType="decimal-pad" onChangeText={text => change(item.roi_id, 'low', text)} />
        <TextField label="Medio hasta (%)" value={draft.medium} editable={editable}
          keyboardType="decimal-pad" onChangeText={text => change(item.roi_id, 'medium', text)} />
        <TextField label="Muestras para confirmar" value={draft.samples} editable={editable}
          keyboardType="numeric" onChangeText={text => change(item.roi_id, 'samples', text)} />
        <Primary onPress={() => save(item)} loading={saving} disabled={!editable}>Guardar en el sistema</Primary>
      </Info>;
    })}
    {!loading && items.length === 0 ? <Info title="Sin zonas">Configura una zona y su producto antes de ajustar umbrales.</Info> : null}
  </Screen>;
}
