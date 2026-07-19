import { createContext, useContext, useEffect, useState } from 'react';
import api from '../lib/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('authUser');
    return stored ? JSON.parse(stored) : null;
  });

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (token) {
      api.defaults.headers.common.Authorization = `Bearer ${token}`;
    }
  }, []);

  const login = async (email, password) => {
    const response = await api.post('/auth/login', { email, password });
    const authenticatedUser = { ...response.data.user, token: response.data.token };

    localStorage.setItem('authToken', response.data.token);
    localStorage.setItem('authUser', JSON.stringify(authenticatedUser));
    api.defaults.headers.common.Authorization = `Bearer ${response.data.token}`;
    setUser(authenticatedUser);

    return authenticatedUser;
  };

  const logout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('authUser');
    delete api.defaults.headers.common.Authorization;
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
