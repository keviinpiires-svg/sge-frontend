import axios from 'axios';
import { authHeaders, sessaoExpirada } from './token';
import { API_URL } from './config';

const api = axios.create({
  // Devolvemos o /api para o final do endereço base
  baseURL: `${API_URL}/api`, 
});

// Anexa o Authorization: Bearer <token> em toda requisição autenticada
api.interceptors.request.use((config) => {
  Object.assign(config.headers, authHeaders());
  return config;
});

// Token expirado ou inválido: encerra a sessão e manda para o login
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      sessaoExpirada();
    }
    return Promise.reject(error);
  }
);

export default api;