import api from './api';

// Toda a gestão de usuários é de ADMIN, inclusive a leitura: a lista revela
// quem tem acesso ao sistema. A senha (hash) nunca vem nas respostas.

// GET /api/usuarios
export const listarUsuarios = () =>
  api.get('/usuarios').then((r) => r.data);

// POST /api/usuarios — { nome, email, perfil, senha }
export const criarUsuario = (usuario) =>
  api.post('/usuarios', usuario).then((r) => r.data);

// PUT /api/usuarios/:id — aceita só os campos que mudaram
// ({ nome }, { perfil }, { ativo }...). Não existe exclusão: desativar
// tira o acesso e preserva a autoria das punições e suspensões.
export const atualizarUsuario = (id, campos) =>
  api.put(`/usuarios/${encodeURIComponent(id)}`, campos).then((r) => r.data);

// PUT /api/usuarios/:id/senha — redefinição feita por um administrador
export const trocarSenhaUsuario = (id, senha) =>
  api.put(`/usuarios/${encodeURIComponent(id)}/senha`, { senha }).then((r) => r.data);
