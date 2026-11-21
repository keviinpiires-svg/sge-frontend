// Peças que todas as folhas de súmula usam.

// A folha tem um número fixo de linhas, esteja o elenco cheio ou não: é o que
// permite levá-la impressa para a quadra e escrever à mão o que faltar.
export const completarLinhas = (atletas, total) => {
  const linhas = [...atletas];
  while (linhas.length < total) linhas.push(null);
  return linhas;
};

export const sequencia = (quantidade) => Array.from({ length: quantidade }, (_, i) => i);

// Quantas linhas de atleta a folha desenha. A em branco segue o papel
// (folha.linhas); a preenchida cresce até folha.linhasMaximas quando a equipe
// tem mais inscritos do que o papel tem linhas — ninguém some da impressão.
export const linhasDaFolha = (folha, equipe, emBranco) => {
  if (emBranco) return folha.linhas;
  const teto = folha.linhasMaximas || folha.linhas;
  return Math.min(teto, Math.max(folha.linhas, equipe.atletas.length));
};

// Quem lê a data do jogo é services/datas.js, para a folha impressa mostrar a
// mesma hora que a tabela de jogos.
export { partesDaData } from '../../services/datas';

export const letraDaEquipe = (indice) => (indice === 0 ? 'A' : 'B');
