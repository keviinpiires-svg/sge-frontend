import { useState, useEffect } from 'react';
import { listarClassificacao } from '../services/classificacao';

function Classificacao() {
  const [classificacao, setClassificacao] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');

  // Incrementar este valor dispara uma nova busca (botão "Tentar novamente")
  const [tentativa, setTentativa] = useState(0);

  useEffect(() => {
    let ativo = true;

    listarClassificacao()
      .then((data) => {
        if (!ativo) return;
        setClassificacao(data);
        setErro('');
      })
      .catch((error) => {
        if (ativo) setErro(error.mensagem);
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
        <div className="state">
          <div className="spinner" />
          <p className="state-text">Carregando classificação...</p>
        </div>
      );
    }

    if (erro) {
      return (
        <div className="state state-error">
          <div className="state-icon">⚠️</div>
          <p className="state-title">Não foi possível carregar a tabela</p>
          <p className="state-text">{erro}</p>
          <button className="btn btn-primary" onClick={tentarNovamente}>Tentar novamente</button>
        </div>
      );
    }

    if (classificacao.length === 0) {
      return (
        <div className="state">
          <div className="state-icon">🏆</div>
          <p className="state-title">Nenhum jogo finalizado ainda.</p>
          <p className="state-text">A tabela será atualizada em breve.</p>
        </div>
      );
    }

    return (
      <div className="table-wrap">
        <table className="table-sge" style={{ minWidth: '560px' }}>
          <thead>
            <tr>
              <th title="Posição">Pos</th>
              <th className="text-left">Escola</th>
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
                    <span className={`rank ${posicao <= 3 ? `rank-${posicao}` : ''}`}>
                      {posicao}
                    </span>
                  </td>
                  <td className="text-left strong">{time.escola_nome}</td>
                  <td className="text-accent num-lg">{time.pontos}</td>
                  <td>{time.vitorias}</td>
                  <td className={time.saldo_gols > 0 ? 'text-success' : time.saldo_gols < 0 ? 'text-danger' : 'text-soft'}>
                    {formatarSaldo(time.saldo_gols)}
                  </td>
                  <td className="text-soft">{time.gols_pro}</td>
                  <td className="text-soft">{time.gols_contra}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="page">
      <div className="container">
        <header className="page-header">
          <p className="eyebrow">Jogos Estudantis</p>
          <h1 className="page-title">Classificação Geral</h1>
          <p className="page-subtitle">Desempenho das escolas com base nos jogos finalizados.</p>
        </header>

        <div className="card">{renderConteudo()}</div>

        {!carregando && !erro && classificacao.length > 0 && (
          <div className="legend">
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
