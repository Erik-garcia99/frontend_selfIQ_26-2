import { useState, useRef, useEffect } from 'react';
export function useAsyncAction() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const busy = useRef(false);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const run = async (action) => {
    if (busy.current) return undefined;
    busy.current = true; setLoading(true); setError('');
    try { return await action(); }
    catch (failure) { if (mounted.current) setError(failure.message || 'No se pudo completar la operación.'); return undefined; }
    finally { busy.current = false; if (mounted.current) setLoading(false); }
  };
  return { loading, error, setError, run };
}
