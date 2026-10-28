import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { listarLideres } from '../services/artilharia';

const ROTULO_GENERO = { MASCULINO: 'Masculino', FEMININO: 'Feminino', MISTO: 'Misto' };

// Esta tela mostra o artilheiro de CADA competição. O ranking completo de uma
// competição fica na página dela: somar gols de futsal com pontos de basquete
// num "artilheiro dos Jogos" não significaria nada.
function Artilharia() {
  const navigate = useNavigate();
  const [resultado, setResultado] = useState(null);
  const [tentativa, setTentativa] = useState(0);

  useEffect(() => {
    let ativo = true;

    listarLideres()
      .then((lideres) => {
        if (ativo) setResultado({ tentativa, lideres, erro: '' });
      })
      .catch((falha) => {
        if (ativo) setResultado({ tentativa, lideres: [], erro: falha.mensagem });
      });

    return () => {
      ativo = false;
    };
  }, [tentativa]);

  const pronto = resultado?.tentativa === tentativa;
  const lideres = pronto ? resultado.lideres : [];
  const erro = pronto ? resultado.erro : '';

  // Agrupa por modalidade, mantendo a ordem que o backend já devolveu
  const porModalidade = lideres.reduce((mapa, lider) => {
    if (!mapa[lider.modalidade_nome]) mapa[lider.modalidade_nome] = [];
    mapa[lider.modalidade_nome].push(lider);
    return mapa;
  }, {});

  const renderConteudo = () => {
    if (!pronto) {
      return (
        <div className="card">
          <div className="state">
            <div className="spinner" />
            <p className="state-text">Carregando artilheiros...</p>
          </div>
        </div>
      );
    }

    if (erro) {
      return (
        <div className="card">
          <div className="state state-error">
            <div className="state-icon">⚠️</div>
            <p className="state-title">Não foi possível carregar</p>
            <p className="state-text">{erro}</p>
            <button className="btn btn-primary" onClick={() => setTentativa((t) => t + 1)}>
              Tentar novamente
            </button>
          </div>
        </div>
      );
    }

    if (lideres.length === 0) {
      return (
        <div className="card">
          <div className="state state-compact">
            <div className="state-icon">⚽</div>
            <p className="state-text">
              Nenhum gol lançado ainda. A artilharia é somada das súmulas.
            </p>
          </div>
        </div>
      );
    }

    return Object.entries(porModalidade).map(([modalidade, doGrupo]) => (
      <section key={modalidade} className="mb-lg">
        <h2 className="secao-titulo">{modalidade}</h2>

        <div className="grid-cards">
          {doGrupo.map((lider) => (
            <button
              key={`${lider.competicao_id}-${lider.atleta_id}`}
              type="button"
              className="tile tile-clicavel"
              onClick={() => navigate(`/competicoes/${lider.competicao_id}`)}
            >
              <p className="tile-meta">
                {lider.categoria_nome} {ROTULO_GENERO[lider.genero] || lider.genero}
              </p>
              <p className="tile-title">{lider.atleta_nome}</p>
              <p className="tile-meta">
                {lider.escola_nome} — <strong>{lider.gols}</strong> {lider.rotulo}
              </p>
            </button>
          ))}
        </div>
      </section>
    ));
  };

  return (
    <div className="page">
      <div className="container-lg">
        <header className="page-header">
          <p className="eyebrow">Artilharia</p>
          <h1 className="page-title">Artilheiros por competição</h1>
          <p className="page-subtitle">
            Quem mais marcou em cada competição. Clique para ver o ranking completo.
          </p>
        </header>

        {renderConteudo()}
      </div>
    </div>
  );
}

export default Artilharia;
