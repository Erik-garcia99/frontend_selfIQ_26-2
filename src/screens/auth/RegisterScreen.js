import { useState } from 'react';
import { Text, View } from 'react-native';
import { AuthScreen, Head, TextField, Primary, LinkButton } from '../../components/layout';
import { FeedbackDialog } from '../../components/FeedbackDialog';
import { Message } from '../../components/ui';
import { registerCustomer } from '../../services/authService';
import { useAsyncAction } from '../../utils/useAsyncAction';
import { describeError } from '../../utils/errorMessages';
import { isEmail } from '../../utils/validation';
import { layoutStyles as L } from '../../theme/layout';

const empty = { first_name: '', last_name: '', email: '', password: '', confirmation: '', organization_code: '' };

// El alta de empleados la hace el encargado desde Personas (F-02). Este
// registro público es solo para clientes; no se ofrece la opción de empleado
// ni se pide el token de sucursal.
export default function RegisterScreen({ go }) {
  const [form, setForm] = useState(empty);
  const [feedback, setFeedback] = useState(null);
  const task = useAsyncAction();
  const update = (key) => (value) => setForm((old) => ({ ...old, [key]: value }));

  const submit = async () => {
    if (!form.first_name.trim() || !form.last_name.trim() || !isEmail(form.email)) {
      return task.setError('Completa nombres, apellidos y un correo válido.');
    }
    if (!form.organization_code.trim()) {
      return task.setError('Completa el código de organización que te dio la tienda.');
    }
    if (form.password.length < 8) return task.setError('La contraseña debe tener al menos 8 caracteres.');
    if (form.password !== form.confirmation) return task.setError('Las contraseñas no coinciden.');

    const result = await task.run(() => registerCustomer({
      first_name: form.first_name.trim(),
      last_name: form.last_name.trim(),
      email: form.email.trim().toLowerCase(),
      password: form.password,
      organization_code: form.organization_code.trim(),
    }));

    if (!result) {
      const info = describeError(task.getFailure());
      task.setError('');
      return setFeedback({ variant: 'error', ...info, actionLabel: 'Corregir datos', onClose: () => setFeedback(null) });
    }

    setForm(empty);
    setFeedback({
      variant: 'success', title: 'Cuenta creada',
      message: 'Tu cuenta de cliente ya está activa.',
      hint: 'Inicia sesión con tu correo y contraseña para empezar.',
      actionLabel: 'Iniciar sesión',
      onClose: () => { setFeedback(null); go('login'); },
    });
  };

  return <AuthScreen>
    <View>
      <View style={L.authHead}>
        <Head title="Crear cuenta de cliente"
          subtitle="Regístrate para consultar disponibilidad y guías en la tienda." />
      </View>
      <View style={L.authCard}>
        <TextField label="Nombres" placeholder="Marcos" value={form.first_name} onChangeText={update('first_name')} editable={!task.loading} />
        <TextField label="Apellidos" placeholder="Solís" value={form.last_name} onChangeText={update('last_name')} editable={!task.loading} />
        <TextField label="Correo" placeholder="tu@correo.com" keyboardType="email-address" autoCapitalize="none" autoCorrect={false} value={form.email} onChangeText={update('email')} editable={!task.loading} />
        <TextField label="Contraseña" placeholder="Mínimo 8 caracteres" secureTextEntry autoCapitalize="none" value={form.password} onChangeText={update('password')} editable={!task.loading} />
        <TextField label="Confirmar contraseña" placeholder="Repite la contraseña" secureTextEntry autoCapitalize="none" value={form.confirmation} onChangeText={update('confirmation')} editable={!task.loading} />
        <TextField label="Código de la organización" placeholder="Código que te dio la tienda" autoCapitalize="characters" autoCorrect={false} value={form.organization_code} onChangeText={update('organization_code')} editable={!task.loading} />
        <Message error={task.error} />
        <Primary tall loading={task.loading} onPress={submit}>Crear cuenta de cliente</Primary>
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
