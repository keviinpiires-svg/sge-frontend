import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import PainelModalidades from '../components/PainelModalidades';
import { listarCompeticoes } from '../services/competicoes';

const ROTULO_GENERO = { MASCULINO: 'Masculino', FEMININO: 'Feminino', MISTO: 'Misto' };

const ROTULO_STATUS = {
  INSCRICOES: 'Inscrições',
  GRUPOS: 'Fase de grupos',
  MATA_MATA: 'Mata-mata',
  ENCERRADA: 'Encerrada'
};

function Competicoes() {
  const { slug } = useParams();
  const navigate = useNavigate();

  // O resultado guarda de qual slug ele veio. Assim "carregando" é derivado da
  // comparação, e nenhum setState precisa rodar no corpo do efeito ao trocar
  // de modalidade (regra react-hooks/set-state-in-effect).
  const [resultado, setResultado] = useState(null);

  const pronto = resultado?.slug === slug;
  const competicoes = pronto ? resultado.competicoes : [];
  const erro = pronto ? resultado.erro : '';

  useEffect(() => {
    let ativo = true;

    listarCompeticoes({ modalidade: slug })
      .then((dados) => {
        if (ativo) setResultado({ slug, competicoes: dados, erro: '' });
      })
      .catch((falha) => {
        if (ativo) setResultado({ slug, competicoes: [], erro: falha.mensagem });
      });

    return () => {
      ativo = false;
    };
  }, [slug]);

  const modalidadeNome = competicoes[0]?.modalidade_nome || slug;

  // Agrupa por gênero preservando a ordem que o backend já devolveu
  // (ordem da modalidade, depois da categoria, depois do gênero).
  const porGenero = competicoes.reduce((mapa, competicao) => {
    const chave = competicao.genero;
    if (!mapa[chave]) mapa[chave] = [];
    mapa[chave].push(competicao);
    return mapa;
  }, {});

  const renderConteudo = () => {
    if (!pronto) {
      return (
        <div className="card">
          <div className="state">
            <div className="spinner" />
            <p className="state-text">Carregando competições...</p>
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
          </div>
        </div>
      );
    }

    if (competicoes.length === 0) {
      return (
        <div className="card">
          <div className="state state-compact">
            <p className="state-text">Nenhuma competição cadastrada nesta modalidade.</p>
          </div>
        </div>
      );
    }

    return Object.entries(porGenero).map(([genero, lista]) => (
      <section key={genero} className="mb-lg">
        <h2 className="secao-titulo">{ROTULO_GENERO[genero] || genero}</h2>

        <div className="grid-cards">
          {lista.map((competicao) => (
            <button
              key={competicao.id}
              type="button"
              className="tile tile-clicavel"
              onClick={() => navigate(`/competicoes/${competicao.id}`)}
            >
              <div className="tile-topo">
                <p className="tile-title">{competicao.categoria_nome}</p>
                <span className="badge">{ROTULO_STATUS[competicao.status] || competicao.status}</span>
              </div>

              <p className="tile-meta">{competicao.regra}</p>

              <p className="tile-meta">
                {competicao.qtd_grupos === 1 ? '1 grupo' : `${competicao.qtd_grupos} grupos`}
                {' · '}
                {competicao.total_equipes === 1 ? '1 equipe' : `${competicao.total_equipes} equipes`}
              </p>
            </button>
          ))}
        </div>
      </section>
    ));
  };

  return (
    <PainelModalidades>
      <header className="page-header">
        <p className="eyebrow">Competições</p>
        <h1 className="page-title">{modalidadeNome}</h1>
        {pronto && !erro && (
          <p className="page-subtitle">
            {competicoes.length === 1
              ? '1 competição nesta modalidade.'
              : `${competicoes.length} competições nesta modalidade.`}
          </p>
        )}
      </header>

      {renderConteudo()}
    </PainelModalidades>
  );
}

export default Competicoes;
