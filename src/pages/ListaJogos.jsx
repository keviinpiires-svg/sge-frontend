import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import { authHeaders, sessaoExpirada } from '../services/token';

function ListaJogos() {
  const [jogos, setJogos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const navigate = useNavigate();
  const { isAdmin } = useAuth();

  // Estados para finalização de partida
  const [jogoEmFinalizacao, setJogoEmFinalizacao] = useState(null);
  const [placar1, setPlacar1] = useState('');
  const [placar2, setPlacar2] = useState('');

  // Incrementar este valor dispara uma nova busca (ex: após finalizar uma partida)
  const [recarga, setRecarga] = useState(0);

  useEffect(() => {
    let ativo = true;

    fetch('http://localhost:3000/api/jogos')
      .then((response) => {
        if (!response.ok) {
          throw new Error('Falha ao buscar as partidas.');
        }
        return response.json();
      })
      .then((data) => {
        if (!ativo) return;
        const arrayJogos = Array.isArray(data) ? data : (data.jogos || []);
        setJogos(arrayJogos);
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
  }, [recarga]);

  const recarregarJogos = () => {
    setCarregando(true);
    setRecarga((r) => r + 1);
  };

  const formatarDataHora = (dataStr) => {
    if (!dataStr) return '';
    const data = new Date(dataStr);
    if (isNaN(data.getTime())) return dataStr;
    return data.toLocaleString('pt-BR', { timeZone: 'UTC', dateStyle: 'short', timeStyle: 'short' });
  };

  const formatarPlacar = (placar1, placar2) => {
    const p1 = (placar1 !== null && placar1 !== undefined) ? placar1 : '-';
    const p2 = (placar2 !== null && placar2 !== undefined) ? placar2 : '-';

    if (p1 === '-' && p2 === '-') return ' - ';
    return `${p1} - ${p2}`;
  };

  const abrirFinalizacao = (jogo) => {
    setJogoEmFinalizacao(jogo);
    setPlacar1('');
    setPlacar2('');
  };

  const handleFinalizar = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`http://localhost:3000/api/jogos/finalizar/${jogoEmFinalizacao.id_jogo || jogoEmFinalizacao.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders()
        },
        body: JSON.stringify({
          placar_escola_1: Number(placar1),
          placar_escola_2: Number(placar2)
        })
      });

      if (response.status === 401) {
        alert('Sua sessão expirou. Faça login novamente.');
        return sessaoExpirada();
      }

      if (response.status === 200) {
        alert('Partida finalizada com sucesso!');
        setJogoEmFinalizacao(null);
        recarregarJogos(); // Recarrega a tabela
      } else {
        const data = await response.json().catch(() => ({}));
        alert(`Erro ao finalizar a partida: ${data.message || 'Erro desconhecido'}`);
      }
    } catch (error) {
      console.error('Erro ao finalizar partida:', error);
      alert('Ocorreu um erro de conexão ao tentar finalizar.');
    }
  };

  const handleExcluir = async (jogo) => {
    const identificacao = jogo.numero_jogo ? `o Jogo #${jogo.numero_jogo}` : 'esta partida';
    if (!window.confirm(`Tem certeza que deseja excluir ${identificacao}? Esta ação não pode ser desfeita.`)) {
      return;
    }

    try {
      const response = await fetch(`http://localhost:3000/api/jogos/${jogo.id_jogo || jogo.id}`, {
        method: 'DELETE',
        headers: authHeaders()
      });

      if (response.status === 401) {
        alert('Sua sessão expirou. Faça login novamente.');
        return sessaoExpirada();
      }

      if (response.ok) {
        alert('Jogo excluído com sucesso!');
        recarregarJogos();
      } else {
        const data = await response.json().catch(() => ({}));
        alert(`Erro ao excluir o jogo: ${data.message || data.erro || 'Erro desconhecido'}`);
      }
    } catch (error) {
      console.error('Erro ao excluir jogo:', error);
      alert('Ocorreu um erro de conexão ao tentar excluir.');
    }
  };

  const nomeEscola1 = (jogo) => jogo.escola_1 || `Escola ${jogo.escola_1_id}`;
  const nomeEscola2 = (jogo) => jogo.escola_2 || `Escola ${jogo.escola_2_id}`;

  return (
    <div className="page">
      <div className="container-lg">
        <header className="page-header">
          <p className="eyebrow">Calendário</p>
          <h1 className="page-title">Tabela de Jogos</h1>
          <p className="page-subtitle">Acompanhe a lista completa de partidas e seus resultados.</p>
        </header>

        {carregando && (
          <div className="card">
            <div className="state">
              <div className="spinner" />
              <p className="state-text">Carregando jogos...</p>
            </div>
          </div>
        )}

        {!carregando && erro && (
          <div className="card">
            <div className="state state-error">
              <div className="state-icon">⚠️</div>
              <p className="state-title">Não foi possível carregar os jogos</p>
              <p className="state-text">{erro}</p>
            </div>
          </div>
        )}

        {!carregando && !erro && jogos.length === 0 && (
          <div className="card">
            <div className="state">
              <div className="state-icon">📅</div>
              <p className="state-title">Nenhuma partida encontrada</p>
              <p className="state-text">Agende um jogo para que ele apareça aqui.</p>
            </div>
          </div>
        )}

        {!carregando && !erro && jogos.length > 0 && !jogoEmFinalizacao && (
          <div className="card">
            <div className="table-wrap">
              <table className="table-sge" style={{ minWidth: '980px' }}>
                <thead>
                  <tr>
                    <th>Nº</th>
                    <th className="text-left">Fase/Grupo</th>
                    <th className="text-left">Local</th>
                    <th className="text-left">Data/Hora</th>
                    <th>Confronto</th>
                    <th>Placar</th>
                    <th>Status</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {jogos.map((jogo, index) => (
                    <tr key={jogo.id || index}>
                      <td className="text-strong">{jogo.numero_jogo}</td>
                      <td className="text-left text-soft">
                        {jogo.fase} {jogo.grupo_id ? `(G${jogo.grupo_id})` : ''}
                      </td>
                      <td className="text-left text-soft">{jogo.local_jogo || 'Não definido'}</td>
                      <td className="text-left text-soft">{formatarDataHora(jogo.data_hora)}</td>
                      <td className="strong">
                        {jogo.escola_1 || jogo.escola_1_id}
                        <span className="vs">X</span>
                        {jogo.escola_2 || jogo.escola_2_id}
                      </td>
                      <td className="text-accent num-lg">
                        {formatarPlacar(jogo.placar_escola_1, jogo.placar_escola_2)}
                      </td>
                      <td>
                        <span className={`badge ${jogo.status === 'FINALIZADO' ? 'badge-success' : ''}`}>
                          {jogo.status || 'AGENDADO'}
                        </span>
                      </td>
                      <td>
                        <div className="btn-group" style={{ flexWrap: 'nowrap' }}>
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => navigate(`/detalhes-sumula/${jogo.id_jogo || jogo.id}`)}
                          >
                            👁️ Ver Súmula
                          </button>
                          {isAdmin && (
                            <button
                              className="btn btn-outline btn-sm"
                              onClick={() => navigate(`/preencher-sumula/${jogo.id_jogo || jogo.id}`)}
                            >
                              📝 Súmula
                            </button>
                          )}
                          {isAdmin && (
                            <button className="btn btn-danger btn-sm" onClick={() => handleExcluir(jogo)}>
                              🗑️ Excluir
                            </button>
                          )}
                          {isAdmin && jogo.status !== 'FINALIZADO' && (
                            <button className="btn btn-success btn-sm" onClick={() => abrirFinalizacao(jogo)}>
                              ⚽ Finalizar
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {jogoEmFinalizacao && (
          <div className="card card-highlight">
            <div className="card-body">
              <h2 className="card-title">Finalizar Partida #{jogoEmFinalizacao.numero_jogo}</h2>
              <p className="text-soft" style={{ marginTop: 0 }}>
                Informe o placar final do confronto entre <strong className="text-accent">{nomeEscola1(jogoEmFinalizacao)}</strong> e <strong className="text-accent">{nomeEscola2(jogoEmFinalizacao)}</strong>.
              </p>

              <form onSubmit={handleFinalizar} className="form" style={{ marginTop: '20px' }}>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Gols: {nomeEscola1(jogoEmFinalizacao)}</label>
                    <input
                      className="form-control"
                      type="number"
                      min="0"
                      value={placar1}
                      onChange={(e) => setPlacar1(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Gols: {nomeEscola2(jogoEmFinalizacao)}</label>
                    <input
                      className="form-control"
                      type="number"
                      min="0"
                      value={placar2}
                      onChange={(e) => setPlacar2(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="btn-row">
                  <button type="button" className="btn btn-secondary" onClick={() => setJogoEmFinalizacao(null)}>
                    Cancelar
                  </button>
                  <button type="submit" className="btn btn-primary" style={{ flex: 2 }}>
                    Confirmar Finalização
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ListaJogos;
