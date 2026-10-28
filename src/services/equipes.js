import api from './api';

// GET /api/equipes — filtros: escola_id, competicao_id.
// Traz a competição de cada equipe, o grupo e quantos atletas já estão
// inscritos, que é o que a tela de inscrição precisa para escolher.
export const listarEquipes = (filtros) =>
  api.get('/equipes', { params: filtros }).then((r) => r.data);

// GET /api/equipes/:id/atletas-elegiveis
// Atletas da escola que passam nas regras de idade e sexo desta competição e
// ainda não estão inscritos nela. Cada um vem com quantas competições
// coletivas já tem, para a tela avisar antes do limite de 2.
export const listarElegiveis = (equipeId) =>
  api.get(`/equipes/${encodeURIComponent(equipeId)}/atletas-elegiveis`).then((r) => r.data);
