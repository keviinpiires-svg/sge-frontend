import api from './api';

// GET /api/atletas/escola/:escola_id — lista pública, sem o RG
export const listarAtletasPorEscola = (escolaId) =>
  api.get(`/atletas/escola/${encodeURIComponent(escolaId)}`).then((r) => r.data);

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
