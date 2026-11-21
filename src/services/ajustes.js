import api from './api';

// GET /api/ajustes-pontos — público: a escola confere por que perdeu pontos
export const listarAjustes = () =>
  api.get('/ajustes-pontos').then((r) => r.data);

// POST /api/ajustes-pontos (ADMIN) — { escola_id, pontos, motivo }
export const aplicarAjuste = (ajuste) =>
  api.post('/ajustes-pontos', ajuste).then((r) => r.data);

// DELETE /api/ajustes-pontos/:id (ADMIN)
export const removerAjuste = (id) =>
  api.delete(`/ajustes-pontos/${encodeURIComponent(id)}`).then((r) => r.data);
