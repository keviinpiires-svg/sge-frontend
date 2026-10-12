import api from './api';

// GET /api/sumulas/:jogo_id
// Devolve { evento, jogo, equipes: [duas], linhas_sumula, lancada }.
// Antes de qualquer lançamento vem o elenco zerado — a súmula em branco.
export const buscarSumulaPorJogo = (jogoId) =>
  api.get(`/sumulas/${encodeURIComponent(jogoId)}`).then((r) => r.data);

// POST /api/sumulas (ADMIN ou PLACAR)
// { jogo_id, finalizar, penaltis_1, penaltis_2, equipes: [{ equipe_id, ..., atletas: [] }] }
export const registrarSumula = (sumula) =>
  api.post('/sumulas', sumula).then((r) => r.data);

// verificarSuspensao saiu: o cálculo antigo não seguia o regulamento
// (2 amarelos = 1 jogo, amarelos zerados na 2ª fase, expulsão = 1 jogo).
// Volta na fatia 5e — suspensão por cartões.
