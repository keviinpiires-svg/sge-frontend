import api from './api';

// Importação de atletas por CSV (só ADMIN). O corpo é o próprio texto do
// arquivo, como text/csv. A prévia não grava nada; o confirmar refaz a análise
// no servidor e grava as linhas OK numa transação única (tudo ou nada).
const comoCsv = { headers: { 'Content-Type': 'text/csv' } };

// escola_id: a escola escolhida na tela, quando a planilha não tem a coluna Escola
const parametros = ({ escolaId, apenasOk } = {}) => ({
  ...comoCsv,
  params: {
    ...(escolaId ? { escola_id: escolaId } : {}),
    ...(apenasOk ? { apenas_ok: true } : {})
  }
});

// POST /api/importar-atletas/previa — { resumo, linhas, sem_coluna_escola }
export const previaAtletas = (csv, opcoes) =>
  api.post('/importar-atletas/previa', csv, parametros(opcoes)).then((r) => r.data);

// POST /api/importar-atletas/confirmar — { mensagem, final, resumo, linhas }
export const confirmarAtletas = (csv, opcoes) =>
  api.post('/importar-atletas/confirmar', csv, parametros(opcoes)).then((r) => r.data);
