import { useState, useCallback, useMemo } from 'react';
import { AuthContext } from './auth-context';
import { getToken, getUsuario, salvarSessao, limparSessao, authHeaders } from '../services/token';
import { login as autenticar } from '../services/auth';

export function AuthProvider({ children }) {
  // O estado inicial vem do localStorage: a sessão sobrevive ao F5
  const [token, setToken] = useState(() => getToken());
  const [usuario, setUsuario] = useState(() => getUsuario());

  const login = useCallback(async (email, senha) => {
    let data;
    try {
      data = await autenticar(email, senha);
    } catch (erro) {
      // O interceptor já traduziu o 401 em "E-mail ou senha inválidos."
      // e, por ser a rota de login, não encerrou a sessão.
      throw new Error(erro.mensagem, { cause: erro });
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
