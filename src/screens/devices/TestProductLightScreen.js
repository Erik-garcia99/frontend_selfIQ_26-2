import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Shell, Copy, ErrorNotice, LoadState, useData, useDevices, FieldCard, Primary, Info, SectionLabel } from './DeviceUI';
import { createGuideRequest, getGuideRequest, cancelGuideRequest, newIdempotencyKey } from '../../services/guideService';
import { guideIsOpen, ledStateLabel, guideControlError } from './guideControl';

export default function TestProductLightScreen({ go }) {
  const d = useDevices();
  const { accessToken } = useAuth();
  return <GuideControl key={`${d.branchId}:${accessToken}:${d.draft.controlNodeId || ''}`}
    go={go} branchId={d.branchId} accessToken={accessToken}
    nodeId={d.draft.controlNodeId} back={d.draft.controlBack || 'panel'} />;
}

export function GuideControl({ go, branchId, accessToken, nodeId, back }) {
  const associations = useData('listGuideAssociations');
  const [query, setQuery] = useState('');
  const [sessions, setSessions] = useState({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const alive = useRef(true);
  const lock = useRef(false);
  const attempts = useRef({});
  useEffect(() => {
    alive.current = true;
    return () => { alive.current = false; };
  }, []);

  function update(productId, state) {
    setSessions(previous => ({ ...previous, [productId]: state }));
  }

  // Cada producto puede mantener su propia sesión LED. Las consultas se
  // serializan para no multiplicar peticiones simultáneas con varios LED.
  const openKey = Object.entries(sessions)
    .filter(([, state]) => guideIsOpen(state))
    .map(([productId, state]) => `${productId}:${state.id}`)
    .join('|');
  useEffect(() => {
    if (!openKey || busy) return undefined;
    const pending = openKey.split('|').map(item => {
      const split = item.indexOf(':');
      return { productId: item.slice(0, split), requestId: item.slice(split + 1) };
    });
    let stopped = false;
    let timer;
    let cursor = 0;
    async function tick() {
      if (stopped) return;
      const { productId, requestId } = pending[cursor % pending.length];
      cursor += 1;
      try {
        const state = await getGuideRequest({ branchId, requestId, accessToken });
        if (stopped) return;
        update(productId, state);
      } catch {
        if (stopped) return;
        setSessions(previous => ({ ...previous, [productId]: { ...previous[productId], light: 'unknown' } }));
        setError('No se pudo actualizar el estado. No des los LED por apagados; puedes solicitar OFF.');
      }
      if (!stopped) timer = setTimeout(tick, 1500);
    }
    tick();
    return () => { stopped = true; clearTimeout(timer); };
  }, [openKey, busy, branchId, accessToken]);

  const ready = !!branchId && !associations.loading && !associations.error;
  const term = query.trim().toLowerCase();
  const rows = (associations.data || []).filter(row =>
    (!nodeId || row.nodeId === nodeId) &&
    (!term || `${row.productName} ${row.sku || ''} ${row.shelfName || ''}`.toLowerCase().includes(term)));

  async function start(row) {
    if (lock.current || !ready || guideIsOpen(sessions[row.productId])) return;
    lock.current = true;
    setBusy(true); setError('');
    const keys = attempts.current;
    if (!keys[row.productId]) keys[row.productId] = newIdempotencyKey();
    try {
      const result = await createGuideRequest({
        branchId, productId: row.productId, accessToken, idempotencyKey: keys[row.productId],
      });
      if (!result?.id) throw new Error('El servidor no identificó la solicitud; no se confirmó el encendido.');
      if (!alive.current) return;
      delete keys[row.productId];
      update(row.productId, result);
      if (result.status === 'failed' || result.status === 'expired') {
        setError(result.reason === 'node_rejected'
          ? 'El nodo rechazó el encendido (canal ocupado o fuera de plazo). Comprueba que el LED no esté en otra guía.'
          : 'El encendido quedó sin confirmar. El LED puede estar apagado; revisa su estado antes de reintentar.');
      }
    } catch (failure) {
      if (!alive.current) return;
      setError(guideControlError(failure));
      update(row.productId, { light: 'unknown' });
      if (failure?.status === 404) associations.reload();
    } finally {
      lock.current = false;
      if (alive.current) setBusy(false);
    }
  }

  async function stop(productId) {
    const requestId = sessions[productId]?.id;
    if (lock.current || !requestId || !guideIsOpen(sessions[productId])) return;
    lock.current = true;
    setBusy(true); setError('');
    try {
      const next = await cancelGuideRequest({ branchId, requestId, accessToken });
      if (alive.current) update(productId, next);
    } catch (failure) {
      if (!alive.current) return;
      setSessions(previous => ({ ...previous, [productId]: { ...previous[productId], light: 'unknown' } }));
      setError(`No se confirmó el apagado. ${guideControlError(failure)}`);
    } finally {
      lock.current = false;
      if (alive.current) setBusy(false);
    }
  }

  return <Shell go={go} title="Control de LED" back={back} busy={busy}>
    <Info>Solo se muestran productos con LED asociado. Puedes encender varios LED a la vez: cada sesión dura hasta 60 segundos y su OFF apaga solo ese LED. No requiere cámara ni ROI. El estado indica la última respuesta del nodo, no una medición óptica.</Info>
    <FieldCard label="Buscar producto o estante" value={query} onChangeText={setQuery} placeholder="Nombre, SKU o estante" />
    <SectionLabel>Productos con LED</SectionLabel>
    <LoadState state={associations}>
      {rows.map(row => {
        const state = sessions[row.productId];
        const open = guideIsOpen(state);
        return <Info key={row.productId} title={row.productName}>
          <Copy>{`LED ${row.channel + 1}${row.lightName ? ` · ${row.lightName}` : ''} · ${row.shelfName || 'Sin estante'}`}</Copy>
          {row.sku ? <Copy>{`SKU: ${row.sku}`}</Copy> : null}
          <Copy>{`Estado: ${ledStateLabel(state)}`}</Copy>
          {open && <Copy>{`Sesión en curso · ${state.remainingSeconds ?? state.ttlSeconds ?? 60} s`}</Copy>}
          <Primary disabled={!ready || busy || open} onPress={() => start(row)}>ON · Encender LED {row.channel + 1}</Primary>
          <Primary variant="light" disabled={busy || !open} onPress={() => stop(row.productId)}>OFF · Apagar LED {row.channel + 1}</Primary>
        </Info>;
      })}
      {!rows.length && <Info>{term ? 'Ninguna asociación coincide con la búsqueda.' : 'No hay productos con LED asociado. Configura y asocia un LED antes de intentar encenderlo.'}</Info>}
    </LoadState>
    <Primary variant="light" disabled={busy} onPress={associations.reload}>Actualizar asociaciones</Primary>
    <ErrorNotice message={error} />
  </Shell>;
}
