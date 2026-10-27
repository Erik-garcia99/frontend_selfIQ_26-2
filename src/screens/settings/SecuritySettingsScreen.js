import { useState } from 'react';
import { Screen, Head, Info, Primary, LinkButton } from '../../components/layout';
import { FeedbackDialog } from '../../components/FeedbackDialog';
import { CAPABILITIES } from '../../services/settingsService';

export default function SecuritySettingsScreen({ go }) {
  const enabled = CAPABILITIES.changePassword;
  const [info, setInfo] = useState(null);
  return <Screen go={go} active="settings">
    <Head title="Seguridad" back="Ajustes" onBack={() => go('settings')} subtitle="Protege el acceso a tu cuenta." />
    <Info title="Cambiar contraseña">Introduce tu contraseña actual y elige una nueva.</Info>
    <Primary disabled={!enabled}>Actualizar contraseña</Primary>
    <Info>{enabled ? 'Usa una contraseña larga y exclusiva para SelfIQ.'
      : 'El cambio de contraseña desde la app todavía no está disponible: el backend aún no tiene ese endpoint. Tu administrador puede restablecerla.'}</Info>
    <LinkButton onPress={() => setInfo(true)}>¿Olvidaste tu contraseña?</LinkButton>
    <FeedbackDialog visible={info} variant="info" title="Restablecer acceso" message="Tu administrador puede restablecer tu contraseña desde el panel de administración."
      hint="El envío automático de correos de recuperación todavía no está activo." actionLabel="Entendido" onClose={() => setInfo(false)} />
  </Screen>;
}
