import { useState } from 'react';
import { Text, View } from 'react-native';
import { AuthScreen, TextField, Primary, LinkButton } from '../../components/layout';
import { Message } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { useAsyncAction } from '../../utils/useAsyncAction';
import { isEmail } from '../../utils/validation';
import { layoutStyles as L } from '../../theme/layout';

// Funcionamiento original conservado: valida con isEmail y muestra el mensaje
// del backend tal cual. Solo cambió la presentación (frames 01 de Figma).
export default function LoginScreen({ go }) {
  const [email, setEmail] = useState(''); const [password, setPassword] = useState('');
  const { signIn } = useAuth(); const task = useAsyncAction();
  const submit = () => {
    if (!isEmail(email) || !password) return task.setError('Escribe tu correo y contraseña.');
    task.run(() => signIn(email.trim().toLowerCase(), password));
  };
  return <AuthScreen>
    <View>
      <Text style={L.authTitle}>Bienvenido</Text>
      <View style={L.authCard}>
        <TextField label="Correo / No. de empleado" placeholder="example@example.com" keyboardType="email-address" autoCapitalize="none" autoCorrect={false}
          value={email} onChangeText={setEmail} editable={!task.loading} />
        <TextField label="Contraseña" placeholder="••••••••" secureTextEntry autoCapitalize="none"
          value={password} onChangeText={setPassword} editable={!task.loading} style={{ marginBottom: 4 }} />
        <Text style={L.authForgot} onPress={() => !task.loading && go('recovery')}>¿Olvidaste tu contraseña?</Text>
        <Message error={task.error} />
        <Primary tall loading={task.loading} onPress={submit}>Iniciar sesión</Primary>
        <View style={L.authRow}>
          <Text style={L.authMuted}>¿Aún no tienes cuenta?</Text>
          <LinkButton onPress={() => !task.loading && go('register')}>Registrarse</LinkButton>
        </View>
      </View>
    </View>
    <View style={L.brand}>
      <Text style={L.brandTitle}>SelfIQ</Text>
      <Text style={L.brandText}>Gestión inteligente para tu operación</Text>
    </View>
  </AuthScreen>;
}
