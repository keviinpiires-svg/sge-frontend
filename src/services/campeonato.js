import api from './api';

// Palavra que o backend exige para aceitar o reset
export const CONFIRMACAO_RESET = 'REINICIAR';

// DELETE /api/campeonato/reset (protegida)
// A confirmação vem de quem chama — normalmente o texto digitado pelo
// administrador. No axios o corpo do DELETE vai em `data`.
export const resetarCampeonato = (confirmacao) =>
  api.delete('/campeonato/reset', { data: { confirmacao } }).then((r) => r.data);
