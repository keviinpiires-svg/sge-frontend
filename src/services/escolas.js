import api from './api';

// GET /api/escolas
export const listarEscolas = () =>
  api.get('/escolas').then((r) => r.data);

// POST /api/escolas (protegida)
export const cadastrarEscola = (escola) =>
  api.post('/escolas', escola).then((r) => r.data);
