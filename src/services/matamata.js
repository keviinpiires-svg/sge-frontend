import api from './api';

// GET /api/matamata — semifinais, 3º lugar e final
export const listarMataMata = () =>
  api.get('/matamata').then((r) => r.data);

// POST /api/matamata/gerar (protegida) — cruza os dois primeiros de cada grupo
export const gerarSemifinais = () =>
  api.post('/matamata/gerar', {}).then((r) => r.data);

// POST /api/matamata/final (protegida) — vencedores das semifinais
export const gerarFinal = () =>
  api.post('/matamata/final', {}).then((r) => r.data);
