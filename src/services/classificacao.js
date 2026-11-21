import api from './api';

// GET /api/classificacao/competicao/:id
// Calculada a partir dos jogos da fase de grupos, com o desempate da
// modalidade já aplicado. Devolve { competicao, criterios_desempate,
// total_jogos_computados, avisos, grupos }.
export const classificacaoDaCompeticao = (competicaoId) =>
  api.get(`/classificacao/competicao/${encodeURIComponent(competicaoId)}`).then((r) => r.data);
