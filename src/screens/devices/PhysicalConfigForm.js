import { useEffect, useRef, useState } from 'react';
import { FieldCard, Info, Primary, SectionLabel } from '../../components/layout';
import { Action, Card, Copy, Tabs } from '../alerts/AlertsUI';
import { physicalConfigService } from '../../services/physicalConfigService';
import { configDraft, orientations, roiConfigBody, specBody } from '../../utils/physicalConfig';

export default function PhysicalConfigForm({ branchId, accessToken, product, onClose }) {
  return <Workspace key={`${branchId}:${accessToken}:${product.id}`}
    branchId={branchId} accessToken={accessToken} product={product} onClose={onClose} />;
}

function Workspace({ branchId, accessToken, product, onClose }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const active = useRef(true);
  const saving = useRef(false);
  useEffect(() => {
    let current = true;
    active.current = true;
    const service = physicalConfigService(accessToken, branchId);
    Promise.all([service.getSpec(product.id), service.listRois(product.id)])
      .then(([spec, rois]) => {
        if (current) { setData({ spec: spec.spec, rois }); setError(''); }
      }).catch(failure => { if (current) { setData(null); setError(failure.message); } });
    return () => { current = false; active.current = false; };
  }, [accessToken, branchId, product.id, attempt]);

  async function save(kind, id, body) {
    if (saving.current) return;
    saving.current = true;
    setBusy(true); setError(''); setNotice('');
    const service = physicalConfigService(accessToken, branchId);
    try {
      const result = kind === 'spec' ? await service.saveSpec(id, body) : await service.saveRoi(id, body);
      if (!active.current) return;
      setData(previous => kind === 'spec' ? { ...previous, spec: result.spec } : {
        ...previous, rois: previous.rois.map(roi => roi.id === id ? { ...roi, config: result.config } : roi),
      });
      setNotice('Guardado en el sistema. No se enviaron cambios a la cámara.');
    } catch (failure) {
      if (active.current) setError(failure.message);
    } finally {
      saving.current = false;
      if (active.current) setBusy(false);
    }
  }

  return <>
    <SectionLabel>Configuración física · {product.name}</SectionLabel>
    <Info title="Solo configuración del sistema">
      No aplica cambios al motor ni modifica geometría, calibración o referencias de la cámara.
      Las medidas pertenecen al producto y se comparten en toda la organización.
    </Info>
    {error ? <Card title="No se pudo completar" tone="warning"><Copy>{error}</Copy></Card> : null}
    {notice ? <Info title="Configuración guardada">{notice}</Info> : null}
    {!data && !error ? <Info>Cargando configuración…</Info> : null}
    {data ? <>
      <SpecForm key={`spec:${data.spec.version}`} value={data.spec} busy={busy}
        onError={setError} onSave={body => save('spec', product.id, body)} />
      <SectionLabel>Configuración por zona de esta sucursal</SectionLabel>
      {!data.rois.length ? <Info>Este producto no tiene zonas activas asociadas en esta sucursal. Asócialo desde el editor de zonas; no se creará una zona ficticia.</Info> : null}
      {data.rois.map(roi => <RoiForm key={`${roi.id}:${roi.config.version}`} roi={roi} busy={busy}
        onError={setError} onSave={body => save('roi', roi.id, body)} />)}
    </> : null}
    <Primary variant="light" disabled={busy} onPress={() => {
      setData(null); setNotice(''); setAttempt(value => value + 1);
    }}>Recargar configuración y descartar cambios</Primary>
    <Primary variant="light" disabled={busy} onPress={onClose}>Volver al catálogo</Primary>
  </>;
}

export function SpecForm({ value, busy, onError, onSave }) {
  const [draft, setDraft] = useState(() => configDraft(value));
  const change = (name, next) => setDraft(previous => ({ ...previous, [name]: next }));
  return <Card title="Dimensiones del producto">
    <Copy muted>Milímetros; describe el producto, no el tamaño de la imagen ni un conteo detectado.</Copy>
    {[['width_mm', 'Ancho (mm)'], ['height_mm', 'Alto (mm)'], ['depth_mm', 'Profundidad (mm)']].map(([name, label]) =>
      <FieldCard key={name} label={label} value={draft[name]} keyboardType="decimal-pad" editable={!busy}
        onChangeText={next => change(name, next)} />)}
    <Copy>Orientación habitual</Copy>
    <Tabs items={Object.entries(orientations).map(([id, label]) => ({
      label, active: draft.usual_orientation === id,
      onPress: () => { if (!busy) change('usual_orientation', id); },
    }))} />
    <Action disabled={busy} onPress={() => {
      try { onSave(specBody(draft, value.version)); } catch (failure) { onError(failure.message); }
    }}>Guardar medidas en el sistema</Action>
  </Card>;
}

export function RoiForm({ roi, busy, onError, onSave }) {
  const value = roi.config;
  const [draft, setDraft] = useState(() => configDraft(value));
  const change = (name, next) => setDraft(previous => ({ ...previous, [name]: next }));
  return <Card title={roi.name} eyebrow={roi.shelf_name}>
    <Copy muted>Configuración cloud, sin aplicación física. No cambia geometría, SKU ni calibración.</Copy>
    {[['visual_capacity_units', 'Capacidad visual de referencia (opcional)'],
      ['threshold_empty_pct', 'Agotado hasta (%)'], ['threshold_low_pct', 'Bajo hasta (%)'],
      ['threshold_medium_pct', 'Medio hasta (%)'], ['confirm_samples', 'Muestras para confirmar estado']]
      .map(([name, label]) => <FieldCard key={name} label={label} value={draft[name]}
        keyboardType="decimal-pad" editable={!busy} onChangeText={next => change(name, next)} />)}
    <Copy muted>Después del umbral medio: adecuado. Los valores son de configuración, no una clasificación ejecutada por esta pantalla.</Copy>
    <Tabs items={[false, true].map(enabled => ({
      label: enabled ? 'Espacios activados' : 'Espacios desactivados',
      active: draft.virtual_slots_enabled === enabled,
      onPress: () => { if (!busy) change('virtual_slots_enabled', enabled); },
    }))} />
    {draft.virtual_slots_enabled ? <>
      <FieldCard label="Filas" value={draft.slots_rows} keyboardType="number-pad" editable={!busy} onChangeText={next => change('slots_rows', next)} />
      <FieldCard label="Columnas" value={draft.slots_cols} keyboardType="number-pad" editable={!busy} onChangeText={next => change('slots_cols', next)} />
      <Copy muted>Máximo 16 por lado y 128 espacios configurados. No habilita el piloto experimental ni confirma soporte físico de esta cuadrícula.</Copy>
    </> : null}
    <Action disabled={busy} onPress={() => {
      try { onSave(roiConfigBody(draft, value.version, roi.product_id)); } catch (failure) { onError(failure.message); }
    }}>Guardar zona en el sistema</Action>
  </Card>;
}
