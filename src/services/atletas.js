import api from './api';

// GET /api/atletas/equipe/:escola_id
export const listarAtletasPorEquipe = (escolaId) =>
  api.get(`/atletas/equipe/${escolaId}`).then((r) => r.data);

// POST /api/atletas (protegida)
export const cadastrarAtleta = (atleta) =>
  api.post('/atletas', atleta).then((r) => r.data);

// PUT /api/atletas/:id (protegida)
export const atualizarAtleta = (id, atleta) =>
  api.put(`/atletas/${id}`, atleta).then((r) => r.data);

// DELETE /api/atletas/:id (protegida)
export const excluirAtleta = (id) =>
  api.delete(`/atletas/${id}`).then((r) => r.data);
