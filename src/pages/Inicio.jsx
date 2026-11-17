import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import { obterEstatisticas } from '../services/dashboard';
import { resetarCampeonato, CONFIRMACAO_RESET } from '../services/campeonato';
import { buscarSaude } from '../services/auth';
import { listarEscolas } from '../services/escolas';
import { listarAgenda } from '../services/agenda';
import { nomeDaCompeticao, nomeDaFase, nomeDaVaga, vagaEmAberto, ROTULO_STATUS, CLASSE_STATUS } from '../components/agendaTextos';
import Artilheiros from '../components/Artilheiros';
import { dataPorExtenso, soAHora } from '../services/datas';

const ROTULO_GENERO = { MASCULINO: 'Masculino', FEMININO: 'Feminino', MISTO: 'Misto' };

// Botão "Reiniciar Campeonato" desativado a pedido do usuário (07/10/2026):
// a Zona de Perigo não aparece nem para o ADMIN. A rota DELETE
// /api/campeonato/reset continua no backend; para reativar, troque para true.
// Mesmo ativo aqui, ele só aparece onde o servidor permite (/saude
// reiniciar_permitido: em produção, só com PERMITIR_REINICIAR=true). Quem
// protege é o backend, que recusa com 403.
const REINICIAR_CAMPEONATO_ATIVO = false;

const formatarNumero = (valor) => Number(valor || 0).toLocaleString('pt-BR');

const formatarData = (dataStr) => dataPorExtenso(dataStr);

const formatarHora = (dataStr) => soAHora(dataStr);

function Inicio() {
  const navigate = useNavigate();
  const { isAdmin, isPlacar, localDaMesa } = useAuth();
  const [reiniciando, setReiniciando] = useState(false);
  const [dashboard, setDashboard] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');

  // Lista de escolas: só é buscada quando o card é aberto pela primeira vez
  const [escolas, setEscolas] = useState(null);
  const [escolasAbertas, setEscolasAbertas] = useState(false);
  const [carregandoEscolas, setCarregandoEscolas] = useState(false);
  const [erroEscolas, setErroEscolas] = useState('');

  // Incrementar este valor dispara uma nova busca (botão "Tentar novamente")
  const [tentativa, setTentativa] = useState(0);

  // Mesa (PLACAR): os próximos 3 jogos AINDA NÃO FINALIZADOS do local dela, da agenda pública.
  // Fica null enquanto carrega; { erro } se falhar.
  const idDoLocalDaMesa = isPlacar && localDaMesa ? localDaMesa.id : null;
  const [proximosDaMesa, setProximosDaMesa] = useState(null);
  useEffect(() => {
    if (!idDoLocalDaMesa) return undefined;
    let ativo = true;
    listarAgenda()
      .then((r) => {
        if (!ativo) return;
        const lista = (Array.isArray(r) ? r : [])
          .filter((j) => j.local?.id === idDoLocalDaMesa && (j.status === 'AGENDADO' || j.status === 'EM_ANDAMENTO') && j.data)
          .sort((a, b) => `${a.data} ${a.hora || ''}`.localeCompare(`${b.data} ${b.hora || ''}`) || a.numero_jogo - b.numero_jogo)
          .slice(0, 3);
        setProximosDaMesa({ lista });
      })
      .catch((error) => { if (ativo) setProximosDaMesa({ erro: error.mensagem }); });
    return () => { ativo = false; };
  }, [idDoLocalDaMesa, tentativa]);

  // O servidor permite reiniciar? Na dúvida (sem resposta), não mostra
  const [reiniciarPermitido, setReiniciarPermitido] = useState(false);
  useEffect(() => {
    if (!REINICIAR_CAMPEONATO_ATIVO || !isAdmin) return undefined;
    let ativo = true;
    buscarSaude()
      .then((saude) => { if (ativo) setReiniciarPermitido(saude.reiniciar_permitido === true); })
      .catch(() => {});
    return () => { ativo = false; };
  }, [isAdmin]);

  useEffect(() => {
    let ativo = true;

    obterEstatisticas()
      .then((data) => {
        if (!ativo) return;
        setDashboard(data);
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

  // Ação irreversível: pede confirmação e depois exige a palavra digitada
  const reiniciarCampeonato = async () => {
    const aviso =
      'ATENÇÃO: isso apaga TODOS os jogos e súmulas deste campeonato, junto com suspensões,\n' +
      'colocações e pontuação da tabela geral.\n\n' +
      'Escolas, competições, grupos, equipes, atletas e inscrições são preservados.\n\n' +
      'Esta ação NÃO pode ser desfeita. Deseja continuar?';

    if (!window.confirm(aviso)) return;

    // O texto digitado é o que vai para o backend: se não for a palavra exata,
    // o próprio servidor recusa, mesmo que algo passasse daqui.
    const digitado = window.prompt(`Para confirmar, digite ${CONFIRMACAO_RESET} (em maiúsculas):`);
    if (digitado !== CONFIRMACAO_RESET) {
      window.alert('Ação cancelada. Nada foi apagado.');
      return;
    }

    setReiniciando(true);
    try {
      const resposta = await resetarCampeonato(digitado);
      window.alert(resposta.mensagem);
      tentarNovamente();
    } catch (error) {
      console.error(error);
      window.alert(error.mensagem);
    } finally {
      setReiniciando(false);
    }
  };

  const alternarEscolas = async () => {
    if (escolasAbertas) {
      setEscolasAbertas(false);
      return;
    }

    setEscolasAbertas(true);

    // Já carregadas antes: não busca de novo
    if (escolas) return;

    setCarregandoEscolas(true);
    setErroEscolas('');
    try {
      setEscolas(await listarEscolas());
    } catch (error) {
      console.error(error);
      setErroEscolas(error.mensagem);
    } finally {
      setCarregandoEscolas(false);
    }
  };

  const renderConteudo = () => {
    if (carregando) {
      return (
        <div className="card">
          <div className="state">
            <div className="spinner" />
            <p className="state-text">Carregando painel do campeonato...</p>
          </div>
        </div>
      );
    }

    if (erro) {
      return (
        <div className="card">
          <div className="state state-error">
            <div className="state-icon">⚠️</div>
            <p className="state-title">Não foi possível carregar o painel</p>
            <p className="state-text">{erro}</p>
            <button className="btn btn-primary" onClick={tentarNovamente}>Tentar novamente</button>
          </div>
        </div>
      );
    }

    const cartaoEscolas = {
      icone: '🏫',
      titulo: 'Escolas Inscritas',
      valor: dashboard.total_escolas,
      detalhe: escolasAbertas ? 'Clique para fechar' : 'Clique para ver a lista',
      aoClicar: alternarEscolas
    };
    // A mesa vê só "Escolas Inscritas"; os outros números do painel são do administrador e do público.
    const estatisticas = isPlacar ? [cartaoEscolas] : [
      cartaoEscolas,
      { icone: '🏃', titulo: 'Atletas Cadastrados', valor: dashboard.total_atletas },
      {
        icone: '🏅',
        titulo: 'Competições',
        valor: dashboard.total_competicoes,
        detalhe: `${formatarNumero(dashboard.total_equipes)} equipes inscritas`
      },
      {
        icone: '🗓️',
        titulo: 'Jogos',
        valor: dashboard.jogos.total,
        detalhe: `${dashboard.jogos.FINALIZADO} encerrados · ${dashboard.jogos.AGENDADO} agendados`
      },
      {
        icone: '⚽',
        titulo: 'Balançaram a Rede',
        // Só modalidades de gol: somar gols de futsal com pontos de basquete
        // daria um número sem significado
        detalhe: 'Gols em futsal, society e handebol',
        valor: dashboard.total_gols
      }
    ];

    const proximo = dashboard.proximo_jogo;
    const campeoes = dashboard.campeoes || [];

    return (
      <div className="stat-grid">
        {estatisticas.map(({ icone, titulo, detalhe, valor, aoClicar }) => {
          const conteudo = (
            <>
              <div className="stat-head">
                <span className="stat-label">{titulo}</span>
                <span className="stat-icon" aria-hidden="true">{icone}</span>
              </div>
              <p className="stat-value">{formatarNumero(valor)}</p>
              {detalhe && <p className="stat-detail">{detalhe}</p>}
            </>
          );

          // Só o card com ação vira botão, para não anunciar os outros
          // como clicáveis a quem navega por teclado ou leitor de tela
          return aoClicar ? (
            <button
              key={titulo}
              type="button"
              className="card stat-card stat-card-clicavel"
              onClick={aoClicar}
              aria-expanded={escolasAbertas}
            >
              {conteudo}
            </button>
          ) : (
            <div key={titulo} className="card stat-card">{conteudo}</div>
          );
        })}

        {escolasAbertas && (
          <section className="card stat-card-wide">
            <div className="card-body">
              <h3 className="card-title">🏫 Escolas Cadastradas</h3>

              {carregandoEscolas && (
                <div className="state state-compact">
                  <div className="spinner" />
                  <p className="state-text">Carregando escolas...</p>
                </div>
              )}

              {!carregandoEscolas && erroEscolas && (
                <p className="alert alert-error" style={{ margin: 0 }}>{erroEscolas}</p>
              )}

              {!carregandoEscolas && !erroEscolas && escolas && (
                escolas.length === 0 ? (
                  <div className="state state-compact">
                    <p className="state-text">Nenhuma escola cadastrada ainda.</p>
                    {isAdmin && (
                      <button className="btn btn-outline btn-sm" onClick={() => navigate('/cadastro')}>
                        🏫 Cadastrar Escola
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="grid-cards">
                    {escolas.map((escola) => (
                      <div key={escola.id ?? escola.nome} className="tile">
                        <p className="tile-title">{escola.nome}</p>
                        <p className="tile-meta">{escola.cnpj ? `CNPJ ${escola.cnpj}` : 'Sem CNPJ'}</p>

                        {/* "Atletas (PDF)" (no lugar do "Editar"): o documento da escola com os
                            atletas por equipe. Só para o ADMIN (a mesa não vê nem acessa).
                            Sem id nao ha como montar a URL, entao o botao some. A rota /editar-escola/:id e a tela continuam. */}
                        {isAdmin && escola.id != null && (
                          <button
                            className="btn btn-outline btn-sm"
                            style={{ marginTop: '12px' }}
                            onClick={() => navigate(`/escola/${escola.id}/atletas`)}
                          >
                            📄 Atletas (PDF)
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )
              )}
            </div>
          </section>
        )}

        {!isPlacar && campeoes.length > 0 && (
          <section className="card stat-card-wide">
            <div className="card-body">
              <h3 className="card-title">🏆 Campeões</h3>
              <div className="grid-cards">
                {campeoes.map((campeao) => (
                  <button
                    key={campeao.competicao_id}
                    type="button"
                    className="tile tile-clicavel"
                    onClick={() => navigate(`/competicoes/${campeao.competicao_id}`)}
                  >
                    <p className="tile-meta">
                      {campeao.modalidade_nome} · {campeao.categoria_nome} {ROTULO_GENERO[campeao.genero]}
                    </p>
                    <p className="tile-title">{campeao.campeao_nome}</p>
                    <p className="tile-meta">
                      {campeao.status === 'WO'
                        ? `W.O. sobre ${campeao.vice_nome}`
                        : `${campeao.placar_campeao} x ${campeao.placar_vice} sobre ${campeao.vice_nome}`}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          </section>
        )}

        {isPlacar ? (
          <div className="card stat-card stat-card-wide">
            <div className="stat-head">
              <span className="stat-label">
                Próximos jogos{localDaMesa ? ` — ${localDaMesa.nome}` : ''}
              </span>
            </div>
            {!localDaMesa ? (
              <div className="state state-compact">
                <p className="state-text">Mesa sem local definido. Fale com o administrador.</p>
              </div>
            ) : !proximosDaMesa ? (
              <div className="state state-compact">
                <div className="spinner" />
                <p className="state-text">Carregando os jogos do local...</p>
              </div>
            ) : proximosDaMesa.erro ? (
              <div className="state state-compact">
                <p className="state-text">{proximosDaMesa.erro}</p>
                <button className="btn btn-outline btn-sm" onClick={tentarNovamente}>Tentar novamente</button>
              </div>
            ) : proximosDaMesa.lista.length === 0 ? (
              <div className="state state-compact">
                <p className="state-text">Nenhum jogo pendente neste local.</p>
              </div>
            ) : (
              <ul className="agenda-jogos proximos-da-mesa">
                {proximosDaMesa.lista.map((jogo) => (
                  <li key={jogo.id}>
                    <Link className="agenda-jogo" to={`/agenda/${jogo.id}`}>
                      <span className="agenda-hora">{jogo.hora || '--:--'}</span>
                      <span className="agenda-corpo">
                        <span className="agenda-competicao proximo-dia">{formatarData(jogo.data)}</span>
                        <span className="agenda-competicao">
                          {nomeDaCompeticao(jogo.competicao)} · {nomeDaFase(jogo)} · Jogo{' '}{jogo.numero_jogo}
                        </span>
                        <span className="agenda-confronto">
                          <span className={vagaEmAberto(jogo.equipe_1) ? 'agenda-a-definir' : undefined}>{nomeDaVaga(jogo.equipe_1)}</span>
                          <span className="agenda-x"> x </span>
                          <span className={vagaEmAberto(jogo.equipe_2) ? 'agenda-a-definir' : undefined}>{nomeDaVaga(jogo.equipe_2)}</span>
                        </span>
                      </span>
                      <span className={`agenda-status ${CLASSE_STATUS[jogo.status] || ''}`}>
                        {ROTULO_STATUS[jogo.status] || jogo.status}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : (
        <div className="card stat-card stat-card-wide">
          <div className="stat-head">
            <span className="stat-label">
              Próximo Jogo
              {proximo && ` — ${proximo.modalidade_nome} ${proximo.categoria_nome}`}
            </span>
            {proximo && <span className="badge badge-accent">{proximo.fase}</span>}
          </div>

          {proximo ? (
            <>
              <div className="next-match">
                <span className="next-match-team home">{proximo.equipe_1_nome}</span>
                <span className="next-match-vs">VS</span>
                <span className="next-match-team away">{proximo.equipe_2_nome}</span>
              </div>

              <div className="next-match-when">
                <span>📅 <span className="next-match-date">{formatarData(proximo.data_hora)}</span></span>
                <span className="next-match-time">🕒 {formatarHora(proximo.data_hora)}</span>
              </div>
            </>
          ) : (
            <div className="state state-compact">
              <p className="state-text">Nenhum jogo agendado no momento.</p>
              <button className="btn btn-outline btn-sm" onClick={() => navigate('/modalidades/futsal')}>
                🗓️ Agendar Jogo
              </button>
            </div>
          )}
        </div>
        )}

        {!isPlacar && <Artilheiros />}
      </div>
    );
  };

  return (
    <div className="page">
      <div className="container-lg">
        <header className="page-header">
          <p className="eyebrow">Sistema de Gestão Esportiva</p>
          <h1 className="page-title">Painel do Campeonato 🏆</h1>
          <p className="page-subtitle">Visão geral dos Jogos Estudantis em tempo real.</p>
        </header>

        {renderConteudo()}

        {REINICIAR_CAMPEONATO_ATIVO && reiniciarPermitido && isAdmin && !carregando && !erro && (
          <section className="card danger-zone mt-lg">
            <div className="card-body">
              <h3 className="card-title">⚠️ Zona de Perigo</h3>
              <p className="state-text" style={{ textAlign: 'left', marginBottom: '18px' }}>
                Reiniciar o campeonato apaga todos os jogos e súmulas, com as suspensões e a pontuação geral.
                Escolas, competições, grupos, equipes, atletas e inscrições são preservados.
                Use isto apenas para começar um novo torneio do zero.
              </p>
              <button className="btn btn-danger" onClick={reiniciarCampeonato} disabled={reiniciando}>
                {reiniciando ? 'Reiniciando...' : '🗑️ Reiniciar Campeonato / Limpar Tudo'}
              </button>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

export default Inicio;
