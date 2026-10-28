import { useState } from 'react';
import { Screen, Head, Identity, FieldCard, Info, Primary } from '../../components/layout';
import { Message } from '../../components/ui';
import { FeedbackDialog } from '../../components/FeedbackDialog';
import { useAuth } from '../../context/AuthContext';
import { updateProfile } from '../../services/settingsService';
import { useAsyncAction } from '../../utils/useAsyncAction';
import { describeError } from '../../utils/errorMessages';
import { isEmail, roleLabel } from '../../utils/validation';

export default function ProfileSettingsScreen({ go }) {
  const { user, accessToken, refreshUser } = useAuth();
  const [form, setForm] = useState({
    first_name: user?.first_name || '',
    last_name: user?.last_name || '',
    email: user?.email || '',
    phone_number: user?.phone_number || '',
  });
  const [feedback, setFeedback] = useState(null);
  const task = useAsyncAction();
  const update = (key) => (value) => setForm((old) => ({ ...old, [key]: value }));
  const name = [form.first_name, form.last_name].filter(Boolean).join(' ') || '—';

  const submit = async () => {
    if (!form.first_name.trim() || !form.last_name.trim()) return task.setError('Completa nombres y apellidos.');
    if (!isEmail(form.email)) return task.setError('Escribe un correo electrónico válido.');
    const result = await task.run(() => updateProfile({
      first_name: form.first_name.trim(),
      last_name: form.last_name.trim(),
      email: form.email.trim().toLowerCase(),
      phone_number: form.phone_number.trim() || null,
    }, accessToken));
    if (!result) {
      const info = describeError(task.getFailure());
      task.setError('');
      return setFeedback({ variant: 'error', ...info, actionLabel: 'Corregir datos', onClose: () => setFeedback(null) });
    }
    setForm({
      first_name: result.first_name,
      last_name: result.last_name,
      email: result.email,
      phone_number: result.phone_number || '',
    });
    await refreshUser().catch(() => {});
    setFeedback({ variant: 'success', title: 'Datos guardados', message: 'Tu perfil se actualizó correctamente.',
      actionLabel: 'Entendido', onClose: () => setFeedback(null) });
  };

  return <Screen go={go} active="settings">
    <Head title="Datos personales" back="Ajustes" onBack={() => go('settings')} subtitle="Consulta y actualiza la información de tu cuenta." />
    <Identity name={name} detail={`${roleLabel(user)}${form.email ? ` · ${form.email}` : ''}`} />
    <FieldCard label="Nombres" value={form.first_name} onChangeText={update('first_name')} editable={!task.loading} autoCapitalize="words" />
    <FieldCard label="Apellidos" value={form.last_name} onChangeText={update('last_name')} editable={!task.loading} autoCapitalize="words" />
    <FieldCard label="Correo electrónico" value={form.email} onChangeText={update('email')} editable={!task.loading}
      keyboardType="email-address" autoCapitalize="none" />
    <FieldCard label="Teléfono" value={form.phone_number} onChangeText={update('phone_number')} editable={!task.loading}
      placeholder="Sin teléfono registrado" keyboardType="phone-pad" autoCapitalize="none" />
    <Message error={task.error} />
    <Info title={`${roleLabel(user)}${user?.branch_id ? ` · ${String(user.branch_id).slice(0, 8)}…` : ''}`}>
      La sucursal y el rol los gestiona tu administrador. Si cambias el correo, deberás usarlo en tu próximo inicio de sesión.
    </Info>
    <Primary tall loading={task.loading} onPress={submit}>Guardar cambios</Primary>
    <FeedbackDialog visible={Boolean(feedback)} variant={feedback?.variant} title={feedback?.title} message={feedback?.message}
      code={feedback?.code} hint={feedback?.hint} actionLabel={feedback?.actionLabel} onClose={feedback?.onClose} />
  </Screen>;
}
