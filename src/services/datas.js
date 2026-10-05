// Datas do SGE.
//
// O banco guarda DATE e DATETIME como HORA DE PAREDE: "24/11 às 10:30" quer
// dizer 10:30 em Barra do Choça, e o backend as entrega como texto
// ("2026-11-24 10:30:00"), sem fuso. Estas funções leem esses números tal como
// vieram, sem nunca deslocá-los pelo fuso de quem abre a tela.
//
// Antes cada tela fazia `new Date(valor)` e formatava com `timeZone: 'UTC'`.
// Isso só acertava quando o servidor rodava em UTC: na máquina de quem
// desenvolve (UTC-3), o jogo das 10:30 aparecia às 13:30.
//
// Para TIMESTAMP (criado_em), que é um instante de verdade e chega em ISO com
// Z, continue usando `new Date(valor)` direto — ali a conversão de fuso é o
// comportamento certo.

const PARTES = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2}))?)?/;

// Um Date com os mesmos números do banco, no fuso de quem está lendo.
export const horaDeParede = (valor) => {
  if (!valor) return null;

  const encontrado = PARTES.exec(String(valor));
  if (!encontrado) return null;

  const [, ano, mes, dia, hora, minuto, segundo] = encontrado;
  const data = new Date(
    Number(ano), Number(mes) - 1, Number(dia),
    Number(hora || 0), Number(minuto || 0), Number(segundo || 0)
  );

  return Number.isNaN(data.getTime()) ? null : data;
};

// "24/11 10:30" — o formato das tabelas de jogos
export const dataEHora = (valor, vazio = 'Sem data') => {
  const data = horaDeParede(valor);
  if (!data) return vazio;
  return data.toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
  });
};

// "terça-feira, 24 de novembro" — o cartão do próximo jogo
export const dataPorExtenso = (valor, vazio = '') => {
  const data = horaDeParede(valor);
  if (!data) return vazio;
  return data.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' });
};

// "10:30"
export const soAHora = (valor, vazio = '') => {
  const data = horaDeParede(valor);
  if (!data) return vazio;
  return data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
};

// "24/11/2026" — datas sem hora, como o nascimento do atleta
export const soAData = (valor, vazio = '') => {
  const data = horaDeParede(valor);
  if (!data) return vazio;
  return data.toLocaleDateString('pt-BR');
};

// ['24', '11', '2026'] — a súmula impressa tem uma caixinha para cada parte
export const partesDaData = (valor) => {
  const encontrado = valor ? PARTES.exec(String(valor)) : null;
  if (!encontrado) return ['', '', ''];

  const [, ano, mes, dia] = encontrado;
  return [dia, mes, ano];
};

// "2026-11-24T10:30" — o que um <input type="datetime-local"> espera. Recorta
// o texto do banco, sem passar por Date: a hora de parede fica como está.
export const paraCampoDataHora = (valor) => {
  const encontrado = valor ? PARTES.exec(String(valor)) : null;
  if (!encontrado) return '';

  const [, ano, mes, dia, hora = '00', minuto = '00'] = encontrado;
  return `${ano}-${mes}-${dia}T${hora}:${minuto}`;
};

// "2026-11-24" — o que um <input type="date"> espera
export const paraCampoData = (valor) => {
  const encontrado = valor ? PARTES.exec(String(valor)) : null;
  if (!encontrado) return '';

  const [, ano, mes, dia] = encontrado;
  return `${ano}-${mes}-${dia}`;
};
