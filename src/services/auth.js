import api from './api';
import { API_URL } from './config';

// POST /api/login
export const login = (email, senha) =>
  api.post('/login', { email, senha }).then((r) => r.data);

// GET /api/eu — a sessão relida do banco (perfil e local da mesa): trocar o
// local de uma conta vale sem novo login
export const buscarEu = () =>
  api.get('/eu').then((r) => r.data);

// GET /saude (fora de /api, público) — inclui se "Reiniciar Campeonato" está
// permitido neste servidor. Quem protege é o backend; a tela só esconde.
export const buscarSaude = () =>
  fetch(`${API_URL}/saude`).then((r) => r.json());
