import { useEffect, useState } from 'react';
import { Modal, Text, View } from 'react-native';
import { Page, Card, Action, Button, Message } from '../../components/ui';
import { FeedbackDialog } from '../../components/FeedbackDialog';
import { useAuth } from '../../context/AuthContext';
import { approveUser, getPendingUsers, rejectUser } from '../../services/authService';
import { useAsyncAction } from '../../utils/useAsyncAction';
import { describeError } from '../../utils/errorMessages';
import { canApprove, roleLabel } from '../../utils/validation';

const formatDate = (value) => {
  if (!value) return '—';
  try { return new Date(value).toLocaleString(); } catch { return String(value); }
};

export default function ApproveUserScreen({ go }) {
  const { user, accessToken } = useAuth();
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState('');
  const [selected, setSelected] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const task = useAsyncAction();

  useEffect(() => {
    let active = true;
    getPendingUsers(accessToken)
      .then((data) => { if (active) setPending(Array.isArray(data) ? data : []); })
      .catch((failure) => { if (active) setListError(describeError(failure).message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [accessToken]);

  const removePending = (id) => setPending((old) => old.filter((item) => item.id !== id));

  const approve = async () => {
    if (!selected) return;
    const result = await task.run(() => approveUser(selected.id, accessToken));
    if (!result) {
      const info = describeError(task.getFailure());
      task.setError('');
      return setFeedback({ variant: 'error', ...info, actionLabel: 'Entendido', onClose: () => setFeedback(null) });
    }
    removePending(selected.id); setSelected(null);
    setFeedback({ variant: 'success', title: 'Cuenta aprobada', message: `${result.first_name} ${result.last_name} ya puede iniciar sesión.`,
      hint: `${roleLabel(result)} · ${result.email}`, actionLabel: 'Entendido', onClose: () => setFeedback(null) });
  };

  const reject = async () => {
    if (!selected) return;
    const result = await task.run(() => rejectUser(selected.id, accessToken));
    if (!result) {
      const info = describeError(task.getFailure());
      task.setError('');
      return setFeedback({ variant: 'error', ...info, actionLabel: 'Entendido', onClose: () => setFeedback(null) });
    }
    removePending(selected.id); setSelected(null);
    setFeedback({ variant: 'success', title: 'Cuenta rechazada', message: 'La cuenta quedó desactivada y no podrá iniciar sesión.',
      actionLabel: 'Entendido', onClose: () => setFeedback(null) });
  };

  if (!canApprove(user)) {
    return <Page title="Aprobar usuario" go={go} back="panel" active="panel"><Card>
      <Text>Tu cuenta no tiene permisos para aprobar usuarios.</Text></Card></Page>;
  }

  return <Page title="Aprobar usuario" go={go} back="panel" active="panel" busy={task.loading}>
    {loading ? <Card><Text>Cargando cuentas pendientes…</Text></Card> : null}
    {listError ? <Card><Message error={listError} /></Card> : null}
    {!loading && !listError && pending.length === 0 ? <Card><Text>No hay cuentas pendientes de aprobación.</Text></Card> : null}
    {pending.map((item) => (
      <Action key={item.id} title={`${item.first_name} ${item.last_name}`.trim() || item.email}
        detail={`${item.email}${item.phone_number ? ` · ${item.phone_number}` : ''}`}
        onPress={() => setSelected(item)} />
    ))}
    <Card><Text style={{ lineHeight: 21 }}>Pulsa una cuenta para ver sus datos y aprobarla o rechazarla.</Text></Card>

    <Modal visible={Boolean(selected)} transparent animationType="fade" onRequestClose={() => !task.loading && setSelected(null)}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,.45)', justifyContent: 'center', padding: 24 }}>
        <View style={{ backgroundColor: '#fff', borderRadius: 20, padding: 20 }}>
          <Text style={{ fontSize: 18, fontWeight: '700', color: '#001D39', marginBottom: 12 }}>Datos de la cuenta</Text>
          {selected ? <>
            <Text style={{ marginBottom: 4 }}><Text style={{ fontWeight: '600' }}>Nombre: </Text>{selected.first_name} {selected.last_name}</Text>
            <Text style={{ marginBottom: 4 }}><Text style={{ fontWeight: '600' }}>Correo: </Text>{selected.email}</Text>
            <Text style={{ marginBottom: 4 }}><Text style={{ fontWeight: '600' }}>Teléfono: </Text>{selected.phone_number || 'Sin teléfono'}</Text>
            <Text style={{ marginBottom: 4 }}><Text style={{ fontWeight: '600' }}>Rol solicitado: </Text>{roleLabel(selected)}</Text>
            <Text style={{ marginBottom: 4 }}><Text style={{ fontWeight: '600' }}>Sucursal: </Text>{selected.branch_id ? String(selected.branch_id).slice(0, 8) + '…' : '—'}</Text>
            <Text style={{ marginBottom: 16 }}><Text style={{ fontWeight: '600' }}>Registrado: </Text>{formatDate(selected.created_at)}</Text>
          </> : null}
          <Message error={task.error} />
          <Button loading={task.loading} onPress={approve}>Aprobar cuenta</Button>
          <Button loading={task.loading} dark={false} onPress={reject}>Rechazar cuenta</Button>
          <Button disabled={task.loading} dark={false} onPress={() => setSelected(null)}>Cancelar</Button>
        </View>
      </View>
    </Modal>

    <FeedbackDialog visible={Boolean(feedback)} variant={feedback?.variant} title={feedback?.title} message={feedback?.message}
      code={feedback?.code} hint={feedback?.hint} actionLabel={feedback?.actionLabel} onClose={feedback?.onClose} />
  </Page>;
}
