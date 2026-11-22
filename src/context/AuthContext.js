import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import * as SecureStore from 'expo-secure-store';
import { getCurrentUser, login, logout, refreshSession } from '../services/authService';
import { setUnauthorizedHandler } from '../services/http';

const AuthContext = createContext(null);
const SECURE_STORAGE_KEY = 'selfiq_session_v1';

async function readStoredSession() {
  try {
    const raw = await SecureStore.getItemAsync(SECURE_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

async function writeStoredSession(session) {
  try {
    if (session) {
      await SecureStore.setItemAsync(SECURE_STORAGE_KEY, JSON.stringify(session));
    } else {
      await SecureStore.deleteItemAsync(SECURE_STORAGE_KEY);
    }
  } catch {
    // Entornos sin módulo nativo o permisos restringidos
  }
}

export function AuthProvider({ children }) {
  const [session, setSessionState] = useState(null);
  const [isReady, setIsReady] = useState(false);
  const sessionRef = useRef(null);
  const generation = useRef(0);
  const refreshInFlight = useRef(null);
  const refreshedCache = useRef(null);
  const restoreStarted = useRef(false);

  // Un único punto de escritura del estado. La persistencia se hace en un
  // efecto (abajo) para no escribir en SecureStore desde el updater de React.
  const setSession = useCallback((next) => {
    setSessionState((old) => {
      const value = typeof next === 'function' ? next(old) : next;
      sessionRef.current = value;
      return value;
    });
  }, []);

  useEffect(() => {
    if (!isReady) return;
    writeStoredSession(session);
  }, [session, isReady]);

  const signOut = useCallback(async () => {
    generation.current += 1;
    refreshInFlight.current = null;
    refreshedCache.current = null;
    const current = sessionRef.current;
    setSession(null);
    if (current?.refresh_token || current?.access_token) {
      // La sesión local se invalida ya; el aviso al backend es best-effort.
      logout(current.refresh_token, current.access_token).catch(() => {});
    }
  }, [setSession]);

  const requestRefresh = useCallback(async (refreshToken) => {
    const refreshed = await refreshSession(refreshToken);
    if (!refreshed?.access_token) throw new Error('El sistema no devolvió una sesión válida.');
    return refreshed;
  }, []);

  const applyRefreshed = useCallback((refreshed) => {
    setSession((old) => old ? {
      ...old,
      access_token: refreshed.access_token,
      // El backend puede rotar el refresh: conservar el nuevo cuando llegue.
      refresh_token: refreshed.refresh_token || old.refresh_token,
    } : null);
  }, [setSession]);

  // Devuelve el access_token nuevo al cliente HTTP para que reintente la
  // petición original. Varios 401 simultáneos comparten UNA SOLA renovación.
  const handleUnauthorized = useCallback(async () => {
    const current = sessionRef.current;
    if (!current?.refresh_token) {
      signOut();
      return null;
    }
    const ownGeneration = generation.current;
    // Si otra petición ya rotó la sesión, reutilizamos ese resultado: el
    // refresh anterior ya no sirve y volver a usarlo cerraría la sesión.
    if (refreshedCache.current?.generation === ownGeneration) {
      return refreshedCache.current.value.access_token;
    }
    if (!refreshInFlight.current) {
      refreshInFlight.current = requestRefresh(current.refresh_token)
        .then((value) => {
          if (generation.current === ownGeneration) {
            refreshedCache.current = { generation: ownGeneration, value };
          }
          return value;
        })
        .finally(() => { refreshInFlight.current = null; });
    }
    try {
      const refreshed = await refreshInFlight.current;
      if (ownGeneration !== generation.current) return null;
      applyRefreshed(refreshed);
      return refreshed.access_token;
    } catch {
      if (ownGeneration === generation.current) signOut();
      return null;
    }
  }, [applyRefreshed, requestRefresh, signOut]);

  useEffect(() => {
    setUnauthorizedHandler(handleUnauthorized);
    return () => setUnauthorizedHandler(null);
  }, [handleUnauthorized]);

  // Restaurar sesión al inicio, una sola vez y sin pisar un login o logout
  // que ocurra mientras se comprueba el token guardado.
  useEffect(() => {
    if (restoreStarted.current) return;
    restoreStarted.current = true;
    let active = true;
    const ownGeneration = generation.current;

    readStoredSession().then(async (stored) => {
      if (!active || ownGeneration !== generation.current) return;
      if (!stored?.access_token) {
        setIsReady(true);
        return;
      }
      try {
        let current = stored;
        let user;
        try {
          user = await getCurrentUser(current.access_token);
        } catch {
          if (!current.refresh_token) throw new Error('Sesión vencida');
          const refreshed = await requestRefresh(current.refresh_token);
          current = {
            ...current,
            access_token: refreshed.access_token,
            refresh_token: refreshed.refresh_token || current.refresh_token,
          };
          user = await getCurrentUser(current.access_token);
        }
        if (active && ownGeneration === generation.current) {
          setSession({ ...current, user });
        }
      } catch {
        // No llamar a setSession(null): podría borrar una sesión iniciada
        // mientras se restauraba. Solo se limpia el almacenamiento.
        if (active && ownGeneration === generation.current) await writeStoredSession(null);
      } finally {
        if (active) setIsReady(true);
      }
    });
    return () => { active = false; };
  }, [requestRefresh, setSession]);

  const signIn = async (email, password) => {
    const ownGeneration = ++generation.current;
    refreshedCache.current = null;
    const result = await login(email, password);
    if (ownGeneration === generation.current) setSession(result);
    return result;
  };

  const refreshUser = async () => {
    const currentSession = sessionRef.current;
    if (!currentSession?.access_token) return;
    const currentGen = generation.current;
    const user = await getCurrentUser(currentSession.access_token);
    if (currentGen === generation.current) {
      setSession((old) => old ? { ...old, user } : old);
    }
    return user;
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user,
        accessToken: session?.access_token,
        isReady,
        signIn,
        signOut,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
