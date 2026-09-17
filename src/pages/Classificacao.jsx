import { useState, useEffect } from 'react';

const estilos = `
  .clf-page {
    min-height: calc(100vh - 70px);
    background: radial-gradient(circle at top, #1f2d3d 0%, #121a24 60%, #0d131b 100%);
    padding: 40px 16px 60px;
    font-family: 'Segoe UI', system-ui, sans-serif;
    color: #e6edf3;
    box-sizing: border-box;
  }
  .clf-container { max-width: 960px; margin: 0 auto; }
  .clf-header { margin-bottom: 28px; }
  .clf-eyebrow {
    color: #f1c40f; font-size: 12px; font-weight: 700;
    letter-spacing: 0.18em; text-transform: uppercase; margin: 0 0 6px;
  }
  .clf-title { margin: 0; font-size: clamp(26px, 4vw, 36px); font-weight: 800; color: #fff; }
  .clf-subtitle { margin: 8px 0 0; color: #8b9bb0; font-size: 15px; }

  .clf-card {
    background: rgba(22, 32, 45, 0.9);
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 16px;
    box-shadow: 0 20px 45px rgba(0, 0, 0, 0.35);
    overflow: hidden;
  }
  .clf-scroll { overflow-x: auto; }
  .clf-table { width: 100%; border-collapse: collapse; min-width: 560px; }
  .clf-table thead th {
    background: linear-gradient(180deg, #2c3e50 0%, #243447 100%);
    color: #f1c40f; font-size: 12px; font-weight: 700;
    letter-spacing: 0.08em; text-transform: uppercase;
    padding: 16px 12px; text-align: center;
    border-bottom: 2px solid #f1c40f;
  }
  .clf-table thead th.clf-left { text-align: left; }
  .clf-table tbody td {
    padding: 14px 12px; text-align: center; font-size: 15px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    font-variant-numeric: tabular-nums;
  }
  .clf-table tbody tr { transition: background 0.15s ease; }
  .clf-table tbody tr:nth-child(even) { background: rgba(255, 255, 255, 0.02); }
  .clf-table tbody tr:hover { background: rgba(241, 196, 15, 0.07); }
  .clf-table tbody tr:last-child td { border-bottom: none; }

  .clf-pos {
    display: inline-flex; align-items: center; justify-content: center;
    width: 30px; height: 30px; border-radius: 50%;
    font-weight: 800; font-size: 14px;
    background: rgba(255, 255, 255, 0.06); color: #c9d4e0;
  }
  .clf-pos-1 { background: linear-gradient(135deg, #f1c40f, #d4a106); color: #1a1a1a; box-shadow: 0 0 12px rgba(241,196,15,0.45); }
  .clf-pos-2 { background: linear-gradient(135deg, #dfe6ec, #a9b4bf); color: #1a1a1a; }
  .clf-pos-3 { background: linear-gradient(135deg, #e0a26b, #b36b35); color: #1a1a1a; }

  .clf-escola { text-align: left !important; font-weight: 600; color: #fff; }
  .clf-pontos { font-weight: 800; color: #f1c40f; font-size: 17px !important; }
  .clf-pos-sg { color: #2ecc71; }
  .clf-neg-sg { color: #e74c3c; }
  .clf-muted { color: #9fb0c3; }

  .clf-state {
    padding: 56px 24px; text-align: center;
  }
  .clf-state-icon { font-size: 44px; margin-bottom: 12px; }
  .clf-state-title { margin: 0 0 6px; font-size: 18px; font-weight: 700; color: #fff; }
  .clf-state-text { margin: 0; color: #8b9bb0; font-size: 15px; }
  .clf-error .clf-state-title { color: #ff7b72; }
  .clf-retry {
    margin-top: 18px; padding: 10px 22px; border: none; border-radius: 8px;
    background: #f1c40f; color: #1a1a1a; font-weight: 700; cursor: pointer;
  }
  .clf-retry:hover { background: #ffd83a; }

  .clf-spinner {
    width: 40px; height: 40px; margin: 0 auto 16px;
    border: 4px solid rgba(255,255,255,0.1); border-top-color: #f1c40f;
    border-radius: 50%; animation: clf-spin 0.8s linear infinite;
  }
  @keyframes clf-spin { to { transform: rotate(360deg); } }

  .clf-legend {
    display: flex; flex-wrap: wrap; gap: 8px 18px;
    margin-top: 16px; color: #6f8196; font-size: 13px;
  }
  .clf-legend b { color: #9fb0c3; }

  @media (max-width: 600px) {
    .clf-page { padding: 24px 16px 40px; }
    .clf-table tbody td { padding: 12px 8px; font-size: 14px; }
    .clf-table thead th { padding: 14px 8px; }
  }
`;

function Classificacao() {
  const [classificacao, setClassificacao] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');

  // Incrementar este valor dispara uma nova busca (botão "Tentar novamente")
  const [tentativa, setTentativa] = useState(0);

  useEffect(() => {
    let ativo = true;

    fetch('http://localhost:3000/api/classificacao')
      .then((response) => {
        if (!response.ok) {
          throw new Error('Falha ao buscar a classificação.');
        }
        return response.json();
      })
      .then((data) => {
        if (!ativo) return;
        setClassificacao(data);
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

  const formatarSaldo = (saldo) => (saldo > 0 ? `+${saldo}` : `${saldo}`);

  const renderConteudo = () => {
    if (carregando) {
      return (
        <div className="clf-state">
          <div className="clf-spinner" />
          <p className="clf-state-text">Carregando classificação...</p>
        </div>
      );
    }

    if (erro) {
      return (
        <div className="clf-state clf-error">
          <div className="clf-state-icon">⚠️</div>
          <p className="clf-state-title">Não foi possível carregar a tabela</p>
          <p className="clf-state-text">{erro}</p>
          <button className="clf-retry" onClick={tentarNovamente}>Tentar novamente</button>
        </div>
      );
    }

    if (classificacao.length === 0) {
      return (
        <div className="clf-state">
          <div className="clf-state-icon">🏆</div>
          <p className="clf-state-title">Nenhum jogo finalizado ainda.</p>
          <p className="clf-state-text">A tabela será atualizada em breve.</p>
        </div>
      );
    }

    return (
      <div className="clf-scroll">
        <table className="clf-table">
          <thead>
            <tr>
              <th title="Posição">Pos</th>
              <th className="clf-left">Escola</th>
              <th title="Pontos">P</th>
              <th title="Vitórias">V</th>
              <th title="Saldo de Gols">SG</th>
              <th title="Gols Pró">GP</th>
              <th title="Gols Contra">GC</th>
            </tr>
          </thead>
          <tbody>
            {classificacao.map((time, index) => {
              const posicao = index + 1;
              return (
                <tr key={time.id}>
                  <td>
                    <span className={`clf-pos ${posicao <= 3 ? `clf-pos-${posicao}` : ''}`}>
                      {posicao}
                    </span>
                  </td>
                  <td className="clf-escola">{time.escola_nome}</td>
                  <td className="clf-pontos">{time.pontos}</td>
                  <td>{time.vitorias}</td>
                  <td className={time.saldo_gols > 0 ? 'clf-pos-sg' : time.saldo_gols < 0 ? 'clf-neg-sg' : 'clf-muted'}>
                    {formatarSaldo(time.saldo_gols)}
                  </td>
                  <td className="clf-muted">{time.gols_pro}</td>
                  <td className="clf-muted">{time.gols_contra}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="clf-page">
      <style>{estilos}</style>
      <div className="clf-container">
        <header className="clf-header">
          <p className="clf-eyebrow">Jogos Estudantis</p>
          <h1 className="clf-title">Classificação Geral</h1>
          <p className="clf-subtitle">Desempenho das escolas com base nos jogos finalizados.</p>
        </header>

        <div className="clf-card">{renderConteudo()}</div>

        {!carregando && !erro && classificacao.length > 0 && (
          <div className="clf-legend">
            <span><b>P</b> Pontos</span>
            <span><b>V</b> Vitórias</span>
            <span><b>SG</b> Saldo de Gols</span>
            <span><b>GP</b> Gols Pró</span>
            <span><b>GC</b> Gols Contra</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default Classificacao;
