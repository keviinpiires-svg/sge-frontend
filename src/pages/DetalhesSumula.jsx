import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useReactToPrint } from 'react-to-print';
import { buscarSumulaPorJogo } from '../services/sumulas';

// A folha impressa segue docs/referencias/sumula_futsal_modelo.pdf: mesma
// ordem de campos, mesmas colunas e mesmo rodapé. O que muda é o número de
// linhas — o papel traz 12 e aqui são 14, o elenco máximo do regulamento.
const LINHAS_POR_EQUIPE = 14;
const CAIXAS_DE_GOLS = 11;
const FALTAS_POR_TEMPO = 5;

const partesDaData = (valor) => {
  if (!valor) return ['', '', ''];
  const data = new Date(valor);
  if (isNaN(data.getTime())) return ['', '', ''];
  return [
    String(data.getUTCDate()).padStart(2, '0'),
    String(data.getUTCMonth() + 1).padStart(2, '0'),
    String(data.getUTCFullYear())
  ];
};

// A folha tem um número fixo de linhas, esteja o elenco cheio ou não: é o que
// permite levá-la impressa para a quadra e escrever à mão o que faltar.
const completarLinhas = (atletas, total) => {
  const linhas = [...atletas];
  while (linhas.length < total) linhas.push(null);
  return linhas;
};

const sequencia = (quantidade) => Array.from({ length: quantidade }, (_, i) => i);

function DetalhesSumula() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [carga, setCarga] = useState(null);
  // Em branco: mesma folha, sem os lançamentos — para levar à quadra.
  // ?em-branco=1 abre direto assim, para imprimir sem passar pela tela.
  const [busca, setBusca] = useSearchParams();
  const emBranco = busca.get('em-branco') === '1';
  const setEmBranco = (valor) => {
    const proximo = typeof valor === 'function' ? valor(emBranco) : valor;
    setBusca(proximo ? { 'em-branco': '1' } : {}, { replace: true });
  };

  const pronto = carga?.id === id;
  const sumula = pronto ? carga.dados : null;
  const erro = pronto ? carga.erro : '';

  const folhaRef = useRef(null);
  const imprimir = useReactToPrint({
    contentRef: folhaRef,
    documentTitle: `Sumula_Jogo_${sumula?.jogo?.numero_jogo || id}${emBranco ? '_em_branco' : ''}`,
    // margem 0 na página + margem própria na folha: é o que tira o cabeçalho
    // e o rodapé que o navegador imprime por conta própria.
    pageStyle: `
      @page { size: A4 portrait; margin: 0; }
      html, body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    `
  });

  useEffect(() => {
    let ativo = true;

    buscarSumulaPorJogo(id)
      .then((dados) => {
        if (ativo) setCarga({ id, dados, erro: '' });
      })
      .catch((falha) => {
        if (ativo) setCarga({ id, dados: null, erro: falha.mensagem });
      });

    return () => {
      ativo = false;
    };
  }, [id]);

  if (!pronto) {
    return (
      <div className="page"><div className="container-lg">
        <div className="card"><div className="state">
          <div className="spinner" />
          <p className="state-text">Carregando súmula...</p>
        </div></div>
      </div></div>
    );
  }

  if (erro) {
    return (
      <div className="page"><div className="container-lg">
        <div className="card"><div className="state state-error">
          <div className="state-icon">⚠️</div>
          <p className="state-title">Não foi possível carregar a súmula</p>
          <p className="state-text">{erro}</p>
        </div></div>
      </div></div>
    );
  }

  const { evento, jogo, equipes } = sumula;
  // Em branco apaga só os lançamentos da partida. Local, data, árbitros e
  // anotador são dados do jogo e vão impressos nas duas versões.
  const lancado = (valor) => (emBranco ? '' : (valor ?? ''));
  const [dia, mes, ano] = partesDaData(jogo.data_hora);

  const renderEquipe = (equipe, indice) => (
    <section key={equipe.equipe_id} className="folha-equipe">
      <div className="folha-equipe-titulo">
        EQUIPE {indice === 0 ? 'A' : 'B'}
        {equipe.escola_nome ? ` — ${equipe.escola_nome}` : ''}
      </div>

      <table className="folha-tabela">
        <colgroup>
          <col className="c-cartao" /><col className="c-cartao" /><col className="c-cartao" />
          <col className="c-numero" />
          <col className="c-atleta" />
          {sequencia(CAIXAS_DE_GOLS).map((i) => <col key={i} className="c-gol" />)}
          <col className="c-capitao" />
        </colgroup>

        <thead>
          <tr>
            <th className="rotulo" colSpan={3}>Cartões</th>
            <th className="rotulo">Nº</th>
            <th className="rotulo">Atletas</th>
            <th className="rotulo" colSpan={CAIXAS_DE_GOLS}>Gols</th>
            <th className="celula-capitao-topo" />
          </tr>
        </thead>

        <tbody>
          {completarLinhas(equipe.atletas, LINHAS_POR_EQUIPE).map((atleta, linha) => {
            const lancado = atleta && !emBranco;
            const gols = lancado ? Number(atleta.gols || 0) : 0;

            return (
              <tr key={atleta ? atleta.atleta_id : `vazia-${linha}`}>
                <td className="cartao">{lancado && atleta.amarelos >= 1 ? '✕' : 'A'}</td>
                <td className="cartao">{lancado && atleta.amarelos >= 2 ? '✕' : 'A'}</td>
                <td className="cartao">{lancado && atleta.vermelho ? '✕' : 'V'}</td>
                <td className="numero">{atleta ? (atleta.numero_camisa ?? '') : ''}</td>
                <td className="atleta">{atleta ? atleta.nome : ''}</td>
                {sequencia(CAIXAS_DE_GOLS).map((i) => (
                  <td key={i} className="gol">{i < gols ? '✕' : ''}</td>
                ))}
                {linha === 0 && (
                  <td className="celula-capitao" rowSpan={LINHAS_POR_EQUIPE}>
                    <span className="texto-vertical">Capitão:</span>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>

      <table className="folha-rodape">
        <tbody>
          <tr>
            <td className="rotulo esquerda" colSpan={2}>Faltas acumuladas</td>
            <td className="rotulo tempo">1º T</td>
            {sequencia(FALTAS_POR_TEMPO).map((i) => (
              <td key={`f1-${i}`} className={`falta ${lancouFalta(equipe.faltas_1t, i, emBranco) ? 'marcada' : ''}`}>
                {i + 1}
              </td>
            ))}
            <td className="rotulo tempo">2º T</td>
            {sequencia(FALTAS_POR_TEMPO).map((i) => (
              <td key={`f2-${i}`} className={`falta ${lancouFalta(equipe.faltas_2t, i, emBranco) ? 'marcada' : ''}`}>
                {i + 1}
              </td>
            ))}
          </tr>
          <tr>
            <td className="rotulo esquerda" colSpan={2}>Tempo técnico</td>
            <td className="sem-borda" colSpan={10}>
              <table className="folha-tempo">
                <tbody>
                  <tr>
                    <td className="rotulo">1º T</td>
                    <td className="rotulo">2º T</td>
                    <td className="tecnico" rowSpan={2}>Técnico: {lancado(equipe.tecnico_nome)}</td>
                  </tr>
                  <tr>
                    <td className="caixa">{emBranco || !equipe.tempo_tecnico_1t ? '' : '✕'}</td>
                    <td className="caixa">{emBranco || !equipe.tempo_tecnico_2t ? '' : '✕'}</td>
                  </tr>
                </tbody>
              </table>
            </td>
          </tr>
        </tbody>
      </table>
    </section>
  );

  return (
    <div className="page">
      <div className="container-lg">
        <div className="page-toolbar no-print">
          <button className="btn btn-outline" onClick={() => navigate(-1)}>← Voltar</button>

          <div className="acoes">
            <button
              type="button"
              className={`btn btn-sm ${emBranco ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setEmBranco((v) => !v)}
            >
              {emBranco ? 'Vendo: em branco' : 'Vendo: preenchida'}
            </button>
            <button type="button" className="btn btn-primary btn-sm" onClick={imprimir}>
              🖨️ Imprimir {emBranco ? 'em branco' : 'preenchida'}
            </button>
          </div>
        </div>

        <div ref={folhaRef} className="folha-sumula print-area">
          <table className="folha-cabecalho">
            <colgroup>
              <col className="a" /><col className="b" /><col className="c" /><col className="d" />
            </colgroup>
            <tbody>
              <tr className="linha-titulo">
                <td className="logo"><img src="/logo-jogos-estudantis.png" alt="" /></td>
                <td className="titulo" colSpan={2}>SÚMULA DE {jogo.modalidade_nome.toUpperCase()}</td>
                <td className="logo"><img src="/logo-barra-do-choca.png" alt="" /></td>
              </tr>
              <tr>
                <td colSpan={4}>Campeonato:&nbsp;&nbsp;&nbsp;{evento.nome_evento}</td>
              </tr>
              <tr>
                <td colSpan={2}>LOCAL: {jogo.local_nome || ''}</td>
                <td>Nº DO JOGO ( {jogo.numero_jogo} )</td>
                <td>Cidade: {evento.cidade}</td>
              </tr>
              <tr>
                <td colSpan={2}>Categoria: {jogo.categoria_nome} {jogo.genero ? jogo.genero.toLowerCase() : ''}</td>
                <td colSpan={2} className="data">
                  Data: <span className="slot">{dia}</span> / <span className="slot">{mes}</span> / <span className="slot">{ano}</span>
                </td>
              </tr>
              <tr>
                <td colSpan={2}>Árbitro 1: {jogo.arbitro_1 || ''}</td>
                <td colSpan={2} />
              </tr>
              <tr>
                <td colSpan={2}>Árbitro 2: {jogo.arbitro_2 || ''}</td>
                <td colSpan={2} />
              </tr>
              <tr>
                <td colSpan={2}>Anotador: {jogo.anotador || ''}</td>
                <td colSpan={2} />
              </tr>
              <tr className="linha-equipes">
                <td colSpan={4}>
                  <div className="confronto">
                    <span className="nome-equipe">EQUIPE A</span>
                    <span className="caixa-placar">{emBranco ? '' : equipes[0].gols}</span>
                    <span className="x">X</span>
                    <span className="caixa-placar">{emBranco ? '' : equipes[1].gols}</span>
                    <span className="nome-equipe">EQUIPE B</span>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>

          {equipes.map(renderEquipe)}
        </div>
      </div>
    </div>
  );
}

// Uma falta lançada marca as caixas de 1 até o total do tempo
const lancouFalta = (total, indice, emBranco) => !emBranco && Number(total || 0) > indice;

export default DetalhesSumula;
