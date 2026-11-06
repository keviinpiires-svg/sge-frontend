// Textos da Agenda de Jogos, compartilhados pela lista e pelo detalhe.

export const ROTULO_GENERO = { MASCULINO: 'Masculino', FEMININO: 'Feminino', MISTO: 'Misto' };

export const ROTULO_STATUS = {
  AGENDADO: 'Agendado',
  EM_ANDAMENTO: 'Em andamento',
  FINALIZADO: 'Encerrado',
  WO: 'W.O.'
};

export const CLASSE_STATUS = {
  AGENDADO: 'agenda-status-agendado',
  EM_ANDAMENTO: 'agenda-status-andamento',
  FINALIZADO: 'agenda-status-encerrado',
  WO: 'agenda-status-encerrado'
};

// "Futsal Sub 13 Feminino"
export const nomeDaCompeticao = (c) =>
  `${c.modalidade} ${c.categoria} ${ROTULO_GENERO[c.genero] || c.genero}`;

// "Grupo A", "Melhor de dois jogos", "Semifinal", "Final"
export const nomeDaFase = (jogo) => {
  if (jogo.melhor_de_dois) return 'Melhor de dois jogos';
  if (jogo.fase === 'SEMIFINAL') return 'Semifinal';
  if (jogo.fase === 'FINAL') return 'Final';
  return jogo.grupo ? `Grupo ${jogo.grupo}` : 'Fase de grupos';
};

// "ACM venceu", "ACM venceu nas cobranças (4 × 3)", "Empate"
export const textoDoResultado = (jogo) => {
  const r = jogo.resultado;
  if (!r) return '';
  if (!r.vencedor) return 'Empate';
  const vencedor = r.vencedor === 1 ? jogo.equipe_1.escola : jogo.equipe_2.escola;
  if (r.wo) return `${vencedor} venceu por W.O.`;
  if (r.decisao === 'COBRANCAS') {
    return `${vencedor} venceu nas cobranças (${r.cobrancas.equipe_1} × ${r.cobrancas.equipe_2})`;
  }
  if (r.decisao === 'ACRESCIMO') return `${vencedor} venceu no acréscimo (baleou primeiro)`;
  return `${vencedor} venceu${r.prorrogacao ? ' na prorrogação' : ''}`;
};

// Comparação de nomes sem acento nem maiúscula, para a busca por escola
export const normalizar = (texto) => String(texto || '')
  .normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().trim();
