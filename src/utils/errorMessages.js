// Traduce el error del backend a un código corto + un mensaje que un usuario
// sin perfil técnico pueda entender. El código es para soporte ("dame el
// código que aparece"), el mensaje es para la persona que está usando la app.
const BY_STATUS = {
  0: { code: 'E-CONEXION', title: 'Sin conexión', message: 'No pudimos comunicarnos con el sistema. Revisa tu conexión a internet y vuelve a intentarlo.', hint: 'Si usas la versión web, revisa también los permisos de acceso del navegador.' },
  400: { code: 'E-400', title: 'Falta un dato', message: 'La información enviada está incompleta o tiene un formato que no reconocemos.', hint: 'Revisa los campos y vuelve a intentarlo.' },
  401: { code: 'E-401', title: 'Sesión vencida', message: 'Tu sesión terminó por seguridad.', hint: 'Inicia sesión de nuevo para continuar.' },
  403: { code: 'E-403', title: 'Sin permiso', message: 'Tu cuenta no tiene permiso para hacer esta operación.', hint: 'Pide a un administrador que revise tu rol.' },
  404: { code: 'E-404', title: 'No encontrado', message: 'El dato que buscas ya no existe o cambió de lugar.', hint: 'Actualiza la pantalla y vuelve a intentarlo.' },
  408: { code: 'E-408', title: 'Tardó demasiado', message: 'El sistema no respondió a tiempo.', hint: 'Espera unos segundos. Antes de repetir, confirma que la operación no se haya guardado.' },
  409: { code: 'E-409', title: 'Ya existe', message: 'Ese registro ya estaba creado.', hint: 'Revisa la lista antes de volver a intentarlo.' },
  422: { code: 'E-422', title: 'Datos no válidos', message: 'Algunos datos no son válidos.', hint: 'Corrige los campos señalados y vuelve a intentarlo.' },
  429: { code: 'E-429', title: 'Demasiados intentos', message: 'Se hicieron muchas solicitudes seguidas.', hint: 'Espera un minuto y vuelve a intentarlo.' },
  500: { code: 'E-500', title: 'Falla del sistema', message: 'Algo falló de nuestro lado.', hint: 'Vuelve a intentarlo en un momento. Si sigue pasando, avisa al administrador con este código.' },
  502: { code: 'E-502', title: 'Respuesta inesperada', message: 'El sistema respondió algo que no esperábamos.', hint: 'Avisa al administrador con este código antes de reintentar.' },
};

const FALLBACK = { code: 'E-DESCONOCIDO', title: 'No se pudo completar', message: 'La operación no se completó.', hint: 'Vuelve a intentarlo. Si sigue pasando, avisa al administrador con este código.' };

// El backend ya responde mensajes cortos en español ("El token no es válido"),
// así que para 4xx preferimos ese texto sobre uno genérico.
function readable(message) {
  const clean = String(message || '').trim();
  if (!clean || clean.length > 140) return '';
  if (/^(null|undefined|\[object)/i.test(clean)) return '';
  return clean;
}

export function describeError(failure) {
  const status = Number(failure?.status ?? 0);
  const base = BY_STATUS[status] || (status >= 500 ? BY_STATUS[500] : FALLBACK);
  // 4xx y 502 los levantamos nosotros o FastAPI con mensajes en español ya
  // pensados para el usuario; 500/0 vienen de la capa de red y son técnicos.
  const humanStatus = (status >= 400 && status < 500) || status === 502;
  const backend = humanStatus ? readable(failure?.message) : '';
  return { code: base.code, title: base.title, message: backend || base.message, hint: base.hint };
}
