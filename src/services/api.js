import axios from 'axios';
import { authHeaders, sessaoExpirada } from './token';
import { API_URL } from './config';

// Rota onde o 401 é resposta esperada (credenciais erradas), e não sessão expirada
const ROTA_LOGIN = '/login';

const api = axios.create({
  baseURL: `${API_URL}/api`,
  // O plano gratuito do Render hiberna: a primeira requisição pode levar ~50s
  // para acordar o servidor. Um timeout curto transformaria isso em erro.
  timeout: 60000,
  headers: { 'Content-Type': 'application/json' }
});

// Anexa o Authorization: Bearer <token> em toda requisição autenticada
api.interceptors.request.use((config) => {
  Object.assign(config.headers, authHeaders());
  return config;
});

// Traduz qualquer falha numa frase que pode ir direto para a tela
const mensagemDoErro = (error) => {
  if (error.code === 'ECONNABORTED') {
    return 'O servidor demorou demais para responder. Ele pode estar iniciando — tente novamente em alguns segundos.';
  }

  if (!error.response) {
    return 'Não foi possível falar com o servidor. Verifique sua conexão e tente novamente.';
  }

  const { status, data } = error.response;
  const doBackend = data?.erro || data?.mensagem || data?.message;
  if (doBackend) return doBackend;

  if (status === 401) return 'Sessão inválida ou expirada.';
  if (status === 403) return 'Você não tem permissão para esta ação.';
  if (status === 404) return 'Recurso não encontrado.';
  if (status >= 500) return 'O servidor encontrou um erro. Tente novamente mais tarde.';
  return 'Não foi possível concluir a operação.';
};

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const noLogin = error.config?.url?.includes(ROTA_LOGIN);

    // 401 no login significa e-mail ou senha errados: a mensagem precisa chegar
    // à tela. Encerrar a sessão aqui só faria a pessoa perder o formulário.
    if (error.response?.status === 401 && !noLogin) {
      sessaoExpirada();
    }

    // Todo consumidor pode ler error.mensagem sem repetir tratamento
    error.mensagem = mensagemDoErro(error);
    return Promise.reject(error);
  }
);

export default api;
