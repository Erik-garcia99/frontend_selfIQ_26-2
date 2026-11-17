import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { getLatestRoiOccupancy } from '../services/telemetryService.js';
import { createRoiOccupancyPoller } from './roiOccupancy.js';

export function useRoiOccupancy({ branchId, roiId, accessToken }) {
  const scope = JSON.stringify([branchId, roiId, accessToken]);
  const [result, setResult] = useState(null);
  const [now, setNow] = useState(Date.now);
  const poller = useRef(null);
  useEffect(() => {
    if (!branchId || !roiId || !accessToken) return;
    const current = createRoiOccupancyPoller({
      load: () => getLatestRoiOccupancy({ branchId, roiId, accessToken }),
      onChange: (state) => { setResult({ scope, ...state }); setNow(Date.now()); },
    });
    poller.current = current;
    current.setActive(AppState.currentState == null || AppState.currentState === 'active');
    const subscription = AppState.addEventListener('change', (state) => current.setActive(state === 'active'));
    const clock = setInterval(() => {
      if (AppState.currentState == null || AppState.currentState === 'active') setNow(Date.now());
    }, 1000);
    return () => {
      current.stop();
      subscription.remove();
      clearInterval(clock);
      if (poller.current === current) poller.current = null;
    };
  }, [branchId, roiId, accessToken, scope]);
  const refresh = useCallback(() => poller.current?.refresh(), []);
  const state = result?.scope === scope ? result : {
    reading: null, loading: true, error: '', fetchedAt: null,
  };
  return { ...state, now, refresh };
}
