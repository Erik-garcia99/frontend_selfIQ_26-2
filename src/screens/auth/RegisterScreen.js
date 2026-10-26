import { useState } from 'react';
import { Text } from 'react-native';
import { Page, Card, Field, Button, Message } from '../../components/ui';
import { register } from '../../services/authService';
import { useAsyncAction } from '../../utils/useAsyncAction';
import { isEmail } from '../../utils/validation';
const empty = { first_name: '', last_name: '', email: '', password: '', confirmation: '', registration_token: '' };
export default function RegisterScreen({ go }) {
  const [form, setForm] = useState(empty); const [message, setMessage] = useState(''); const [createdId, setCreatedId] = useState(''); const task = useAsyncAction();
  const update = (key) => (value) => setForm((old) => ({ ...old, [key]: value }));
  const submit = async () => {
    if (!form.first_name.trim() || !form.last_name.trim() || !isEmail(form.email) || !form.registration_token.trim()) return task.setError('Completa nombres, apellidos, correo y token de sucursal.');
    if (form.password.length < 8) return task.setError('La contraseña debe tener al menos 8 caracteres.');
    if (form.password !== form.confirmation) return task.setError('Las contraseñas no coinciden.');
    const result = await task.run(() => register({ first_name: form.first_name.trim(), last_name: form.last_name.trim(),
      email: form.email.trim().toLowerCase(), password: form.password, registration_token: form.registration_token.trim() }));
    if (result) { setCreatedId(result.user_id); setMessage('Cuenta creada y pendiente de aprobación. Solicita al administrador que la apruebe antes de iniciar sesión.'); setForm(empty); }
  };
  return <Page auth title="Creación de usuario" go={go} back="login" busy={task.loading}><Card>
    <Field label="Nombres" value={form.first_name} onChangeText={update('first_name')} editable={!task.loading} />
    <Field label="Apellidos" value={form.last_name} onChangeText={update('last_name')} editable={!task.loading} />
    <Field label="Correo" keyboardType="email-address" autoCapitalize="none" value={form.email} onChangeText={update('email')} editable={!task.loading} />
    <Field label="Contraseña" password value={form.password} onChangeText={update('password')} editable={!task.loading} />
    <Field label="Confirmar contraseña" password value={form.confirmation} onChangeText={update('confirmation')} editable={!task.loading} />
    <Field label="Token de la sucursal" autoCapitalize="none" value={form.registration_token} onChangeText={update('registration_token')} editable={!task.loading} />
    <Text style={{ marginBottom: 16 }}>Usa el token de tu sucursal proporcionado por el administrador.</Text>
    <Message error={task.error} success={message} />{createdId ? <Text selectable style={{ marginBottom: 18 }}>ID para aprobación: {createdId}</Text> : null}<Button loading={task.loading} onPress={submit}>Registrar usuario</Button>
  </Card></Page>;
}
