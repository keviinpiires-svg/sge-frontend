import { useState, useCallback, useMemo, useEffect } from 'react';
import { AuthContext } from './auth-context';
import { getToken, getUsuario, salvarSessao, limparSessao } from '../services/token';
import { login as autenticar, buscarEu } from '../services/auth';

export function AuthProvider({ children }) {
  // O estado inicial vem do localStorage: a sessão sobrevive ao F5
  const [token, setToken] = useState(() => getToken());
  const [usuario, setUsuario] = useState(() => getUsuario());

  // Ao abrir o sistema, relê a conta no servidor: o ADMIN pode ter trocado o
  // local da mesa (ou o perfil) depois do login. A trava em si é do backend,
  // que lê o banco a cada escrita; aqui é só para a tela mostrar o certo.
  useEffect(() => {
    if (!token) return undefined;
    let ativo = true;
    buscarEu()
      .then((atual) => {
        if (!ativo) return;
        salvarSessao(token, atual);
        setUsuario(atual);
      })
      .catch(() => {
        // 401 já encerra a sessão pelo interceptor; sem rede, fica a do login
      });
    return () => { ativo = false; };
  }, [token]);

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
    // O backend manda o perfil no login (ADMIN ou PLACAR). Sem perfil
    // reconhecido, a sessão vale só para leitura: logado não é mais sinônimo
    // de administrador.
    const perfil = (usuario?.perfil || '').toString().toUpperCase();
    const autenticado = Boolean(token);

    return {
      token,
      usuario,
      perfil,
      autenticado,
      isAdmin: autenticado && perfil === 'ADMIN',
      isPlacar: autenticado && perfil === 'PLACAR',
      // Quem lança súmula e placar: o administrador e a mesa
      podeLancar: autenticado && (perfil === 'ADMIN' || perfil === 'PLACAR'),
      // Local da conta de mesa (db/18); null = mesa sem local, ou ADMIN
      localDaMesa: autenticado && perfil === 'PLACAR' && usuario?.local_id
        ? { id: usuario.local_id, nome: usuario.local_nome }
        : null,
      login,
      logout,
    };
  }, [token, usuario, login, logout]);

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>;
}
