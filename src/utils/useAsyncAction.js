import { useState, useRef, useEffect } from 'react';
export function useAsyncAction() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const busy = useRef(false);
  const mounted = useRef(true);
  const lastFailure = useRef(null);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const run = async (action) => {
    if (busy.current) return undefined;
    busy.current = true; setLoading(true); setError(''); lastFailure.current = null;
    try { return await action(); }
    catch (failure) {
      lastFailure.current = failure;
      if (mounted.current) setError(failure.message || 'No se pudo completar la operación.');
      return undefined;
    }
    finally { busy.current = false; if (mounted.current) setLoading(false); }
  };
  // getFailure() devuelve el error crudo (con .status) de la última ejecución.
  // Se lee por ref para no depender del estado de React, que aún no se habrá
  // actualizado cuando la pantalla evalúa el resultado de run().
  return { loading, error, setError, run, getFailure: () => lastFailure.current };
}
