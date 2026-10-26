import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { getCurrentUser, login } from '../services/authService';
import { setUnauthorizedHandler } from '../services/http';
const AuthContext = createContext(null);
export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const generation = useRef(0);
  const signOut = useCallback(() => { generation.current += 1; setSession(null); }, []);
  useEffect(() => { setUnauthorizedHandler(signOut); return () => setUnauthorizedHandler(null); }, [signOut]);
  const signIn = async (email, password) => {
    const ownGeneration = ++generation.current;
    const result = await login(email, password);
    if (ownGeneration === generation.current) setSession(result);
    return result;
  };
  const refreshUser = async () => {
    if (!session) return;
    const current = generation.current;
    const user = await getCurrentUser(session.access_token);
    if (current === generation.current) setSession((old) => old ? { ...old, user } : old);
    return user;
  };
  return <AuthContext.Provider value={{ session, user: session?.user, accessToken: session?.access_token, signIn, signOut, refreshUser }}>{children}</AuthContext.Provider>;
}
export function useAuth() { return useContext(AuthContext); }