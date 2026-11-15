import { useEffect, useReducer, useState } from 'react';
import { BackHandler, Pressable, Text, TextInput, View } from 'react-native';
import { Head, Screen } from '../../components/layout';
import { useDevices } from '../../context/DeviceContext';
import { colors as C } from '../../theme/colors';
import { Action, Card, Copy, Pair, Tabs, styles as S } from './AlertsUI';
import {
  alertsReducer, alertViews, auditResults, exampleAlerts, exampleEvents, filterError,
  filterEvents, heatLevel, heatmapHours, heatmapRows, initialAlertState, initialFilters, timelineEvents,
} from './alertsModel';

// Solo interfaz del prototipo. No hay llamadas a endpoints inexistentes ni
// confirmaciones de operaciones reales. La vista previa se activa explícitamente.
export default function AlertsScreen({ go }) {
  const { branchId } = useDevices();
  // Cambiar de sucursal descarta formularios y resultados de ejemplo.
  return <AlertsWorkspace key={branchId || 'none'} go={go} />;
}

export function AlertsWorkspace({ go, initialState }) {
  const [state, dispatch] = useReducer(alertsReducer, initialState, value => value ?? initialAlertState());
  const [notice, setNotice] = useState('');
  const [expandedFilter, setExpandedFilter] = useState(null);
  const [selectedHeat, setSelectedHeat] = useState(null);
  const navigate = (view) => { setNotice(''); setExpandedFilter(null); dispatch({ type: 'navigate', view }); };
  const back = () => { setNotice(''); dispatch({ type: 'back' }); };
  const filters = state.filters;
  const filteredEvents = filterEvents(exampleEvents, filters);
  const title = alertViews[state.view][1];

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (!state.preview) return false;
      dispatch({ type: state.stack.length ? 'back' : 'exit' });
      return true;
    });
    return () => subscription.remove();
  }, [state.preview, state.stack.length]);

  const history = (scope = {}) => {
    dispatch({ type: 'filters', value: { ...initialFilters, ...scope } });
    navigate('history');
  };
  const tabs = (first = 'Resumen') => <Tabs items={[
    { label: first, active: true, onPress: () => {} },
    { label: 'Historial', onPress: () => history() },
    { label: 'Filtros', onPress: () => navigate('filters') },
  ]} />;
  const button = (label, view, secondary = false) => <Action secondary={secondary} onPress={() => navigate(view)}>{label}</Action>;
  const eventCard = (event) => <Card key={event.id} title={event.title}
    eyebrow={`${event.time} · ${event.category}`} tone={event.category === 'Repisas' ? 'danger' : undefined}
    onPress={() => navigate(event.target)}><Copy muted>{event.detail}</Copy></Card>;
  const alertCard = (alert, clickable = true) => <Card key={alert.id} title={alert.title}
    eyebrow={`${alert.severity.toUpperCase()} · ${alert.state.toUpperCase()}`}
    tone={alert.severity === 'Alta' ? 'danger' : undefined}
    onPress={clickable ? () => navigate(alert.target) : undefined}>
    <Copy muted>{alert.detail}</Copy><Copy muted>{alert.meta}</Copy>
  </Card>;
  const subtitle = {
    summary: 'Hoy, 22 oct · Actualizado 12:12 · Datos de ejemplo',
    shelves: '2 abiertas · Agrupadas por producto y estante',
    stock: 'Azúcar 1 kg · SKU AZU-001', discrepancy: 'Azúcar 1 kg · E-03 · ROI-02 · 22 oct, 12:08',
    audit: 'Azúcar 1 kg · E-03 · Revisión manual',
    environment: 'Entrada · Sensor AF-01 · 22 oct, 12:00',
    devices: '3 alertas · Último contacto por dispositivo',
    timeline: 'Azúcar 1 kg · E-03 · Zona 2 (ROI-02)',
    heatmap: 'Frecuencia de alertas · 15–21 oct · Ejemplo',
    map: 'Sucursal central · 8 alertas abiertas',
    order: 'Arroz 1 kg · SKU ARR-001 · E-02',
    filters: 'Consulta históricos y prepara una exportación',
    auditSaved: 'Azúcar 1 kg · E-03 · ROI-02',
    orderSaved: 'Confirmación manual de ejemplo',
    history: `${filters.from} — ${filters.to} · ${filters.category} · Ejemplo`,
    calibration: 'CAM-03 · E-03 · ROI-02',
  }[state.view];

  let content;
  if (!state.preview) {
    content = <>
      <Card title="Monitoreo de alertas pendiente de conexión">
        <Copy>El centro de alertas todavía no está conectado a los eventos del sistema.</Copy>
        <Copy muted>No tener información no significa que no haya incidencias.</Copy>
      </Card>
      <Action onPress={() => dispatch({ type: 'preview' })}>Ver diseño con datos de ejemplo</Action>
      <Card title="Qué puedes revisar"><Copy muted>Los 16 frames incluyen repisas, auditoría, ambiente, equipos, mapas, historial y pedidos sugeridos. La vista previa no guarda ni envía datos.</Copy></Card>
    </>;
  } else if (state.view === 'summary') {
    content = <>
      <View style={S.hero}><Text style={S.heroTitle}>8 alertas abiertas</Text>
        <Copy style={S.onDark}>6 nuevas · 2 en revisión</Copy>
        <Copy style={S.onDark}>Stock 2 · Inventario 1 · Ambiente 2 · Equipos 3</Copy>
      </View>
      {tabs()}
      {[
        ['REPOSICIÓN', 'Repisas · 2 alertas', '1 agotado · 1 stock bajo', 'shelves'],
        ['REVISIÓN REQUERIDA', 'Inventario · 1 discrepancia', 'Existencias registradas con repisa baja', 'discrepancy'],
        ['ALTA', 'Ambiente · 2 alertas', 'Temperatura y humedad elevadas', 'environment'],
        ['REVISAR CONEXIÓN', 'Dispositivos · 3 alertas', 'Nodo sin conexión, batería y gateway', 'devices'],
      ].map(([eyebrow, heading, detail, target]) =>
        <Card key={target} eyebrow={eyebrow} title={heading} onPress={() => navigate(target)}><Copy muted>{detail} →</Copy></Card>)}
      <View style={S.row}><View style={S.grow}>{button('Mapa de calor', 'heatmap')}</View><View style={S.grow}>{button('Mapa del local', 'map', true)}</View></View>
    </>;
  } else if (state.view === 'shelves') {
    content = <>
      {tabs('Todas (2)')}
      {exampleAlerts.filter(alert => alert.category === 'Repisas').map(alert => alertCard(alert))}
      <Card title="Una alerta por condición"><Copy muted>La misma alerta permanece abierta mientras continúe el estado. Consulta su evolución en el historial.</Copy></Card>
      {button('Ver ubicación de las repisas', 'map', true)}
      {button('Ver línea de tiempo', 'timeline', true)}
    </>;
  } else if (state.view === 'stock') {
    content = <>
      <Card tone="warning" title="18 % de ocupación visual">
        <Copy muted>MEDIA · En revisión · Detectada a las 12:05</Copy>
        <Pair label="Ubicación" value="E-03 · Zona 2 (ROI-02)" />
        <Pair label="Cámara" value="CAM-03" /><Pair label="Umbral bajo" value="Menos de 25 %" />
      </Card>
      <Card title="Dos medidas independientes">
        <Pair label="Inventario registrado" value="24 unidades" /><Pair label="Repisa" value="18 % ocupada" />
        <Copy muted>La cámara no modifica las existencias del inventario.</Copy>
      </Card>
      <Card title="Evidencia del evento"><Copy muted>22 oct, 12:05 · CAM-03 · ROI-02</Copy>
        <Copy>Imagen no disponible para este evento</Copy><Copy muted>Si se capturó una imagen, se mostrará aquí.</Copy>
      </Card>
      {button('Revisar discrepancia asociada', 'discrepancy')}
      <View style={S.row}><View style={S.grow}>{button('Línea de tiempo', 'timeline')}</View><View style={S.grow}>{button('Ver ubicación', 'map', true)}</View></View>
      {button('¿La imagen cambió? Revisar calibración', 'calibration', true)}
    </>;
  } else if (state.view === 'discrepancy') {
    content = <>
      <Card tone="warning" title="Revisión pendiente"><Copy muted>Hay 24 unidades registradas y 18 % de ocupación visual. Verifica la repisa y las existencias.</Copy></Card>
      <Card title="Movimientos del periodo"><Copy muted>22 oct · 09:00–12:12</Copy>
        <Pair label="Saldo inicial" value="26 unidades" /><Pair label="Entradas / salidas" value="0 / 0 unidades" />
        <Pair label="Ventas" value="2 unidades" /><Pair label="Saldo registrado" value="24 unidades" />
      </Card>
      <Card title="Sin clasificación automática"><Copy muted>Esta diferencia no confirma merma ni robo. La causa se registra después de una revisión.</Copy></Card>
      {button('Revisar eventos relacionados', 'timeline', true)}
      {button('Registrar resultado de auditoría', 'audit')}
      {button('Ver evidencia de la repisa', 'stock', true)}
    </>;
  } else if (state.view === 'audit') {
    const needsNotes = state.result === 'Otra causa' && !state.notes.trim();
    content = <>
      <Card title="Confirmar o descartar"><Copy muted>Registra lo que encontraste. El inventario no cambiará automáticamente.</Copy></Card>
      <Card title="Resultado de la revisión">
        <View accessibilityRole="radiogroup">{auditResults.map(result =>
          <Pressable key={result} accessibilityRole="radio" accessibilityState={{ checked: state.result === result }}
            onPress={() => dispatch({ type: 'result', value: result })} style={S.option}>
            <View style={S.radio}>{state.result === result && <View style={S.radioDot} />}</View><Copy>{result}</Copy>
          </Pressable>)}</View>
      </Card>
      <Card title="Observaciones"><TextInput accessibilityLabel="Observaciones de la revisión" multiline maxLength={1000}
        value={state.notes} onChangeText={value => dispatch({ type: 'notes', value })} style={[S.input, S.notes]} />
        {needsNotes && <Copy style={S.dangerText}>Describe la otra causa antes de continuar.</Copy>}
      </Card>
      <Copy muted style={{ marginBottom: 12 }}>Revisor de ejemplo: Marcos Solís · 22 oct, 12:12</Copy>
      <Action disabled={needsNotes} onPress={() => dispatch({ type: 'saveAudit' })}>Guardar resultado de ejemplo</Action>
      {button('Cancelar', 'discrepancy', true)}
    </>;
  } else if (state.view === 'environment') {
    content = <>
      {exampleAlerts.filter(alert => alert.category === 'Ambiente').map(alert => alertCard(alert, false))}
      <Card title="Temperatura · última hora"><Copy muted>°C · Lecturas de ejemplo · Umbral: 40 °C</Copy>
        <View style={S.chart} accessibilityLabel="Temperatura de ejemplo: 36, 37, 39, 40 y 42 grados; umbral 40 grados">
          <View pointerEvents="none" style={S.threshold} />
          {[36, 37, 39, 40, 42].map((value, index) => <View key={value} style={S.column}>
            <Text style={S.chartNumber}>{value}</Text>
            <View style={[S.bar, { height: (value - 30) * 7, backgroundColor: value > 40 ? C.danger : C.blue }]} />
            <Text style={S.chartTime}>{['11:00', '11:15', '11:30', '11:45', '12:00'][index]}</Text>
          </View>)}
        </View><Copy muted>Escala visible: 30–44 °C</Copy>
      </Card>
      <Card title="Revisión sugerida"><Copy muted>Comprueba ventilación y condiciones del área. Verifica el sensor si la lectura no coincide con el entorno.</Copy></Card>
      <Action secondary onPress={() => history({ category: 'Ambiente' })}>Consultar historial ambiental</Action>
    </>;
  } else if (state.view === 'devices') {
    content = <>
      {exampleAlerts.filter(alert => alert.category === 'Dispositivos').map(alert => alertCard(alert, false))}
      <Card tone="warning" title="Datos pendientes de actualizar"><Copy muted>Los equipos pueden seguir registrando datos localmente. La aplicación mostrará los datos nuevos al recuperar la conexión.</Copy></Card>
      <Action secondary onPress={() => history({ category: 'Dispositivos' })}>Abrir bitácora de eventos</Action>
      {button('Ver ubicación de equipos', 'map', true)}
    </>;
  } else if (state.view === 'timeline') {
    content = <>
      <Tabs items={[{ label: '22 oct', active: true, onPress: () => navigate('filters') },
        { label: '09:00–12:12', onPress: () => navigate('filters') }, { label: 'Filtrar', onPress: () => navigate('filters') }]} />
      {timelineEvents.map(([time, heading, detail, target], index) =>
        <Card key={time} title={index === 0 && state.auditSaved ? state.auditSaved.result : heading} eyebrow={time}
          tone={index === 0 ? 'success' : undefined} onPress={() => navigate(target)}><Copy muted>{detail}</Copy></Card>)}
      {button('Consultar mapa de calor', 'heatmap', true)}
    </>;
  } else if (state.view === 'heatmap') {
    content = <>
      <Tabs items={[{ label: 'Por hora', active: true, onPress: () => {} }, { label: 'Por ubicación', onPress: () => navigate('map') }]} />
      <Card title="Alertas por día y hora"><Copy muted>Número de eventos nuevos; no cuenta lecturas repetidas.</Copy>
        <View style={S.heatRow}><Text style={S.heatLabel}>Día</Text>{heatmapHours.map(hour =>
          <View key={hour} style={S.heatCell}><Text style={S.heatText}>{hour}</Text></View>)}</View>
        {heatmapRows.map(([day, counts]) => <View key={day} style={S.heatRow}>
          <Text style={S.heatLabel}>{day}</Text>{counts.map((count, index) =>
            <Pressable key={index} accessibilityRole="button" accessibilityLabel={`${day}, ${heatmapHours[index]} horas: ${count} eventos de ejemplo`}
              accessibilityState={{ selected: selectedHeat?.day === day && selectedHeat?.index === index }}
              onPress={() => setSelectedHeat({ day, index, count })}
              style={[S.heatCell, { backgroundColor: ['#D3E5F0', '#ADD9EE', '#FFF1D0', '#F2BCBF'][heatLevel(count)],
                borderWidth: selectedHeat?.day === day && selectedHeat?.index === index ? 2 : 0, borderColor: C.navy }]}>
              <Text style={S.heatText}>{count}</Text>
            </Pressable>)}
        </View>)}
        <Copy muted>0 sin eventos · 1–2 baja · 3–5 media · 6+ alta</Copy>
      </Card>
      <Card title="Cómo interpretar el mapa"><Copy muted>Cada celda representa una franja de 2 horas. El color indica frecuencia, no temperatura.</Copy>
        {selectedHeat && <Copy>{selectedHeat.day} · {heatmapHours[selectedHeat.index]}:00 · {selectedHeat.count} eventos ilustrativos. El prototipo no incluye su detalle histórico.</Copy>}
      </Card>
      <Action onPress={() => history({ from: '2026-10-15', to: '2026-10-21' })}>Ver eventos del periodo</Action>
      {button('Cambiar fechas o exportar', 'filters', true)}
    </>;
  } else if (state.view === 'map') {
    content = <>
      <Tabs items={[{ label: 'Por ubicación', active: true, onPress: () => {} }, { label: 'Por hora', onPress: () => navigate('heatmap') }]} />
      <Card title="Ubicación de incidencias"><Copy muted>Plano ilustrativo · Toca una zona para ver el detalle.</Copy>
        <View style={S.floor}>
          <View style={S.row}>{[['E-01', 'Sin alertas', null], ['E-02', '2 alertas', 'order'], ['E-03', '2 alertas', 'stock']].map(([name, detail, target], index) =>
            <Pressable key={name} accessibilityRole="button" accessibilityLabel={`${name}, ${detail}`}
              onPress={() => target ? navigate(target) : history({ location: name })}
              style={[S.shelf, index === 1 ? S.danger : index === 2 ? S.warning : null]}>
              <Text style={S.shelfName}>{name}</Text><Text style={S.shelfDetail}>{detail}</Text>
            </Pressable>)}</View>
          <View style={S.row}><Pressable accessibilityRole="button" onPress={() => navigate('devices')} style={[S.area, S.warning]}>
            <Text style={S.shelfName}>Caja</Text><Text style={S.shelfDetail}>Gateway · 1</Text>
          </Pressable><Pressable accessibilityRole="button" onPress={() => navigate('environment')} style={[S.area, S.danger]}>
            <Text style={S.shelfName}>Entrada</Text><Text style={S.shelfDetail}>Ambiente + batería · 3</Text>
          </Pressable></View>
        </View><Copy muted>E-02: agotado + cámara · E-03: stock + discrepancia</Copy>
      </Card>
      <Card title="Frecuencia, no temperatura"><Copy muted>El color indica concentración de alertas en las ubicaciones configuradas. No representa seguimiento de personas.</Copy></Card>
      {button('Consultar lista de dispositivos', 'devices', true)}
    </>;
  } else if (state.view === 'order') {
    content = <>
      <Card tone="danger" title="Repisa agotada · 0 %"><Copy muted>Inventario registrado: 0 unidades · Detectado a las 12:10</Copy></Card>
      <Card title="Revisa antes de confirmar"><Pair label="Proveedor" value="Abarrotes del Norte" /><Pair label="Cantidad sugerida" value="24 unidades" />
        <Pair label="Presentación" value="Bolsas de 1 kg" /><Pair label="Estado" value="Pendiente de confirmación" /></Card>
      <Card title="Cantidad a solicitar"><View style={S.stepper}>
        <Pressable accessibilityRole="button" accessibilityLabel="Disminuir cantidad" disabled={state.quantity <= 1}
          accessibilityState={{ disabled: state.quantity <= 1 }} onPress={() => dispatch({ type: 'quantity', value: state.quantity - 1 })} style={[S.stepButton, state.quantity <= 1 && S.disabled]}><Text style={S.stepLabel}>−</Text></Pressable>
        <Text accessibilityLiveRegion="polite" style={S.stepValue}>{state.quantity} unidades</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Aumentar cantidad" disabled={state.quantity >= 999}
          accessibilityState={{ disabled: state.quantity >= 999 }} onPress={() => dispatch({ type: 'quantity', value: state.quantity + 1 })} style={[S.stepButton, state.quantity >= 999 && S.disabled]}><Text style={S.stepLabel}>+</Text></Pressable>
      </View></Card>
      <Card title="Confirmación del encargado"><Copy muted>La sugerencia no se convierte en pedido hasta que la confirmes. En esta vista previa solo se muestra un resultado local, sin guardar ni enviar al proveedor.</Copy></Card>
      <Action onPress={() => dispatch({ type: 'saveOrder' })}>Confirmar pedido de ejemplo</Action>
      {button('Volver a alertas de repisa', 'shelves', true)}
    </>;
  } else if (state.view === 'filters') {
    const choices = {
      category: ['Todas', 'Repisas', 'Inventario', 'Ambiente', 'Dispositivos', 'Pedidos'],
      severity: ['Todas', 'Alta', 'Media'], state: ['Todas', 'Nueva', 'En revisión', 'Atendida'],
      product: ['Todos', 'Arroz 1 kg', 'Azúcar 1 kg'], location: ['Todas', 'E-01', 'E-02', 'E-03', 'Entrada', 'Caja'],
    };
    content = <>
      <Card title="Periodo y alcance">
        <Copy muted>Fechas · AAAA-MM-DD</Copy>
        <TextInput accessibilityLabel="Fecha inicial" autoCapitalize="none" value={filters.from}
          onChangeText={from => dispatch({ type: 'filters', value: { from } })} style={S.input} maxLength={10} />
        <TextInput accessibilityLabel="Fecha final" autoCapitalize="none" value={filters.to}
          onChangeText={to => dispatch({ type: 'filters', value: { to } })} style={S.input} maxLength={10} />
        {[['category', 'Tipo'], ['severity', 'Severidad'], ['state', 'Estado'], ['product', 'Producto'], ['location', 'Ubicación']].map(([key, label]) =>
          <View key={key}><Pressable accessibilityRole="button" accessibilityLabel={`${label}: ${filters[key]}. Elegir filtro`}
            accessibilityState={{ expanded: expandedFilter === key }} style={S.filterRow}
            onPress={() => setExpandedFilter(expandedFilter === key ? null : key)}><Pair label={label} value={`${filters[key]} ›`} /></Pressable>
            {expandedFilter === key && choices[key].map(value => <Pressable key={value} accessibilityRole="radio"
              accessibilityState={{ checked: filters[key] === value }} style={S.option}
              onPress={() => { dispatch({ type: 'filters', value: { [key]: value } }); setExpandedFilter(null); }}>
              <View style={S.radio}>{filters[key] === value && <View style={S.radioDot} />}</View><Copy>{value}</Copy>
            </Pressable>)}
          </View>)}
        {filterError(filters) ? <Copy style={S.dangerText}>{filterError(filters)}</Copy> : null}
      </Card>
      <Action disabled={Boolean(filterError(filters))} onPress={() => navigate('history')}>Consultar historial de ejemplo</Action>
      <Card title="Exportar reporte"><Copy muted>Se incluirán rango, tipo, severidad, producto, equipo y fecha. La generación de archivos aún no está conectada.</Copy>
        <Tabs items={['PDF', 'Excel', 'CSV'].map(label => ({ label, onPress: () => setNotice(`Exportación ${label} pendiente de integración. No se ha generado ni descargado ningún archivo.`) }))} />
      </Card>
      {button('Ver mapa del periodo', 'heatmap', true)}
      <Copy muted>El mapa sigue mostrando el periodo ilustrativo 15–21 oct; no recalcula datos con estos filtros.</Copy>
    </>;
  } else if (state.view === 'auditSaved') {
    const saved = state.auditSaved || { result: 'Reposición pendiente', notes: 'Hay existencias en almacén.' };
    content = <>
      <Card tone="success" title={state.auditSaved ? 'Resultado de ejemplo guardado en esta vista' : 'Registro ilustrativo del diseño'}>
        <Copy muted>{saved.result} · Revisor de ejemplo: Marcos Solís</Copy></Card>
      <Card title="Registro de la revisión"><Pair label="Fecha de ejemplo" value="22 oct, 12:12" />
        <Pair label="Inventario" value="24 unidades, sin cambios" /><Pair label="Seguimiento" value={saved.result} />
        <Copy muted>{saved.notes}</Copy>
        <Copy muted>La alerta de stock continúa abierta hasta que se recupere la ocupación. No se ha enviado esta revisión al servidor.</Copy>
      </Card>
      {button('Consultar línea de tiempo', 'timeline')}
      {button('Volver a alertas', 'summary', true)}
    </>;
  } else if (state.view === 'orderSaved') {
    content = <>
      <Card tone="success" title="Pedido PED-024 · Ejemplo"><Copy muted>Confirmación ilustrativa · Marcos Solís · 22 oct, 12:12</Copy></Card>
      <Card title="Detalle del pedido"><Pair label="Producto" value="Arroz 1 kg · ARR-001" />
        <Pair label="Cantidad" value={`${state.orderSaved?.quantity ?? 24} unidades`} /><Pair label="Proveedor" value="Abarrotes del Norte" />
        <Pair label="Estado ilustrativo" value="Pendiente de recepción" /></Card>
      <Copy muted style={{ marginBottom: 14 }}>No se ha creado ni enviado un pedido real. Las existencias no cambian.</Copy>
      <Action onPress={() => history({ category: 'Pedidos' })}>Consultar eventos del pedido</Action>
      {button('Volver a alertas de repisa', 'shelves', true)}
    </>;
  } else if (state.view === 'history') {
    content = <>
      <Tabs items={[{ label: 'Todas', active: filters.category === 'Todas', onPress: () => dispatch({ type: 'filters', value: { ...initialFilters } }) },
        { label: 'Filtros', onPress: () => navigate('filters') }, { label: 'Exportar', onPress: () => navigate('filters') }]} />
      {filteredEvents.length ? filteredEvents.map(eventCard) : <Card title="Sin eventos de ejemplo para este filtro">
        <Copy muted>No se consultó el servidor. El historial ilustrativo disponible corresponde al 22 de octubre.</Copy>
      </Card>}
    </>;
  } else if (state.view === 'calibration') {
    content = <>
      <Card tone="warning" title="La imagen cambió"><Copy muted>Cambios importantes de iluminación o de posición pueden requerir recalibrar la zona.</Copy></Card>
      <Card title="Verifica antes de continuar"><Copy muted>Revisa el ángulo de la cámara, la luz y el acomodo del producto. Una lectura anómala aislada no confirma stock bajo.</Copy></Card>
      <Card title="Proceso de recalibración"><Copy>1. Capturar referencia de zona vacía{'\n'}2. Capturar referencia abastecida{'\n'}3. Revisar y guardar las referencias</Copy>
        <Pair label="Última calibración de ejemplo" value="18 oct, 09:20" /></Card>
      <Copy muted style={{ marginBottom: 14 }}>Conserva la asociación con Azúcar 1 kg. Las nuevas referencias reemplazan las anteriores. Este frame es informativo: no envía comandos a una cámara de ejemplo.</Copy>
      {button('Volver al detalle de la repisa', 'stock', true)}
    </>;
  }

  return <Screen key={`${state.preview}:${state.view}`} go={go} active="alerts">
    <View style={S.header}>
      <Head title={title} big={state.view === 'summary'} back={state.stack.length ? 'Alertas' : undefined} onBack={back}
        subtitle={state.preview ? subtitle : 'Monitoreo de la sucursal'} />
    </View>
    {state.preview && <View style={S.preview}>
      <Text style={S.previewTitle}>Vista previa · Datos de ejemplo · Sin conexión a eventos</Text>
      <Pressable accessibilityRole="button" style={S.exit} onPress={() => { setNotice(''); setSelectedHeat(null); dispatch({ type: 'exit' }); }}>
        <Text style={S.exitText}>Salir de la vista previa</Text>
      </Pressable>
    </View>}
    {notice ? <View accessibilityLiveRegion="polite"><Card title="Función pendiente"><Copy>{notice}</Copy></Card></View> : null}
    {content}
  </Screen>;
}
