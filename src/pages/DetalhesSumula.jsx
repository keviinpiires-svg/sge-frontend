import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

function DetalhesSumula() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [jogo, setJogo] = useState(null);
  const [eventos, setEventos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');

  useEffect(() => {
    async function carregarRelatorio() {
      try {
        const response = await fetch(`http://localhost:3000/api/sumulas/${id}`);
        if (!response.ok) {
          throw new Error('Falha ao carregar detalhes da súmula.');
        }
        
        const data = await response.json();
        
        // Estratégia flexível de leitura, caso o backend retorne array (JOINs) ou objeto estruturado
        if (Array.isArray(data)) {
          if (data.length > 0) {
            setJogo({
              escola_1: data[0].escola_1 || data[0].escola_mandante,
              escola_2: data[0].escola_2 || data[0].escola_visitante,
              placar_escola_1: data[0].placar_escola_1,
              placar_escola_2: data[0].placar_escola_2,
              fase: data[0].fase,
              numero_jogo: data[0].numero_jogo
            });
            setEventos(data);
          } else {
            // Sem eventos, tenta recuperar os dados básicos do jogo
            const resJogo = await fetch(`http://localhost:3000/api/jogos/${id}`);
            if (resJogo.ok) {
              const infoJogo = await resJogo.json();
              setJogo(Array.isArray(infoJogo) ? infoJogo[0] : infoJogo);
            }
            setEventos([]);
          }
        } else {
          // Quando o backend já retorna num JSON estruturado { jogo: {}, eventos: [] }
          setJogo(data.jogo || data);
          setEventos(data.eventos || []);
        }
      } catch (err) {
        console.error(err);
        setErro(err.message || 'Ocorreu um erro de conexão.');
      } finally {
        setCarregando(false);
      }
    }

    if (id) {
      carregarRelatorio();
    }
  }, [id]);

  if (carregando) {
    return (
      <div style={{ padding: '50px', textAlign: 'center', fontFamily: 'sans-serif', fontSize: '18px', color: '#555' }}>
        Buscando relatório da súmula...
      </div>
    );
  }

  if (erro) {
    return (
      <div style={{ padding: '50px', textAlign: 'center', fontFamily: 'sans-serif', color: '#dc3545', fontSize: '18px' }}>
        <strong>Erro:</strong> {erro}
      </div>
    );
  }

  return (
    <div style={{ padding: '30px 20px', fontFamily: 'sans-serif', maxWidth: '900px', margin: '0 auto' }}>
      
      {/* Placar estilo Esportivo (Stadium View) */}
      <div style={{ backgroundColor: '#1a252f', color: '#fff', padding: '40px 30px', borderRadius: '12px', boxShadow: '0 8px 24px rgba(0,0,0,0.15)', textAlign: 'center', marginBottom: '40px' }}>
        <h2 style={{ margin: '0 0 10px 0', color: '#f39c12', textTransform: 'uppercase', letterSpacing: '2px', fontSize: '16px' }}>
          Relatório Final Oficial
        </h2>
        <p style={{ margin: '0 0 35px 0', color: '#bdc3c7', fontSize: '14px', fontWeight: 'bold' }}>
          JOGO {jogo?.numero_jogo ? `#${jogo.numero_jogo}` : id} {jogo?.fase && `— ${jogo.fase}`}
        </p>
        
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '30px', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '150px', textAlign: 'right' }}>
            <h3 style={{ fontSize: '26px', margin: 0, fontWeight: '700' }}>{jogo?.escola_1 || 'Equipe Mandante'}</h3>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <div style={{ backgroundColor: '#fff', color: '#1a252f', fontSize: '42px', fontWeight: '900', width: '80px', height: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '12px', boxShadow: '0 4px 10px rgba(0,0,0,0.3)' }}>
              {jogo?.placar_escola_1 !== null && jogo?.placar_escola_1 !== undefined ? jogo.placar_escola_1 : '-'}
            </div>
            <span style={{ fontSize: '24px', fontWeight: 'bold', color: '#7f8c8d' }}>X</span>
            <div style={{ backgroundColor: '#fff', color: '#1a252f', fontSize: '42px', fontWeight: '900', width: '80px', height: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '12px', boxShadow: '0 4px 10px rgba(0,0,0,0.3)' }}>
              {jogo?.placar_escola_2 !== null && jogo?.placar_escola_2 !== undefined ? jogo.placar_escola_2 : '-'}
            </div>
          </div>

          <div style={{ flex: 1, minWidth: '150px', textAlign: 'left' }}>
            <h3 style={{ fontSize: '26px', margin: 0, fontWeight: '700' }}>{jogo?.escola_2 || 'Equipe Visitante'}</h3>
          </div>
        </div>
      </div>

      {/* Listagem de Eventos da Súmula */}
      <div style={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e1e8ed', padding: '25px', boxShadow: '0 4px 15px rgba(0,0,0,0.03)' }}>
        <h3 style={{ borderBottom: '2px solid #3498db', paddingBottom: '12px', color: '#2c3e50', marginTop: 0, fontSize: '20px' }}>
          Atletas com Registro na Súmula
        </h3>

        {eventos.length === 0 ? (
          <div style={{ padding: '40px 20px', textAlign: 'center', color: '#7f8c8d', fontSize: '16px', backgroundColor: '#f9fbfd', borderRadius: '8px', border: '1px dashed #ccc' }}>
            Nenhum evento (gols ou cartões) foi registrado nesta súmula.
          </div>
        ) : (
          <div style={{ overflowX: 'auto', marginTop: '20px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead style={{ backgroundColor: '#f1f5f8' }}>
                <tr>
                  <th style={{ padding: '15px', color: '#34495e', borderBottom: '2px solid #dce4ec' }}>Atleta</th>
                  <th style={{ padding: '15px', color: '#34495e', borderBottom: '2px solid #dce4ec' }}>Escola</th>
                  <th style={{ padding: '15px', color: '#34495e', borderBottom: '2px solid #dce4ec', textAlign: 'center' }}>⚽ Gols</th>
                  <th style={{ padding: '15px', color: '#34495e', borderBottom: '2px solid #dce4ec', textAlign: 'center' }}>🟨 Amarelos</th>
                  <th style={{ padding: '15px', color: '#34495e', borderBottom: '2px solid #dce4ec', textAlign: 'center' }}>🟥 Vermelhos</th>
                </tr>
              </thead>
              <tbody>
                {eventos.map((evento, index) => (
                  <tr key={index} style={{ borderBottom: '1px solid #ecf0f1', transition: 'background-color 0.2s' }} onMouseOver={e => e.currentTarget.style.backgroundColor = '#fdfefe'} onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                    <td style={{ padding: '15px', color: '#2c3e50', fontWeight: 'bold' }}>
                      {evento.nome_atleta || evento.atleta || evento.aluno || evento.nome || `Atleta #${evento.aluno_id || evento.atleta_id}`}
                    </td>
                    <td style={{ padding: '15px', color: '#7f8c8d', fontSize: '14px' }}>
                      {evento.nome_escola || evento.escola || '-'}
                    </td>
                    <td style={{ padding: '15px', textAlign: 'center', color: '#27ae60', fontWeight: '900', fontSize: '18px' }}>
                      {evento.gols > 0 ? evento.gols : <span style={{color: '#ccc', fontWeight: 'normal'}}>-</span>}
                    </td>
                    <td style={{ padding: '15px', textAlign: 'center', color: '#f39c12', fontWeight: '900', fontSize: '18px' }}>
                      {evento.cartoes_amarelos > 0 ? evento.cartoes_amarelos : <span style={{color: '#ccc', fontWeight: 'normal'}}>-</span>}
                    </td>
                    <td style={{ padding: '15px', textAlign: 'center', color: '#c0392b', fontWeight: '900', fontSize: '18px' }}>
                      {(evento.cartao_vermelho > 0 || evento.cartoes_vermelhos > 0) ? (evento.cartao_vermelho || evento.cartoes_vermelhos) : <span style={{color: '#ccc', fontWeight: 'normal'}}>-</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div style={{ marginTop: '35px', textAlign: 'center' }}>
        <button 
          onClick={() => navigate('/lista-jogos')}
          style={{ padding: '14px 30px', backgroundColor: '#95a5a6', color: 'white', border: 'none', borderRadius: '50px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', transition: 'background-color 0.2s' }}
          onMouseOver={e => e.currentTarget.style.backgroundColor = '#7f8c8d'}
          onMouseOut={e => e.currentTarget.style.backgroundColor = '#95a5a6'}
        >
          ← Voltar para a Tabela de Jogos
        </button>
      </div>

    </div>
  );
}

export default DetalhesSumula;

