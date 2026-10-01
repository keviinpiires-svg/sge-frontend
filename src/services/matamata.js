import api from './api';

// GET /api/matamata/competicao/:id
// A chave inteira: formato, classificados, confrontos (previstos ou já
// gerados), colocações calculadas e o que dá para gerar agora.
export const chaveDaCompeticao = (competicaoId) =>
  api.get(`/matamata/competicao/${encodeURIComponent(competicaoId)}`).then((r) => r.data);

// POST /api/matamata/competicao/:id/gerar (ADMIN)
// Gera a próxima fase — o backend decide se é semifinal ou final.
export const gerarProximaFase = (competicaoId) =>
  api.post(`/matamata/competicao/${encodeURIComponent(competicaoId)}/gerar`).then((r) => r.data);

// DELETE /api/matamata/competicao/:id/:fase (ADMIN)
// Só desfaz enquanto nada foi jogado naquela fase.
export const desfazerFase = (competicaoId, fase) =>
  api.delete(`/matamata/competicao/${encodeURIComponent(competicaoId)}/${fase}`).then((r) => r.data);
