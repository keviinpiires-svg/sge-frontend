import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import Contador from '../components/Contador';
import { buscarSumulaPorJogo, registrarSumula } from '../services/sumulas';
import { suspensosNoJogo } from '../services/suspensoes';

const TEXTO_DO_PLACAR = {
  Gols: 'a soma dos gols lançados',
  Pontos: 'a soma dos pontos lançados'
};

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
  const [sets, setSets] = useState(null);       // vôlei: os três sets do papel
  const [prorrogacao, setProrrogacao] = useState(false);
  // Final do baleado empatada: a equipe que baleou primeiro no acréscimo
  const [baleouPrimeiro, setBaleouPrimeiro] = useState(null);
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
        setSets(dados.sets);
        setPenaltis({
          penaltis_1: dados.jogo.penaltis_1 ?? 0,
          penaltis_2: dados.jogo.penaltis_2 ?? 0
        });
        setBaleouPrimeiro(dados.jogo.baleou_primeiro_equipe_id ?? null);
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

  const mudarSet = (numero_set, campo, valor) => {
    setSets((atual) => atual.map((set) => (
      set.numero_set === numero_set ? { ...set, [campo]: valor } : set
    )));
  };

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
        baleou_primeiro_equipe_id: baleouPrimeiro,
        sets,
        equipes: equipes.map((equipe) => ({
          equipe_id: equipe.equipe_id,
          tecnico_nome: equipe.tecnico_nome,
          faltas_1t: equipe.faltas_1t,
          faltas_2t: equipe.faltas_2t,
          tempo_tecnico_1t: equipe.tempo_tecnico_1t,
          tempo_tecnico_2t: equipe.tempo_tecnico_2t,
          baleados: equipe.baleados || 0,
          // Folha sem coluna por atleta (baleado, vôlei): nada vai na coluna,
          // nem o que uma súmula antiga tenha gravado nela
          atletas: sumula.folha.rotuloEstatistica
            ? equipe.atletas
            : equipe.atletas.map((atleta) => ({ ...atleta, gols: 0 }))
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

  // No vôlei o placar são os sets vencidos, não a soma de uma coluna.
  const setsVencidos = (lado) => (sets || []).reduce((total, set) => {
    const meus = Number(lado === 0 ? set.pontos_1 : set.pontos_2);
    const deles = Number(lado === 0 ? set.pontos_2 : set.pontos_1);
    return total + (meus > deles ? 1 : 0);
  }, 0);

  // No baleado cada equipe marca as SUAS atletas baleadas: o placar de uma é
  // o contador da outra.
  const baleadasDe = (equipe) => Number(equipe.baleados || 0);
  let placar1 = golsDe(equipes[0]);
  let placar2 = golsDe(equipes[1]);
  if (folha.sets) {
    placar1 = setsVencidos(0);
    placar2 = setsVencidos(1);
  } else if (folha.baleadosPorEquipe) {
    placar1 = baleadasDe(equipes[1]);
    placar2 = baleadasDe(equipes[0]);
  }

  // Nº, atleta, capitão e presente são fixos; a coluna de estatística, as
  // faltas e os cartões dependem da folha da modalidade.
  const colunasDaTabela = 4 + (folha.rotuloEstatistica ? 1 : 0)
    + (folha.faltasIndividuais > 0 ? 1 : 0) + (folha.cartoes ? 2 : 0);
  // A regra de desempate vem do backend (src/config/regrasProvisorias.js):
  // a tela não guarda cópia de qual modalidade joga prorrogação. Sem regra,
  // não há cobrança genérica: o empate fica pendente com a organização.
  const desempate = sumula.desempate || {
    sequencia: [], nomeCobranca: null, pendente: true, motivo: 'a regra de desempate não chegou do servidor'
  };
  const exigeProrrogacao = desempate.sequencia.includes('PRORROGACAO');
  const empatado = jogo.fase !== 'GRUPOS' && placar1 === placar2;
  // Final do baleado (07/10/2026): acréscimo de 4 minutos, vence quem balear
  // primeiro. Fora da final, o empate do baleado no mata-mata segue pendente.
  const acrescimoDaFinal = empatado && Boolean(desempate.pendente && desempate.final) && jogo.fase === 'FINAL';
  const empatePendente = empatado && Boolean(desempate.pendente) && !acrescimoDaFinal;
  // Só há cobrança onde a modalidade tem uma (o vôlei, por exemplo, não empata)
  const precisaPenaltis = empatado && !desempate.pendente && Boolean(desempate.nomeCobranca)
    && (!exigeProrrogacao || prorrogacao);

  return (
    <div className="page">
      <div className="container-lg">
        <header className="page-header">
          <p className="eyebrow">
            {jogo.modalidade_nome} · {jogo.categoria_nome} · Jogo nº {jogo.numero_jogo}
          </p>
          <h1 className="page-title">Preencher Súmula</h1>
          <p className="page-subtitle">
            {folha.sets && `O placar do jogo são os sets: vence quem ganhar ${folha.setsParaVencer} sets `
              + `de ${folha.pontosPorSet} pontos, com 2 de vantagem.`}
            {folha.baleadosPorEquipe && 'Em cada equipe, marque as atletas DELA que foram baleadas: '
              + 'o placar de uma equipe é o número de baleadas da adversária.'}
            {!folha.sets && !folha.baleadosPorEquipe
              && `O placar é ${TEXTO_DO_PLACAR[folha.rotuloEstatistica]}: não existe campo de placar para digitar.`}
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

        {folha.sets && sets && (
          <section className="card mb-lg">
            <div className="card-body">
              <h2 className="card-title">Controle dos sets</h2>
              <p className="form-hint">
                Lance os pontos de cada set. Um set termina em {folha.pontosPorSet} pontos, com 2 de
                vantagem, e o jogo acaba quando uma equipe vence {folha.setsParaVencer} sets — aí o
                3º set não se joga.
              </p>

              <div className="table-wrap">
                <table className="table-sge compact">
                  <thead>
                    <tr>
                      <th>Set</th>
                      <th>{equipes[0].escola_nome}</th>
                      <th>{equipes[1].escola_nome}</th>
                      <th>Vencedor do set</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sets.map((set) => {
                      const um = Number(set.pontos_1);
                      const dois = Number(set.pontos_2);
                      const fechado = Math.max(um, dois) >= folha.pontosPorSet
                        && Math.abs(um - dois) >= 2;

                      return (
                        <tr key={set.numero_set}>
                          <td className="strong">{set.numero_set}º</td>
                          <td>
                            <Contador
                              valor={um}
                              rotulo={`pontos de ${equipes[0].escola_nome} no ${set.numero_set}º set`}
                              aoMudar={(v) => mudarSet(set.numero_set, 'pontos_1', v)}
                            />
                          </td>
                          <td>
                            <Contador
                              valor={dois}
                              rotulo={`pontos de ${equipes[1].escola_nome} no ${set.numero_set}º set`}
                              aoMudar={(v) => mudarSet(set.numero_set, 'pontos_2', v)}
                            />
                          </td>
                          <td>
                            {um === 0 && dois === 0 ? '—'
                              : fechado ? (um > dois ? equipes[0].escola_nome : equipes[1].escola_nome)
                                : 'set em andamento'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

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
                      {folha.rotuloEstatistica && <th>{folha.rotuloEstatistica}</th>}
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
                        {folha.rotuloEstatistica && (
                          <td>
                            <Contador
                              valor={Number(atleta.gols)}
                              rotulo={`${folha.rotuloEstatistica.toLowerCase()} de ${atleta.nome}`}
                              aoMudar={(v) => mudarAtleta(indice, atleta.atleta_id, 'gols', v)}
                            />
                          </td>
                        )}

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

                {folha.baleadosPorEquipe > 0 && (
                  <div className="form-group">
                    <span className="form-label">
                      Baleadas desta equipe <small>(0 a {folha.baleadosPorEquipe})</small>
                    </span>
                    <Contador
                      valor={Number(equipe.baleados || 0)}
                      max={folha.baleadosPorEquipe}
                      rotulo={`atletas de ${equipe.escola_nome} baleadas`}
                      aoMudar={(v) => mudarEquipe(indice, 'baleados', v)}
                    />
                  </div>
                )}

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

                {folha.tempoTecnico && (
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
                )}
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

        {acrescimoDaFinal && (
          <div className="card mb-lg">
            <div className="card-body">
              <h2 className="card-title">Acréscimo de {desempate.final.minutosDeAcrescimo} minutos</h2>
              <p className="form-hint">{desempate.final.descricao} Marque a equipe que baleou primeiro.</p>
              <div className="linha-checks">
                {equipes.map((equipe) => (
                  <label key={equipe.equipe_id}>
                    <input
                      type="radio"
                      name="baleou-primeiro"
                      checked={baleouPrimeiro === equipe.equipe_id}
                      onChange={() => setBaleouPrimeiro(equipe.equipe_id)}
                    />{' '}
                    {equipe.escola_nome}
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}

        {empatePendente && (
          <div className="alert alert-aviso mb-lg">
            <p className="alert-titulo">⚠️ Empate no mata-mata: regra pendente</p>
            <p className="alert-texto">
              Em {jogo.modalidade_nome}, {desempate.motivo}. A regra está pendente com a
              organização: salve a súmula sem finalizar e aguarde a decisão. O sistema não
              finaliza este jogo empatado.
            </p>
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
                    rotulo={`${desempate.nomeCobranca} da primeira equipe`}
                    aoMudar={(v) => setPenaltis((p) => ({ ...p, penaltis_1: v }))}
                  />
                </div>
                <div className="form-group">
                  <span className="form-label">{equipes[1].escola_nome}</span>
                  <Contador
                    valor={penaltis.penaltis_2}
                    rotulo={`${desempate.nomeCobranca} da segunda equipe`}
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
