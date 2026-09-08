import { useState, useEffect } from 'react';
import api from '../services/api';

function FaseGrupos() {
  const [classificacao, setClassificacao] = useState([]);

  useEffect(() => {
    async function carregarClassificacao() {
      try {
        // Agora busca os dados completos com a pontuação unida aos nomes
        const resposta = await api.get('/classificacao');
        setClassificacao(resposta.data);
      } catch (erro) {
        console.error("Erro ao buscar classificação:", erro);
      }
    }
    carregarClassificacao();
  }, []);

  // Separa os times automaticamente por grupo
  const grupoA = classificacao.filter(time => time.grupo === 'A');
  const grupoB = classificacao.filter(time => time.grupo === 'B');

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
      <h2>Fase de Grupos ⚽</h2>
      <p>Classificação e pontuação do campeonato.</p>

      <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', marginTop: '20px' }}>
        
        {/* Tabela do Grupo A */}
        <div style={{ flex: '1', minWidth: '300px', border: '1px solid #ccc', padding: '15px', borderRadius: '8px', backgroundColor: '#f9f9f9' }}>
          <h3 style={{ borderBottom: '2px solid #2c3e50', paddingBottom: '5px' }}>Grupo A</h3>
          <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', marginTop: '10px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #ddd' }}>
                <th style={{ padding: '8px' }}>Time</th>
                <th style={{ padding: '8px' }}>P</th>
                <th style={{ padding: '8px' }}>J</th>
                <th style={{ padding: '8px' }}>V</th>
              </tr>
            </thead>
            <tbody>
              {grupoA.map((time, index) => (
                <tr key={time.id} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '8px' }}>{index + 1}. {time.escola_nome}</td>
                  <td style={{ padding: '8px', fontWeight: 'bold' }}>{time.pontos}</td>
                  <td style={{ padding: '8px' }}>{time.jogos}</td>
                  <td style={{ padding: '8px' }}>{time.vitorias}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Tabela do Grupo B */}
        <div style={{ flex: '1', minWidth: '300px', border: '1px solid #ccc', padding: '15px', borderRadius: '8px', backgroundColor: '#f9f9f9' }}>
          <h3 style={{ borderBottom: '2px solid #2c3e50', paddingBottom: '5px' }}>Grupo B</h3>
          <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', marginTop: '10px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #ddd' }}>
                <th style={{ padding: '8px' }}>Time</th>
                <th style={{ padding: '8px' }}>P</th>
                <th style={{ padding: '8px' }}>J</th>
                <th style={{ padding: '8px' }}>V</th>
              </tr>
            </thead>
            <tbody>
              {grupoB.map((time, index) => (
                <tr key={time.id} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '8px' }}>{index + 1}. {time.escola_nome}</td>
                  <td style={{ padding: '8px', fontWeight: 'bold' }}>{time.pontos}</td>
                  <td style={{ padding: '8px' }}>{time.jogos}</td>
                  <td style={{ padding: '8px' }}>{time.vitorias}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
}

export default FaseGrupos;