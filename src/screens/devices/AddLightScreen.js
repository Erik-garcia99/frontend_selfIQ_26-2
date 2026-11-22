import { useState } from 'react';
import { Shell, Copy, ErrorNotice, LoadState, useData, useDevices, FieldCard, Primary, Info, SectionLabel } from './DeviceUI';
import { validLight } from '../../services/deviceService';

export default function AddLightScreen({ go }) {
  const d = useDevices();
  const channels = useData('listLightChannels', { deviceId: d.device?.id });
  const guide = useData('getGuide', { deviceId: d.device?.id });
  const shelves = useData('listShelves');
  const products = useData('listShelfGuideProducts', { shelfId: d.draft.shelfId });
  const catalogue = useData('listProducts');
  const associations = useData('listGuideAssociations');
  const [productId, setProductId] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [showCatalogue, setShowCatalogue] = useState(false);
  const states = [channels, guide, shelves, products, associations, ...(showCatalogue ? [catalogue] : [])];
  const ready = states.every(state => !state.loading && !state.error);
  const configured = (guide.data?.lights || []).find(light => light.channel === d.draft.channel);
  const channel = (channels.data || []).find(item => item.id === d.draft.channel);
  const choices = [...(products.data || []), ...(showCatalogue ? catalogue.data || [] : [])];
  const selected = choices.find(product => product.id === productId);
  const rows = associations.data || [];
  const savedLight = d.draft.id;
  const available = channel && (savedLight ? configured?.id === savedLight : channel.available && !configured);
  const assigned = rows.some(row => row.productId === productId);
  const canSave = ready && available && validLight(d.draft) && selected && !assigned;

  async function save() {
    if (busy || !canSave) return;
    setBusy(true);
    setError('');
    let lightId = savedLight;
    try {
      if (!lightId) {
        const light = await d.mutate('addLight', {
          deviceId: d.device.id, name: d.draft.name.trim(),
          shelfId: d.draft.shelfId, channel: d.draft.channel,
        });
        lightId = light.id;
        d.setDraft({ ...d.draft, ...light, mode: 'add' });
        guide.reload();
      }
      await d.mutate('assignGuideProduct', { productId, guidePointId: lightId });
      go('guide');
    } catch (failure) {
      setError(`${lightId ? 'El LED quedó configurado, pero no se confirmó la asociación del producto. Puedes reintentar. ' : ''}${failure?.message || 'No se pudo guardar.'}`);
      guide.reload();
      associations.reload();
    } finally {
      setBusy(false);
    }
  }

  return <Shell go={go} title={`Configurar LED ${d.draft.channel == null ? '' : d.draft.channel + 1}`} back="guide" busy={busy}>
    <Info>El LED físico ya está seleccionado. Elige su estante y producto. Puedes asociar un producto del catálogo directamente; no necesitas cámara, zonas ni calibración.</Info>
    <FieldCard label="Nombre del LED" value={d.draft.name || ''} editable={!busy && !savedLight}
      onChangeText={name => d.setDraft({ ...d.draft, name })} />
    <SectionLabel>Estante</SectionLabel>
    <LoadState state={shelves}>
      {(shelves.data || []).map(shelf => <Primary key={shelf.id} variant="light" disabled={busy || !!savedLight}
        onPress={() => { d.setDraft({ ...d.draft, shelfId: shelf.id, shelfName: shelf.name }); setProductId(null); setShowCatalogue(false); setError(''); }}>
        {`${d.draft.shelfId === shelf.id ? '✓ ' : ''}${shelf.name}`}
      </Primary>)}
      {!shelves.data?.length && <Info>No hay estantes registrados en esta sucursal.</Info>}
    </LoadState>
    <SectionLabel>Productos ya asociados por la guía a este estante</SectionLabel>
    {!d.draft.shelfId ? <Info>Selecciona un estante para ver sus productos.</Info> :
      <LoadState state={products}><LoadState state={associations}>
        {(products.data || []).map(product => {
          const association = rows.find(row => row.productId === product.id);
          return <Primary key={product.id} variant="light" disabled={busy || !!association}
            onPress={() => setProductId(product.id)}>
            {`${productId === product.id ? '✓ ' : ''}${product.name}${product.sku ? ` · ${product.sku}` : ''}${association ? ` · Ya usa LED ${association.channel + 1}` : ''}`}
          </Primary>;
        })}
        {!products.data?.length && <Info>Este estante todavía no tiene productos asociados a la guía. Puedes elegir uno del catálogo aquí mismo.</Info>}
      </LoadState></LoadState>}
    {d.draft.shelfId && <>
      <Primary variant="light" disabled={busy} onPress={() => { setShowCatalogue(!showCatalogue); setProductId(null); }}>
        {showCatalogue ? 'Cerrar catálogo' : 'Elegir otro producto del catálogo'}
      </Primary>
      {showCatalogue && <LoadState state={catalogue}><LoadState state={associations}>
        <Info>Al guardar, el producto quedará asociado a este LED y estante para la guía. No se crean ni modifican zonas de cámara.</Info>
        {(catalogue.data || []).filter(product =>
          !(products.data || []).some(item => item.id === product.id) &&
          !rows.some(row => row.productId === product.id)).map(product =>
          <Primary key={product.id} variant="light" disabled={busy}
            onPress={() => setProductId(product.id)}>
            {`${productId === product.id ? '✓ ' : ''}${product.name}${product.sku ? ` · ${product.sku}` : ''}`}
          </Primary>)}
        {!(catalogue.data || []).some(product =>
          !(products.data || []).some(item => item.id === product.id) &&
          !rows.some(row => row.productId === product.id)) &&
          <Info>No hay otros productos sin LED asignado. Puedes crear productos desde el catálogo o liberar una asociación existente.</Info>}
      </LoadState></LoadState>}
    </>}
    <LoadState state={channels}><LoadState state={guide}>
      {ready && !available && <Info>El LED seleccionado ya no está disponible. Vuelve a la guía y revisa su configuración.</Info>}
    </LoadState></LoadState>
    {savedLight && <Copy>El LED ya está guardado en este estante. Falta completar su asociación al producto.</Copy>}
    <ErrorNotice message={error} />
    <Primary loading={busy} disabled={!canSave} onPress={save}>Guardar LED y asociar producto</Primary>
  </Shell>;
}
