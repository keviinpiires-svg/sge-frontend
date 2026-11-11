import api from './api';

// GET /api/atletas/escola/:escola_id — lista pública, sem o RG
export const listarAtletasPorEscola = (escolaId) =>
  api.get(`/atletas/escola/${encodeURIComponent(escolaId)}`).then((r) => r.data);

// GET /api/atletas/busca?nome= — busca pelo nome em TODAS as escolas (pública; mín. 3 letras, até 50).
// Devolve { limite, mais_resultados, atletas: [{ id, nome, escola_id, escola_nome }] }; o ADMIN recebe
// também sexo e nascimento, o visitante não.
export const buscarAtletasPorNome = (nome) =>
  api.get('/atletas/busca', { params: { nome } }).then((r) => r.data);

// Nome antigo, mantido enquanto as telas não migram: "equipe" aqui sempre
// significou escola, e o backend mantém o caminho antigo apontando ao mesmo lugar.
export const listarAtletasPorEquipe = listarAtletasPorEscola;

// GET /api/atletas/:id (ADMIN) — traz o RG, para a tela de edição
export const buscarAtletaPorId = (id) =>
  api.get(`/atletas/${encodeURIComponent(id)}`).then((r) => r.data);

// POST /api/atletas (protegida)
export const cadastrarAtleta = (atleta) =>
  api.post('/atletas', atleta).then((r) => r.data);

// PUT /api/atletas/:id (protegida)
export const atualizarAtleta = (id, atleta) =>
  api.put(`/atletas/${id}`, atleta).then((r) => r.data);

// DELETE /api/atletas/:id (protegida)
export const excluirAtleta = (id) =>
  api.delete(`/atletas/${id}`).then((r) => r.data);

// GET /api/atletas/:id/inscricoes — competições do atleta (pública; a marca "excecao" só vem para o ADMIN)
export const listarInscricoesDoAtleta = (id) =>
  api.get(`/atletas/${encodeURIComponent(id)}/inscricoes`).then((r) => r.data);
