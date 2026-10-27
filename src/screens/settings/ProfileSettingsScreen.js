import { Screen, Head, Identity, FieldCard, Info, Primary } from '../../components/layout';
import { useAuth } from '../../context/AuthContext';
import { CAPABILITIES } from '../../services/settingsService';
import { roleLabel } from '../../utils/validation';

export default function ProfileSettingsScreen({ go }) {
  const { user } = useAuth();
  const name = [user?.first_name, user?.last_name].filter(Boolean).join(' ') || '—';
  const editable = CAPABILITIES.editProfile;
  return <Screen go={go} active="settings">
    <Head title="Datos personales" back="Ajustes" onBack={() => go('settings')} subtitle="Consulta y actualiza la información de tu cuenta." />
    <Identity name={name} detail={`${roleLabel(user)}${user?.email ? ` · ${user.email}` : ''}`} />
    <FieldCard label="Nombre completo" value={name} />
    <FieldCard label="Correo electrónico" value={user?.email || '—'} />
    <FieldCard label="Teléfono" value={user?.phone_number || ''} placeholder="Sin teléfono registrado" />
    <Info title={`${roleLabel(user)}${user?.branch_id ? ` · ${String(user.branch_id).slice(0, 8)}…` : ''}`}>
      {editable ? 'La sucursal y el rol los gestiona tu administrador.' : 'Tu administrador gestiona estos datos: escríbele para corregir tu nombre, correo o teléfono.'}
    </Info>
    <Primary disabled={!editable}>Guardar cambios</Primary>
    {editable ? null : <Info>La edición del perfil se habilita cuando el backend exponga el endpoint de actualización.</Info>}
  </Screen>;
}
