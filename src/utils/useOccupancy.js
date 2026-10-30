import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { getLatestOccupancy, getTelemetryBranches } from '../services/telemetryService';

const POLL_MS = 2000;

export function useOccupancy(accessToken, userBranchId) {
  const [branches, setBranches] = useState([]);
  const [branchId, setBranchId] = useState(userBranchId || '');
  const [branchError, setBranchError] = useState('');
  const [loadingBranches, setLoadingBranches] = useState(true);
  const [reading, setReading] = useState(null);
  const [requestState, setRequestState] = useState(null);
  const [now, setNow] = useState(Date.now);
  const [attempt, setAttempt] = useState(0);
  const refresh = useCallback(() => {
    setLoadingBranches(true);
    setBranchError('');
    setAttempt((value) => value + 1);
  }, []);

  useEffect(() => {
    let active = true;
    getTelemetryBranches(accessToken).then((rows) => {
      if (!active) return;
      setBranches(rows);
      setBranchId((previous) => rows.some((row) => row.id === previous) ? previous
        : rows.some((row) => row.id === userBranchId) ? userBranchId : rows[0]?.id || '');
    }).catch((error) => {
      if (active) setBranchError(error.message);
    }).finally(() => { if (active) setLoadingBranches(false); });
    return () => { active = false; };
  }, [accessToken, userBranchId, attempt]);

  useEffect(() => {
    if (!accessToken || !branchId) return;
    let active = true;
    let foreground = !AppState.currentState || AppState.currentState === 'active';
    let inFlight = false;
    let timer;
    async function load() {
      if (!active || !foreground || inFlight) return;
      clearTimeout(timer);
      inFlight = true;
      setRequestState({ branchId, loading: true, error: '' });
      try {
        const data = await getLatestOccupancy(branchId, accessToken);
        if (active) setReading(data);
      } catch (error) {
        if (active) setRequestState({ branchId, loading: false, error: error.message, status: error.status ?? null });
        return;
      } finally {
        inFlight = false;
        if (active) setNow(Date.now());
        if (active && foreground) timer = setTimeout(load, POLL_MS);
      }
      if (active) setRequestState({ branchId, loading: false, error: '' });
    }
    load();
    const subscription = AppState.addEventListener('change', (state) => {
      foreground = state === 'active';
      clearTimeout(timer);
      if (foreground) load();
    });
    return () => { active = false; clearTimeout(timer); subscription.remove(); };
  }, [accessToken, branchId, attempt]);

  const data = reading?.branch_id === branchId ? reading : null;
  const state = requestState?.branchId === branchId ? requestState : null;
  const stale = Boolean(data?.measured_at && (data.status === 'stale'
    || now - new Date(data.measured_at).getTime() >= data.stale_after_seconds * 1000));
  return { branches, branchId, selectBranch: setBranchId, data, stale,
    loading: loadingBranches || Boolean(branchId && (!state || state.loading)),
    error: branchError || state?.error || '', errorStatus: branchError ? null : state?.status ?? null, refresh };
}
