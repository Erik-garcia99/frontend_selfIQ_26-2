import { useEffect, useState } from 'react';
import { Screen, Head, Info, ToggleRow, Primary } from '../../components/layout';
import { Message } from '../../components/ui';
import { FeedbackDialog } from '../../components/FeedbackDialog';
import { useAuth } from '../../context/AuthContext';
import { getNotificationPreferences, saveNotificationPreferences } from '../../services/settingsService';
import { useAsyncAction } from '../../utils/useAsyncAction';
import { describeError } from '../../utils/errorMessages';

const LABELS = [
  ['lowStock', 'Stock bajo'],
  ['capacity', 'Aforo máximo'],
  ['temperature', 'Temperatura fuera de rango'],
  ['offline', 'Dispositivos sin conexión'],
  ['sound', 'Sonido de notificaciones'],
];

const defaults = { lowStock: true, capacity: true, temperature: true, offline: true, sound: false };

export default function NotificationsSettingsScreen({ go }) {
  const { accessToken } = useAuth();
  const [prefs, setPrefs] = useState(defaults);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState(null);
  const task = useAsyncAction();

  useEffect(() => {
    let active = true;
    getNotificationPreferences(accessToken)
      .then((data) => { if (active) setPrefs(data); })
      .catch((failure) => {
        if (!active) return;
        const info = describeError(failure);
        setFeedback({ variant: 'error', ...info, actionLabel: 'Cerrar', onClose: () => setFeedback(null) });
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [accessToken]);

  const toggle = (key) => (value) => setPrefs((old) => ({ ...old, [key]: value }));

  const save = async () => {
    const result = await task.run(() => saveNotificationPreferences(prefs, accessToken));
    if (!result) {
      const info = describeError(task.getFailure());
      task.setError('');
      return setFeedback({ variant: 'error', ...info, actionLabel: 'Corregir datos', onClose: () => setFeedback(null) });
    }
    setPrefs(result);
    setFeedback({ variant: 'success', title: 'Preferencias guardadas', message: 'Tus avisos quedaron guardados en tu cuenta.',
      hint: 'Se aplicarán cada vez que inicies sesión, en cualquier dispositivo.', actionLabel: 'Entendido', onClose: () => setFeedback(null) });
  };

  const busy = loading || task.loading;

  return <Screen go={go} active="settings">
    <Head title="Notificaciones" back="Ajustes" onBack={() => go('settings')} subtitle="Elige qué avisos quieres recibir de tu sucursal." />
    <Info title="Avisos de SelfIQ">Personaliza las alertas que recibes en la aplicación. Se guardan en tu cuenta.</Info>
    {LABELS.map(([key, label]) => <ToggleRow key={key} label={label} value={Boolean(prefs[key])} onValueChange={toggle(key)} disabled={busy} />)}
    <Message error={task.error} />
    <Primary loading={task.loading} disabled={loading} onPress={save}>Guardar preferencias</Primary>
    <Info>Estas preferencias se aplican solo a tu cuenta y se sincronizan entre dispositivos.</Info>
    <FeedbackDialog visible={Boolean(feedback)} variant={feedback?.variant} title={feedback?.title} message={feedback?.message}
      code={feedback?.code} hint={feedback?.hint} actionLabel={feedback?.actionLabel} onClose={feedback?.onClose} />
  </Screen>;
}
