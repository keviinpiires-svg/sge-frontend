import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import { listarMataMata, gerarSemifinais as gerarSemis, gerarFinal as gerarDecisao } from '../services/matamata';

// Mesma ordem e mesmos valores de "fase" devolvidos por GET /api/matamata
const FASES = [
  { fase: 'SEMIFINAL', titulo: 'Semifinais' },
  { fase: 'TERCEIRO_LUGAR', titulo: 'Disputa de 3º Lugar' },
  { fase: 'FINAL', titulo: '🥇 Grande Final' },
];

const formatarDataHora = (dataStr) =>
  new Date(dataStr).toLocaleString('pt-BR', { timeZone: 'UTC', dateStyle: 'short', timeStyle: 'short' });

function MataMata() {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [jogos, setJogos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [gerando, setGerando] = useState(false);
  const [erroGeracao, setErroGeracao] = useState('');

  // Incrementar este valor dispara uma nova busca (botão "Tentar novamente")
  const [tentativa, setTentativa] = useState(0);

  useEffect(() => {
    let ativo = true;

    listarMataMata()
      .then((data) => {
        if (!ativo) return;
        setJogos(data);
        setErro('');
      })
      .catch((error) => {
        if (ativo) setErro(error.mensagem);
      })
      .finally(() => {
        if (ativo) setCarregando(false);
      });

    return () => {
      ativo = false;
    };
  }, [tentativa]);

  const tentarNovamente = useCallback(() => {
    setCarregando(true);
    setErro('');
    setTentativa((t) => t + 1);
  }, []);

  const gerar = async (acao) => {
    setGerando(true);
    setErroGeracao('');

    try {
      await acao();
      tentarNovamente();
    } catch (error) {
      console.error(error);
      setErroGeracao(error.mensagem);
    } finally {
      setGerando(false);
    }
  };

  const gerarSemifinais = () => gerar(gerarSemis);
  const gerarFinal = () => gerar(gerarDecisao);

  const semifinais = jogos.filter((jogo) => jogo.fase === 'SEMIFINAL');
  const temFinal = jogos.some((jogo) => jogo.fase === 'FINAL');
  const semifinaisEncerradas =
    semifinais.length >= 2 && semifinais.every((jogo) => jogo.status === 'FINALIZADO');
  const podeGerarFinal = isAdmin && semifinaisEncerradas && !temFinal;

  const renderCardJogo = (jogo, isFinal) => {
    const finalizado = jogo.status === 'FINALIZADO';
    const p1 = jogo.placar_escola_1;
    const p2 = jogo.placar_escola_2;

    const situacao = (meu, outro) => {
      if (!finalizado || meu === outro) return '';
      return meu > outro ? 'is-winner' : 'is-loser';
    };

    const equipes = [
      { nome: jogo.escola_1_nome, placar: p1, classe: situacao(p1, p2) },
      { nome: jogo.escola_2_nome, placar: p2, classe: situacao(p2, p1) },
    ];

    return (
      <article key={jogo.id} className={`card match-card ${isFinal ? 'is-final' : ''}`}>
        <header className="match-head">
          <span>Jogo #{jogo.numero_jogo}</span>
          <span className={`badge ${finalizado ? 'badge-success' : 'badge-accent'}`}>{jogo.status}</span>
        </header>

        <div className="match-teams">
          {equipes.map((equipe) => (
            <div key={equipe.nome} className={`match-team ${equipe.classe}`}>
              <span className="match-team-name" title={equipe.nome}>{equipe.nome}</span>
              <span className="match-score">{finalizado ? equipe.placar : '–'}</span>
            </div>
          ))}
        </div>

        <footer className="match-foot">
          <p className="match-info">📅 {formatarDataHora(jogo.data_hora)}</p>

          {finalizado ? (
            <button className="btn btn-primary btn-block" onClick={() => navigate(`/detalhes-sumula/${jogo.id}`)}>
              👁️ Ver Súmula
            </button>
          ) : (
            <button className="btn btn-primary btn-block" disabled>
              🗓️ Agendado
            </button>
          )}
        </footer>
      </article>
    );
  };

  const renderConteudo = () => {
    if (carregando) {
      return (
        <div className="card">
          <div className="state">
            <div className="spinner" />
            <p className="state-text">Carregando chaveamento...</p>
          </div>
        </div>
      );
    }

    if (erro) {
      return (
        <div className="card">
          <div className="state state-error">
            <div className="state-icon">⚠️</div>
            <p className="state-title">Não foi possível carregar o mata-mata</p>
            <p className="state-text">{erro}</p>
            <button className="btn btn-primary" onClick={tentarNovamente}>Tentar novamente</button>
          </div>
        </div>
      );
    }

    if (jogos.length === 0) {
      return (
        <div className="card">
          <div className="state">
            <div className="state-icon">🏆</div>
            <p className="state-title">Chaveamento ainda não definido.</p>
            {isAdmin ? (
              <>
                <p className="state-text">
                  As semifinais serão montadas com os dois primeiros de cada grupo: 1ºA x 2ºB e 1ºB x 2ºA.
                </p>
                <button className="btn btn-primary btn-lg" onClick={gerarSemifinais} disabled={gerando}>
                  {gerando ? 'Gerando...' : '🎯 Gerar Semifinais'}
                </button>
                {erroGeracao && (
                  <p className="alert alert-error" style={{ marginTop: '18px' }}>{erroGeracao}</p>
                )}
              </>
            ) : (
              <p className="state-text">Os confrontos aparecerão aqui ao término da fase de grupos.</p>
            )}
          </div>
        </div>
      );
    }

    return (
      <>
        {FASES.map(({ fase, titulo }) => {
          const jogosDaFase = jogos.filter((jogo) => jogo.fase === fase);
          if (jogosDaFase.length === 0) return null;

          const isFinal = fase === 'FINAL';
          return (
            <section key={fase} className="bracket-stage">
              <div className="bracket-stage-header">
                <h2 className="bracket-stage-title">{titulo}</h2>
              </div>
              <div className={`bracket-grid ${jogosDaFase.length === 1 ? 'single' : ''}`}>
                {jogosDaFase.map((jogo) => renderCardJogo(jogo, isFinal))}
              </div>
            </section>
          );
        })}

        {podeGerarFinal && (
          <section className="card card-highlight">
            <div className="card-body text-center">
              <p className="state-title">As semifinais terminaram!</p>
              <p className="state-text" style={{ marginBottom: '18px' }}>
                A Grande Final será montada com os dois vencedores.
              </p>
              <button className="btn btn-primary btn-lg btn-pill" onClick={gerarFinal} disabled={gerando}>
                {gerando ? 'Gerando...' : '🏆 Gerar Grande Final'}
              </button>
              {erroGeracao && (
                <p className="alert alert-error" style={{ marginTop: '18px' }}>{erroGeracao}</p>
              )}
            </div>
          </section>
        )}
      </>
    );
  };

  return (
    <div className="page">
      <div className="container">
        <header className="page-header">
          <p className="eyebrow">Eliminatórias</p>
          <h1 className="page-title">Mata-Mata 🏆</h1>
          <p className="page-subtitle">Chaveamento e resultados das fases eliminatórias.</p>
        </header>

        {renderConteudo()}
      </div>
    </div>
  );
}

export default MataMata;
