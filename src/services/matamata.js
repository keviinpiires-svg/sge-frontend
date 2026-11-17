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

// PUT /api/matamata/competicao/:id/colocacao (ADMIN)
// Posição de pódio empatada até o sorteio: grava a equipe escolhida (equipe_id null desfaz).
export const definirColocacao = (competicaoId, posicao, equipeId) =>
  api.put(`/matamata/competicao/${encodeURIComponent(competicaoId)}/colocacao`, { posicao, equipe_id: equipeId }).then((r) => r.data);

// Avisos que a súmula ou o W.O. devolvem quando deveriam mudar um jogo do mata-mata já iniciado ou
// encerrado (o sistema não troca sozinho): uma frase por jogo, para mostrar na hora ao ADMIN.
export const textoDosAvisosDoMataMata = (avisos) => (avisos || [])
  .map((a) => `Jogo nº ${a.numero_tabela ?? a.jogo_id}${a.origem ? ` (${a.origem})` : ''}: ${a.motivo}`)
  .join('\n');

// POST /api/matamata/competicao/:id/recalcular-vagas (ADMIN)
// Preenche de novo as vagas dos jogos de mata-mata cadastrados (vagas escolhidas à mão ficam).
export const recalcularVagas = (competicaoId) =>
  api.post(`/matamata/competicao/${encodeURIComponent(competicaoId)}/recalcular-vagas`).then((r) => r.data);
