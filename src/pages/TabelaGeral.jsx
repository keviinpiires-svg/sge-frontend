import { useState, useEffect } from 'react';
import { useAuth } from '../context/useAuth';
import { obterTabelaGeral } from '../services/tabelaGeral';
import { aplicarAjuste, removerAjuste } from '../services/ajustes';
import { listarEscolas } from '../services/escolas';

const ROTULO_GENERO = { MASCULINO: 'M', FEMININO: 'F', MISTO: 'misto' };

const MEDALHA = { 1: '🥇', 2: '🥈', 3: '🥉', 4: '4º', 5: '5º' };

const PUNICAO_VAZIA = { escola_id: '', pontos: '-5', motivo: '' };

const formatarData = (valor) =>
  valor ? new Date(valor).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '';

function TabelaGeral() {
  const { isAdmin } = useAuth();

  const [resultado, setResultado] = useState(null);
  const [recarga, setRecarga] = useState(0);
  const [escolas, setEscolas] = useState([]);
  const [aberta, setAberta] = useState(null);     // escola com a abertura aberta
  const [form, setForm] = useState(PUNICAO_VAZIA);
  const [salvando, setSalvando] = useState(false);
  const [aviso, setAviso] = useState(null);

  const pronto = resultado?.recarga === recarga;
  const dados = pronto ? resultado.dados : null;
  const erro = pronto ? resultado.erro : '';

  useEffect(() => {
    let ativo = true;

    obterTabelaGeral()
      .then((dados) => {
        if (ativo) setResultado({ recarga, dados, erro: '' });
      })
      .catch((falha) => {
        if (ativo) setResultado({ recarga, dados: null, erro: falha.mensagem });
      });

    return () => {
      ativo = false;
    };
  }, [recarga]);

  // A lista de escolas só serve ao formulário de punição
  useEffect(() => {
    if (!isAdmin) return undefined;

    let ativo = true;
    listarEscolas()
      .then((lista) => {
        if (ativo) setEscolas(lista);
      })
      .catch(() => {
        if (ativo) setEscolas([]);
      });

    return () => {
      ativo = false;
    };
  }, [isAdmin]);

  const punir = async (evento) => {
    evento.preventDefault();
    setSalvando(true);
    setAviso(null);

    try {
      const resposta = await aplicarAjuste({
        escola_id: Number(form.escola_id),
        pontos: Number(form.pontos),
        motivo: form.motivo.trim()
      });
      setAviso({ tipo: 'success', texto: resposta.mensagem });
      setForm(PUNICAO_VAZIA);
      setRecarga((r) => r + 1);
    } catch (falha) {
      setAviso({ tipo: 'error', texto: falha.mensagem });
    } finally {
      setSalvando(false);
    }
  };

  const desfazer = async (ajuste) => {
    const confirmou = window.confirm(
      `Desfazer a punição de ${Math.abs(ajuste.pontos)} pontos de ${ajuste.escola_nome}?\n\n`
      + `Motivo registrado: ${ajuste.motivo}`
    );
    if (!confirmou) return;

    setSalvando(true);
    setAviso(null);

    try {
      const resposta = await removerAjuste(ajuste.id);
      setAviso({ tipo: 'success', texto: resposta.mensagem });
      setRecarga((r) => r + 1);
    } catch (falha) {
      setAviso({ tipo: 'error', texto: falha.mensagem });
    } finally {
      setSalvando(false);
    }
  };

  if (!pronto) {
    return (
      <div className="page"><div className="container-lg">
        <div className="card"><div className="state">
          <div className="spinner" />
          <p className="state-text">Carregando a tabela geral...</p>
        </div></div>
      </div></div>
    );
  }

  if (erro) {
    return (
      <div className="page"><div className="container-lg">
        <div className="card"><div className="state state-error">
          <div className="state-icon">⚠️</div>
          <p className="state-title">Não foi possível montar a tabela geral</p>
          <p className="state-text">{erro}</p>
        </div></div>
      </div></div>
    );
  }

  const { geral, ajustes, competicoes, regras } = dados;
  // A posição vem pronta do backend: mesma soma desempata por 1ºs, 2ºs e 3ºs, e
  // empatadas em tudo dividem a posição (empatadas em 1º são todas campeãs).
  const campeas = geral.filter((escola) => escola.posicao === 1);
  const semRegra = regras.posicoes_sem_regra || [];
  // 4º e 5º entram pela regra provisória (aguardando o chefe)
  const provisorias = regras.posicoes_provisorias?.posicoes || [];
  const quantasPontuam = regras.posicoes_que_pontuam.length;

  // De onde vieram os pontos de uma escola, agrupado para a tela
  const renderAbertura = (escola) => (
    <tr className="linha-abertura">
      <td colSpan={7}>
        <div className="abertura">
          {escola.origens.length === 0 ? (
            <p className="state-text">Sem pontos de competição: só o desconto de punição.</p>
          ) : (
            <ul className="abertura-lista">
              {escola.origens.map((origem, i) => (
                <li key={`${origem.competicao_id}-${i}`}>
                  <span className="abertura-medalha">{MEDALHA[origem.posicao]}</span>
                  <span className="abertura-competicao">
                    {origem.modalidade_nome} {origem.categoria_nome} {ROTULO_GENERO[origem.genero] || origem.genero}
                  </span>
                  <span className="abertura-pontos">
                    +{origem.pontos}{origem.provisoria && ' (provisório)'}
                  </span>
                </li>
              ))}
            </ul>
          )}

          {escola.ajustes ? (
            <ul className="abertura-lista">
              {ajustes.filter((a) => a.escola_id === escola.escola_id).map((a) => (
                <li key={a.id}>
                  <span className="abertura-medalha">⚖️</span>
                  <span className="abertura-competicao">{a.motivo}</span>
                  <span className="abertura-pontos negativo">{a.pontos}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </td>
    </tr>
  );

  const renderTabela = (escolasDaTabela) => (
    <div className="table-wrap">
      <table className="table-sge compact">
        <thead>
          <tr>
            <th>Pos</th>
            <th className="text-left">Escola</th>
            <th title="Pontos">P</th>
            <th title="Primeiros lugares">🥇</th>
            <th title="Segundos lugares">🥈</th>
            <th title="Terceiros lugares">🥉</th>
            <th title="Punições da Comissão">⚖️</th>
          </tr>
        </thead>
        <tbody>
          {escolasDaTabela.map((escola) => {
            const abertaAqui = aberta === escola.escola_id;

            return [
              <tr
                key={escola.escola_id}
                className="linha-clicavel"
                onClick={() => setAberta(abertaAqui ? null : escola.escola_id)}
              >
                <td>
                  <span className={`rank ${escola.posicao <= 3 ? `rank-${escola.posicao}` : ''}`}>
                    {escola.posicao}
                  </span>
                </td>
                <td className="text-left strong">
                  {escola.escola_nome}
                  <span className="abrir-abertura">{abertaAqui ? '▾' : '▸'}</span>
                </td>
                <td className="text-accent num-lg">{escola.pontos}</td>
                <td className="text-soft">{escola.primeiros}</td>
                <td className="text-soft">{escola.segundos}</td>
                <td className="text-soft">{escola.terceiros}</td>
                <td className={escola.ajustes ? 'text-danger' : 'text-soft'}>
                  {escola.ajustes || '—'}
                </td>
              </tr>,
              abertaAqui ? { ...renderAbertura(escola), key: `abertura-${escola.escola_id}` } : null
            ].filter(Boolean);
          })}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="page">
      <div className="container-lg">
        <header className="page-header">
          <p className="eyebrow">Campeão geral</p>
          <h1 className="page-title">Tabela Geral</h1>
          <p className="page-subtitle">
            Cada competição encerrada dá {regras.pontuacao
              .filter((p) => regras.posicoes_que_pontuam.includes(p.posicao))
              .map((p) => p.pontos).join(', ')} pontos às {quantasPontuam === 3 ? 'três' : quantasPontuam} primeiras colocadas.
            {regras.desempate?.descricao || 'Escolas com a mesma soma dividem a posição.'}
            Clique numa escola para ver de onde vieram os pontos.
          </p>
        </header>

        {/* 4º e 5º já pontuam, mas por uma regra que o chefe ainda vai confirmar */}
        {provisorias.length > 0 && (
          <div className="alert alert-aviso mb-lg">
            <p className="alert-titulo">
              ⚠️ {provisorias.map((p) => `${p}º`).join(' e ')} lugar provisórios — aguardando confirmação do chefe
            </p>
            <p className="alert-texto">
              {regras.posicoes_provisorias.descricao} Os pontos que vêm dessas posições aparecem
              marcados como provisórios na conta de cada escola.
            </p>
          </div>
        )}

        {/* Posição da pontuação que ainda não entra na conta, se houver */}
        {semRegra.length > 0 && (
          <div className="alert alert-aviso mb-lg">
            <p className="alert-titulo">⚠️ 4º e 5º lugar ainda sem regra</p>
            <p className="alert-texto">
              A pontuação prevê {semRegra.map((p) => `${p}º`).join(' e ')} lugar
              ({regras.pontuacao.filter((p) => semRegra.includes(p.posicao)).map((p) => `${p.pontos} pts`).join(' e ')}),
              mas o regulamento não diz como essas colocações saem. Enquanto não houver regra, a tabela
              distribui só {regras.pontuacao.filter((p) => regras.posicoes_que_pontuam.includes(p.posicao))
                .map((p) => p.pontos).join(', ')} por competição.
            </p>
          </div>
        )}

        {aviso && <p className={`alert alert-${aviso.tipo} mb-lg`}>{aviso.texto}</p>}

        {geral.length === 0 ? (
          <div className="card">
            <div className="state">
              <div className="state-icon">🏆</div>
              <p className="state-title">Nenhuma competição encerrada ainda</p>
              <p className="state-text">
                A tabela se preenche sozinha conforme as competições vão tendo campeão.
                {competicoes.sem_pontuar.length > 0
                  && ` São ${competicoes.sem_pontuar.length} competições à espera.`}
              </p>
            </div>
          </div>
        ) : (
          <section className="card mb-lg">
            <div className="card-body" style={{ paddingBottom: 0 }}>
              <h2 className="card-title" style={{ marginBottom: 0, borderBottom: 'none' }}>
                Soma geral
              </h2>
              {campeas.length > 1 && (
                <p className="state-text" style={{ textAlign: 'left', margin: '8px 0 0' }}>
                  🏆 {campeas.length} escolas empatadas em 1º lugar: todas são campeãs gerais.
                </p>
              )}
            </div>
            {renderTabela(geral)}
          </section>
        )}

        {/* Punições: a lista é pública, os botões não */}
        {(ajustes.length > 0 || isAdmin) && (
          <section className="card mb-lg">
            <div className="card-body">
              <h2 className="card-title">Punições da Comissão Disciplinar</h2>

              {ajustes.length === 0 ? (
                <p className="state-text">Nenhuma punição aplicada.</p>
              ) : (
                <div className="table-wrap">
                  <table className="table-sge compact">
                    <thead>
                      <tr>
                        <th className="text-left">Escola</th>
                        <th>Pontos</th>
                        <th className="text-left">Motivo</th>
                        <th className="text-left">Quando</th>
                        <th className="text-left">Quem aplicou</th>
                        {isAdmin && <th>Ação</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {ajustes.map((ajuste) => (
                        <tr key={ajuste.id}>
                          <td className="text-left strong">{ajuste.escola_nome}</td>
                          <td className="text-danger num-lg">{ajuste.pontos}</td>
                          <td className="text-left">{ajuste.motivo}</td>
                          <td className="text-left text-soft">{formatarData(ajuste.criado_em)}</td>
                          <td className="text-left text-soft">{ajuste.usuario_nome || '—'}</td>
                          {isAdmin && (
                            <td>
                              <button
                                type="button"
                                className="btn btn-danger btn-sm"
                                disabled={salvando}
                                onClick={() => desfazer(ajuste)}
                              >
                                Desfazer
                              </button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {isAdmin && (
                <form onSubmit={punir} className="form" style={{ marginTop: '24px' }}>
                  <h3 className="form-label" style={{ fontSize: '14px' }}>Aplicar punição</h3>

                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label" htmlFor="escola">Escola</label>
                      <select
                        id="escola"
                        className="form-control"
                        value={form.escola_id}
                        onChange={(e) => setForm({ ...form, escola_id: e.target.value })}
                        required
                      >
                        <option value="">Selecione a escola</option>
                        {escolas.map((escola) => (
                          <option key={escola.id} value={escola.id}>{escola.nome}</option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label" htmlFor="pontos">Pontos</label>
                      <select
                        id="pontos"
                        className="form-control"
                        value={form.pontos}
                        onChange={(e) => setForm({ ...form, pontos: e.target.value })}
                      >
                        {[-5, -6, -7, -8, -9, -10].map((valor) => (
                          <option key={valor} value={valor}>{valor}</option>
                        ))}
                      </select>
                      <span className="form-hint">O regulamento permite de 5 a 10 pontos.</span>
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="motivo">Motivo</label>
                    <input
                      id="motivo"
                      className="form-control"
                      type="text"
                      maxLength={255}
                      value={form.motivo}
                      onChange={(e) => setForm({ ...form, motivo: e.target.value })}
                      placeholder="Ex.: escalou atleta suspenso no jogo #12"
                      required
                    />
                    <span className="form-hint">
                      Obrigatório: é o que a escola vai ler para saber por que perdeu pontos.
                    </span>
                  </div>

                  <button type="submit" className="btn btn-danger" disabled={salvando}>
                    {salvando ? 'Aplicando...' : '⚖️ Aplicar punição'}
                  </button>
                </form>
              )}
            </div>
          </section>
        )}

        {competicoes.sem_pontuar.length > 0 && (
          <p className="legenda-desempate">
            <b>Fora da conta ({competicoes.sem_pontuar.length}):</b> competições que ainda não têm campeão
            definido, ou com menos de duas equipes inscritas, ou de modalidade individual.
          </p>
        )}
      </div>
    </div>
  );
}

export default TabelaGeral;
