export function validateThresholds(draft) {
  if (['empty', 'low', 'medium', 'samples'].some(
    field => String(draft[field] ?? '').trim() === '')) {
    return { error: 'Escribe valores numéricos en todos los campos.' };
  }
  const empty = Number(String(draft.empty).replace(',', '.'));
  const low = Number(String(draft.low ?? '').replace(',', '.'));
  const medium = Number(String(draft.medium ?? '').replace(',', '.'));
  const samples = Number(draft.samples);
  if (![empty, low, medium].every(Number.isFinite) || !Number.isInteger(samples)) {
    return { error: 'Escribe valores numéricos en todos los campos.' };
  }
  if (!(0 <= empty && empty < low && low < medium && medium < 100)) {
    return { error: 'Los umbrales deben cumplir: agotado < bajo < medio y medio menor a 100.' };
  }
  if (samples < 1 || samples > 100) {
    return { error: 'Las muestras de confirmación deben estar entre 1 y 100.' };
  }
  return { values: { empty, low, medium, samples } };
}
