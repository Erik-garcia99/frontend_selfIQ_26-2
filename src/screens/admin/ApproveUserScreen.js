import { useState } from 'react';
import { Text } from 'react-native';
import { Page, Card, Field, Button, Message } from '../../components/ui';
import { FeedbackDialog } from '../../components/FeedbackDialog';
import { approveUser } from '../../services/authService';
import { useAuth } from '../../context/AuthContext';
import { useAsyncAction } from '../../utils/useAsyncAction';
import { describeError } from '../../utils/errorMessages';
import { roleLabel, isUuid } from '../../utils/validation';

export default function ApproveUserScreen({ go }) {
  const [id, setId] = useState(''); const [feedback, setFeedback] = useState(null);
  const { accessToken } = useAuth(); const task = useAsyncAction();
  const submit = async () => {
    if (!isUuid(id)) return task.setError('Escribe el ID del usuario pendiente.');
    const result = await task.run(() => approveUser(id.trim(), accessToken));
    if (!result) {
      const info = describeError(task.getFailure());
      task.setError('');
      return setFeedback({ variant: 'error', ...info, actionLabel: 'Entendido', onClose: () => setFeedback(null) });
    }
    setId('');
    setFeedback({ variant: 'success', title: 'Cuenta aprobada', message: `${result.first_name} ${result.last_name} ya puede iniciar sesión.`, hint: `${roleLabel(result)} · ${result.email}`, actionLabel: 'Entendido', onClose: () => setFeedback(null) });
  };
  return <Page title="Aprobar usuario" go={go} back="panel" active="panel" busy={task.loading}><Card>
    <Text style={{ lineHeight: 21, marginBottom: 18 }}>Solicita el ID que recibió el usuario al registrarse para aprobar su cuenta.</Text>
    <Field label="ID de usuario pendiente" autoCapitalize="none" value={id} onChangeText={setId} editable={!task.loading} />
    <Message error={task.error} /><Button loading={task.loading} onPress={submit}>Aprobar cuenta</Button>
  </Card>
  <FeedbackDialog visible={Boolean(feedback)} variant={feedback?.variant} title={feedback?.title} message={feedback?.message}
    code={feedback?.code} hint={feedback?.hint} actionLabel={feedback?.actionLabel} onClose={feedback?.onClose} /></Page>;
}
