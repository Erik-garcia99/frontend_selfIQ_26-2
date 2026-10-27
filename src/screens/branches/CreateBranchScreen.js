import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Page, Card, Field, Button, Message, TokenModal } from '../../components/ui';
import { FeedbackDialog } from '../../components/FeedbackDialog';
import { createBranch } from '../../services/branchService';
import { useAuth } from '../../context/AuthContext';
import { useAsyncAction } from '../../utils/useAsyncAction';
import { describeError } from '../../utils/errorMessages';
import { mexicanTimezones } from '../../config/timezones';
import { styles } from '../../theme/styles';
const empty = { registration_token: '', name: '', address: '', timezone: 'America/Tijuana', category: '' };
export default function CreateBranchScreen({ go }) {
  const [form, setForm] = useState(empty); const [open, setOpen] = useState(false); const [issued, setIssued] = useState(null); const [feedback, setFeedback] = useState(null);
  const { accessToken } = useAuth(); const task = useAsyncAction();
  const update = (key) => (value) => setForm((old) => ({ ...old, [key]: value }));
  const submit = async () => {
    if (!form.registration_token.trim() || form.name.trim().length < 2 || form.address.trim().length < 5 || !form.category.trim()) return task.setError('Completa el token global, nombre, dirección y rubro de la sucursal.');
    const name = form.name.trim();
    const result = await task.run(() => createBranch(Object.fromEntries(Object.entries(form).map(([key, value]) => [key, value.trim()])), accessToken));
    if (!result) {
      const info = describeError(task.getFailure());
      task.setError('');
      return setFeedback({ variant: 'error', ...info, actionLabel: 'Corregir datos', onClose: () => setFeedback(null) });
    }
    setForm(empty);
    setFeedback({ variant: 'success', title: 'Sucursal registrada', message: `"${name}" quedó creada y ya puede recibir usuarios y Raspberry.`, hint: 'Guarda el token ahora: no se puede volver a mostrar.', actionLabel: 'Ver token', onClose: () => {
      setFeedback(null);
      setIssued({ title: 'Sucursal creada', token: result.branch_token, idLabel: 'ID de sucursal', id: result.id,
        detail: 'Este token de sucursal permite registrar sus usuarios y configurar sus Raspberry. No es el token global de empresa.' });
    } });
  };
  return <Page title="Creación de sucursal" go={go} busy={task.loading}><Card>
    <Field label="Token global de empresa" autoCapitalize="none" value={form.registration_token} onChangeText={update('registration_token')} editable={!task.loading} />
    <Field label="Nombre de la sucursal" value={form.name} onChangeText={update('name')} editable={!task.loading} />
    <Field label="Dirección" value={form.address} onChangeText={update('address')} editable={!task.loading} />
    <Text style={styles.fieldLabel}>Zona horaria</Text><Button dark={false} disabled={task.loading} onPress={() => setOpen(!open)}>{mexicanTimezones.find((zone) => zone.value === form.timezone)?.label}</Button>
    {open && <View style={{ marginTop: 12 }}>{mexicanTimezones.map((zone) => <Pressable key={zone.value} onPress={() => { update('timezone')(zone.value); setOpen(false); }} style={{ padding: 12 }}><Text>{zone.label}</Text></Pressable>)}</View>}
    <View style={{ marginTop: 24 }}><Field label="Rubro del negocio" value={form.category} onChangeText={update('category')} editable={!task.loading} /></View>
    <Message error={task.error} /><Button loading={task.loading} onPress={submit}>Registrar sucursal</Button>
  </Card><TokenModal issued={issued} onSaved={() => setIssued(null)} />
  <FeedbackDialog visible={Boolean(feedback)} variant={feedback?.variant} title={feedback?.title} message={feedback?.message}
    code={feedback?.code} hint={feedback?.hint} actionLabel={feedback?.actionLabel} onClose={feedback?.onClose} /></Page>;
}
