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
      <div style={{ padding: '40px', textAlign: 'center', fontFamily: 'sans-serif', color: '#555', fontSize: '18px' }}>
        Buscando dados da partida...
      </div>
    );
  }

  const renderColunaTime = (atletas, nomeEscola) => (
    <div style={{ flex: 1, minWidth: '350px', backgroundColor: '#fff', borderRadius: '8px', padding: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
      <h3 style={{ borderBottom: '2px solid #007bff', paddingBottom: '10px', margin: '0 0 20px 0', color: '#2c3e50', textAlign: 'center' }}>
        {nomeEscola || 'Equipe'}
      </h3>
      
      {atletas.length === 0 ? (
        <p style={{ textAlign: 'center', color: '#777', fontStyle: 'italic' }}>Nenhum atleta cadastrado nesta equipe.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          {atletas.map(atleta => (
            <div key={atleta.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', backgroundColor: '#f8f9fa', borderRadius: '6px', border: '1px solid #e9ecef' }}>
              <div style={{ fontWeight: 'bold', color: '#333', flex: 1, fontSize: '14px', marginRight: '10px' }}>
                {atleta.nome} <br />
                <span style={{ fontSize: '11px', color: '#888', fontWeight: 'normal' }}>RG: {atleta.rg_ou_matricula}</span>
              </div>
              
              <div style={{ display: 'flex', gap: '10px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <label style={{ fontSize: '14px', marginBottom: '2px' }}>⚽</label>
                  <input 
                    type="number" 
                    min="0" 
                    value={getValor(atleta.id, 'gols')}
                    onChange={(e) => handleEventoChange(atleta.id, 'gols', e.target.value)}
                    style={{ width: '40px', padding: '5px', textAlign: 'center', border: '1px solid #ccc', borderRadius: '4px', outline: 'none' }}
                  />
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <label style={{ fontSize: '14px', marginBottom: '2px' }}>🟨</label>
                  <input 
                    type="number" 
                    min="0" 
                    value={getValor(atleta.id, 'cartoes_amarelos')}
                    onChange={(e) => handleEventoChange(atleta.id, 'cartoes_amarelos', e.target.value)}
                    style={{ width: '40px', padding: '5px', textAlign: 'center', border: '1px solid #ccc', borderRadius: '4px', outline: 'none' }}
                  />
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <label style={{ fontSize: '14px', marginBottom: '2px' }}>🟥</label>
                  <input 
                    type="number" 
                    min="0" 
                    value={getValor(atleta.id, 'cartao_vermelho')}
                    onChange={(e) => handleEventoChange(atleta.id, 'cartao_vermelho', e.target.value)}
                    style={{ width: '40px', padding: '5px', textAlign: 'center', border: '1px solid #ccc', borderRadius: '4px', outline: 'none' }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div style={{ padding: '30px 20px', fontFamily: 'sans-serif', maxWidth: '1200px', margin: '0 auto', backgroundColor: '#f4f6f8', minHeight: '100vh', borderRadius: '8px' }}>
      <div style={{ textAlign: 'center', marginBottom: '30px' }}>
        <h2 style={{ margin: 0, color: '#333' }}>Preenchimento de Súmula 📝</h2>
        <p style={{ color: '#555', marginTop: '10px', fontSize: '16px' }}>
          Lançamento de Gols e Cartões — Jogo <strong>#{jogo.numero_jogo}</strong> ({jogo.fase})
        </p>
      </div>

      <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', marginBottom: '40px' }}>
        {renderColunaTime(atletasA, jogo.escola_1 || `Equipe Mandante (ID: ${jogo.escola_1_id})`)}
        
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, width: '40px' }}>
          <h1 style={{ color: '#ccc', margin: 0 }}>X</h1>
        </div>
        
        {renderColunaTime(atletasB, jogo.escola_2 || `Equipe Visitante (ID: ${jogo.escola_2_id})`)}
      </div>

      <div style={{ textAlign: 'center' }}>
        <button 
          onClick={handleSalvar}
          disabled={salvando}
          style={{ 
            padding: '16px 45px', 
            backgroundColor: '#007bff', 
            color: 'white', 
            border: 'none', 
            borderRadius: '50px', 
            fontSize: '18px', 
            fontWeight: 'bold', 
            cursor: salvando ? 'not-allowed' : 'pointer',
            boxShadow: '0 4px 10px rgba(0, 123, 255, 0.4)',
            transition: 'background-color 0.2s',
            letterSpacing: '0.5px'
          }}
        >
          {salvando ? 'Salvando...' : 'Salvar Súmula da Partida'}
        </button>
      </div>
    </div>
  );
}

export default PreencherSumula;
