import { useState } from 'react';
import { Text } from 'react-native';
import { Page, Card, Field, Button, Message } from '../../components/ui';
import { approveUser } from '../../services/authService';
import { useAuth } from '../../context/AuthContext';
import { useAsyncAction } from '../../utils/useAsyncAction';
import { isUuid } from '../../utils/validation';
export default function ApproveUserScreen({ go }) {
  const [id, setId] = useState(''); const [message, setMessage] = useState('');
  const { accessToken } = useAuth(); const task = useAsyncAction();
  const submit = async () => {
    if (!isUuid(id)) return task.setError('Escribe el ID del usuario pendiente.');
    const result = await task.run(() => approveUser(id.trim(), accessToken));
    if (result) { setMessage(`Cuenta de ${result.first_name} ${result.last_name} aprobada. Ya puede iniciar sesión.`); setId(''); }
  };
  return <Page title="Aprobar usuario" go={go} back="panel" active="panel" busy={task.loading}><Card>
    <Text style={{ lineHeight: 21, marginBottom: 18 }}>Solicita el ID que recibió el usuario al registrarse para aprobar su cuenta.</Text>
    <Field label="ID de usuario pendiente" autoCapitalize="none" value={id} onChangeText={setId} editable={!task.loading} />
    <Message error={task.error} success={message} /><Button loading={task.loading} onPress={submit}>Aprobar cuenta</Button>
  </Card></Page>;
}
