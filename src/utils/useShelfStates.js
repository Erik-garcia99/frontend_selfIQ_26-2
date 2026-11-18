import { useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { getShelfStates } from '../services/roiStateService.js';
import { createRoiOccupancyPoller } from './roiOccupancy.js';

export function useShelfStates({ branchId, accessToken }) {
  const scope = JSON.stringify([branchId, accessToken]);
  const [result, setResult] = useState(null);
  const poller = useRef(null);
  useEffect(() => {
    if (!branchId || !accessToken) return;
    const current = createRoiOccupancyPoller({
      load: () => getShelfStates(accessToken, branchId),
      onChange: state => setResult({ scope, ...state }),
      interval: 10000,
    });
    poller.current = current;
    current.setActive(AppState.currentState == null || AppState.currentState === 'active');
    const subscription = AppState.addEventListener('change', state => current.setActive(state === 'active'));
    return () => {
      current.stop();
      subscription.remove();
      if (poller.current === current) poller.current = null;
    };
  }, [branchId, accessToken, scope]);
  const current = result?.scope === scope ? result : {
    reading: null, loading: true, error: '', fetchedAt: null,
  };
  return {
    states: current.reading, loading: current.loading,
    error: current.error, fetchedAt: current.fetchedAt,
    refresh: () => poller.current?.refresh(),
  };
}
