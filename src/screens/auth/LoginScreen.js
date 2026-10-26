import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { Logo, Field, Button, Message } from '../../components/ui';
import { styles } from '../../theme/styles';
import { useAuth } from '../../context/AuthContext';
import { useAsyncAction } from '../../utils/useAsyncAction';
import { isEmail } from '../../utils/validation';
export default function LoginScreen({ go }) {
  const [email, setEmail] = useState(''); const [password, setPassword] = useState('');
  const { signIn } = useAuth(); const task = useAsyncAction();
  const submit = () => {
    if (!isEmail(email) || !password) return task.setError('Escribe tu correo y contraseña.');
    task.run(() => signIn(email.trim().toLowerCase(), password));
  };
  return <View style={styles.auth}><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.authContent}>
    <Logo /><Text style={styles.welcome}>Bienvenido</Text><View style={styles.authCard}>
      <Field label="Correo" placeholder="tu@correo.com" keyboardType="email-address" autoCapitalize="none" value={email} onChangeText={setEmail} editable={!task.loading} />
      <Field label="Contraseña" password placeholder="Tu contraseña" value={password} onChangeText={setPassword} editable={!task.loading} />
      <Text style={styles.forgot} onPress={() => !task.loading && go('recovery')}>¿Olvidaste tu contraseña?</Text>
      <Message error={task.error} /><Button onPress={submit} loading={task.loading}>Iniciar sesión</Button>
      <View style={styles.registerRow}><Text style={styles.mutedText}>¿Aún no tienes cuenta?</Text><Text style={styles.link} onPress={() => !task.loading && go('register')}>Registrarse</Text></View>
    </View><View style={styles.footer}><Text style={styles.footerTitle}>SelfIQ</Text><Text style={styles.footerText}>Gestión inteligente para tu operación</Text></View>
  </ScrollView></View>;
}
