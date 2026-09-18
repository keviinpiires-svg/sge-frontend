import api from './api';

// DELETE /api/campeonato/reset (protegida)
// O backend exige a confirmação no corpo; no axios o corpo do DELETE vai em `data`.
export const resetarCampeonato = () =>
  api.delete('/campeonato/reset', { data: { confirmacao: 'REINICIAR' } }).then((r) => r.data);
