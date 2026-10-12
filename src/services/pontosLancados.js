import api from './api';

// Pontos que a mesa lança para atletismo, xadrez, dama e dominó, que
// funcionam fora do sistema (chefe, 12/10/2026). Leitura pública; lançar e
// editar é de ADMIN e PLACAR; apagar o lançamento inteiro, só do ADMIN.

// GET /api/pontos-lancados — { configuracao, escolas, lancamentos }
export const listarPontosLancados = () =>
  api.get('/pontos-lancados').then((r) => r.data);

// PUT /api/pontos-lancados — { modalidade, categoria_id, genero, linhas, base, confirmado }
// 409: outra pessoa salvou no meio; 422: há escola acima do esperado sem confirmação
export const salvarPontosLancados = (lancamento) =>
  api.put('/pontos-lancados', lancamento).then((r) => r.data);

// DELETE /api/pontos-lancados/:modalidade/:categoria_id/:genero
export const apagarLancamento = (modalidade, categoria_id, genero) =>
  api.delete(`/pontos-lancados/${encodeURIComponent(modalidade)}/${categoria_id}/${genero}`)
    .then((r) => r.data);
