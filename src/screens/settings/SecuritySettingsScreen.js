import { useState } from 'react';
import { Screen, Head, Info, Primary, TextField, LinkButton } from '../../components/layout';
import { Message } from '../../components/ui';
import { FeedbackDialog } from '../../components/FeedbackDialog';
import { useAuth } from '../../context/AuthContext';
import { changePassword } from '../../services/settingsService';
import { useAsyncAction } from '../../utils/useAsyncAction';
import { describeError } from '../../utils/errorMessages';

const empty = { current: '', next: '', confirmation: '' };

export default function SecuritySettingsScreen({ go }) {
  const { accessToken } = useAuth();
  const [form, setForm] = useState(empty);
  const [info, setInfo] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const task = useAsyncAction();
  const update = (key) => (value) => setForm((old) => ({ ...old, [key]: value }));

  const submit = async () => {
    if (!form.current) return task.setError('Escribe tu contraseña actual.');
    if (form.next.length < 8) return task.setError('La nueva contraseña debe tener al menos 8 caracteres.');
    if (form.next === form.current) return task.setError('La nueva contraseña debe ser distinta de la actual.');
    if (form.next !== form.confirmation) return task.setError('Las contraseñas no coinciden.');
    const result = await task.run(() => changePassword(form.current, form.next, accessToken));
    if (!result) {
      const info = describeError(task.getFailure());
      task.setError('');
      return setFeedback({ variant: 'error', ...info, actionLabel: 'Corregir datos', onClose: () => setFeedback(null) });
    }
    setForm(empty);
    setFeedback({ variant: 'success', title: 'Contraseña actualizada', message: 'Usa tu nueva contraseña la próxima vez que inicies sesión.',
      actionLabel: 'Entendido', onClose: () => setFeedback(null) });
  };

  return <Screen go={go} active="settings">
    <Head title="Seguridad" back="Ajustes" onBack={() => go('settings')} subtitle="Protege el acceso a tu cuenta." />
    <Info title="Cambiar contraseña">Introduce tu contraseña actual y elige una nueva de al menos 8 caracteres.</Info>
    <TextField label="Contraseña actual" placeholder="••••••••" secureTextEntry autoCapitalize="none" autoCorrect={false}
      value={form.current} onChangeText={update('current')} editable={!task.loading} />
    <TextField label="Nueva contraseña" placeholder="Mínimo 8 caracteres" secureTextEntry autoCapitalize="none" autoCorrect={false}
      value={form.next} onChangeText={update('next')} editable={!task.loading} />
    <TextField label="Confirmar nueva contraseña" placeholder="Repite la nueva contraseña" secureTextEntry autoCapitalize="none" autoCorrect={false}
      value={form.confirmation} onChangeText={update('confirmation')} editable={!task.loading} />
    <Message error={task.error} />
    <Primary tall loading={task.loading} onPress={submit}>Actualizar contraseña</Primary>
    <Info>Usa una contraseña larga y exclusiva para SelfIQ.</Info>
    <LinkButton onPress={() => setInfo(true)}>¿Olvidaste tu contraseña?</LinkButton>
    <FeedbackDialog visible={info} variant="info" title="Restablecer acceso" message="Tu administrador puede restablecer tu contraseña desde el panel de administración."
      hint="El envío automático de correos de recuperación todavía no está activo." actionLabel="Entendido" onClose={() => setInfo(false)} />
    <FeedbackDialog visible={Boolean(feedback)} variant={feedback?.variant} title={feedback?.title} message={feedback?.message}
      code={feedback?.code} hint={feedback?.hint} actionLabel={feedback?.actionLabel} onClose={feedback?.onClose} />
  </Screen>;
}
