export const orientations = { upright: 'De pie', sideways: 'De lado', flat: 'Acostado' };

export function numberField(value, label, { integer = false, min = 0, max = 100000, nullable = false } = {}) {
  if (nullable && String(value ?? '').trim() === '') return null;
  const text = String(value ?? '').trim().replace(',', '.');
  if (!/^\d+(\.\d+)?$/.test(text)) throw new Error(`${label}: escribe un número válido.`);
  const number = Number(text);
  if (!Number.isFinite(number) || number < min || number > max || (integer && !Number.isInteger(number))) {
    throw new Error(`${label}: valor fuera del rango permitido${integer ? ' o no entero' : ''}.`);
  }
  return number;
}

export function specBody(draft, version) {
  if (!orientations[draft.usual_orientation]) throw new Error('Selecciona una orientación.');
  return {
    base_version: version,
    ...Object.fromEntries(['width_mm', 'height_mm', 'depth_mm'].map(name =>
      [name, numberField(draft[name], 'Dimensiones en mm', { min: Number.MIN_VALUE })])),
    usual_orientation: draft.usual_orientation,
  };
}

export function roiConfigBody(draft, version, productId) {
  const integer = (name, label, max, nullable = false) =>
    numberField(draft[name], label, { integer: true, min: 1, max, nullable });
  const empty = numberField(draft.threshold_empty_pct, 'Umbral agotado', { max: 100 });
  const low = numberField(draft.threshold_low_pct, 'Umbral bajo', { max: 100 });
  const medium = numberField(draft.threshold_medium_pct, 'Umbral medio', { max: 100 });
  if (!(empty < low && low < medium && medium < 100)) {
    throw new Error('Los umbrales deben cumplir agotado < bajo < medio < 100.');
  }
  const rows = draft.virtual_slots_enabled ? integer('slots_rows', 'Filas', 16) : null;
  const cols = draft.virtual_slots_enabled ? integer('slots_cols', 'Columnas', 16) : null;
  if (rows * cols > 128) throw new Error('Máximo 128 espacios virtuales de configuración.');
  return {
    base_version: version, expected_product_id: productId,
    visual_capacity_units: integer('visual_capacity_units', 'Capacidad', 9999, true),
    threshold_empty_pct: empty, threshold_low_pct: low, threshold_medium_pct: medium,
    confirm_samples: integer('confirm_samples', 'Muestras de confirmación', 100),
    virtual_slots_enabled: Boolean(draft.virtual_slots_enabled), slots_rows: rows, slots_cols: cols,
  };
}

export function configDraft(value) {
  return Object.fromEntries(Object.entries(value).map(([key, item]) =>
    [key, typeof item === 'boolean' ? item : String(item ?? '')]));
}
