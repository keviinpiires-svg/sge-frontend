import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import PainelModalidades from '../components/PainelModalidades';
import { buscarCompeticao } from '../services/competicoes';

const ROTULO_GENERO = { MASCULINO: 'Masculino', FEMININO: 'Feminino', MISTO: 'Misto' };

const ROTULO_STATUS = {
  INSCRICOES: 'Inscrições',
  GRUPOS: 'Fase de grupos',
  MATA_MATA: 'Mata-mata',
  ENCERRADA: 'Encerrada'
};

function CompeticaoDetalhe() {
  const { id } = useParams();
  const navigate = useNavigate();

  // Mesmo padrão da lista: o resultado carrega o id de origem, então o estado
  // de carga é derivado e nenhum setState roda no corpo do efeito.
  const [resultado, setResultado] = useState(null);

  const pronto = resultado?.id === id;
  const competicao = pronto ? resultado.competicao : null;
  const erro = pronto ? resultado.erro : '';

  useEffect(() => {
    let ativo = true;

    buscarCompeticao(id)
      .then((dados) => {
        if (ativo) setResultado({ id, competicao: dados, erro: '' });
      })
      .catch((falha) => {
        if (ativo) setResultado({ id, competicao: null, erro: falha.mensagem });
      });

    return () => {
      ativo = false;
    };
  }, [id]);

  if (!pronto) {
    return (
      <PainelModalidades>
        <div className="card">
          <div className="state">
            <div className="spinner" />
            <p className="state-text">Carregando competição...</p>
          </div>
        </div>
      </PainelModalidades>
    );
  }

  if (erro) {
    return (
      <PainelModalidades>
        <div className="card">
          <div className="state state-error">
            <div className="state-icon">⚠️</div>
            <p className="state-title">Não foi possível carregar</p>
            <p className="state-text">{erro}</p>
          </div>
        </div>
      </PainelModalidades>
    );
  }

  return (
    <PainelModalidades>
      <header className="page-header">
        <p className="eyebrow">
          {competicao.modalidade_nome} · {ROTULO_GENERO[competicao.genero] || competicao.genero}
        </p>
        <h1 className="page-title">{competicao.categoria_nome}</h1>
        <p className="page-subtitle">{competicao.regra}</p>
      </header>

      <div className="card mb-lg">
        <div className="card-body">
          <div className="ficha">
            <div>
              <span className="ficha-rotulo">Situação</span>
              <span className="ficha-valor">{ROTULO_STATUS[competicao.status] || competicao.status}</span>
            </div>
            <div>
              <span className="ficha-rotulo">Equipes</span>
              <span className="ficha-valor">{competicao.total_equipes}</span>
            </div>
            <div>
              <span className="ficha-rotulo">Grupos</span>
              <span className="ficha-valor">{competicao.qtd_grupos}</span>
            </div>
            <div>
              <span className="ficha-rotulo">Elenco</span>
              <span className="ficha-valor">
                {competicao.max_atletas ? `até ${competicao.max_atletas}` : 'sem limite'}
              </span>
            </div>
            {competicao.idade_maxima !== null && (
              <div>
                <span className="ficha-rotulo">Categoria</span>
                <span className="ficha-valor">Sub {competicao.idade_maxima}</span>
              </div>
            )}
            <div>
              <span className="ficha-rotulo">Pontuação</span>
              <span className="ficha-valor">
                {competicao.pontos_vitoria}/{competicao.pontos_empate}/{competicao.pontos_derrota}
              </span>
            </div>
          </div>
        </div>
      </div>

      {competicao.grupos.map((grupo) => (
        <section key={grupo.id ?? 'sem-grupo'} className="card mb-lg">
          <div className="card-body">
            <h2 className="card-title">
              {grupo.nome.startsWith('Sem') ? grupo.nome : `Grupo ${grupo.nome}`}
            </h2>

            <div className="grid-cards">
              {grupo.equipes.map((equipe) => (
                <div key={equipe.id} className="tile">
                  <p className="tile-title">{equipe.escola_nome}</p>
                  <p className="tile-meta">
                    {equipe.total_inscritos === 1
                      ? '1 atleta inscrito'
                      : `${equipe.total_inscritos} atletas inscritos`}
                  </p>
                  {equipe.tecnico_nome && <p className="tile-meta">Técnico: {equipe.tecnico_nome}</p>}
                </div>
              ))}
            </div>
          </div>
        </section>
      ))}

      <button
        type="button"
        className="btn btn-outline btn-sm"
        onClick={() => navigate(`/modalidades/${competicao.modalidade_slug}`)}
      >
        ← Voltar para {competicao.modalidade_nome}
      </button>
    </PainelModalidades>
  );
}

export default CompeticaoDetalhe;
