import api from './api';

// A mesa (PLACAR) adiciona atleta à equipe na hora do jogo e retira o que ela mesma colocou (db/45).
// Tudo pelo jogo: a trava de local do backend lê o jogo da URL.

// GET /api/jogos/:jogoId/equipes/:equipeId/atletas-da-escola?nome=
// Atletas da mesma escola da equipe que ainda não estão nela: [{ id, nome, equipes: [{ modalidade, categoria, genero }] }].
// Sem RG, sem nascimento: a mesa não vê dado pessoal.
export const buscarAtletasDaEscola = (jogoId, equipeId, nome) =>
  api.get(`/jogos/${encodeURIComponent(jogoId)}/equipes/${encodeURIComponent(equipeId)}/atletas-da-escola`, { params: { nome } })
    .then((r) => r.data);

// POST /api/jogos/:jogoId/equipes/:equipeId/atletas
// { atleta_id }  ou  { nome, data_nascimento (AAAA-MM-DD), sexo ('M'|'F'), documento? }
// Regra que barra: 403 { erro: 'Precisa de autorização do administrador.', detalhe: 'motivo curto' }.
export const adicionarAtletaPelaMesa = (jogoId, equipeId, corpo) =>
  api.post(`/jogos/${encodeURIComponent(jogoId)}/equipes/${encodeURIComponent(equipeId)}/atletas`, corpo)
    .then((r) => r.data);

// DELETE /api/jogos/:jogoId/inscricoes/:inscricaoId — só a inscrição que esta mesa criou
export const retirarAtletaPelaMesa = (jogoId, inscricaoId) =>
  api.delete(`/jogos/${encodeURIComponent(jogoId)}/inscricoes/${encodeURIComponent(inscricaoId)}`)
    .then((r) => r.data);

// GET /api/inscricoes/adicionadas-pela-mesa (ADMIN)
export const listarAtletasAdicionadosPelasMesas = () =>
  api.get('/inscricoes/adicionadas-pela-mesa').then((r) => r.data);
