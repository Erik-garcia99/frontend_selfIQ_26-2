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

  const setSession = useCallback((next) => {
    setSessionState((old) => {
      const value = typeof next === 'function' ? next(old) : next;
      sessionRef.current = value;
      writeStoredSession(value);
      return value;
    });
  }, []);

  const signOut = useCallback(async () => {
    generation.current += 1;
    const current = sessionRef.current;
    setSession(null);
    if (current?.refresh_token || current?.access_token) {
      logout(current.refresh_token, current.access_token).catch(() => {});
    }
  }, [setSession]);

  // Si el backend responde 401 en cualquier llamada autenticada:
  // intenta refrescar el token si existe un refresh_token, o cierra la sesión.
  const handleUnauthorized = useCallback(async () => {
    const current = sessionRef.current;
    if (!current?.refresh_token) {
      signOut();
      return;
    }
    const ownGeneration = ++generation.current;
    try {
      const refreshed = await refreshSession(current.refresh_token);
      if (ownGeneration === generation.current && refreshed?.access_token) {
        setSession((old) => old ? { ...old, access_token: refreshed.access_token } : null);
      } else {
        signOut();
      }
    } catch {
      signOut();
    }
  }, [setSession, signOut]);

  useEffect(() => {
    setUnauthorizedHandler(handleUnauthorized);
    return () => setUnauthorizedHandler(null);
  }, [handleUnauthorized]);

  // Restaurar sesión al inicio
  useEffect(() => {
    let active = true;
    readStoredSession().then(async (stored) => {
      if (!active) return;
      if (!stored?.access_token) {
        setIsReady(true);
        return;
      }
      try {
        const user = await getCurrentUser(stored.access_token);
        if (active) {
          setSession({ ...stored, user });
        }
      } catch (err) {
        // Si el access_token guardado ya venció, intentar con refresh_token
        if (stored.refresh_token) {
          try {
            const refreshed = await refreshSession(stored.refresh_token);
            if (active && refreshed?.access_token) {
              const freshUser = await getCurrentUser(refreshed.access_token);
              if (active) {
                setSession({ ...stored, access_token: refreshed.access_token, user: freshUser });
              }
            } else if (active) {
              await writeStoredSession(null);
            }
          } catch {
            if (active) await writeStoredSession(null);
          }
        } else if (active) {
          await writeStoredSession(null);
        }
      } finally {
        if (active) setIsReady(true);
      }
    });
    return () => { active = false; };
  }, [setSession]);

  const signIn = async (email, password) => {
    const ownGeneration = ++generation.current;
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
