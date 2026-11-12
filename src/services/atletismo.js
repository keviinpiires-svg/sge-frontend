import api from './api';

// Atletismo por colocação (db/37, 12/11/2026): o ADMIN lança o 1º, o 2º e o
// 3º de cada prova + categoria + gênero. Leitura pública; escrita só ADMIN.

// GET /api/atletismo-colocacoes — { resultados, configuracao }
export const listarColocacoes = () =>
  api.get('/atletismo-colocacoes').then((r) => r.data);

// PUT /api/atletismo-colocacoes/podio — o pódio inteiro numa transação
// { prova, categoria_id, genero, linhas: [{ colocacao, escola_id, atleta_nome }] }
// 409: colocação repetida ou a mesma escola duas vezes
export const salvarPodio = (podio) =>
  api.put('/atletismo-colocacoes/podio', podio).then((r) => r.data);

// DELETE /api/atletismo-colocacoes/:id
export const apagarColocacao = (id) =>
  api.delete(`/atletismo-colocacoes/${encodeURIComponent(id)}`).then((r) => r.data);
