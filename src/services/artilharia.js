import api from './api';

// GET /api/artilharia/competicao/:id — ranking completo de uma competição.
// Devolve { competicao, rotulo, artilheiros }: o rótulo diz se a coluna é
// "gols" ou "pontos", conforme a modalidade.
export const artilhariaDaCompeticao = (competicaoId) =>
  api.get(`/artilharia/competicao/${encodeURIComponent(competicaoId)}`).then((r) => r.data);

// GET /api/artilharia/lideres — o artilheiro de cada competição que já teve gol
export const listarLideres = () =>
  api.get('/artilharia/lideres').then((r) => r.data);
