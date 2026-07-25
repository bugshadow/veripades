import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import api, { setAccessToken, setUnauthorizedHandler } from '../lib/api';

const AuthContext = createContext(null);

const decodeJwt = (token) => {
  try {
    const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(decodeURIComponent(window.atob(payload).split('').map((char) => `%${char.charCodeAt(0).toString(16).padStart(2, '0')}`).join('')));
  } catch {
    return null;
  }
};

export const AuthProvider = ({ children }) => {
  const [session, setSession] = useState(null);
  const [sessionNotice, setSessionNotice] = useState('');
  const expiryTimer = useRef(null);

  const clearSession = useCallback((reason = '') => {
    if (expiryTimer.current) window.clearTimeout(expiryTimer.current);
    setAccessToken(null);
    setSession(null);
    setSessionNotice(reason);
  }, []);

  const establishSession = useCallback((user, token) => {
    const payload = decodeJwt(token);
    const expiresAt = payload?.exp ? payload.exp * 1000 : Date.now() + (2 * 60 * 60 * 1000);
    const remaining = expiresAt - Date.now();
    if (remaining <= 0) {
      clearSession('Votre session a expiré. Reconnectez-vous pour continuer.');
      return null;
    }
    if (expiryTimer.current) window.clearTimeout(expiryTimer.current);
    setAccessToken(token);
    setSession({ user, token, expiresAt });
    setSessionNotice('');
    expiryTimer.current = window.setTimeout(() => clearSession('Votre session a expiré. Reconnectez-vous pour continuer.'), remaining);
    return user;
  }, [clearSession]);

  useEffect(() => {
    setUnauthorizedHandler(() => clearSession('Votre session n’est plus valide. Reconnectez-vous pour continuer.'));
    return () => {
      setUnauthorizedHandler(null);
      if (expiryTimer.current) window.clearTimeout(expiryTimer.current);
    };
  }, [clearSession]);

  const login = useCallback(async (email, password) => {
    const response = await api.post('/auth/login', { email, password }, { publicRequest: true });
    return establishSession(response.data.user, response.data.token);
  }, [establishSession]);

  const register = useCallback(async (email, password) => {
    await api.post('/auth/register', { email, password }, { publicRequest: true });
    return login(email, password);
  }, [login]);

  const value = useMemo(() => ({
    user: session?.user || null,
    token: session?.token || null,
    expiresAt: session?.expiresAt || null,
    sessionNotice,
    clearSessionNotice: () => setSessionNotice(''),
    login,
    register,
    logout: () => clearSession(''),
  }), [clearSession, login, register, session, sessionNotice]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth doit être utilisé dans AuthProvider.');
  return context;
};
