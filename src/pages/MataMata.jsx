import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

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
  const [jogos, setJogos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');

  // Incrementar este valor dispara uma nova busca (botão "Tentar novamente")
  const [tentativa, setTentativa] = useState(0);

  useEffect(() => {
    let ativo = true;

    fetch('http://localhost:3000/api/matamata')
      .then((response) => {
        if (!response.ok) {
          throw new Error('Falha ao buscar o chaveamento.');
        }
        return response.json();
      })
      .then((data) => {
        if (!ativo) return;
        setJogos(data);
        setErro('');
      })
      .catch((error) => {
        if (ativo) setErro(error.message || 'Ocorreu um erro de conexão.');
      })
      .finally(() => {
        if (ativo) setCarregando(false);
      });

    return () => {
      ativo = false;
    };
  }, [tentativa]);

  const tentarNovamente = () => {
    setCarregando(true);
    setErro('');
    setTentativa((t) => t + 1);
  };

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
            <p className="state-text">Os confrontos aparecerão aqui ao término da fase de grupos.</p>
          </div>
        </div>
      );
    }

    return FASES.map(({ fase, titulo }) => {
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
    });
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
