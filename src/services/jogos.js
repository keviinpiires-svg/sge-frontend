import api from './api';

// GET /api/jogos — filtros aceitos: competicao_id, fase, status
export const listarJogos = (filtros) =>
  api.get('/jogos', { params: filtros }).then((r) => r.data);

// GET /api/jogos/:id
export const buscarJogoPorId = (id) =>
  api.get(`/jogos/${encodeURIComponent(id)}`).then((r) => r.data);

// POST /api/jogos (ADMIN)
export const agendarJogo = (jogo) =>
  api.post('/jogos', jogo).then((r) => r.data);

// PUT /api/jogos/:id (ADMIN) — só dados de agenda
export const atualizarJogo = (id, dados) =>
  api.put(`/jogos/${encodeURIComponent(id)}`, dados).then((r) => r.data);

// PUT /api/jogos/:id/iniciar (ADMIN ou PLACAR)
export const iniciarJogo = (id) =>
  api.put(`/jogos/${encodeURIComponent(id)}/iniciar`).then((r) => r.data);

// DELETE /api/jogos/:id (ADMIN) — renumera os jogos seguintes da competição
export const excluirJogo = (id) =>
  api.delete(`/jogos/${encodeURIComponent(id)}`).then((r) => r.data);

// PUT /api/jogos/:id/wo (ADMIN) — { vencedor_equipe_id, placar_1, placar_2, motivo }
export const declararWO = (id, dados) =>
  api.put(`/jogos/${encodeURIComponent(id)}/wo`, dados).then((r) => r.data);
