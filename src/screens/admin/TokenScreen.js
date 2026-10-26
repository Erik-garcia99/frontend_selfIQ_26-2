import { useState } from 'react';
import { Text, View } from 'react-native';
import { Page, Card, Field, Button, Message, TokenModal } from '../../components/ui';
import { issueBusinessToken, issueBranchToken } from '../../services/branchService';
import { useAuth } from '../../context/AuthContext';
import { useAsyncAction } from '../../utils/useAsyncAction';
import { isSuperuser, isUuid } from '../../utils/validation';
export default function TokenScreen({ go }) {
  const { user, accessToken } = useAuth(); const [mode, setMode] = useState('branch');
  const [id, setId] = useState(user?.branch_id || ''); const [confirmed, setConfirmed] = useState(false); const [issued, setIssued] = useState(null);
  const task = useAsyncAction();
  const changeMode = (next) => { setMode(next); setId(next === 'branch' ? user?.branch_id || '' : user?.organization_id || ''); setConfirmed(false); task.setError(''); };
  const submit = async () => {
    if (!isUuid(id)) return task.setError('Escribe un ID válido.');
    if (!confirmed) { setConfirmed(true); return; }
    const result = await task.run(() => mode === 'branch' ? issueBranchToken(id.trim(), accessToken) : issueBusinessToken(id.trim(), accessToken));
    if (result) {
      setIssued({ title: mode === 'branch' ? 'Token de sucursal' : 'Token global de empresa',
        token: mode === 'branch' ? result.branch_token : result.business_token, id: id.trim(), idLabel: mode === 'branch' ? 'Sucursal' : 'Empresa',
        detail: mode === 'branch' ? 'Úsalo para registrar usuarios y en las Raspberry de esta sucursal. Actualiza las Raspberry que tenían el token anterior.' : 'Entrega este token al propietario de la empresa para crear sus sucursales.' });
      setConfirmed(false);
    }
  };
  return <Page title="Tokens de acceso" go={go} back="panel" active="panel" busy={task.loading}><Card>
    {isSuperuser(user) && <View style={{ gap: 12, marginBottom: 24 }}><Button disabled={task.loading} dark={mode === 'branch'} onPress={() => changeMode('branch')}>Token de sucursal</Button><Button disabled={task.loading} dark={mode === 'business'} onPress={() => changeMode('business')}>Token global de empresa</Button></View>}
    <Field label={mode === 'branch' ? 'ID de sucursal' : 'ID de empresa'} autoCapitalize="none" value={id} onChangeText={(value) => { setId(value); setConfirmed(false); }} editable={!task.loading} />
    <Text style={{ lineHeight: 21, marginBottom: 18 }}>{mode === 'branch' ? 'Genera un token de sucursal para usuarios y Raspberry.' : 'Genera el token global para crear sucursales de esta empresa.'}</Text>
    {confirmed && <Message error={mode === 'branch' ? 'Esta emisión reemplazará los tokens anteriores y desconectará las Raspberry de esta sucursal. Pulsa nuevamente para confirmar.' : 'Esta emisión reemplazará los tokens globales anteriores de la empresa. Pulsa nuevamente para confirmar.'} />}
    <Message error={task.error} /><Button loading={task.loading} onPress={submit}>{confirmed ? 'Confirmar emisión y reemplazo' : 'Generar token'}</Button>
    {confirmed && <View style={{ marginTop: 12 }}><Button disabled={task.loading} dark={false} onPress={() => setConfirmed(false)}>Cancelar</Button></View>}
  </Card><TokenModal issued={issued} onSaved={() => setIssued(null)} /></Page>;
}
