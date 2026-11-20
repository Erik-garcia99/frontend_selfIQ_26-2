import { useState } from 'react';
import { Shell, Copy, ErrorNotice, LoadState, useData, useDevices, Primary, Info, SectionLabel } from './DeviceUI';

export default function GuideProductsScreen({ go }) {
  const d = useDevices();
  const associations = useData('listGuideAssociations');
  const lightsState = useData('getGuide', { deviceId: d.device?.id });
  const lightId = d.draft?.id;
  const lights = lightsState.data?.lights || [];
  const chosen = lights.find(light => light.id === lightId);
  const productsState = useData('listShelfProducts', { shelfId: chosen?.shelfId });
  const catalogue = useData('listProducts');
  const [productId, setProductId] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState('');
  const [showCatalogue, setShowCatalogue] = useState(false);

  const rows = associations.data || [];
  const assigned = new Set(rows.map(row => row.productId));
  const products = productsState.data || [];
  const catalogueProducts = (catalogue.data || []).filter(product =>
    !assigned.has(product.id) && !products.some(item => item.id === product.id));
  const choices = [...products, ...(showCatalogue ? catalogueProducts : [])];
  const occupants = rows.filter(row => row.guidePointId === lightId);
  const ready = !associations.loading && !associations.error && !lightsState.loading &&
    !lightsState.error && !productsState.loading && !productsState.error &&
    (!showCatalogue || (!catalogue.loading && !catalogue.error));

  async function run(operation, payload, message) {
    if (busy || !ready) return;
    setBusy(true); setError(''); setSaved('');
    try {
      await d.mutate(operation, payload);
      setSaved(message);
      setProductId(null);
      associations.reload();
      productsState.reload();
    } catch (failure) {
      setError(failure?.message || 'No se pudo guardar la asociación. Inténtalo de nuevo.');
      associations.reload();
    } finally {
      setBusy(false);
    }
  }

  return <Shell go={go} title={chosen ? `Producto del LED ${chosen.channel + 1}` : 'Producto del LED'} back="guide" busy={busy}>
    <Info>Cada LED señala un producto. Puedes reutilizarlo confirmando el reemplazo o elegir otro producto del catálogo para este estante. La guía es independiente de la cámara y sus zonas.</Info>
    <LoadState state={associations}>
    <LoadState state={lightsState}>
      {lights.filter(light => light.id === lightId).map(light => <Info key={light.id} title={`LED ${light.channel + 1} · ${light.name}`}>
        <Copy>{`${light.shelfName ? `Estante: ${light.shelfName}` : 'Sin estante asignado'} · Luz ${light.channel + 1}`}</Copy>
        {rows.filter(row => row.guidePointId === light.id).map(row =>
          <Primary key={row.productId} variant="light" disabled={busy || !ready}
            onPress={() => run('unassignGuideProduct', { productId: row.productId }, `${row.productName} desasociado.`)}>
            {`Quitar ${row.productName}`}
          </Primary>)}
        {!rows.some(row => row.guidePointId === light.id) && <Copy>Sin productos asociados.</Copy>}
      </Info>)}
      {!chosen && <Info>Vuelve a la guía y selecciona el LED que quieres configurar.</Info>}
    </LoadState>
    </LoadState>

    <SectionLabel>Productos ya asociados por la guía a este estante</SectionLabel>
    {occupants.length === 1 && chosen && <Info title="Confirmar reemplazo">{`Al guardar, ${occupants[0].productName} quedará sin LED y el nuevo producto usará el LED ${chosen.channel + 1}. Verifica su ubicación física.`}</Info>}
    {occupants.length > 1 && <Info>Esta luz tiene varias asociaciones antiguas. Quita los productos sobrantes antes de reemplazarla.</Info>}
    {chosen && <Copy>{`Estante: ${chosen.shelfName || 'Sin nombre'}`}</Copy>}
    <LoadState state={productsState}>
    {products.map(product => <Primary key={product.id} variant="light" disabled={busy || !ready || assigned.has(product.id)}
      onPress={() => setProductId(product.id)}>
      {`${productId === product.id ? '✓ ' : ''}${product.name}${assigned.has(product.id) ? ' · Ya tiene LED asignado' : ''}`}
    </Primary>)}
    {chosen && !products.length && <Info>Este estante todavía no tiene productos asociados a la guía. Puedes elegir uno del catálogo aquí mismo.</Info>}
    </LoadState>
    {chosen && <>
      <Primary variant="light" disabled={busy} onPress={() => { setShowCatalogue(!showCatalogue); setProductId(null); }}>
        {showCatalogue ? 'Cerrar catálogo' : 'Elegir otro producto del catálogo'}
      </Primary>
      {showCatalogue && <LoadState state={catalogue}>
        <Info>El producto elegido quedará asociado al LED y al estante de esta guía. Esto no crea ni modifica zonas de cámara.</Info>
        {catalogueProducts.map(product => <Primary key={product.id} variant="light" disabled={busy || !ready}
          onPress={() => setProductId(product.id)}>
          {`${productId === product.id ? '✓ ' : ''}${product.name}${product.sku ? ` · ${product.sku}` : ''}`}
        </Primary>)}
        {!catalogueProducts.length && <Info>No hay otros productos sin LED asignado en el catálogo.</Info>}
      </LoadState>}
    </>}
    <Primary loading={busy} disabled={!ready || !chosen || !choices.some(product => product.id === productId) || assigned.has(productId) || occupants.length > 1}
      onPress={() => run('assignGuideProduct',
        { productId, guidePointId: lightId, replaceProductId: occupants[0]?.productId },
        `LED ${chosen.channel + 1} asociado al producto.`)}>
      {occupants.length ? 'Confirmar cambio de producto' : 'Asociar producto al LED seleccionado'}
    </Primary>
    {saved ? <Info title="Listo">{saved}</Info> : null}
    <ErrorNotice message={error} />
  </Shell>;
}
