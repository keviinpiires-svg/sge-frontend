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

  const renderGrupo = (titulo, times) => (
    <div className="card">
      <div className="card-body" style={{ paddingBottom: 0 }}>
        <h3 className="card-title" style={{ marginBottom: 0, borderBottom: 'none' }}>{titulo}</h3>
      </div>
      <div className="table-wrap">
        <table className="table-sge compact">
          <thead>
            <tr>
              <th>Pos</th>
              <th className="text-left">Time</th>
              <th>P</th>
              <th>J</th>
              <th>V</th>
            </tr>
          </thead>
          <tbody>
            {times.map((time, index) => (
              <tr key={time.id}>
                <td>
                  <span className={`rank ${index < 3 ? `rank-${index + 1}` : ''}`}>{index + 1}</span>
                </td>
                <td className="text-left strong">{time.escola_nome}</td>
                <td className="text-accent num-lg">{time.pontos}</td>
                <td className="text-soft">{time.jogos}</td>
                <td className="text-soft">{time.vitorias}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {times.length === 0 && (
        <div className="state state-compact">
          <p className="state-text">Nenhum time neste grupo ainda.</p>
        </div>
      )}
    </div>
  );

  return (
    <div className="page">
      <div className="container-lg">
        <header className="page-header">
          <p className="eyebrow">Campeonato</p>
          <h1 className="page-title">Fase de Grupos ⚽</h1>
          <p className="page-subtitle">Classificação e pontuação do campeonato.</p>
        </header>

        <div className="grid-2">
          {renderGrupo('Grupo A', grupoA)}
          {renderGrupo('Grupo B', grupoB)}
        </div>
      </div>
    </div>
  );
}

export default FaseGrupos;
