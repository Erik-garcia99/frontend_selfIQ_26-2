// Unidades relativas: no son metros ni medidas tomadas del local.
export function areaFields(document) {
  return { width: String(document?.width ?? 100), height: String(document?.height ?? 100) };
}

export function resizeDraft(document, fields) {
  const size = (value) => {
    const text = String(value).trim().replace(',', '.');
    if (!text || !/^\d+(\.\d+)?$/.test(text)) throw new Error('Escribe un tamaño válido para el área.');
    const number = Number(text);
    if (!Number.isFinite(number) || number < 1 || number > 10000)
      throw new Error('El ancho y el largo deben estar entre 1 y 10000.');
    return number;
  };
  // Conservar las figuras recibidas: cambiar el área no borra su geometría.
  return { ...(document || { schema_version: 1, elements: [] }),
    width: size(fields.width), height: size(fields.height) };
}

export function mapDraftError(error) {
  if (error?.status === 409) return 'El borrador cambió en otra sesión. Tus cambios siguen aquí. Recarga la versión guardada antes de volver a editar.';
  if (error?.status === 403) return 'Tu cuenta ya no tiene permiso para editar este mapa o esta sucursal.';
  if (error?.status === 404) return 'El mapa todavía no está habilitado en el servidor o la sucursal ya no está disponible.';
  if (error?.status === 422) return 'Revisa los tamaños. El área debe contener todas las figuras, incluso las giradas.';
  return error?.message || 'No pudimos guardar el borrador. Comprueba la conexión e inténtalo de nuevo.';
}
