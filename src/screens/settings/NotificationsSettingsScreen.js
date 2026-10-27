import { useState } from 'react';
import { Screen, Head, Info, ToggleRow, Primary } from '../../components/layout';
import { FeedbackDialog } from '../../components/FeedbackDialog';
import { notificationPreferences, setPreferences } from '../../utils/preferences';

const LABELS = [
  ['lowStock', 'Stock bajo'],
  ['capacity', 'Aforo máximo'],
  ['temperature', 'Temperatura fuera de rango'],
  ['offline', 'Dispositivos sin conexión'],
  ['sound', 'Sonido de notificaciones'],
];

export default function NotificationsSettingsScreen({ go }) {
  const [prefs, setPrefs] = useState(notificationPreferences());
  const [saved, setSaved] = useState(false);
  const toggle = (key) => (value) => setPrefs((old) => ({ ...old, [key]: value }));
  return <Screen go={go} active="settings">
    <Head title="Notificaciones" back="Ajustes" onBack={() => go('settings')} subtitle="Elige qué avisos quieres recibir de tu sucursal." />
    <Info title="Avisos de SelfIQ">Personaliza las alertas que recibes en la aplicación.</Info>
    {LABELS.map(([key, label]) => <ToggleRow key={key} label={label} value={Boolean(prefs[key])} onValueChange={toggle(key)} />)}
    <Info>Estas preferencias se aplican solo a tu cuenta.</Info>
    <Primary onPress={() => { setPreferences(prefs); setSaved(true); }}>Guardar preferencias</Primary>
    <FeedbackDialog visible={saved} variant="success" title="Preferencias guardadas" message="Aplicaremos estos avisos a tu cuenta."
      hint="Por ahora se mantienen durante esta sesión: el backend todavía no guarda las preferencias de notificaciones." actionLabel="Entendido" onClose={() => setSaved(false)} />
  </Screen>;
}
