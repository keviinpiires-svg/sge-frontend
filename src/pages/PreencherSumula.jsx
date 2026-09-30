import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import Contador from '../components/Contador';
import { buscarSumulaPorJogo, registrarSumula } from '../services/sumulas';
import { suspensosNoJogo } from '../services/suspensoes';

// A súmula é regravada inteira a cada envio, então o estado local é a folha
// toda: as duas equipes, cada uma com o seu rodapé e as suas linhas.
// Quais colunas existem (cartões, faltas, quanto cabe em cada uma) vem do
// backend, de src/config/folhasSumula.js: o basquete não tem cartão e o
// futsal não tem falta por atleta.
function PreencherSumula() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [carga, setCarga] = useState(null);      // { id, dados, erro }
  const [equipes, setEquipes] = useState(null);  // cópia editável da folha
  const [penaltis, setPenaltis] = useState({ penaltis_1: 0, penaltis_2: 0 });
  const [prorrogacao, setProrrogacao] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [aviso, setAviso] = useState(null);
  const [suspensao, setSuspensao] = useState(null);

  const pronto = carga?.id === id;
  const erro = pronto ? carga.erro : '';
  const sumula = pronto ? carga.dados : null;

  useEffect(() => {
    let ativo = true;

    buscarSumulaPorJogo(id)
      .then((dados) => {
        if (!ativo) return;
        setCarga({ id, dados, erro: '' });
        setEquipes(dados.equipes);
        setPenaltis({
          penaltis_1: dados.jogo.penaltis_1 ?? 0,
          penaltis_2: dados.jogo.penaltis_2 ?? 0
        });
      })
      .catch((falha) => {
        if (ativo) setCarga({ id, dados: null, erro: falha.mensagem });
      });

    return () => {
      ativo = false;
    };
  }, [id]);

  useEffect(() => {
    let ativo = true;

    suspensosNoJogo(id)
      .then((dados) => {
        if (ativo) setSuspensao({ id, dados });
      })
      .catch(() => {
        // A súmula não depende disto para ser preenchida: sem a lista, a
        // tela segue sem os avisos em vez de travar.
        if (ativo) setSuspensao({ id, dados: null });
      });

    return () => {
      ativo = false;
    };
  }, [id]);

  const mudarAtleta = (indiceEquipe, atletaId, campo, valor) => {
    setEquipes((atual) => atual.map((equipe, i) => (
      i !== indiceEquipe ? equipe : {
        ...equipe,
        atletas: equipe.atletas.map((atleta) => (
          atleta.atleta_id === atletaId ? { ...atleta, [campo]: valor } : atleta
        ))
      }
    )));
  };

  // O backend recusa duas capitanias na mesma equipe, então marcar um
  // desmarca o anterior em vez de deixar o erro acontecer no envio.
  const marcarCapitao = (indiceEquipe, atletaId) => {
    setEquipes((atual) => atual.map((equipe, i) => (
      i !== indiceEquipe ? equipe : {
        ...equipe,
        atletas: equipe.atletas.map((atleta) => ({
          ...atleta,
          capitao: atleta.atleta_id === atletaId ? !atleta.capitao : false
        }))
      }
    )));
  };

  const mudarEquipe = (indiceEquipe, campo, valor) => {
    setEquipes((atual) => atual.map((equipe, i) => (
      i === indiceEquipe ? { ...equipe, [campo]: valor } : equipe
    )));
  };

  const golsDe = (equipe) => equipe.atletas.reduce((total, a) => total + Number(a.gols || 0), 0);

  const enviar = async (finalizar) => {
    setAviso(null);
    setSalvando(true);

    try {
      const resposta = await registrarSumula({
        jogo_id: Number(id),
        finalizar,
        penaltis_1: penaltis.penaltis_1,
        penaltis_2: penaltis.penaltis_2,
        prorrogacao,
        equipes: equipes.map((equipe) => ({
          equipe_id: equipe.equipe_id,
          tecnico_nome: equipe.tecnico_nome,
          faltas_1t: equipe.faltas_1t,
          faltas_2t: equipe.faltas_2t,
          tempo_tecnico_1t: equipe.tempo_tecnico_1t,
          tempo_tecnico_2t: equipe.tempo_tecnico_2t,
          atletas: equipe.atletas
        }))
      });

      setAviso({
        tipo: 'success',
        texto: `${resposta.mensagem} Placar ${resposta.placar_1} x ${resposta.placar_2}.`
      });

      if (finalizar) navigate(`/detalhes-sumula/${id}`);
    } catch (falha) {
      setAviso({ tipo: 'error', texto: falha.mensagem });
    } finally {
      setSalvando(false);
    }
  };

  if (!pronto || (!erro && !equipes)) {
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
          <p className="state-title">Não foi possível carregar</p>
          <p className="state-text">{erro}</p>
        </div></div>
      </div></div>
    );
  }

  const { jogo, folha } = sumula;
  const listaSuspensos = suspensao?.id === id && suspensao.dados ? suspensao.dados.suspensos : [];
  const avisosSuspensao = suspensao?.id === id && suspensao.dados ? suspensao.dados.avisos : [];
  const suspensoPorAtleta = new Map(listaSuspensos.map((s) => [s.atleta_id, s]));

  const placar1 = golsDe(equipes[0]);
  const placar2 = golsDe(equipes[1]);
  // Nº, atleta, estatística, capitão e presente são fixos; faltas e cartões
  // dependem da folha da modalidade.
  const colunasDaTabela = 5 + (folha.faltasIndividuais > 0 ? 1 : 0) + (folha.cartoes ? 2 : 0);
  // A regra de desempate vem do backend (src/config/regrasProvisorias.js):
  // a tela não guarda cópia de qual modalidade joga prorrogação.
  const desempate = sumula.desempate || { sequencia: ['PENALTIS'], nomeCobranca: 'pênaltis' };
  const exigeProrrogacao = desempate.sequencia.includes('PRORROGACAO');
  const empatado = jogo.fase !== 'GRUPOS' && placar1 === placar2;
  const precisaPenaltis = empatado && (!exigeProrrogacao || prorrogacao);

  return (
    <div className="page">
      <div className="container-lg">
        <header className="page-header">
          <p className="eyebrow">
            {jogo.modalidade_nome} · {jogo.categoria_nome} · Jogo nº {jogo.numero_jogo}
          </p>
          <h1 className="page-title">Preencher Súmula</h1>
          <p className="page-subtitle">
            O placar é a soma {folha.rotuloEstatistica === 'Pontos' ? 'dos pontos lançados'
              : `${folha.rotuloEstatistica === 'Eliminações' ? 'das eliminações lançadas' : 'dos gols lançados'}`}:
            não existe campo de placar para digitar.
          </p>
        </header>

        {aviso && <p className={`alert alert-${aviso.tipo}`}>{aviso.texto}</p>}

        {avisosSuspensao.map((item) => (
          <div key={item.titulo} className="alert alert-aviso mb-lg">
            <p className="alert-titulo">⚠️ {item.titulo}</p>
            <p className="alert-texto">{item.texto}</p>
          </div>
        ))}

        {listaSuspensos.length > 0 && (
          <div className="alert alert-error mb-lg">
            <p className="alert-titulo">🚫 Atleta suspenso nesta partida</p>
            <p className="alert-texto">
              {listaSuspensos
                .map((s) => `${s.nome} (${s.escola_nome}) — ${s.motivo}`)
                .join(' · ')}
              . O regulamento não permite escalar quem está cumprindo suspensão.
            </p>
          </div>
        )}

        <div className="card mb-lg">
          <div className="card-body placar-ao-vivo">
            <div>
              <p className="placar-equipe">{equipes[0].escola_nome}</p>
              <p className="placar-numero">{placar1}</p>
            </div>
            <span className="placar-x">x</span>
            <div>
              <p className="placar-equipe">{equipes[1].escola_nome}</p>
              <p className="placar-numero">{placar2}</p>
            </div>
          </div>
        </div>

        {equipes.map((equipe, indice) => (
          <section key={equipe.equipe_id} className="card mb-lg">
            <div className="card-body">
              <h2 className="card-title">{equipe.escola_nome}</h2>

              <div className="table-wrap">
                <table className="table-sge compact">
                  <thead>
                    <tr>
                      <th>Nº</th>
                      <th className="text-left">Atleta</th>
                      <th>{folha.rotuloEstatistica}</th>
                      {folha.faltasIndividuais > 0 && <th>Faltas</th>}
                      {folha.cartoes && <th>Amarelos</th>}
                      {folha.cartoes && <th>🟥</th>}
                      <th>Cap.</th>
                      <th>Presente</th>
                    </tr>
                  </thead>
                  <tbody>
                    {equipe.atletas.map((atleta) => (
                      <tr
                        key={atleta.atleta_id}
                        className={suspensoPorAtleta.has(atleta.atleta_id) ? 'row-suspenso' : ''}
                      >
                        <td className="strong">{atleta.numero_camisa ?? '—'}</td>
                        <td className="text-left">
                          {atleta.nome}
                          {suspensoPorAtleta.has(atleta.atleta_id) && (
                            <span
                              className="tag-suspenso"
                              title={suspensoPorAtleta.get(atleta.atleta_id).motivo}
                            >
                              suspenso
                            </span>
                          )}
                        </td>
                        <td>
                          <Contador
                            valor={Number(atleta.gols)}
                            rotulo={`${folha.rotuloEstatistica.toLowerCase()} de ${atleta.nome}`}
                            aoMudar={(v) => mudarAtleta(indice, atleta.atleta_id, 'gols', v)}
                          />
                        </td>

                        {folha.faltasIndividuais > 0 && (
                          <td>
                            <Contador
                              valor={Number(atleta.faltas || 0)}
                              max={folha.faltasIndividuais}
                              rotulo={`faltas de ${atleta.nome}`}
                              aoMudar={(v) => mudarAtleta(indice, atleta.atleta_id, 'faltas', v)}
                            />
                          </td>
                        )}

                        {folha.cartoes && (
                          <td>
                            <Contador
                              valor={Number(atleta.amarelos)}
                              max={folha.maxAmarelos}
                              rotulo={`amarelos de ${atleta.nome}`}
                              aoMudar={(v) => mudarAtleta(indice, atleta.atleta_id, 'amarelos', v)}
                            />
                          </td>
                        )}

                        {folha.cartoes && (
                          <td>
                            <input
                              type="checkbox"
                              checked={atleta.vermelho}
                              onChange={(e) => mudarAtleta(indice, atleta.atleta_id, 'vermelho', e.target.checked)}
                              aria-label={`Cartão vermelho para ${atleta.nome}`}
                            />
                          </td>
                        )}
                        <td>
                          <input
                            type="checkbox"
                            checked={atleta.capitao}
                            onChange={() => marcarCapitao(indice, atleta.atleta_id)}
                            aria-label={`Capitão: ${atleta.nome}`}
                          />
                        </td>
                        <td>
                          <input
                            type="checkbox"
                            checked={atleta.presente}
                            onChange={(e) => mudarAtleta(indice, atleta.atleta_id, 'presente', e.target.checked)}
                            aria-label={`Presente: ${atleta.nome}`}
                          />
                        </td>
                      </tr>
                    ))}

                    {equipe.atletas.length === 0 && (
                      <tr>
                        <td colSpan={colunasDaTabela} className="text-left">
                          Nenhum atleta inscrito nesta equipe.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {folha.faltasIndividuais > 0 && (
                <p className="form-hint">
                  Falta individual vai de 0 a {folha.faltasIndividuais}: com {folha.faltasIndividuais} o
                  atleta está excluído. As faltas acumulativas da equipe vão até {folha.faltasAcumuladas} por tempo.
                </p>
              )}

              <div className="rodape-equipe">
                <div className="form-group">
                  <label className="form-label" htmlFor={`tecnico-${indice}`}>Técnico</label>
                  <input
                    id={`tecnico-${indice}`}
                    className="form-control"
                    type="text"
                    value={equipe.tecnico_nome || ''}
                    onChange={(e) => mudarEquipe(indice, 'tecnico_nome', e.target.value)}
                  />
                </div>

                {folha.faltasAcumuladas > 0 && (
                  <div className="form-group">
                    <span className="form-label">
                      Faltas 1º tempo <small>(até {folha.faltasAcumuladas})</small>
                    </span>
                    <Contador
                      valor={Number(equipe.faltas_1t)}
                      max={folha.faltasAcumuladas}
                      rotulo="faltas do primeiro tempo"
                      aoMudar={(v) => mudarEquipe(indice, 'faltas_1t', v)}
                    />
                  </div>
                )}

                {folha.faltasAcumuladas > 0 && (
                  <div className="form-group">
                    <span className="form-label">
                      Faltas 2º tempo <small>(até {folha.faltasAcumuladas})</small>
                    </span>
                    <Contador
                      valor={Number(equipe.faltas_2t)}
                      max={folha.faltasAcumuladas}
                      rotulo="faltas do segundo tempo"
                      aoMudar={(v) => mudarEquipe(indice, 'faltas_2t', v)}
                    />
                  </div>
                )}

                <div className="form-group">
                  <span className="form-label">Tempo técnico</span>
                  <div className="linha-checks">
                    <label>
                      <input
                        type="checkbox"
                        checked={equipe.tempo_tecnico_1t}
                        onChange={(e) => mudarEquipe(indice, 'tempo_tecnico_1t', e.target.checked)}
                      /> 1º T
                    </label>
                    <label>
                      <input
                        type="checkbox"
                        checked={equipe.tempo_tecnico_2t}
                        onChange={(e) => mudarEquipe(indice, 'tempo_tecnico_2t', e.target.checked)}
                      /> 2º T
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </section>
        ))}

        {empatado && exigeProrrogacao && (
          <div className="card mb-lg">
            <div className="card-body">
              <h2 className="card-title">Prorrogação</h2>
              <p className="form-hint">
                Empate no mata-mata: em {jogo.modalidade_nome} joga-se prorrogação antes das
                cobranças. Lance os gols da prorrogação nas linhas dos atletas acima; se o
                empate persistir depois dela, marque abaixo para informar as cobranças.
              </p>
              <label className="linha-checks">
                <input
                  type="checkbox"
                  checked={prorrogacao}
                  onChange={(e) => setProrrogacao(e.target.checked)}
                />{' '}
                Houve prorrogação e o empate continuou
              </label>
            </div>
          </div>
        )}

        {precisaPenaltis && (
          <div className="card mb-lg">
            <div className="card-body">
              <h2 className="card-title" style={{ textTransform: 'capitalize' }}>
                {desempate.nomeCobranca}
              </h2>
              <p className="form-hint">
                Empate no mata-mata não decide nada: informe {desempate.nomeCobranca} para finalizar.
              </p>
              <div className="rodape-equipe">
                <div className="form-group">
                  <span className="form-label">{equipes[0].escola_nome}</span>
                  <Contador
                    valor={penaltis.penaltis_1}
                    rotulo="pênaltis da primeira equipe"
                    aoMudar={(v) => setPenaltis((p) => ({ ...p, penaltis_1: v }))}
                  />
                </div>
                <div className="form-group">
                  <span className="form-label">{equipes[1].escola_nome}</span>
                  <Contador
                    valor={penaltis.penaltis_2}
                    rotulo="pênaltis da segunda equipe"
                    aoMudar={(v) => setPenaltis((p) => ({ ...p, penaltis_2: v }))}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="page-toolbar">
          <div className="acoes">
            <button type="button" className="btn btn-outline" onClick={() => enviar(false)} disabled={salvando}>
              {salvando ? 'Salvando...' : 'Salvar parcial'}
            </button>
            <button type="button" className="btn btn-primary" onClick={() => enviar(true)} disabled={salvando}>
              Finalizar súmula
            </button>
          </div>

          <Link className="btn btn-outline btn-sm" to={`/detalhes-sumula/${id}`}>
            🖨️ Ver / imprimir
          </Link>
        </div>
      </div>
    </div>
  );
}

export default PreencherSumula;
