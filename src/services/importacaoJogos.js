import api from './api';

// Importação de jogos da fase de grupos por CSV (só ADMIN). O corpo é o
// próprio texto do arquivo, como text/csv. A prévia não grava nada; a
// importação refaz a análise no servidor e grava as linhas novas numa
// transação única.
const comoCsv = { headers: { 'Content-Type': 'text/csv' } };

// POST /api/importacao-jogos/previa — { resumo, linhas }
export const previaImportacao = (csv) =>
  api.post('/importacao-jogos/previa', csv, comoCsv).then((r) => r.data);

// POST /api/importacao-jogos — { mensagem, resumo, linhas }
export const importarJogos = (csv) =>
  api.post('/importacao-jogos', csv, comoCsv).then((r) => r.data);
