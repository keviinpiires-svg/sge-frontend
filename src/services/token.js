// Leitura/escrita do JWT no localStorage, isolada para o axios e o AuthContext
// usarem a mesma fonte de verdade. Em janela anônima o acesso pode falhar,
// por isso todo acesso é protegido com try/catch.
const CHAVE_TOKEN = 'sge_token';
const CHAVE_USUARIO = 'sge_usuario';

export function getToken() {
  try {
    return localStorage.getItem(CHAVE_TOKEN);
  } catch {
    return null;
  }
}

export function getUsuario() {
  try {
    const bruto = localStorage.getItem(CHAVE_USUARIO);
    return bruto ? JSON.parse(bruto) : null;
  } catch {
    return null;
  }
}

export function salvarSessao(token, usuario) {
  try {
    localStorage.setItem(CHAVE_TOKEN, token);
    localStorage.setItem(CHAVE_USUARIO, JSON.stringify(usuario || null));
  } catch {
    // Sem localStorage a sessão vale apenas enquanto a aba estiver aberta
  }
}

export function limparSessao() {
  try {
    localStorage.removeItem(CHAVE_TOKEN);
    localStorage.removeItem(CHAVE_USUARIO);
  } catch {
    // Nada a limpar
  }
}

// Cabeçalho pronto para o fetch: { Authorization: 'Bearer <token>' }
export function authHeaders() {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// Chamada quando o backend responde 401: token expirado ou inválido.
// A ida para /login recarrega a página, e o AuthProvider renasce deslogado.
export function sessaoExpirada() {
  limparSessao();
  if (window.location.pathname !== '/login') {
    window.location.assign('/login');
  }
}
