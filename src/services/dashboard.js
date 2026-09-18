import api from './api';

// GET /api/dashboard -> totais, próximo jogo e campeão
export const obterEstatisticas = () =>
  api.get('/dashboard').then((r) => r.data);
