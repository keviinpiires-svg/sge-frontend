import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

function PreencherSumula() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [jogo, setJogo] = useState(null);
  const [atletasA, setAtletasA] = useState([]);
  const [atletasB, setAtletasB] = useState([]);
  const [eventos, setEventos] = useState({});
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    async function carregarDados() {
      try {
        const resJogo = await fetch(`http://localhost:3000/api/jogos/${id}`);
        if (!resJogo.ok) throw new Error('Falha ao buscar jogo');
        const dataJogo = await resJogo.json();

        const infoJogo = Array.isArray(dataJogo) ? dataJogo[0] : dataJogo;
        setJogo(infoJogo);

        if (infoJogo && infoJogo.escola_1_id && infoJogo.escola_2_id) {
          const resA = await fetch(`http://localhost:3000/api/atletas/equipe/${infoJogo.escola_1_id}`);
          if (resA.ok) {
            const dataA = await resA.json();
            setAtletasA(Array.isArray(dataA) ? dataA : (dataA.atletas || []));
          }

          const resB = await fetch(`http://localhost:3000/api/atletas/equipe/${infoJogo.escola_2_id}`);
          if (resB.ok) {
            const dataB = await resB.json();
            setAtletasB(Array.isArray(dataB) ? dataB : (dataB.atletas || []));
          }
        }
      } catch (error) {
        console.error('Erro ao carregar dados para a súmula:', error);
        alert('Não foi possível carregar os dados da partida.');
      }
    }

    if (id) {
      carregarDados();
    }
  }, [id]);

  const handleEventoChange = (atletaId, campo, valor) => {
    const num = Math.max(0, parseInt(valor) || 0);
    setEventos(prev => ({
      ...prev,
      [atletaId]: {
        ...(prev[atletaId] || { gols: 0, cartoes_amarelos: 0, cartao_vermelho: 0 }),
        [campo]: num
      }
    }));
  };

  const getValor = (atletaId, campo) => {
    return eventos[atletaId] ? eventos[atletaId][campo] : 0;
  };

  const handleSalvar = async () => {
    setSalvando(true);

    // Mapeia e filtra apenas atletas com ações reais (gols ou cartões > 0)
    const payload = Object.keys(eventos).map(atletaId => ({
      jogo_id: Number(id),
      atleta_id: Number(atletaId),
      gols: eventos[atletaId].gols || 0,
      cartoes_amarelos: eventos[atletaId].cartoes_amarelos || 0,
      cartao_vermelho: eventos[atletaId].cartao_vermelho || 0
    })).filter(e => e.gols > 0 || e.cartoes_amarelos > 0 || e.cartao_vermelho > 0);

    try {
      const response = await fetch('http://localhost:3000/api/sumulas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        alert('Súmula da partida salva com sucesso!');
        navigate('/lista-jogos'); // Redireciona para a lista de jogos
      } else {
        const errData = await response.json().catch(() => ({}));
        alert(`Falha ao salvar a súmula: ${errData.erro || errData.message || 'Verifique o console para detalhes.'}`);
      }
    } catch (error) {
      console.error('Erro no POST sumula:', error);
      alert('Ocorreu um erro de conexão ao tentar salvar a súmula.');
    } finally {
      setSalvando(false);
    }
  };

  if (!jogo) {
    return (
      <div className="page">
        <div className="container card">
          <div className="state">
            <div className="spinner" />
            <p className="state-text">Buscando dados da partida...</p>
          </div>
        </div>
      </div>
    );
  }

  const campos = [
    { campo: 'gols', icone: '⚽', titulo: 'Gols' },
    { campo: 'cartoes_amarelos', icone: '🟨', titulo: 'Cartões amarelos' },
    { campo: 'cartao_vermelho', icone: '🟥', titulo: 'Cartão vermelho' },
  ];

  const renderColunaTime = (atletas, nomeEscola) => (
    <div className="card">
      <div className="card-body">
        <h3 className="card-title center">{nomeEscola || 'Equipe'}</h3>

        {atletas.length === 0 ? (
          <div className="state state-compact">
            <p className="state-text">Nenhum atleta cadastrado nesta equipe.</p>
          </div>
        ) : (
          <div className="stack" style={{ gap: '10px' }}>
            {atletas.map(atleta => (
              <div key={atleta.id} className="player-row">
                <div className="player-name">
                  {atleta.nome}
                  <span className="player-meta">RG: {atleta.rg_ou_matricula}</span>
                </div>

                <div className="player-stats">
                  {campos.map(({ campo, icone, titulo }) => (
                    <label key={campo} className="player-stat" title={titulo}>
                      <span>{icone}</span>
                      <input
                        className="form-control input-num"
                        type="number"
                        min="0"
                        value={getValor(atleta.id, campo)}
                        onChange={(e) => handleEventoChange(atleta.id, campo, e.target.value)}
                      />
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="page">
      <div className="container-lg">
        <header className="page-header center">
          <p className="eyebrow">Súmula Oficial</p>
          <h1 className="page-title">Preenchimento de Súmula</h1>
          <p className="page-subtitle">
            Lançamento de Gols e Cartões — Jogo <strong className="text-accent">#{jogo.numero_jogo}</strong> ({jogo.fase})
          </p>
        </header>

        <div className="grid-2">
          {renderColunaTime(atletasA, jogo.escola_1 || `Equipe Mandante (ID: ${jogo.escola_1_id})`)}
          {renderColunaTime(atletasB, jogo.escola_2 || `Equipe Visitante (ID: ${jogo.escola_2_id})`)}
        </div>

        <div className="text-center mt-lg">
          <button className="btn btn-primary btn-pill btn-lg" onClick={handleSalvar} disabled={salvando}>
            {salvando ? 'Salvando...' : 'Salvar Súmula da Partida'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default PreencherSumula;
