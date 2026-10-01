import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import { listarJogos, agendarJogo, excluirJogo, iniciarJogo, declararWO } from '../services/jogos';
import { listarLocais } from '../services/locais';
import { dataEHora } from '../services/datas';

const ROTULO_STATUS = {
  AGENDADO: 'Agendado',
  EM_ANDAMENTO: 'Em andamento',
  FINALIZADO: 'Finalizado',
  WO: 'W.O.'
};

const FORM_VAZIO = {
  equipe_1_id: '',
  equipe_2_id: '',
  data_hora: '',
  local_id: '',
  rodada: '',
  arbitro_1: ''
};

const formatarQuando = (valor) => dataEHora(valor);

function TabelaJogos({ competicao }) {
  const { isAdmin, autenticado } = useAuth();

  // O resultado guarda de qual competição veio, e recarga força nova busca
  // depois de agendar ou excluir — sem setState no corpo do efeito.
  const [resultado, setResultado] = useState(null);
  const [recarga, setRecarga] = useState(0);
  const [locais, setLocais] = useState([]);
  const [form, setForm] = useState(FORM_VAZIO);
  const [salvando, setSalvando] = useState(false);
  const [aviso, setAviso] = useState(null);
  // Painel de W.O.: abre sob a tabela, com 1x0 já sugerido
  const [wo, setWo] = useState(null);

  const chave = `${competicao.id}:${recarga}`;
  const pronto = resultado?.chave === chave;
  const jogos = pronto ? resultado.jogos : [];
  const erro = pronto ? resultado.erro : '';

  useEffect(() => {
    let ativo = true;

    listarJogos({ competicao_id: competicao.id })
      .then((dados) => {
        if (ativo) setResultado({ chave, jogos: dados, erro: '' });
      })
      .catch((falha) => {
        if (ativo) setResultado({ chave, jogos: [], erro: falha.mensagem });
      });

    return () => {
      ativo = false;
    };
  }, [chave, competicao.id]);

  useEffect(() => {
    if (!isAdmin) return;

    let ativo = true;
    listarLocais()
      .then((dados) => {
        if (ativo) setLocais(dados);
      })
      .catch(() => {
        // Sem locais o agendamento continua possível: o campo é opcional.
      });

    return () => {
      ativo = false;
    };
  }, [isAdmin]);

  // As equipes vêm do detalhe da competição, já separadas por grupo
  const equipes = competicao.grupos.flatMap((grupo) =>
    grupo.equipes.map((equipe) => ({ ...equipe, grupo: grupo.nome }))
  );

  const alterar = (campo) => (e) => setForm((atual) => ({ ...atual, [campo]: e.target.value }));

  const enviar = async (e) => {
    e.preventDefault();
    setAviso(null);
    setSalvando(true);

    try {
      const resposta = await agendarJogo({
        competicao_id: competicao.id,
        equipe_1_id: form.equipe_1_id,
        equipe_2_id: form.equipe_2_id,
        data_hora: form.data_hora,
        local_id: form.local_id || null,
        rodada: form.rodada || null,
        arbitro_1: form.arbitro_1
      });

      setAviso({ tipo: 'success', texto: `Jogo nº ${resposta.numero_jogo}: ${resposta.confronto}` });
      setForm(FORM_VAZIO);
      setRecarga((n) => n + 1);
    } catch (falha) {
      setAviso({ tipo: 'error', texto: falha.mensagem });
    } finally {
      setSalvando(false);
    }
  };

  const remover = async (jogo) => {
    const confirmado = window.confirm(
      `Excluir o jogo nº ${jogo.numero_jogo} (${jogo.equipe_1_nome} x ${jogo.equipe_2_nome})?\n\n` +
      'Os jogos seguintes serão renumerados para não deixar buraco na sequência.'
    );
    if (!confirmado) return;

    try {
      const resposta = await excluirJogo(jogo.id);
      setAviso({
        tipo: 'success',
        texto: resposta.jogos_renumerados > 0
          ? `Jogo nº ${resposta.numero_removido} excluído. ${resposta.jogos_renumerados} jogo(s) renumerado(s).`
          : `Jogo nº ${resposta.numero_removido} excluído.`
      });
      setRecarga((n) => n + 1);
    } catch (falha) {
      setAviso({ tipo: 'error', texto: falha.mensagem });
    }
  };

  const abrirWO = (jogo) => setWo({
    jogo,
    vencedor_equipe_id: String(jogo.equipe_1_id),
    placar_1: 1,
    placar_2: 0,
    motivo: ''
  });

  const confirmarWO = async () => {
    try {
      await declararWO(wo.jogo.id, {
        vencedor_equipe_id: Number(wo.vencedor_equipe_id),
        placar_1: Number(wo.placar_1),
        placar_2: Number(wo.placar_2),
        motivo: wo.motivo
      });
      setAviso({ tipo: 'success', texto: `W.O. registrado no jogo nº ${wo.jogo.numero_jogo}.` });
      setWo(null);
      setRecarga((n) => n + 1);
    } catch (falha) {
      setAviso({ tipo: 'error', texto: falha.mensagem });
    }
  };

  const iniciar = async (jogo) => {
    try {
      await iniciarJogo(jogo.id);
      setAviso({ tipo: 'success', texto: `Jogo nº ${jogo.numero_jogo} iniciado.` });
      setRecarga((n) => n + 1);
    } catch (falha) {
      setAviso({ tipo: 'error', texto: falha.mensagem });
    }
  };

  return (
    <section className="card mb-lg">
      <div className="card-body">
        <h2 className="card-title">🗓️ Jogos</h2>

        {aviso && (
          <p className={`alert alert-${aviso.tipo}`} style={{ marginTop: 0 }}>{aviso.texto}</p>
        )}

        {!pronto && (
          <div className="state state-compact">
            <div className="spinner" />
            <p className="state-text">Carregando jogos...</p>
          </div>
        )}

        {pronto && erro && <p className="alert alert-error">{erro}</p>}

        {pronto && !erro && jogos.length === 0 && (
          <div className="state state-compact">
            <p className="state-text">Nenhum jogo agendado nesta competição.</p>
          </div>
        )}

        {pronto && !erro && jogos.length > 0 && (
          <div className="table-wrap">
            <table className="table-sge compact">
              <thead>
                <tr>
                  <th>Nº</th>
                  <th className="text-left">Quando</th>
                  <th className="text-left">Confronto</th>
                  <th>Grupo</th>
                  <th className="text-left">Local</th>
                  <th>Placar</th>
                  <th>Situação</th>
                  {autenticado && <th aria-label="Ações" />}
                </tr>
              </thead>
              <tbody>
                {jogos.map((jogo) => (
                  <tr key={jogo.id}>
                    <td className="strong">{jogo.numero_jogo}</td>
                    <td className="text-left">{formatarQuando(jogo.data_hora)}</td>
                    <td className="text-left">
                      {jogo.equipe_1_nome} <span className="versus">x</span> {jogo.equipe_2_nome}
                    </td>
                    <td>{jogo.grupo_nome || '—'}</td>
                    <td className="text-left">{jogo.local_nome || '—'}</td>
                    <td className="strong">
                      {jogo.placar_1 === null ? '—' : `${jogo.placar_1} x ${jogo.placar_2}`}
                    </td>
                    <td>
                      <span className="badge">{ROTULO_STATUS[jogo.status] || jogo.status}</span>
                    </td>
                    {autenticado && (
                      <td className="acoes">
                        {jogo.status === 'AGENDADO' && (
                          <button type="button" className="btn btn-outline btn-sm" onClick={() => iniciar(jogo)}>
                            Iniciar
                          </button>
                        )}
                        {jogo.status !== 'WO' && (
                          <Link className="btn btn-outline btn-sm" to={`/preencher-sumula/${jogo.id}`}>
                            Súmula
                          </Link>
                        )}
                        <Link className="btn btn-outline btn-sm" to={`/detalhes-sumula/${jogo.id}`}>
                          🖨️
                        </Link>
                        {isAdmin && ['AGENDADO', 'EM_ANDAMENTO'].includes(jogo.status) && (
                          <button type="button" className="btn btn-outline btn-sm" onClick={() => abrirWO(jogo)}>
                            W.O.
                          </button>
                        )}
                        {jogo.status === 'AGENDADO' && isAdmin && (
                          <button type="button" className="btn btn-danger btn-sm" onClick={() => remover(jogo)}>
                            Excluir
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {wo && (
          <div className="painel-wo">
            <h3 className="secao-titulo">
              W.O. no jogo nº {wo.jogo.numero_jogo}: {wo.jogo.equipe_1_nome} x {wo.jogo.equipe_2_nome}
            </h3>

            <div className="form-linha">
              <div className="form-group">
                <label className="form-label" htmlFor="wo-vencedor">Vencedor</label>
                <select
                  id="wo-vencedor"
                  className="form-control"
                  value={wo.vencedor_equipe_id}
                  onChange={(e) => {
                    // O placar acompanha o vencedor: 1x0 para o lado certo
                    const venceuPrimeira = Number(e.target.value) === wo.jogo.equipe_1_id;
                    setWo((atual) => ({
                      ...atual,
                      vencedor_equipe_id: e.target.value,
                      placar_1: venceuPrimeira ? 1 : 0,
                      placar_2: venceuPrimeira ? 0 : 1
                    }));
                  }}
                >
                  <option value={wo.jogo.equipe_1_id}>{wo.jogo.equipe_1_nome}</option>
                  <option value={wo.jogo.equipe_2_id}>{wo.jogo.equipe_2_nome}</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="wo-p1">Placar {wo.jogo.equipe_1_nome}</label>
                <input id="wo-p1" className="form-control" type="number" min="0" value={wo.placar_1}
                  onChange={(e) => setWo((a) => ({ ...a, placar_1: e.target.value }))} />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="wo-p2">Placar {wo.jogo.equipe_2_nome}</label>
                <input id="wo-p2" className="form-control" type="number" min="0" value={wo.placar_2}
                  onChange={(e) => setWo((a) => ({ ...a, placar_2: e.target.value }))} />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="wo-motivo">Motivo</label>
              <input id="wo-motivo" className="form-control" type="text" value={wo.motivo}
                placeholder="Ex.: equipe não compareceu dentro da tolerância de 15 minutos"
                onChange={(e) => setWo((a) => ({ ...a, motivo: e.target.value }))} />
            </div>

            <div className="acoes" style={{ justifyContent: 'flex-start' }}>
              <button type="button" className="btn btn-primary btn-sm" onClick={confirmarWO} disabled={!wo.motivo.trim()}>
                Registrar W.O.
              </button>
              <button type="button" className="btn btn-outline btn-sm" onClick={() => setWo(null)}>
                Cancelar
              </button>
            </div>

            <p className="form-hint">
              Os gols de um W.O. não entram na artilharia, porque não há súmula. Eles contam na classificação.
            </p>
          </div>
        )}

        {isAdmin && (
          <form onSubmit={enviar} className="form form-jogo">
            <h3 className="secao-titulo" style={{ marginTop: '24px' }}>Agendar jogo</h3>

            <div className="form-linha">
              <div className="form-group">
                <label className="form-label" htmlFor="equipe1">Equipe 1</label>
                <select id="equipe1" className="form-control" value={form.equipe_1_id} onChange={alterar('equipe_1_id')} required>
                  <option value="">Selecione...</option>
                  {equipes.map((equipe) => (
                    <option key={equipe.id} value={equipe.id}>{equipe.escola_nome} ({equipe.grupo})</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="equipe2">Equipe 2</label>
                <select id="equipe2" className="form-control" value={form.equipe_2_id} onChange={alterar('equipe_2_id')} required>
                  <option value="">Selecione...</option>
                  {equipes.map((equipe) => (
                    <option key={equipe.id} value={equipe.id}>{equipe.escola_nome} ({equipe.grupo})</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-linha">
              <div className="form-group">
                <label className="form-label" htmlFor="quando">Data e hora</label>
                <input id="quando" className="form-control" type="datetime-local" value={form.data_hora} onChange={alterar('data_hora')} />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="local">Local <span className="form-hint">(opcional)</span></label>
                <select id="local" className="form-control" value={form.local_id} onChange={alterar('local_id')}>
                  <option value="">Sem local</option>
                  {locais.map((local) => (
                    <option key={local.id} value={local.id}>{local.nome}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="rodada">Rodada <span className="form-hint">(opcional)</span></label>
                <input id="rodada" className="form-control" type="number" min="1" value={form.rodada} onChange={alterar('rodada')} />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="arbitro">Árbitro <span className="form-hint">(opcional)</span></label>
              <input id="arbitro" className="form-control" type="text" value={form.arbitro_1} onChange={alterar('arbitro_1')} />
            </div>

            <button type="submit" className="btn btn-primary" disabled={salvando}>
              {salvando ? 'Agendando...' : 'Agendar jogo'}
            </button>

            <p className="form-hint">
              O número do jogo é dado pelo sistema, por competição. O grupo sai das próprias equipes.
            </p>
          </form>
        )}
      </div>
    </section>
  );
}

export default TabelaJogos;
