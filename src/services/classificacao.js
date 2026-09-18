import api from './api';

// GET /api/classificacao — calculada a partir dos jogos finalizados
export const listarClassificacao = () =>
  api.get('/classificacao').then((r) => r.data);
