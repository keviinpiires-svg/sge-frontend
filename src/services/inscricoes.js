import api from './api';

// POST /api/inscricoes (ADMIN)
// O backend valida idade × categoria, sexo × gênero, teto de 14 e o limite de
// 2 competições coletivas; a mensagem de cada recusa vem em error.mensagem.
export const inscreverAtleta = (inscricao) =>
  api.post('/inscricoes', inscricao).then((r) => r.data);

// GET /api/inscricoes/equipe/:equipe_id — elenco da equipe
export const listarInscritos = (equipeId) =>
  api.get(`/inscricoes/equipe/${encodeURIComponent(equipeId)}`).then((r) => r.data);

// DELETE /api/inscricoes/:id (ADMIN)
export const removerInscricao = (id) =>
  api.delete(`/inscricoes/${encodeURIComponent(id)}`).then((r) => r.data);
