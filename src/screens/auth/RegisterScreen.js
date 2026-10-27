import { useState } from 'react';
import { Text, View } from 'react-native';
import { AuthScreen, Head, TextField, Primary, LinkButton } from '../../components/layout';
import { FeedbackDialog } from '../../components/FeedbackDialog';
import { Message } from '../../components/ui';
import { register } from '../../services/authService';
import { useAsyncAction } from '../../utils/useAsyncAction';
import { describeError } from '../../utils/errorMessages';
import { isEmail } from '../../utils/validation';
import { layoutStyles as L } from '../../theme/layout';

const empty = { first_name: '', last_name: '', email: '', password: '', confirmation: '', registration_token: '' };

export default function RegisterScreen({ go }) {
  const [form, setForm] = useState(empty); const [createdId, setCreatedId] = useState(''); const [feedback, setFeedback] = useState(null); const task = useAsyncAction();
  const update = (key) => (value) => setForm((old) => ({ ...old, [key]: value }));
  // Validación original: errores inline, sin modal.
  const submit = async () => {
    if (!form.first_name.trim() || !form.last_name.trim() || !isEmail(form.email) || !form.registration_token.trim()) return task.setError('Completa nombres, apellidos, correo y token de sucursal.');
    if (form.password.length < 8) return task.setError('La contraseña debe tener al menos 8 caracteres.');
    if (form.password !== form.confirmation) return task.setError('Las contraseñas no coinciden.');
    const result = await task.run(() => register({ first_name: form.first_name.trim(), last_name: form.last_name.trim(),
      email: form.email.trim().toLowerCase(), password: form.password, registration_token: form.registration_token.trim() }));
    if (!result) {
      const info = describeError(task.getFailure());
      task.setError('');
      return setFeedback({ variant: 'error', ...info, actionLabel: 'Corregir datos', onClose: () => setFeedback(null) });
    }
    setCreatedId(result.user_id); setForm(empty);
    setFeedback({ variant: 'success', title: 'Cuenta creada', message: 'Tu registro quedó guardado y está pendiente de aprobación.', hint: 'Un administrador debe aprobar la cuenta antes de que puedas iniciar sesión.', actionLabel: 'Entendido', onClose: () => setFeedback(null) });
  };
  return <AuthScreen>
    <View>
      <View style={L.authHead}>
        <Head title="Creación de usuario" subtitle="Registra tu cuenta con el token de tu sucursal. Un administrador la aprobará después." />
      </View>
      <View style={L.authCard}>
        <TextField label="Nombres" placeholder="Marcos" value={form.first_name} onChangeText={update('first_name')} editable={!task.loading} />
        <TextField label="Apellidos" placeholder="Solís" value={form.last_name} onChangeText={update('last_name')} editable={!task.loading} />
        <TextField label="Correo" placeholder="tu@correo.com" keyboardType="email-address" autoCapitalize="none" autoCorrect={false} value={form.email} onChangeText={update('email')} editable={!task.loading} />
        <TextField label="Contraseña" placeholder="Mínimo 8 caracteres" secureTextEntry autoCapitalize="none" value={form.password} onChangeText={update('password')} editable={!task.loading} />
        <TextField label="Confirmar contraseña" placeholder="Repite la contraseña" secureTextEntry autoCapitalize="none" value={form.confirmation} onChangeText={update('confirmation')} editable={!task.loading} />
        <TextField label="Token de la sucursal" placeholder="Token que te dio tu administrador" autoCapitalize="none" autoCorrect={false} value={form.registration_token} onChangeText={update('registration_token')} editable={!task.loading} />
        <Message error={task.error} />
        {createdId ? <Text selectable style={[L.note, { marginBottom: 14 }]}>Folio para aprobación: {createdId}</Text> : null}
        <Primary tall loading={task.loading} onPress={submit}>Registrar usuario</Primary>
        <View style={L.authRow}>
          <Text style={L.authMuted}>¿Ya tienes cuenta?</Text>
          <LinkButton onPress={() => !task.loading && go('login')}>Iniciar sesión</LinkButton>
        </View>
      </View>
    </View>
    <FeedbackDialog visible={Boolean(feedback)} variant={feedback?.variant} title={feedback?.title} message={feedback?.message}
      code={feedback?.code} hint={feedback?.hint} actionLabel={feedback?.actionLabel} onClose={feedback?.onClose} />
  </AuthScreen>;
}
