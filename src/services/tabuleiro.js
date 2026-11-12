import api from './api';

// Tabuleiro por colocação (db/38, 12/11/2026): xadrez, dama e dominó, misto.
// O ADMIN lança o 1º, o 2º e o 3º de cada jogo + categoria. Leitura pública;
// escrita só ADMIN.

// GET /api/tabuleiro-colocacoes — { resultados, configuracao }
export const listarColocacoesTabuleiro = () =>
  api.get('/tabuleiro-colocacoes').then((r) => r.data);

// PUT /api/tabuleiro-colocacoes/podio — o pódio inteiro numa transação
// { jogo, categoria_id, linhas: [{ colocacao, escola_id, atleta_nome }] }
// 409: colocação repetida ou a mesma escola duas vezes
export const salvarPodioTabuleiro = (podio) =>
  api.put('/tabuleiro-colocacoes/podio', podio).then((r) => r.data);

// DELETE /api/tabuleiro-colocacoes/:id
export const apagarColocacaoTabuleiro = (id) =>
  api.delete(`/tabuleiro-colocacoes/${encodeURIComponent(id)}`).then((r) => r.data);
