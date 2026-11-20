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

// "Grupo A", "Semifinal", "Final", "Final – jogo 1"
// O "melhor de dois jogos" (2 escolas, ida e volta, sem mata-mata) é a final da competição:
// "Final – jogo 1" e "Final – jogo 2". `posicao` ({ ordem, total }) vem de ordemNasCompeticoes
// quando a tela tem a lista dos jogos; sem ela, vale o nº do jogo na competição (numerado por
// data e hora).
export const nomeDaFase = (jogo, posicao) => {
  if (jogo.melhor_de_dois) {
    if (posicao && posicao.total === 1) return 'Final';
    const ordem = posicao?.ordem ?? jogo.numero_jogo;
    return ordem ? `Final – jogo ${ordem}` : 'Final';
  }
  if (jogo.fase === 'SEMIFINAL') return 'Semifinal';
  if (jogo.fase === 'FINAL') return 'Final';
  return jogo.grupo ? `Grupo ${jogo.grupo}` : 'Fase de grupos';
};

// Classe do selo da fase: final (inclusive o melhor de dois) em dourado, semifinal em
// destaque discreto; grupos sem selo
export const classeDaFase = (jogo) => {
  if (jogo.melhor_de_dois || jogo.fase === 'FINAL') return 'selo-fase selo-fase-final';
  if (jogo.fase === 'SEMIFINAL') return 'selo-fase selo-fase-semifinal';
  return '';
};

// id do jogo -> { ordem, total } dentro da competição, por data e hora (e nº do jogo)
export const ordemNasCompeticoes = (jogos, competicaoDe, quandoDe) => {
  const porCompeticao = new Map();
  for (const jogo of jogos) {
    const chave = competicaoDe(jogo);
    if (!porCompeticao.has(chave)) porCompeticao.set(chave, []);
    porCompeticao.get(chave).push(jogo);
  }
  const mapa = new Map();
  for (const lista of porCompeticao.values()) {
    const ordenada = [...lista].sort((a, b) => String(quandoDe(a) || '~').localeCompare(String(quandoDe(b) || '~'))
      || (a.numero_jogo ?? 0) - (b.numero_jogo ?? 0));
    ordenada.forEach((jogo, i) => mapa.set(jogo.id, { ordem: i + 1, total: ordenada.length }));
  }
  return mapa;
};

// Fase do jogo de GET /api/sumulas/:id (cabeçalho das folhas impressas)
export const nomeDaFaseDaSumula = (jogo) => nomeDaFase({
  fase: jogo.fase,
  grupo: jogo.grupo_nome,
  numero_jogo: jogo.numero_jogo,
  melhor_de_dois: jogo.fase === 'GRUPOS' && jogo.turno === 'IDA_E_VOLTA' && jogo.proxima_fase === 'NENHUMA'
});

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

// Mata-mata cadastrado de antemão (db/28): enquanto a equipe não existe, a vaga mostra de onde ela
// virá ("1º do Grupo A", "Melhor 2º colocado", "Vencedor do jogo 263")
export const nomeDaVaga = (equipe) => equipe?.escola || equipe?.origem || 'A definir';
export const vagaEmAberto = (equipe) => !equipe?.escola;

// Comparação de nomes sem acento nem maiúscula, para a busca por escola
export const normalizar = (texto) => String(texto || '')
  .normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().trim();
