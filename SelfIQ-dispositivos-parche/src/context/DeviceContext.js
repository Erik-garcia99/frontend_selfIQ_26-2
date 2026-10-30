import { createContext, useContext, useRef, useState } from 'react';
import { useAuth } from './AuthContext';
import { deviceRequest } from '../services/deviceService';
const Context = createContext(null);
export function DeviceProvider({ children }) {
  const { user, accessToken } = useAuth();
  const [gateway, setGateway] = useState(null);
  const [device, setDevice] = useState(null);
  const [draft, setDraft] = useState({});
  const [discovery, setDiscovery] = useState(null);
  const [result, setResult] = useState(null);
  const [failure, setFailure] = useState('');
  const mutation = useRef(null);
  const request = (operation, payload) => deviceRequest(operation, { branchId: user?.branch_id, accessToken }, payload);
  // Single-flight mutations prevent double taps from submitting twice.
  const mutate = (operation, payload) => {
    if (mutation.current) return mutation.current;
    mutation.current = request(operation, payload).finally(() => { mutation.current = null; });
    return mutation.current;
  };
  const selectDevice = (value) => { setDevice(value); setDraft({ name: value?.name || '', location: value?.location || '' }); setResult(null); };
  return <Context.Provider value={{ branchId: user?.branch_id, gateway, setGateway, device, selectDevice,
    draft, setDraft, discovery, setDiscovery, result, setResult, failure, setFailure, request, mutate }}>{children}</Context.Provider>;
}
export function useDevices() { return useContext(Context); }
