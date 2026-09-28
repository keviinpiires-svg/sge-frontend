import api from './api';

// GET /api/modalidades — alimenta o primeiro nível do menu lateral
export const listarModalidades = () =>
  api.get('/modalidades').then((r) => r.data);
