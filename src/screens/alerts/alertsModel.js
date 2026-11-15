// Prototipo 05 de Figma. Datos ilustrativos, nunca lecturas ni escrituras reales.
export const alertViews = {
  summary: ['05.01', 'Alertas'],
  shelves: ['05.02', 'Alertas de repisa'],
  stock: ['05.03', 'Stock bajo'],
  discrepancy: ['05.04', 'Discrepancia'],
  audit: ['05.05', 'Registrar auditoría'],
  environment: ['05.06', 'Ambiente'],
  devices: ['05.07', 'Dispositivos'],
  timeline: ['05.08', 'Línea de tiempo'],
  heatmap: ['05.09', 'Mapa de calor'],
  map: ['05.10', 'Mapa del local'],
  order: ['05.11', 'Pedido sugerido'],
  filters: ['05.12', 'Filtros y reportes'],
  auditSaved: ['05.13', 'Auditoría registrada'],
  orderSaved: ['05.14', 'Pedido registrado'],
  history: ['05.15', 'Historial de eventos'],
  calibration: ['05.16', 'Revisar calibración'],
};

export const auditResults = [
  'Sin discrepancia', 'Error de inventario', 'Merma confirmada',
  'Reposición pendiente', 'Otra causa',
];

export const initialFilters = {
  from: '2026-10-16', to: '2026-10-22', category: 'Todas',
  severity: 'Todas', state: 'Todas', product: 'Todos', location: 'Todas',
};

export const exampleAlerts = [
  { id: 'rice', category: 'Repisas', severity: 'Alta', state: 'Nueva', title: 'Arroz 1 kg · Agotado', detail: 'E-02 · Zona 1 · Ocupación 0 %', meta: '22 oct, 12:10 · SKU ARR-001', target: 'order', location: 'E-02', product: 'Arroz 1 kg' },
  { id: 'sugar', category: 'Repisas', severity: 'Media', state: 'En revisión', title: 'Azúcar 1 kg · Stock bajo', detail: 'E-03 · Zona 2 · Ocupación 18 %', meta: '22 oct, 12:05 · SKU AZU-001', target: 'stock', location: 'E-03', product: 'Azúcar 1 kg' },
  { id: 'difference', category: 'Inventario', severity: 'Media', state: 'Nueva', title: 'Azúcar 1 kg · Revisar diferencia', detail: '24 unidades registradas · Repisa 18 %', meta: 'CAM-03 · E-03 · 12:08', target: 'discrepancy', location: 'E-03', product: 'Azúcar 1 kg' },
  { id: 'temperature', category: 'Ambiente', severity: 'Alta', state: 'Nueva', title: 'Temperatura alta', detail: 'Lectura: 42 °C · Umbral: mayor a 40 °C', meta: 'Entrada · AF-01 · 12:00', target: 'environment', location: 'Entrada', product: '—' },
  { id: 'humidity', category: 'Ambiente', severity: 'Alta', state: 'Nueva', title: 'Humedad alta', detail: 'Lectura: 84 % · Umbral: mayor a 80 %', meta: 'Entrada · AF-01 · 12:00', target: 'environment', location: 'Entrada', product: '—' },
  { id: 'camera', category: 'Dispositivos', severity: 'Alta', state: 'Nueva', title: 'CAM-02 sin conexión', detail: 'E-02 · Último contacto 12:10:20', meta: 'Detectado 12:11 · Estado de repisa desactualizado', target: 'devices', location: 'E-02', product: '—' },
  { id: 'battery', category: 'Dispositivos', severity: 'Media', state: 'Nueva', title: 'Batería baja · AF-01', detail: '18 % · Umbral: menor a 20 %', meta: 'Entrada · Reporte de las 12:00', target: 'devices', location: 'Entrada', product: '—' },
  { id: 'gateway', category: 'Dispositivos', severity: 'Alta', state: 'En revisión', title: 'Gateway sin conexión', detail: 'RPI-01 · Último contacto 12:11', meta: 'No se reciben nuevas lecturas de la sucursal', target: 'devices', location: 'Caja', product: '—' },
];

export const exampleEvents = [
  { id: 'event-order', time: '12:12', category: 'Pedidos', title: 'Pedido PED-024 registrado', detail: 'Arroz 1 kg · 24 unidades · Confirmación manual', target: 'orderSaved', product: 'Arroz 1 kg', location: 'E-02', severity: 'Media', state: 'Atendida' },
  { id: 'event-gateway', time: '12:11', category: 'Dispositivos', title: 'RPI-01 perdió conexión', detail: 'Se pausó la recepción de datos de la sucursal.', target: 'devices', product: '—', location: 'Caja', severity: 'Alta', state: 'En revisión' },
  { id: 'event-rice', time: '12:10', category: 'Repisas', title: 'Arroz 1 kg agotado', detail: 'E-02 · 0 % ocupación · Severidad alta', target: 'order', product: 'Arroz 1 kg', location: 'E-02', severity: 'Alta', state: 'Nueva' },
  { id: 'event-difference', time: '12:08', category: 'Inventario', title: 'Azúcar 1 kg: revisar diferencia', detail: 'CAM-03 · E-03 · Inventario 24 u. · Repisa 18 %', target: 'discrepancy', product: 'Azúcar 1 kg', location: 'E-03', severity: 'Media', state: 'Nueva' },
  { id: 'event-environment', time: '12:00', category: 'Ambiente', title: '42 °C y 84 % de humedad', detail: 'AF-01 · Entrada · Severidad alta', target: 'environment', product: '—', location: 'Entrada', severity: 'Alta', state: 'Nueva' },
].map(event => ({ ...event, date: '2026-10-22' }));

export const timelineEvents = [
  ['12:12 · Auditoría', 'Reposición pendiente', 'Marcos Solís confirma existencias en almacén.', 'auditSaved'],
  ['12:08 · Inventario', 'Discrepancia detectada', 'Inventario: 24 unidades · Repisa: 18 %', 'discrepancy'],
  ['12:05 · CAM-03', 'Ocupación 42 % → 18 %', 'Stock bajo confirmado · Umbral: 25 %', 'stock'],
  ['10:40 · CAM-03', 'Ocupación 74 % → 42 %', 'Cambio significativo en ROI-02.', 'stock'],
  ['10:20 · Caja', 'Venta de 2 unidades', 'Saldo lógico: 26 → 24 unidades.', 'discrepancy'],
];

export const heatmapRows = [
  ['Jue 15', [0, 1, 0, 2, 3, 1]], ['Vie 16', [0, 0, 1, 1, 2, 0]],
  ['Sáb 17', [1, 0, 2, 3, 1, 0]], ['Dom 18', [0, 1, 3, 5, 2, 1]],
  ['Lun 19', [1, 2, 4, 6, 3, 1]], ['Mar 20', [0, 1, 3, 4, 2, 1]],
  ['Mié 21', [1, 2, 5, 8, 0, 0]],
];
export const heatmapHours = ['08', '10', '12', '14', '16', '18'];
export const heatLevel = value => value === 0 ? 0 : value <= 2 ? 1 : value <= 5 ? 2 : 3;

function validDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value)
    && !Number.isNaN(Date.parse(`${value}T00:00:00Z`))
    && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;
}

export function filterError(filters) {
  if (!validDate(filters.from) || !validDate(filters.to)) return 'Escribe fechas válidas con formato AAAA-MM-DD.';
  return filters.from > filters.to ? 'La fecha inicial no puede ser posterior a la final.' : '';
}

export function filterEvents(events, filters) {
  if (filterError(filters)) return [];
  return events.filter(event => event.date >= filters.from && event.date <= filters.to
    && (filters.category === 'Todas' || event.category === filters.category)
    && (filters.severity === 'Todas' || event.severity === filters.severity)
    && (filters.state === 'Todas' || event.state === filters.state)
    && (filters.product === 'Todos' || event.product === filters.product)
    && (filters.location === 'Todas' || event.location === filters.location));
}

export function initialAlertState() {
  return {
    preview: false, view: 'summary', stack: [], filters: { ...initialFilters },
    result: 'Reposición pendiente',
    notes: 'Hay existencias en almacén. Reponer la repisa E-03 y volver a comprobar.',
    quantity: 24, auditSaved: null, orderSaved: null,
  };
}

export function alertsReducer(state, action) {
  switch (action.type) {
    case 'preview': return { ...initialAlertState(), preview: true };
    case 'exit': return initialAlertState();
    case 'navigate': {
      if (!state.preview || !alertViews[action.view] || action.view === state.view) return state;
      if (action.view === 'summary') return { ...state, view: 'summary', stack: [] };
      const previous = state.stack.lastIndexOf(action.view);
      if (previous >= 0) return { ...state, view: action.view, stack: state.stack.slice(0, previous) };
      return { ...state, view: action.view, stack: [...state.stack, state.view] };
    }
    case 'back':
      return state.stack.length ? { ...state, view: state.stack.at(-1), stack: state.stack.slice(0, -1) } : state;
    case 'filters': return { ...state, filters: { ...state.filters, ...action.value } };
    case 'result': return auditResults.includes(action.value) ? { ...state, result: action.value } : state;
    case 'notes': return { ...state, notes: action.value.slice(0, 1000) };
    case 'quantity': return Number.isInteger(action.value) ? { ...state, quantity: Math.max(1, Math.min(999, action.value)) } : state;
    case 'saveAudit':
      if (!state.preview || state.view !== 'audit' || (state.result === 'Otra causa' && !state.notes.trim())) return state;
      return { ...state, auditSaved: { result: state.result, notes: state.notes.trim() }, view: 'auditSaved', stack: [...state.stack, 'audit'] };
    case 'saveOrder':
      if (!state.preview || state.view !== 'order') return state;
      return { ...state, orderSaved: { quantity: state.quantity }, view: 'orderSaved', stack: [...state.stack, 'order'] };
    default: return state;
  }
}
