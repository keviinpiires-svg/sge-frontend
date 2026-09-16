import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

function ListaJogos() {
  const [jogos, setJogos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const navigate = useNavigate();
  
  // Estados para finalização de partida
  const [jogoEmFinalizacao, setJogoEmFinalizacao] = useState(null);
  const [placar1, setPlacar1] = useState('');
  const [placar2, setPlacar2] = useState('');

  const fetchJogos = async () => {
    setCarregando(true);
    try {
      const response = await fetch('http://localhost:3000/api/jogos');
      if (!response.ok) {
        throw new Error('Falha ao buscar as partidas.');
      }
      const data = await response.json();
      
      const arrayJogos = Array.isArray(data) ? data : (data.jogos || []);
      setJogos(arrayJogos);
    } catch (error) {
      setErro(error.message || 'Ocorreu um erro de conexão.');
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    fetchJogos();
  }, []);

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
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          placar_escola_1: Number(placar1),
          placar_escola_2: Number(placar2)
        })
      });

      if (response.status === 200) {
        alert('Partida finalizada com sucesso!');
        setJogoEmFinalizacao(null);
        fetchJogos(); // Recarrega a tabela
      } else {
        const data = await response.json().catch(() => ({}));
        alert(`Erro ao finalizar a partida: ${data.message || 'Erro desconhecido'}`);
      }
    } catch (error) {
      console.error('Erro ao finalizar partida:', error);
      alert('Ocorreu um erro de conexão ao tentar finalizar.');
    }
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif', maxWidth: '1100px', margin: '0 auto' }}>
      <h2>Tabela de Jogos 🏆</h2>
      <p>Acompanhe abaixo a lista completa de partidas e seus resultados.</p>

      {carregando && (
        <p style={{ color: '#555', fontStyle: 'italic', marginTop: '20px' }}>Carregando jogos...</p>
      )}
      
      {erro && (
        <p style={{ color: '#dc3545', fontWeight: 'bold', marginTop: '20px' }}>Erro: {erro}</p>
      )}

      {!carregando && !erro && jogos.length === 0 && (
        <div style={{ padding: '20px', textAlign: 'center', color: '#777', backgroundColor: '#f9f9f9', borderRadius: '8px', marginTop: '20px' }}>
          Nenhuma partida encontrada
        </div>
      )}

      {!carregando && !erro && jogos.length > 0 && !jogoEmFinalizacao && (
        <div style={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #ddd', overflowX: 'auto', marginTop: '20px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '900px' }}>
            <thead style={{ backgroundColor: '#f1f1f1' }}>
              <tr>
                <th style={{ padding: '15px', borderBottom: '2px solid #ddd', color: '#333' }}>Nº</th>
                <th style={{ padding: '15px', borderBottom: '2px solid #ddd', color: '#333' }}>Fase/Grupo</th>
                <th style={{ padding: '15px', borderBottom: '2px solid #ddd', color: '#333' }}>Local</th>
                <th style={{ padding: '15px', borderBottom: '2px solid #ddd', color: '#333' }}>Data/Hora</th>
                <th style={{ padding: '15px', borderBottom: '2px solid #ddd', color: '#333', textAlign: 'center' }}>Confronto</th>
                <th style={{ padding: '15px', borderBottom: '2px solid #ddd', color: '#333', textAlign: 'center' }}>Placar</th>
                <th style={{ padding: '15px', borderBottom: '2px solid #ddd', color: '#333' }}>Status</th>
                <th style={{ padding: '15px', borderBottom: '2px solid #ddd', color: '#333', textAlign: 'center' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {jogos.map((jogo, index) => (
                <tr key={jogo.id || index} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '15px', color: '#555', fontWeight: 'bold' }}>
                    {jogo.numero_jogo}
                  </td>
                  <td style={{ padding: '15px', color: '#555' }}>
                    {jogo.fase} {jogo.grupo_id ? `(G${jogo.grupo_id})` : ''}
                  </td>
                  <td style={{ padding: '15px', color: '#555' }}>
                    {jogo.local_jogo || 'Não definido'}
                  </td>
                  <td style={{ padding: '15px', color: '#555' }}>
                    {formatarDataHora(jogo.data_hora)}
                  </td>
                  <td style={{ padding: '15px', color: '#333', textAlign: 'center', fontWeight: 'bold', fontSize: '15px' }}>
                    {jogo.escola_1 || jogo.escola_1_id} <span style={{ color: '#e74c3c', margin: '0 8px' }}>X</span> {jogo.escola_2 || jogo.escola_2_id}
                  </td>
                  <td style={{ padding: '15px', color: '#555', textAlign: 'center', fontSize: '18px', fontWeight: 'bold' }}>
                    {formatarPlacar(jogo.placar_escola_1, jogo.placar_escola_2)}
                  </td>
                  <td style={{ padding: '15px', color: '#555' }}>
                    <span style={{ 
                      padding: '5px 10px', 
                      borderRadius: '12px', 
                      fontSize: '13px', 
                      backgroundColor: jogo.status === 'AGENDADO' ? '#e2e3e5' : '#d4edda', 
                      color: jogo.status === 'AGENDADO' ? '#383d41' : '#155724',
                      fontWeight: 'bold'
                    }}>
                      {jogo.status || 'AGENDADO'}
                    </span>
                  </td>
                  <td style={{ padding: '15px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                      <button 
                        onClick={() => navigate(`/sumula-detalhes/${jogo.id_jogo || jogo.id}`)}
                        style={{ padding: '6px 12px', backgroundColor: '#6f42c1', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold' }}
                      >
                        👁️ Ver Súmula
                      </button>
                      <button 
                        onClick={() => navigate(`/preencher-sumula/${jogo.id_jogo || jogo.id}`)}
                        style={{ padding: '6px 12px', backgroundColor: '#17a2b8', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold' }}
                      >
                        📝 Súmula
                      </button>
                      {jogo.status === 'AGENDADO' && (
                        <button 
                          onClick={() => abrirFinalizacao(jogo)}
                          style={{ padding: '6px 12px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold' }}
                        >
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
      )}

      {jogoEmFinalizacao && (
        <div style={{ backgroundColor: '#f9f9f9', padding: '25px', borderRadius: '8px', border: '1px solid #ccc', marginTop: '20px' }}>
          <h3 style={{ marginTop: 0 }}>Finalizar Partida #{jogoEmFinalizacao.numero_jogo}</h3>
          <p style={{ color: '#555' }}>
            Informe o placar final do confronto entre <strong>{jogoEmFinalizacao.escola_1 || `Escola ${jogoEmFinalizacao.escola_1_id}`}</strong> e <strong>{jogoEmFinalizacao.escola_2 || `Escola ${jogoEmFinalizacao.escola_2_id}`}</strong>.
          </p>
          
          <form onSubmit={handleFinalizar} style={{ display: 'flex', gap: '20px', alignItems: 'flex-end', marginTop: '20px', flexWrap: 'wrap' }}>
            <div style={{ flex: '1', minWidth: '200px' }}>
              <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px', color: '#333' }}>
                Gols: {jogoEmFinalizacao.escola_1 || `Escola ${jogoEmFinalizacao.escola_1_id}`}
              </label>
              <input 
                type="number" 
                min="0"
                value={placar1} 
                onChange={(e) => setPlacar1(e.target.value)} 
                required 
                style={{ width: '100%', padding: '10px', boxSizing: 'border-box', borderRadius: '4px', border: '1px solid #ccc', fontSize: '16px' }} 
              />
            </div>

            <div style={{ flex: '1', minWidth: '200px' }}>
              <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px', color: '#333' }}>
                Gols: {jogoEmFinalizacao.escola_2 || `Escola ${jogoEmFinalizacao.escola_2_id}`}
              </label>
              <input 
                type="number" 
                min="0"
                value={placar2} 
                onChange={(e) => setPlacar2(e.target.value)} 
                required 
                style={{ width: '100%', padding: '10px', boxSizing: 'border-box', borderRadius: '4px', border: '1px solid #ccc', fontSize: '16px' }} 
              />
            </div>

            <div style={{ display: 'flex', gap: '10px', flex: '1', minWidth: '300px' }}>
              <button 
                type="button" 
                onClick={() => setJogoEmFinalizacao(null)}
                style={{ flex: 1, padding: '12px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold', fontSize: '15px' }}
              >
                Cancelar
              </button>
              <button 
                type="submit" 
                style={{ flex: 2, padding: '12px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold', fontSize: '15px' }}
              >
                Confirmar Finalização
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

export default ListaJogos;
