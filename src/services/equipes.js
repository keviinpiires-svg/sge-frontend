import api from './api';

// GET /api/equipes — filtros: escola_id, competicao_id.
// Traz a competição de cada equipe, o grupo e quantos atletas já estão
// inscritos, que é o que a tela de inscrição precisa para escolher.
export const listarEquipes = (filtros) =>
  api.get('/equipes', { params: filtros }).then((r) => r.data);
