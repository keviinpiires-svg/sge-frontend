import api from './api';

// GET /api/grupos -> [{ id, nome, escolas: [...] }]
export const listarGrupos = () =>
  api.get('/grupos').then((r) => r.data);
