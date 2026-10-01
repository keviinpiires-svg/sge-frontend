import api from './api';

// GET /api/tabela-geral
// Devolve { blocos, geral, ajustes, competicoes, regras }. Tudo calculado a
// partir dos jogos: nada da tabela geral é guardado, fora as punições.
export const obterTabelaGeral = () =>
  api.get('/tabela-geral').then((r) => r.data);
