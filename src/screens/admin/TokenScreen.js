import { useState } from 'react';
import { Text, View } from 'react-native';
import { Page, Card, Field, Button, Message, TokenModal } from '../../components/ui';
import { FeedbackDialog } from '../../components/FeedbackDialog';
import { issueBusinessToken, issueBranchToken } from '../../services/branchService';
import { useAuth } from '../../context/AuthContext';
import { useAsyncAction } from '../../utils/useAsyncAction';
import { describeError } from '../../utils/errorMessages';
import { isSuperuser, isUuid } from '../../utils/validation';

export default function TokenScreen({ go }) {
  const { user, accessToken } = useAuth(); const [mode, setMode] = useState('branch');
  const [id, setId] = useState(user?.branch_id || ''); const [confirmed, setConfirmed] = useState(false);
  const [issued, setIssued] = useState(null); const [feedback, setFeedback] = useState(null);
  const task = useAsyncAction();
  const changeMode = (next) => { setMode(next); setId(next === 'branch' ? user?.branch_id || '' : user?.organization_id || ''); setConfirmed(false); task.setError(''); };
  const submit = async () => {
    if (!isUuid(id)) return task.setError('Escribe un ID válido.');
    if (!confirmed) { setConfirmed(true); return; }
    const branchMode = mode === 'branch';
    const result = await task.run(() => branchMode ? issueBranchToken(id.trim(), accessToken) : issueBusinessToken(id.trim(), accessToken));
    setConfirmed(false);
    if (!result) {
      const info = describeError(task.getFailure());
      task.setError('');
      return setFeedback({ variant: 'error', ...info, actionLabel: 'Entendido', onClose: () => setFeedback(null) });
    }
    const issuedToken = { title: branchMode ? 'Token de sucursal' : 'Token global de empresa',
      token: branchMode ? result.branch_token : result.business_token, id: id.trim(), idLabel: branchMode ? 'Sucursal' : 'Empresa',
      detail: branchMode ? 'Úsalo para registrar usuarios y en las Raspberry de esta sucursal. Actualiza las Raspberry que tenían el token anterior.' : 'Entrega este token al propietario de la empresa para crear sus sucursales.' };
    setFeedback({ variant: 'success', title: 'Token generado',
      message: branchMode ? 'El token de sucursal quedó emitido y los anteriores fueron revocados.' : 'El token global de la empresa quedó emitido y los anteriores fueron revocados.',
      hint: 'Se muestra una sola vez: no se puede volver a consultar. Cópialo ahora.', actionLabel: 'Ver token',
      onClose: () => { setFeedback(null); setIssued(issuedToken); } });
  };
  return <Page title="Tokens de acceso" go={go} back="panel" active="panel" busy={task.loading}><Card>
    {isSuperuser(user) && <View style={{ gap: 12, marginBottom: 24 }}><Button disabled={task.loading} dark={mode === 'branch'} onPress={() => changeMode('branch')}>Token de sucursal</Button><Button disabled={task.loading} dark={mode === 'business'} onPress={() => changeMode('business')}>Token global de empresa</Button></View>}
    <Field label={mode === 'branch' ? 'ID de sucursal' : 'ID de empresa'} autoCapitalize="none" value={id} onChangeText={(value) => { setId(value); setConfirmed(false); }} editable={!task.loading} />
    <Text style={{ lineHeight: 21, marginBottom: 18 }}>{mode === 'branch' ? 'Genera un token de sucursal para usuarios y Raspberry.' : 'Genera el token global para crear sucursales de esta empresa.'}</Text>
    {confirmed && <Message error={mode === 'branch' ? 'Esta emisión reemplazará los tokens anteriores y desconectará las Raspberry de esta sucursal. Pulsa nuevamente para confirmar.' : 'Esta emisión reemplazará los tokens globales anteriores de la empresa. Pulsa nuevamente para confirmar.'} />}
    <Message error={task.error} /><Button loading={task.loading} onPress={submit}>{confirmed ? 'Confirmar emisión y reemplazo' : 'Generar token'}</Button>
    {confirmed && <View style={{ marginTop: 12 }}><Button disabled={task.loading} dark={false} onPress={() => setConfirmed(false)}>Cancelar</Button></View>}
  </Card><TokenModal issued={issued} onSaved={() => setIssued(null)} />
  <FeedbackDialog visible={Boolean(feedback)} variant={feedback?.variant} title={feedback?.title} message={feedback?.message}
    code={feedback?.code} hint={feedback?.hint} actionLabel={feedback?.actionLabel} onClose={feedback?.onClose} /></Page>;
}
