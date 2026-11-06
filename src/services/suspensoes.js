import api from './api';

// GET /api/suspensoes/competicao/:id
// Cartões e suspensões pendentes de todos os atletas da competição.
// Devolve { competicao, regra_definida, avisos, atletas }.
export const suspensoesDaCompeticao = (competicaoId) =>
  api.get(`/suspensoes/competicao/${encodeURIComponent(competicaoId)}`).then((r) => r.data);

// GET /api/suspensoes/jogo/:id
// Quem não pode entrar neste jogo, contando só o que veio antes dele.
export const suspensosNoJogo = (jogoId) =>
  api.get(`/suspensoes/jogo/${encodeURIComponent(jogoId)}`).then((r) => r.data);
