import { useState } from 'react';
import { Modal, TextInput, View, Text, TouchableOpacity } from 'react-native';
import { Shell, Copy, ErrorNotice, Wait, LoadState, useData, useSave, useDevices, FieldCard, Primary, Info, NavRow, SectionLabel, deviceLabel, statusLabel, LIGHT_LIMIT } from './DeviceUI';
import { useAuth } from '../../context/AuthContext';
import { apiRequest } from '../../services/http';

export default function AforoDetailScreen({ go }) {
const d = useDevices(); const state = useData('getDevice', { deviceId: d.device?.id }); const device = state.data; const reading = device?.readings;
const { accessToken } = useAuth();
const [adjustOpen, setAdjustOpen] = useState(false);
const [adjustValue, setAdjustValue] = useState('0');
const [adjustReason, setAdjustReason] = useState('');
const [adjusting, setAdjusting] = useState(false);
const [adjustMsg, setAdjustMsg] = useState('');

const adjustOccupancy = async (value, reason) => {
  setAdjusting(true); setAdjustMsg('');
  try {
    const v = Number(value);
    if (!Number.isInteger(v) || v < 0) throw new Error('Valor inválido');
    await apiRequest(`/branches/${encodeURIComponent(d.branchId)}/occupancy/adjustments`, {
      method: 'POST', accessToken, timeout: 30000,
      body: { node_id: d.device?.id, value: v, reason: reason || 'Ajuste manual' },
    });
    setAdjustMsg(`Aforo ajustado a ${v}.`);
    setAdjustOpen(false);
    state.reload();
  } catch (e) { setAdjustMsg(e?.message || 'No se pudo ajustar el aforo.'); }
  finally { setAdjusting(false); }
};

const openAdjust = () => {
  setAdjustValue(reading?.occupancy != null ? String(reading.occupancy) : '0');
  setAdjustReason('');
  setAdjustOpen(true);
};

 return <Shell go={go} title={deviceLabel(d.device)} back="registered-devices"><LoadState state={state}>
 <Info title={statusLabel(device)}>{device?.lastSeenAt ? `Última comunicación: ${new Date(device.lastSeenAt).toLocaleString()}` : 'Todavía no hay información de comunicación.'}</Info>
 <Info title="Últimas lecturas"><Copy>{reading?.occupancy != null ? `${reading.occupancy} personas` : 'Aforo: sin lectura'}</Copy>
 <Copy>{reading?.temperature != null ? `Temperatura: ${reading.temperature} °C` : 'Temperatura: sin lectura'}</Copy>
 <Copy>{reading?.humidity != null ? `Humedad: ${reading.humidity} %` : 'Humedad: sin lectura'}</Copy>
 <Copy>{reading?.measuredAt ? `Medido: ${new Date(reading.measuredAt).toLocaleString()}` : 'Sin fecha de medición'}</Copy></Info>
 <FieldCard label="Nombre" value={device?.name} /><FieldCard label="Ubicación" value={device?.location} />
 {adjustMsg ? <Info title="Ajuste">{adjustMsg}</Info> : null}
 <Primary disabled={!device?.id || adjusting} onPress={openAdjust}>{adjusting ? 'Ajustando…' : 'Ajustar aforo'}</Primary>
 <Primary disabled={!device?.id} onPress={() => { d.selectDevice(device); go('edit-aforo'); }}>Editar datos</Primary>
 <Primary variant="danger" disabled={!device?.id} onPress={() => { d.selectDevice(device); go('delete-device'); }}>Eliminar dispositivo</Primary></LoadState>
 <Modal visible={adjustOpen} transparent animationType="slide" onRequestClose={() => setAdjustOpen(false)}>
   <View style={{ flex:1, justifyContent:'center', padding:20, backgroundColor:'rgba(0,0,0,0.5)' }}>
     <View style={{ backgroundColor:'#fff', borderRadius:12, padding:16 }}>
       <Text style={{ fontWeight:'700', marginBottom:12 }}>Ajustar contador de aforo</Text>
       <TextInput placeholder="Nuevo valor (personas)" keyboardType="numeric" value={adjustValue} onChangeText={setAdjustValue} style={{ borderWidth:1, borderColor:'#ccc', borderRadius:8, padding:8, marginBottom:8 }} />
       <TextInput placeholder="Motivo" value={adjustReason} onChangeText={setAdjustReason} style={{ borderWidth:1, borderColor:'#ccc', borderRadius:8, padding:8, marginBottom:12 }} />
       <View style={{ flexDirection:'row', justifyContent:'flex-end', gap:8 }}>
         <TouchableOpacity onPress={() => setAdjustOpen(false)}><Text style={{ padding:8 }}>Cancelar</Text></TouchableOpacity>
         <TouchableOpacity onPress={() => adjustOccupancy(adjustValue, adjustReason)} disabled={adjusting}><Text style={{ padding:8, color:'#007aff' }}>{adjusting ? 'Ajustando…' : 'Aplicar'}</Text></TouchableOpacity>
       </View>
     </View>
   </View>
 </Modal>
 </Shell>;
}