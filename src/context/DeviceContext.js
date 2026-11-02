import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useAuth } from './AuthContext';
import { deviceRequest } from '../services/deviceService';
import { getTelemetryBranches } from '../services/telemetryService';
const Context = createContext(null);
export function DeviceProvider({ children }) {
  const { user, accessToken } = useAuth();
  const [branches, setBranches] = useState([]);
  const [branchId, setBranchId] = useState(user?.branch_id || '');
  const [branchError, setBranchError] = useState('');
  const [loadingBranches, setLoadingBranches] = useState(true);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    getTelemetryBranches(accessToken).then(rows => {
      if (!active) return;
      setBranches(rows);
      setBranchId(previous => rows.some(row => row.id === previous) ? previous : rows[0]?.id || '');
    }).catch(error => { if (active) setBranchError(error.message); })
      .finally(() => { if (active) setLoadingBranches(false); });
    return () => { active = false; };
  }, [accessToken, attempt]);
  const reloadBranches = () => { setBranchError(''); setLoadingBranches(true); setAttempt(v => v + 1); };
  const [gateway, setGateway] = useState(null);
  const [device, setDevice] = useState(null);
  const [draft, setDraft] = useState({});
  const [discovery, setDiscovery] = useState(null);
  const [result, setResult] = useState(null);
  const [failure, setFailure] = useState('');
  const mutation = useRef(null);
  const request = useCallback((operation, payload) => deviceRequest(operation, { branchId, accessToken }, payload), [branchId, accessToken]);
  // Single-flight mutations prevent double taps from submitting twice.
  const mutate = (operation, payload) => {
    if (mutation.current) return mutation.current;
    mutation.current = request(operation, payload).finally(() => { mutation.current = null; });
    return mutation.current;
  };
  const selectDevice = (value) => { setDevice(value); setDraft({ name: value?.name || '', location: value?.location || '' }); setResult(null); };
  const selectBranch = (id) => {
    if (mutation.current || !branches.some(branch => branch.id === id)) return;
    setBranchId(id); setGateway(null); selectDevice(null); setDiscovery(null); setFailure('');
  };
  return <Context.Provider value={{ branchId, branches, selectBranch, loadingBranches, branchError, reloadBranches, gateway, setGateway, device, selectDevice,
    draft, setDraft, discovery, setDiscovery, result, setResult, failure, setFailure, request, mutate }}>{children}</Context.Provider>;
}
export function useDevices() { return useContext(Context); }
