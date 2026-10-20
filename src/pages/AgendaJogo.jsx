import { useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { buscarJogoDaAgenda } from '../services/agenda';
import { dataPorExtenso } from '../services/datas';
import {
  CLASSE_STATUS, ROTULO_GENERO, ROTULO_STATUS, nomeDaFase, textoDoResultado
} from '../components/agendaTextos';

// Detalhe de um jogo da Agenda — público. Os atletas chegam só com nome e
// número da camisa (GET /api/agenda/jogos/:id): nada de dado pessoal.

function Elenco({ equipe }) {
  return (
    <section className="card agenda-elenco">
      <div className="card-body">
        <h2 className="card-title">{equipe.escola}</h2>
        {equipe.atletas.length === 0 ? (
          <p className="state-text agenda-sem-atletas">Atletas ainda não inscritos</p>
        ) : (
          <ul className="agenda-atletas">
            {equipe.atletas.map((atleta, i) => (
              <li key={`${atleta.numero_camisa ?? 's'}-${i}`}>
                <span className="agenda-camisa">{atleta.numero_camisa ?? '–'}</span>
                <span>{atleta.nome}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function AgendaJogo() {
  const { id } = useParams();
  const { search } = useLocation();
  const [resultado, setResultado] = useState(null);
  const [tentativa, setTentativa] = useState(0);

  useEffect(() => {
    let ativo = true;
    buscarJogoDaAgenda(id)
      .then((jogo) => { if (ativo) setResultado({ chave: `${id}-${tentativa}`, jogo, erro: '' }); })
      .catch((falha) => { if (ativo) setResultado({ chave: `${id}-${tentativa}`, jogo: null, erro: falha.mensagem }); });
    return () => { ativo = false; };
  }, [id, tentativa]);

  const pronto = resultado?.chave === `${id}-${tentativa}`;
  const jogo = pronto ? resultado.jogo : null;
  const erro = pronto ? resultado.erro : '';
  // Volta para a agenda com os mesmos filtros
  const voltar = `/agenda${search}`;

  let conteudo;
  if (!pronto) {
    conteudo = (
      <div className="agenda-esqueleto" aria-busy="true" aria-label="Carregando o jogo">
        <div className="esqueleto esqueleto-titulo" />
        <div className="esqueleto esqueleto-bloco" />
        <div className="esqueleto esqueleto-bloco" />
      </div>
    );
  } else if (erro) {
    conteudo = (
      <div className="card">
        <div className="state state-error">
          <div className="state-icon">⚠️</div>
          <p className="state-title">Não foi possível carregar o jogo</p>
          <p className="state-text">{erro}</p>
          <button className="btn btn-primary" onClick={() => setTentativa((t) => t + 1)}>Tentar novamente</button>
        </div>
      </div>
    );
  } else {
    const c = jogo.competicao;
    conteudo = (
      <>
        <header className="page-header">
          <p className="eyebrow">{c.modalidade} · {c.categoria} · {ROTULO_GENERO[c.genero] || c.genero}</p>
          <h1 className="page-title agenda-titulo-jogo">
            {jogo.equipe_1.escola} <span className="agenda-x">x</span> {jogo.equipe_2.escola}
          </h1>
        </header>

        <section className="card mb-lg">
          <div className="card-body">
            {jogo.placar && (
              <div className="agenda-placar-grande" aria-label="Placar">
                <span>{jogo.placar.equipe_1}</span>
                <span className="agenda-x">×</span>
                <span>{jogo.placar.equipe_2}</span>
              </div>
            )}
            {jogo.resultado && <p className="agenda-resultado">{textoDoResultado(jogo)}</p>}
            <dl className="agenda-info">
              <div><dt>Data</dt><dd>{jogo.data ? dataPorExtenso(jogo.data) : 'A definir'}</dd></div>
              <div><dt>Hora</dt><dd>{jogo.hora || 'A definir'}</dd></div>
              <div><dt>Local</dt><dd>{jogo.local?.nome || 'A definir'}</dd></div>
              <div><dt>Fase</dt><dd>{nomeDaFase(jogo)}</dd></div>
              <div><dt>Jogo</dt><dd>nº {jogo.numero_jogo}</dd></div>
              <div>
                <dt>Situação</dt>
                <dd><span className={`agenda-status ${CLASSE_STATUS[jogo.status] || ''}`}>{ROTULO_STATUS[jogo.status] || jogo.status}</span></dd>
              </div>
            </dl>
          </div>
        </section>

        <div className="agenda-elencos">
          <Elenco equipe={jogo.equipe_1} />
          <Elenco equipe={jogo.equipe_2} />
        </div>
      </>
    );
  }

  return (
    <div className="page">
      <div className="container-lg">
        <Link className="btn btn-outline btn-sm mb-lg" to={voltar}>← Voltar para a agenda</Link>
        {conteudo}
      </div>
    </div>
  );
}

export default AgendaJogo;
