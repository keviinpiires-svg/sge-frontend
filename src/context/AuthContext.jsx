import { useState, useCallback, useMemo } from 'react';
import { AuthContext } from './auth-context';
import { getToken, getUsuario, salvarSessao, limparSessao, authHeaders } from '../services/token';

export function AuthProvider({ children }) {
  // O estado inicial vem do localStorage: a sessão sobrevive ao F5
  const [token, setToken] = useState(() => getToken());
  const [usuario, setUsuario] = useState(() => getUsuario());

  const login = useCallback(async (email, senha) => {
    const response = await fetch('http://localhost:3000/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, senha }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.message || data.erro || 'E-mail ou senha inválidos.');
    }
    if (!data.token) {
      throw new Error('O servidor não devolveu um token de acesso.');
    }

    salvarSessao(data.token, data.usuario);
    setToken(data.token);
    setUsuario(data.usuario || null);
    return data.usuario;
  }, []);

  const logout = useCallback(() => {
    limparSessao();
    setToken(null);
    setUsuario(null);
  }, []);

  const valor = useMemo(() => {
    const perfil = (usuario?.perfil || usuario?.role || '').toString().toUpperCase();
    return {
      token,
      usuario,
      autenticado: Boolean(token),
      // Sem campo de perfil no backend, todo usuário logado é tratado como administrador
      isAdmin: Boolean(token) && (perfil === '' || perfil.includes('ADMIN')),
      login,
      logout,
      authHeaders,
    };
  }, [token, usuario, login, logout]);

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>;
}
