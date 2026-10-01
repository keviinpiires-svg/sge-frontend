// Peças que todas as folhas de súmula usam.

// A folha tem um número fixo de linhas, esteja o elenco cheio ou não: é o que
// permite levá-la impressa para a quadra e escrever à mão o que faltar.
export const completarLinhas = (atletas, total) => {
  const linhas = [...atletas];
  while (linhas.length < total) linhas.push(null);
  return linhas;
};

export const sequencia = (quantidade) => Array.from({ length: quantidade }, (_, i) => i);

// Quem lê a data do jogo é services/datas.js, para a folha impressa mostrar a
// mesma hora que a tabela de jogos.
export { partesDaData } from '../../services/datas';

export const letraDaEquipe = (indice) => (indice === 0 ? 'A' : 'B');
