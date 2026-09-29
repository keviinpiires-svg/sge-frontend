import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useReactToPrint } from 'react-to-print';
import { buscarSumulaPorJogo } from '../services/sumulas';

const formatarData = (valor) =>
  valor ? new Date(valor).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : '';

const formatarHora = (valor) =>
  valor ? new Date(valor).toLocaleTimeString('pt-BR', { timeZone: 'UTC', hour: '2-digit', minute: '2-digit' }) : '';

// A folha tem um número fixo de linhas, esteja o elenco cheio ou não: é o que
// permite levá-la impressa para a quadra e escrever à mão o que faltar.
const completarLinhas = (atletas, total) => {
  const linhas = [...atletas];
  while (linhas.length < total) linhas.push(null);
  return linhas;
};

function DetalhesSumula() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [carga, setCarga] = useState(null);
  // Em branco: mesma folha, sem os lançamentos — para levar à quadra
  const [emBranco, setEmBranco] = useState(false);

  const pronto = carga?.id === id;
  const sumula = pronto ? carga.dados : null;
  const erro = pronto ? carga.erro : '';

  const folhaRef = useRef(null);
  const imprimir = useReactToPrint({
    contentRef: folhaRef,
    documentTitle: `Sumula_Jogo_${sumula?.jogo?.numero_jogo || id}${emBranco ? '_em_branco' : ''}`,
    pageStyle: '@page { size: A4 portrait; margin: 10mm; } html, body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }'
  });

  useEffect(() => {
    let ativo = true;

    buscarSumulaPorJogo(id)
      .then((dados) => {
        if (ativo) setCarga({ id, dados, erro: '' });
      })
      .catch((falha) => {
        if (ativo) setCarga({ id, dados: null, erro: falha.mensagem });
      });

    return () => {
      ativo = false;
    };
  }, [id]);

  if (!pronto) {
    return (
      <div className="page"><div className="container-lg">
        <div className="card"><div className="state">
          <div className="spinner" />
          <p className="state-text">Carregando súmula...</p>
        </div></div>
      </div></div>
    );
  }

  if (erro) {
    return (
      <div className="page"><div className="container-lg">
        <div className="card"><div className="state state-error">
          <div className="state-icon">⚠️</div>
          <p className="state-title">Não foi possível carregar a súmula</p>
          <p className="state-text">{erro}</p>
        </div></div>
      </div></div>
    );
  }

  const { evento, jogo, equipes, linhas_sumula } = sumula;
  const mostrar = (valor) => (emBranco ? '' : valor);

  const renderEquipe = (equipe, indice) => (
    <section key={equipe.equipe_id} className="folha-equipe">
      <div className="folha-equipe-topo">
        <span className="folha-rotulo">Equipe {indice === 0 ? 'A' : 'B'}</span>
        <strong className="folha-equipe-nome">{equipe.escola_nome}</strong>
      </div>

      <table className="folha-tabela">
        <thead>
          <tr>
            <th className="col-cartao">A</th>
            <th className="col-cartao">A</th>
            <th className="col-cartao">V</th>
            <th className="col-numero">Nº</th>
            <th className="col-atleta">Atleta</th>
            <th className="col-gols">Gols</th>
            <th className="col-capitao">Cap.</th>
          </tr>
        </thead>
        <tbody>
          {completarLinhas(equipe.atletas, linhas_sumula).map((atleta, linha) => (
            <tr key={atleta ? atleta.atleta_id : `vazia-${linha}`}>
              <td className="col-cartao">{atleta && !emBranco && atleta.amarelos >= 1 ? '✕' : ''}</td>
              <td className="col-cartao">{atleta && !emBranco && atleta.amarelos >= 2 ? '✕' : ''}</td>
              <td className="col-cartao">{atleta && !emBranco && atleta.vermelho ? '✕' : ''}</td>
              <td className="col-numero">{atleta ? atleta.numero_camisa ?? '' : ''}</td>
              <td className="col-atleta">{atleta ? atleta.nome : ''}</td>
              <td className="col-gols">{atleta && !emBranco && atleta.gols > 0 ? atleta.gols : ''}</td>
              <td className="col-capitao">{atleta && !emBranco && atleta.capitao ? '✕' : ''}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="folha-rodape">
        <span><strong>Faltas 1º T:</strong> {mostrar(equipe.faltas_1t)}</span>
        <span><strong>Faltas 2º T:</strong> {mostrar(equipe.faltas_2t)}</span>
        <span><strong>Tempo técnico:</strong> {emBranco ? '' : [
          equipe.tempo_tecnico_1t ? '1º T' : null,
          equipe.tempo_tecnico_2t ? '2º T' : null
        ].filter(Boolean).join(' e ') || '—'}</span>
        <span className="folha-tecnico"><strong>Técnico:</strong> {mostrar(equipe.tecnico_nome)}</span>
      </div>
    </section>
  );

  return (
    <div className="page">
      <div className="container-lg">
        <div className="page-toolbar no-print">
          <button className="btn btn-outline" onClick={() => navigate(-1)}>← Voltar</button>

          <div className="acoes">
            <button
              type="button"
              className={`btn btn-sm ${emBranco ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setEmBranco((v) => !v)}
            >
              {emBranco ? 'Vendo: em branco' : 'Vendo: preenchida'}
            </button>
            <button type="button" className="btn btn-primary btn-sm" onClick={imprimir}>
              🖨️ Imprimir {emBranco ? 'em branco' : 'preenchida'}
            </button>
          </div>
        </div>

        <div ref={folhaRef} className="folha-sumula print-area">
          <header className="folha-cabecalho">
            <h1 className="folha-titulo">{evento.nome_evento}</h1>
            <p className="folha-subtitulo">Súmula — {jogo.modalidade_nome}</p>

            <div className="folha-campos">
              <span><strong>Jogo nº</strong> {jogo.numero_jogo}</span>
              <span><strong>Chave</strong> {jogo.grupo_nome || jogo.fase}</span>
              <span><strong>Rodada</strong> {jogo.rodada ?? ''}</span>
              <span><strong>Categoria</strong> {jogo.categoria_nome} {jogo.genero}</span>
              <span><strong>Ginásio</strong> {jogo.local_nome || ''}</span>
              <span><strong>Cidade</strong> {evento.cidade} — {evento.estado}</span>
              <span><strong>Data</strong> {formatarData(jogo.data_hora)}</span>
              <span><strong>Horário</strong> {formatarHora(jogo.data_hora)}</span>
              <span><strong>Árbitro 1</strong> {jogo.arbitro_1 || ''}</span>
              <span><strong>Árbitro 2</strong> {jogo.arbitro_2 || ''}</span>
              <span><strong>Anotador</strong> {jogo.anotador || ''}</span>
            </div>

            <div className="folha-placar">
              <div>
                <span className="folha-placar-equipe">{equipes[0].escola_nome}</span>
                <span className="folha-placar-caixa">{emBranco ? '' : equipes[0].gols}</span>
              </div>
              <span className="folha-placar-x">×</span>
              <div>
                <span className="folha-placar-caixa">{emBranco ? '' : equipes[1].gols}</span>
                <span className="folha-placar-equipe">{equipes[1].escola_nome}</span>
              </div>
            </div>

            {!emBranco && jogo.penaltis_1 !== null && jogo.penaltis_2 !== null && (
              <p className="folha-penaltis">
                Pênaltis: {jogo.penaltis_1} × {jogo.penaltis_2}
              </p>
            )}

            {!emBranco && jogo.status === 'WO' && (
              <p className="folha-penaltis">W.O. — {jogo.observacoes}</p>
            )}
          </header>

          {equipes.map(renderEquipe)}

          <footer className="folha-assinaturas">
            <div><span />Árbitro</div>
            <div><span />Técnico {equipes[0].escola_nome}</div>
            <div><span />Técnico {equipes[1].escola_nome}</div>
          </footer>
        </div>
      </div>
    </div>
  );
}

export default DetalhesSumula;
