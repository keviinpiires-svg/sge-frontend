import api from './api';

// POST /api/login
export const login = (email, senha) =>
  api.post('/login', { email, senha }).then((r) => r.data);
