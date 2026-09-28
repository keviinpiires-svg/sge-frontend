import api from './api';

// GET /api/competicoes — filtros aceitos: modalidade (slug ou id), genero, categoria_id
export const listarCompeticoes = (filtros) =>
  api.get('/competicoes', { params: filtros }).then((r) => r.data);

// GET /api/competicoes/:id — traz a regra de disputa e os grupos com as equipes
export const buscarCompeticao = (id) =>
  api.get(`/competicoes/${encodeURIComponent(id)}`).then((r) => r.data);
