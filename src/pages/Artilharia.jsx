import { useState, useEffect } from 'react';
import { listarArtilharia } from '../services/artilharia';

function Artilharia() {
  const [artilheiros, setArtilheiros] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');

  // Incrementar este valor dispara uma nova busca (botão "Tentar novamente")
  const [tentativa, setTentativa] = useState(0);

  useEffect(() => {
    let ativo = true;

    listarArtilharia()
      .then((data) => {
        if (!ativo) return;
        setArtilheiros(data);
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

  const renderConteudo = () => {
    if (carregando) {
      return (
        <div className="state">
          <div className="spinner" />
          <p className="state-text">Carregando artilharia...</p>
        </div>
      );
    }

    if (erro) {
      return (
        <div className="state state-error">
          <div className="state-icon">⚠️</div>
          <p className="state-title">Não foi possível carregar a artilharia</p>
          <p className="state-text">{erro}</p>
          <button className="btn btn-primary" onClick={tentarNovamente}>Tentar novamente</button>
        </div>
      );
    }

    if (artilheiros.length === 0) {
      return (
        <div className="state">
          <div className="state-icon">⚽</div>
          <p className="state-title">Nenhum gol registrado ainda.</p>
          <p className="state-text">A artilharia será atualizada assim que as súmulas forem preenchidas.</p>
        </div>
      );
    }

    return (
      <div className="table-wrap">
        <table className="table-sge" style={{ minWidth: '480px' }}>
          <thead>
            <tr>
              <th title="Posição">Posição</th>
              <th className="text-left">Atleta</th>
              <th className="text-left">Escola</th>
              <th>Gols</th>
            </tr>
          </thead>
          <tbody>
            {artilheiros.map((artilheiro, index) => {
              const posicao = index + 1;
              const lider = posicao === 1;
              return (
                <tr key={artilheiro.atleta_id ?? index} className={lider ? 'row-leader' : ''}>
                  <td>
                    <span className={`rank ${posicao <= 3 ? `rank-${posicao}` : ''}`}>{posicao}</span>
                  </td>
                  <td className="text-left strong">
                    {artilheiro.atleta_nome}
                    {lider && (
                      <span className="golden-boot" title="Chuteira de Ouro">👟 Chuteira de Ouro</span>
                    )}
                  </td>
                  <td className="text-left text-soft">{artilheiro.escola_nome}</td>
                  <td className="text-accent num-lg">{artilheiro.total_gols}</td>
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
          <p className="eyebrow">Estatísticas</p>
          <h1 className="page-title">Artilharia ⚽</h1>
          <p className="page-subtitle">Os maiores goleadores do campeonato.</p>
        </header>

        <div className="card">{renderConteudo()}</div>
      </div>
    </div>
  );
}

export default Artilharia;
