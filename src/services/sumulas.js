import api from './api';

// GET /api/sumulas/:jogo_id -> { jogo, eventos }
export const buscarSumulaPorJogo = (jogoId) =>
  api.get(`/sumulas/${jogoId}`).then((r) => r.data);

// GET /api/sumulas/atleta/:atleta_id/status
export const verificarSuspensao = (atletaId) =>
  api.get(`/sumulas/atleta/${atletaId}/status`).then((r) => r.data);

// POST /api/sumulas (protegida) -> { jogo_id, eventos: [...] }
export const registrarSumula = (sumula) =>
  api.post('/sumulas', sumula).then((r) => r.data);
