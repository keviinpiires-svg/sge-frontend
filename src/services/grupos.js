import api from './api';

// GET /api/grupos -> [{ id, nome, escolas: [...] }]
export const listarGrupos = () =>
  api.get('/grupos').then((r) => r.data);

// PUT /api/grupos/distribuicao (protegida) -> { A: [ids], B: [ids] }
export const salvarDistribuicao = (distribuicao) =>
  api.put('/grupos/distribuicao', { distribuicao }).then((r) => r.data);
