import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import { chaveDaCompeticao, gerarProximaFase, desfazerFase } from '../services/matamata';
import { dataEHora } from '../services/datas';

const ROTULO_FASE = { SEMIFINAL: 'Semifinais', FINAL: 'Final' };

const ROTULO_STATUS = {
  AGENDADO: 'Agendado',
  EM_ANDAMENTO: 'Em andamento',
  FINALIZADO: 'Finalizado',
  WO: 'W.O.'
};

const MEDALHA = { 1: '🥇', 2: '🥈', 3: '🥉' };

const formatarQuando = (valor) => dataEHora(valor);

// "2 grupos × 2 → semifinal", em uma linha
const descreverFormato = (formato) => {
  if (!formato.tem_mata_mata) return 'Sem mata-mata: duas equipes em ida e volta';

  const grupos = formato.qtd_grupos === 1 ? 'grupo único' : `${formato.qtd_grupos} grupos`;
  const porGrupo = formato.classificados_por_grupo === 1
    ? 'o 1º de cada'
    : `os ${formato.classificados_por_grupo} primeiros`;
  const segundos = formato.melhores_segundos > 0
    ? formato.melhores_segundos === 1 ? ' + o melhor 2º' : ` + os ${formato.melhores_segundos} melhores 2º`
    : '';
  const destino = formato.proxima_fase === 'SEMIFINAL' ? 'semifinal' : 'final';

  return `${grupos}, ${porGrupo}${segundos} → ${destino}`;
};

function MataMataCompeticao({ competicao }) {
  const { isAdmin } = useAuth();

  const [resultado, setResultado] = useState(null);
  const [recarga, setRecarga] = useState(0);
  const [trabalhando, setTrabalhando] = useState(false);
  const [aviso, setAviso] = useState(null);

  const chaveDaBusca = `${competicao.id}:${recarga}`;
  const pronto = resultado?.chave === chaveDaBusca;
  const dados = pronto ? resultado.dados : null;
  const erro = pronto ? resultado.erro : '';

  useEffect(() => {
    let ativo = true;

    chaveDaCompeticao(competicao.id)
      .then((dados) => {
        if (ativo) setResultado({ chave: chaveDaBusca, dados, erro: '' });
      })
      .catch((falha) => {
        if (ativo) setResultado({ chave: chaveDaBusca, dados: null, erro: falha.mensagem });
      });

    return () => {
      ativo = false;
    };
  }, [chaveDaBusca, competicao.id]);

  const executar = async (acao, sucesso) => {
    setTrabalhando(true);
    setAviso(null);

    try {
      const resposta = await acao();
      setAviso({ tipo: 'success', texto: resposta.mensagem || sucesso });
      setRecarga((r) => r + 1);
    } catch (falha) {
      setAviso({ tipo: 'error', texto: falha.mensagem });
    } finally {
      setTrabalhando(false);
    }
  };

  if (!pronto) {
    return (
      <section className="card mb-lg">
        <div className="state state-compact">
          <div className="spinner" />
          <p className="state-text">Carregando o mata-mata...</p>
        </div>
      </section>
    );
  }

  if (erro) {
    return (
      <section className="card mb-lg">
        <div className="state state-compact state-error">
          <p className="state-title">Não foi possível montar a chave</p>
          <p className="state-text">{erro}</p>
        </div>
      </section>
    );
  }

  const { formato, fase_de_grupos: grupos, chave, colocacoes, pode_gerar: podeGerar } = dados;
  const comparacao = dados.comparacao_entre_grupos;

  // Um confronto já gerado: tem jogo, placar e link para a súmula
  const renderJogo = (jogo, isFinal) => {
    const encerrado = ['FINALIZADO', 'WO'].includes(jogo.status);
    const lado = (equipe_id, nome, placar, outro) => {
      const classe = !encerrado || placar === outro
        ? ''
        : jogo.vencedor_equipe_id === equipe_id ? 'is-winner' : 'is-loser';
      return { equipe_id, nome, placar, classe };
    };

    const equipes = [
      lado(jogo.equipe_1_id, jogo.escola_1_nome, jogo.placar_1, jogo.placar_2),
      lado(jogo.equipe_2_id, jogo.escola_2_nome, jogo.placar_2, jogo.placar_1)
    ];

    const cobrancas = jogo.penaltis_1 !== null && jogo.penaltis_2 !== null;

    return (
      <article key={jogo.id} className={`card match-card ${isFinal ? 'is-final' : ''}`}>
        <header className="match-head">
          <span>Jogo #{jogo.numero_jogo}</span>
          <span className={`badge ${encerrado ? 'badge-success' : 'badge-accent'}`}>
            {ROTULO_STATUS[jogo.status] || jogo.status}
          </span>
        </header>

        <div className="match-teams">
          {equipes.map((equipe) => (
            <div key={equipe.equipe_id} className={`match-team ${equipe.classe}`}>
              <span className="match-team-name" title={equipe.nome}>{equipe.nome}</span>
              <span className="match-score">{encerrado ? (equipe.placar ?? 0) : '–'}</span>
            </div>
          ))}
        </div>

        <footer className="match-foot">
          <p className="match-info">
            📅 {formatarQuando(jogo.data_hora)}
            {cobrancas && ` · cobranças ${jogo.penaltis_1} × ${jogo.penaltis_2}`}
          </p>
          <Link className="btn btn-primary btn-block btn-sm" to={`/detalhes-sumula/${jogo.id}`}>
            {encerrado ? '👁️ Ver súmula' : '📄 Abrir súmula'}
          </Link>
        </footer>
      </article>
    );
  };

  // Um confronto ainda não gerado: mostra de onde cada lado sai
  const renderPrevisto = (confronto, indice, isFinal) => (
    <article key={`${confronto.rotulo}-${indice}`} className={`card match-card e-previsto ${isFinal ? 'is-final' : ''}`}>
      <header className="match-head">
        <span>{confronto.rotulo}</span>
        <span className="badge">a gerar</span>
      </header>

      <div className="match-teams">
        {[confronto.equipe_1, confronto.equipe_2].map((equipe) => (
          <div key={equipe.equipe_id} className="match-team">
            <span className="match-team-name" title={equipe.escola_nome}>
              {equipe.escola_nome}
              <span className="origem-equipe">{equipe.origem}</span>
            </span>
          </div>
        ))}
      </div>
    </article>
  );

  const renderFase = (fase, bloco) => {
    if (!bloco) return null;

    const isFinal = fase === 'FINAL';
    const jogos = bloco.jogos || [];
    const confrontos = bloco.confrontos || [];
    const podeDesfazer = isAdmin
      && bloco.gerada
      && jogos.every((j) => !['FINALIZADO', 'WO'].includes(j.status));

    return (
      <section key={fase} className="bracket-stage">
        <div className="bracket-stage-header">
          <h3 className="bracket-stage-title">{isFinal ? '🥇 ' : ''}{ROTULO_FASE[fase]}</h3>
          {podeDesfazer && (
            <button
              type="button"
              className="btn btn-danger btn-sm"
              disabled={trabalhando}
              onClick={() => executar(
                () => desfazerFase(competicao.id, fase),
                'Fase desfeita.'
              )}
            >
              🗑️ Desfazer
            </button>
          )}
        </div>

        {bloco.observacao && (
          <div className="alert alert-aviso mb-lg">
            <p className="alert-texto">{bloco.observacao}</p>
          </div>
        )}

        {/* Erro de verdade é só quando esta fase já podia ser gerada; o resto
            é pré-requisito, e falar em vermelho assusta à toa. */}
        {bloco.erro && (
          podeGerar.fase === fase ? (
            <div className="alert alert-error mb-lg">
              <p className="alert-texto">{bloco.erro}</p>
            </div>
          ) : (
            <div className="card">
              <div className="state state-compact">
                <p className="state-text">{bloco.erro}</p>
              </div>
            </div>
          )
        )}

        {jogos.length > 0 && (
          <div className={`bracket-grid ${jogos.length === 1 ? 'single' : ''}`}>
            {jogos.map((jogo) => renderJogo(jogo, isFinal))}
          </div>
        )}

        {jogos.length === 0 && confrontos.length > 0 && (
          <div className={`bracket-grid ${confrontos.length === 1 ? 'single' : ''}`}>
            {confrontos.map((confronto, i) => renderPrevisto(confronto, i, isFinal))}
          </div>
        )}

        {jogos.length === 0 && confrontos.length === 0 && !bloco.erro && (
          <div className="card">
            <div className="state state-compact">
              <p className="state-text">
                {bloco.pendente
                  ? 'Os confrontos aparecem quando a fase de grupos terminar.'
                  : 'Nada a mostrar nesta fase ainda.'}
              </p>
            </div>
          </div>
        )}

        {/* O cruzamento usado ainda é uma decisão nossa, não do regulamento */}
        {bloco.regra?.provisorio && (
          <p className="legenda-desempate">
            <b>Cruzamento provisório ({bloco.regra.decididoEm}):</b> {bloco.regra.descricao}
          </p>
        )}
      </section>
    );
  };

  return (
    <section className="card mb-lg">
      <div className="card-body">
        <h2 className="card-title">Mata-mata</h2>

        <div className="ficha" style={{ marginBottom: '20px' }}>
          <div>
            <span className="ficha-rotulo">Formato</span>
            <span className="ficha-valor">{descreverFormato(formato)}</span>
          </div>
          <div>
            <span className="ficha-rotulo">Fase de grupos</span>
            <span className="ficha-valor">
              {grupos.total === 0
                ? 'sem jogos'
                : grupos.completa
                  ? `completa (${grupos.total} jogos)`
                  : `${grupos.pendentes} de ${grupos.total} em aberto`}
            </span>
          </div>
        </div>

        {aviso && <p className={`alert alert-${aviso.tipo} mb-lg`}>{aviso.texto}</p>}

        {/* O "melhor segundo" é comparado por uma regra que ainda é nossa */}
        {comparacao?.provisoria && comparacao.equipes_descartadas?.length > 0 && (
          <div className="alert alert-aviso mb-lg">
            <p className="alert-titulo">⚠️ Comparação entre grupos ainda provisória</p>
            <p className="alert-texto">
              Os grupos têm tamanhos diferentes, então os jogos contra o último colocado dos
              grupos maiores foram descartados para comparar todo mundo pelo mesmo número de
              partidas — decisão de {comparacao.decidido_em}, a confirmar.
              {comparacao.jogos_descartados > 0
                && ` ${comparacao.jogos_descartados} jogo(s) ficaram de fora da conta.`}
            </p>
          </div>
        )}

        {!formato.tem_mata_mata && (
          <div className="state state-compact">
            <p className="state-text">
              Esta competição não tem mata-mata: são duas equipes em ida e volta, e o campeão
              sai da soma dos dois jogos. Empatada a soma, o segundo jogo é decidido nas
              cobranças lançadas na súmula.
            </p>
          </div>
        )}

        {formato.tem_mata_mata && (
          <>
            {renderFase('SEMIFINAL', chave.semifinal)}
            {renderFase('FINAL', chave.final)}

            {isAdmin && (
              <div className="btn-row" style={{ justifyContent: 'flex-start' }}>
                {podeGerar.fase ? (
                  <button
                    type="button"
                    className="btn btn-primary"
                    disabled={trabalhando}
                    onClick={() => executar(
                      () => gerarProximaFase(competicao.id),
                      'Fase gerada.'
                    )}
                  >
                    {trabalhando
                      ? 'Gerando...'
                      : podeGerar.fase === 'SEMIFINAL' ? '🎯 Gerar semifinais' : '🏆 Gerar final'}
                  </button>
                ) : (
                  <p className="legenda-desempate" style={{ margin: 0 }}>{podeGerar.motivo}</p>
                )}
              </div>
            )}
          </>
        )}

        {colocacoes.length > 0 && (
          <div className="podio">
            <h3 className="card-title" style={{ marginTop: '24px' }}>Colocações</h3>
            {colocacoes.map((colocacao) => (
              <div key={colocacao.posicao} className="podio-linha">
                <span className="podio-medalha">{MEDALHA[colocacao.posicao] || colocacao.posicao}</span>
                <span className="podio-escola">{colocacao.escola_nome}</span>
                <span className="podio-como">
                  {colocacao.como}
                  {colocacao.provisoria && ' · regra provisória'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

export default MataMataCompeticao;
