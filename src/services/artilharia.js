import api from './api';

// GET /api/artilharia — 10 maiores goleadores
export const listarArtilharia = () =>
  api.get('/artilharia').then((r) => r.data);
