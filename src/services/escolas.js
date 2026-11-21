import api from './api';

// GET /api/escolas
export const listarEscolas = () =>
  api.get('/escolas').then((r) => r.data);

// POST /api/escolas (protegida)
export const cadastrarEscola = (escola) =>
  api.post('/escolas', escola).then((r) => r.data);

// PUT /api/escolas/:id (protegida)
export const atualizarEscola = (id, escola) =>
  api.put(`/escolas/${encodeURIComponent(id)}`, escola).then((r) => r.data);

// GET /api/escolas/:id/atletas-por-equipe — só logados (ADMIN e PLACAR): as equipes
// da escola em modalidade coletiva, com nome, nascimento e camisa dos inscritos
// (sem RG). Alimenta o documento "Atletas (PDF)".
export const buscarAtletasDaEscola = (id) =>
  api.get(`/escolas/${encodeURIComponent(id)}/atletas-por-equipe`).then((r) => r.data);
