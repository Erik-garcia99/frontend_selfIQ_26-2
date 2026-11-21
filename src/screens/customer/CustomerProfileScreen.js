import { useState } from 'react';
import { Text, View } from 'react-native';
import { ClientScreen, Head, Identity, Info, NavRow, Primary, SectionLabel, TextField } from '../../components/layout';
import { useAuth } from '../../context/AuthContext';
import { changePassword, updateProfile } from '../../services/settingsService';
import { APP_NAME, APP_VERSION } from '../../config/appInfo';

export default function CustomerProfileScreen({ go, back }) {
  const { user, accessToken, signOut, refreshUser } = useAuth();

  const [draft, setDraft] = useState({
    first_name: user?.first_name || '',
    last_name: user?.last_name || '',
    phone_number: user?.phone_number || '',
  });
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMessage, setProfileMessage] = useState('');

  const [passwords, setPasswords] = useState({ current: '', next: '', confirm: '' });
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState('');

  const name = [user?.first_name, user?.last_name].filter(Boolean).join(' ') || user?.email || 'Mi cuenta';

  const profileChanged =
    draft.first_name !== (user?.first_name || '') ||
    draft.last_name !== (user?.last_name || '') ||
    (draft.phone_number || '') !== (user?.phone_number || '');

  const saveProfile = async () => {
    setSavingProfile(true);
    setProfileMessage('');
    try {
      await updateProfile(
        {
          first_name: draft.first_name,
          last_name: draft.last_name,
          phone_number: draft.phone_number || null,
        },
        accessToken
      );
      await refreshUser();
      setProfileMessage('Datos actualizados.');
    } catch (e) {
      setProfileMessage(e.message || 'No se pudieron guardar los datos.');
    } finally {
      setSavingProfile(false);
    }
  };

  const passwordValid =
    passwords.current &&
    passwords.next.length >= 8 &&
    passwords.next !== passwords.current &&
    passwords.next === passwords.confirm;

  const savePassword = async () => {
    if (!passwordValid) return;
    setSavingPassword(true);
    setPasswordMessage('');
    try {
      await changePassword(passwords.current, passwords.next, accessToken);
      setPasswords({ current: '', next: '', confirm: '' });
      setPasswordMessage('Contraseña actualizada.');
    } catch (e) {
      setPasswordMessage(e.message || 'No se pudo cambiar la contraseña.');
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <ClientScreen go={go} active="profile">
      <Head back="Volver" onBack={back} big title="Perfil" subtitle="Datos de tu cuenta de cliente" />
      <Identity name={name} detail={`Cliente · ${user?.email || ''}`} />

      <SectionLabel>Mi cuenta</SectionLabel>
      <TextField
        label="Nombre"
        value={draft.first_name}
        onChangeText={(v) => setDraft({ ...draft, first_name: v })}
      />
      <TextField
        label="Apellido"
        value={draft.last_name}
        onChangeText={(v) => setDraft({ ...draft, last_name: v })}
      />
      <TextField
        label="Teléfono"
        value={draft.phone_number}
        onChangeText={(v) => setDraft({ ...draft, phone_number: v })}
        keyboardType="phone-pad"
      />
      <TextField label="Correo electrónico" value={user?.email || ''} editable={false} />
      {profileMessage ? <Info text={profileMessage} /> : null}
      <Primary loading={savingProfile} disabled={!profileChanged} onPress={saveProfile}>
        Guardar datos
      </Primary>

      <SectionLabel>Seguridad</SectionLabel>
      <TextField
        label="Contraseña actual"
        value={passwords.current}
        onChangeText={(v) => setPasswords({ ...passwords, current: v })}
        secureTextEntry
      />
      <TextField
        label="Nueva contraseña"
        value={passwords.next}
        onChangeText={(v) => setPasswords({ ...passwords, next: v })}
        secureTextEntry
      />
      <TextField
        label="Confirmar nueva contraseña"
        value={passwords.confirm}
        onChangeText={(v) => setPasswords({ ...passwords, confirm: v })}
        secureTextEntry
      />
      {passwordMessage ? <Info text={passwordMessage} /> : null}
      <Primary loading={savingPassword} disabled={!passwordValid} onPress={savePassword}>
        Cambiar contraseña
      </Primary>

      <SectionLabel>Privacidad</SectionLabel>
      <Info
        text="Finalidad: gestionar tu cuenta y mostrar tus compras. Datos mínimos: nombre, correo y teléfono opcional. Retención: mientras tu cuenta esté activa. Para solicitar la eliminación o anonimización de tus datos, contacta al personal de la tienda."
      />

      <View style={{ height: 28 }} />
      <NavRow label="Cerrar sesión" danger onPress={signOut} />
      <Text style={{ fontSize: 12, color: '#888', marginTop: 12, textAlign: 'center' }}>
        {APP_NAME} · v{APP_VERSION}
      </Text>
    </ClientScreen>
  );
}