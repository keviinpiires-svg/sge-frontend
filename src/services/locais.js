import api from './api';

// GET /api/locais — locais de disputa
export const listarLocais = () =>
  api.get('/locais').then((r) => r.data);
