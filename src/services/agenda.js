import api from './api';

// GET /api/agenda — pública: todos os jogos, só com os campos da agenda
export const listarAgenda = () =>
  api.get('/agenda').then((r) => r.data);

// GET /api/agenda/jogos/:id — pública: o jogo e os atletas (só nome e camisa)
export const buscarJogoDaAgenda = (id) =>
  api.get(`/agenda/jogos/${encodeURIComponent(id)}`).then((r) => r.data);
