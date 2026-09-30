// Peças que todas as folhas de súmula usam.

// A folha tem um número fixo de linhas, esteja o elenco cheio ou não: é o que
// permite levá-la impressa para a quadra e escrever à mão o que faltar.
export const completarLinhas = (atletas, total) => {
  const linhas = [...atletas];
  while (linhas.length < total) linhas.push(null);
  return linhas;
};

export const sequencia = (quantidade) => Array.from({ length: quantidade }, (_, i) => i);

export const partesDaData = (valor) => {
  if (!valor) return ['', '', ''];
  const data = new Date(valor);
  if (isNaN(data.getTime())) return ['', '', ''];
  return [
    String(data.getUTCDate()).padStart(2, '0'),
    String(data.getUTCMonth() + 1).padStart(2, '0'),
    String(data.getUTCFullYear())
  ];
};

export const letraDaEquipe = (indice) => (indice === 0 ? 'A' : 'B');
