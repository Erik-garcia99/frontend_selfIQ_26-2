import { useState } from 'react';
import { Text, View } from 'react-native';
import { Page, Card, Field, Button, Message } from '../../components/ui';
import { FeedbackDialog } from '../../components/FeedbackDialog';
import { getGateway, sendGatewayCommand } from '../../services/gatewayService';
import { useAuth } from '../../context/AuthContext';
import { useAsyncAction } from '../../utils/useAsyncAction';
import { describeError } from '../../utils/errorMessages';
import { isGatewayId } from '../../utils/validation';

const SUCCESS = {
  'tcp.enable': { title: 'AP y TCP activos', message: 'Enciende la ESP32 nueva para que reciba las credenciales.', hint: 'La ventana se cierra tras cinco minutos sin solicitudes válidas.' },
  'tcp.disable': { title: 'AP y TCP cerrados', message: 'La Raspberry conserva su Wi-Fi y deja de aceptar nodos nuevos.', hint: 'Puedes volver a abrirlos cuando registres otro módulo.' },
  status: { title: 'Estado consultado', message: 'La Raspberry respondió al comando de estado.', hint: 'Los datos de TCP se muestran debajo del identificador.' },
};

export default function GatewayScreen({ go }) {
  const [id, setId] = useState(''); const [connection, setConnection] = useState(null); const [state, setState] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const { accessToken } = useAuth(); const task = useAsyncAction();
  const perform = async (command) => {
    if (!isGatewayId(id)) return task.setError('Escribe el identificador de tu Raspberry.');
    const result = await task.run(() => command === 'connection' ? getGateway(id.trim(), accessToken) : sendGatewayCommand(id.trim(), command, accessToken));
    if (!result) {
      setState(null); setConnection(null);
      const info = describeError(task.getFailure());
      task.setError('');
      return setFeedback({ variant: 'error', ...info, actionLabel: 'Entendido', onClose: () => setFeedback(null) });
    }
    if (command === 'connection') {
      setConnection(result.connected); setState(null);
      return setFeedback(result.connected
        ? { variant: 'success', title: 'Raspberry conectada', message: 'La Raspberry está en línea y aceptando comandos.', hint: `Estado de registro: ${result.registration_status}`, actionLabel: 'Entendido', onClose: () => setFeedback(null) }
        : { variant: 'error', code: result.registration_status === 'token_invalid' ? 'E-TOKEN' : 'E-OFFLINE', title: 'Raspberry desconectada', message: result.alert || 'La Raspberry no está conectada al backend.', hint: 'Revisa que tenga internet y que el token de la sucursal siga vigente.', actionLabel: 'Entendido', onClose: () => setFeedback(null) });
    }
    setConnection(true); setState(result);
    const extra = command === 'tcp.enable' && result.tcp_activo === false ? 'Consulta el estado: TCP no figura activo.'
      : command === 'tcp.disable' && result.tcp_activo !== false ? 'Consulta el estado: TCP todavía figura activo.' : '';
    setFeedback({ variant: 'success', ...SUCCESS[command], message: extra ? `${SUCCESS[command].message} ${extra}` : SUCCESS[command].message, actionLabel: 'Entendido', onClose: () => setFeedback(null) });
  };
  return <Page title="Agregar nodo" go={go} back="panel" active="panel" busy={task.loading}><Card>
    <Field label="ID de Raspberry" placeholder="Ej. rpi-local-01" autoCapitalize="none" value={id} editable={!task.loading}
      onChangeText={(value) => { setId(value); setConnection(null); setState(null); }} />
    <Text style={{ marginBottom: 18, lineHeight: 21 }}>La Raspberry abrirá su AP y TCP para que la ESP32 reciba las credenciales guardadas. Se cerrarán tras cinco minutos sin solicitudes válidas.</Text>
    {connection !== null && <Text style={{ marginBottom: 14 }}>Raspberry: {connection ? 'conectada al backend' : 'desconectada'}</Text>}
    {state && <Text style={{ marginBottom: 14 }}>TCP: {state.tcp_activo ? 'activo' : 'cerrado'}{state.segundos_para_cierre != null ? ` · Cierre en ${state.segundos_para_cierre} s (última consulta)` : ''}</Text>}
    <Message error={task.error} />
    <View style={{ gap: 12 }}><Button loading={task.loading} onPress={() => perform('tcp.enable')}>Buscar nuevos nodos</Button>
      <Button disabled={task.loading} onPress={() => perform('status')}>Consultar estado</Button>
      <Button disabled={task.loading} dark={false} onPress={() => perform('tcp.disable')}>Cerrar AP y TCP</Button>
      <Button disabled={task.loading} dark={false} onPress={() => perform('connection')}>Comprobar conexión</Button></View>
  </Card>
  <FeedbackDialog visible={Boolean(feedback)} variant={feedback?.variant} title={feedback?.title} message={feedback?.message}
    code={feedback?.code} hint={feedback?.hint} actionLabel={feedback?.actionLabel} onClose={feedback?.onClose} /></Page>;
}
