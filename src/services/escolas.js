import api from './api';

// GET /api/escolas
export const listarEscolas = () =>
  api.get('/escolas').then((r) => r.data);

// POST /api/escolas (protegida)
export const cadastrarEscola = (escola) =>
  api.post('/escolas', escola).then((r) => r.data);

// PUT /api/escolas/:id (protegida)
export const atualizarEscola = (id, escola) =>
  api.put(`/escolas/${encodeURIComponent(id)}`, escola).then((r) => r.data);
