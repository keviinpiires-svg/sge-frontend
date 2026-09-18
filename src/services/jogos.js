import api from './api';

// GET /api/jogos
export const listarJogos = () =>
  api.get('/jogos').then((r) => r.data);

// GET /api/jogos/:id
export const buscarJogoPorId = (id) =>
  api.get(`/jogos/${id}`).then((r) => r.data);

// POST /api/jogos/agendar (protegida)
export const agendarJogo = (jogo) =>
  api.post('/jogos/agendar', jogo).then((r) => r.data);

// PUT /api/jogos/finalizar/:id (protegida)
export const finalizarJogo = (id, placares) =>
  api.put(`/jogos/finalizar/${id}`, placares).then((r) => r.data);

// DELETE /api/jogos/:id (protegida)
export const excluirJogo = (id) =>
  api.delete(`/jogos/${id}`).then((r) => r.data);
