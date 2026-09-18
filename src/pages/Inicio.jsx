import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const formatarNumero = (valor) => Number(valor || 0).toLocaleString('pt-BR');

const formatarData = (dataStr) =>
  new Date(dataStr).toLocaleDateString('pt-BR', { timeZone: 'UTC', weekday: 'long', day: '2-digit', month: 'long' });

const formatarHora = (dataStr) =>
  new Date(dataStr).toLocaleTimeString('pt-BR', { timeZone: 'UTC', hour: '2-digit', minute: '2-digit' });

function Inicio() {
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');

  // Incrementar este valor dispara uma nova busca (botão "Tentar novamente")
  const [tentativa, setTentativa] = useState(0);

  useEffect(() => {
    let ativo = true;

    fetch('http://localhost:3000/api/dashboard')
      .then((response) => {
        if (!response.ok) {
          throw new Error('Falha ao buscar os dados do painel.');
        }
        return response.json();
      })
      .then((data) => {
        if (!ativo) return;
        setDashboard(data);
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

  const renderConteudo = () => {
    if (carregando) {
      return (
        <div className="card">
          <div className="state">
            <div className="spinner" />
            <p className="state-text">Carregando painel do campeonato...</p>
          </div>
        </div>
      );
    }

    if (erro) {
      return (
        <div className="card">
          <div className="state state-error">
            <div className="state-icon">⚠️</div>
            <p className="state-title">Não foi possível carregar o painel</p>
            <p className="state-text">{erro}</p>
            <button className="btn btn-primary" onClick={tentarNovamente}>Tentar novamente</button>
          </div>
        </div>
      );
    }

    const estatisticas = [
      { icone: '🏫', titulo: 'Escolas Inscritas', valor: dashboard.total_escolas },
      { icone: '🏃', titulo: 'Atletas Cadastrados', valor: dashboard.total_atletas },
      { icone: '⚽', titulo: 'Balançaram a Rede', detalhe: 'Total de gols', valor: dashboard.total_gols },
    ];

    const proximo = dashboard.proximo_jogo;
    const campeao = dashboard.campeao;

    return (
      <div className="stat-grid">
        {estatisticas.map(({ icone, titulo, detalhe, valor }) => (
          <div key={titulo} className="card stat-card">
            <div className="stat-head">
              <span className="stat-label">{titulo}</span>
              <span className="stat-icon" aria-hidden="true">{icone}</span>
            </div>
            <p className="stat-value">{formatarNumero(valor)}</p>
            {detalhe && <p className="stat-detail">{detalhe}</p>}
          </div>
        ))}

        {campeao ? (
          <div className="card stat-card stat-card-wide champion-card">
            <div className="stat-head">
              <span className="stat-label">Campeão do Campeonato</span>
              <span className="badge badge-accent">FINAL ENCERRADA</span>
            </div>

            <div className="champion-body">
              <span className="champion-trophy" aria-hidden="true">🏆</span>
              <p className="champion-name">{campeao.escola_nome}</p>
              <p className="champion-detail">
                Venceu a Grande Final por {campeao.gols_campeao} x {campeao.gols_vice} contra {campeao.vice_nome}
              </p>
              <button className="btn btn-outline btn-sm" onClick={() => navigate('/matamata')}>
                Ver chaveamento
              </button>
            </div>
          </div>
        ) : (
        <div className="card stat-card stat-card-wide">
          <div className="stat-head">
            <span className="stat-label">Próximo Jogo</span>
            {proximo && <span className="badge badge-accent">{proximo.fase}</span>}
          </div>

          {proximo ? (
            <>
              <div className="next-match">
                <span className="next-match-team home">{proximo.escola_1_nome}</span>
                <span className="next-match-vs">VS</span>
                <span className="next-match-team away">{proximo.escola_2_nome}</span>
              </div>

              <div className="next-match-when">
                <span>📅 <span className="next-match-date">{formatarData(proximo.data_hora)}</span></span>
                <span className="next-match-time">🕒 {formatarHora(proximo.data_hora)}</span>
              </div>
            </>
          ) : (
            <div className="state state-compact">
              <p className="state-text">Nenhum jogo agendado no momento.</p>
              <button className="btn btn-outline btn-sm" onClick={() => navigate('/agendar-jogo')}>
                🗓️ Agendar Jogo
              </button>
            </div>
          )}
        </div>
        )}
      </div>
    );
  };

  return (
    <div className="page">
      <div className="container-lg">
        <header className="page-header">
          <p className="eyebrow">Sistema de Gestão Esportiva</p>
          <h1 className="page-title">Painel do Campeonato 🏆</h1>
          <p className="page-subtitle">Visão geral dos Jogos Estudantis em tempo real.</p>
        </header>

        {renderConteudo()}
      </div>
    </div>
  );
}

export default Inicio;
