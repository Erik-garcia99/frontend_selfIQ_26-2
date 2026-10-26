import { useState } from 'react';
import { Text, View } from 'react-native';
import { Page, Card, Field, Button, Message } from '../../components/ui';
import { getGateway, sendGatewayCommand } from '../../services/gatewayService';
import { useAuth } from '../../context/AuthContext';
import { useAsyncAction } from '../../utils/useAsyncAction';
import { isGatewayId } from '../../utils/validation';
export default function GatewayScreen({ go }) {
  const [id, setId] = useState(''); const [connection, setConnection] = useState(null); const [state, setState] = useState(null); const [message, setMessage] = useState('');
  const { accessToken } = useAuth(); const task = useAsyncAction();
  const perform = async (command) => {
    if (!isGatewayId(id)) return task.setError('Escribe el identificador de tu Raspberry.');
    setMessage('');
    const result = await task.run(() => command === 'connection' ? getGateway(id.trim(), accessToken) : sendGatewayCommand(id.trim(), command, accessToken));
    if (!result) { setState(null); setConnection(null); return; }
    if (command === 'connection') { setConnection(result.connected); setState(null); }
    else {
      setConnection(true); setState(result);
      if (command === 'tcp.enable') setMessage(result.tcp_activo ? 'AP y TCP activos. Enciende la ESP32 nueva para que solicite las credenciales. No necesitas conectarte al AP.' : 'Consulta el estado: TCP no figura activo.');
      if (command === 'tcp.disable') setMessage(result.tcp_activo === false ? 'AP y TCP cerrados. La Raspberry conserva su Wi-Fi.' : 'Consulta el estado: TCP todavía figura activo.');
    }
  };
  return <Page title="Agregar nodo" go={go} back="panel" active="panel" busy={task.loading}><Card>
    <Field label="ID de Raspberry" placeholder="Ej. rpi-local-01" autoCapitalize="none" value={id} editable={!task.loading}
      onChangeText={(value) => { setId(value); setConnection(null); setState(null); setMessage(''); }} />
    <Text style={{ marginBottom: 18, lineHeight: 21 }}>La Raspberry abrirá su AP y TCP para que la ESP32 reciba las credenciales guardadas. Se cerrarán tras cinco minutos sin solicitudes válidas.</Text>
    {connection !== null && <Text style={{ marginBottom: 14 }}>Raspberry: {connection ? 'conectada al backend' : 'desconectada'}</Text>}
    {state && <Text style={{ marginBottom: 14 }}>TCP: {state.tcp_activo ? 'activo' : 'cerrado'}{state.segundos_para_cierre != null ? ` · Cierre en ${state.segundos_para_cierre} s (última consulta)` : ''}</Text>}
    <Message error={task.error} success={message} />
    <View style={{ gap: 12 }}><Button loading={task.loading} onPress={() => perform('tcp.enable')}>Buscar nuevos nodos</Button>
      <Button disabled={task.loading} onPress={() => perform('status')}>Consultar estado</Button>
      <Button disabled={task.loading} dark={false} onPress={() => perform('tcp.disable')}>Cerrar AP y TCP</Button>
      <Button disabled={task.loading} dark={false} onPress={() => perform('connection')}>Comprobar conexión</Button></View>
  </Card></Page>;
}
