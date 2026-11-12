import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/useAuth';
import { listarColocacoesTabuleiro, salvarPodioTabuleiro, apagarColocacaoTabuleiro } from '../services/tabuleiro';
import { listarEscolas } from '../services/escolas';

// Tabuleiro por colocação (db/38, 12/11/2026): xadrez, dama e dominó. A página
// é pública: todos veem o pódio de cada jogo e categoria. Só o ADMIN vê o
// formulário (jogo, categoria e as três linhas: 1º, 2º e 3º, cada uma com a
// escola e o nome do atleta). Pelo regulamento o tabuleiro é MISTO (não há
// campo de gênero) e todos os jogos são individuais, inclusive o dominó.
// Cada colocação vale, na Tabela Geral, a pontuação das modalidades coletivas.
// (Irmã de pages/Atletismo.jsx, que fica como está; usa os mesmos estilos.)

const MEDALHA = { 1: '🥇', 2: '🥈', 3: '🥉' };

const linhasVazias = (colocacoes) => colocacoes.map((colocacao) => ({ colocacao, escola_id: '', atleta_nome: '' }));
const chaveDoPodio = (r) => `${r.jogo}|${r.categoria_id}`;

function Tabuleiro() {
  const { isAdmin } = useAuth();
  const [dados, setDados] = useState(null);
  const [escolas, setEscolas] = useState([]);
  const [erro, setErro] = useState('');
  const [recarga, setRecarga] = useState(0);
  const [aviso, setAviso] = useState(null);
  const [salvando, setSalvando] = useState(false);
  // editando: a chave do pódio aberto para correção (jogo e categoria ficam travados)
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState({ jogo: '', categoria_id: '', linhas: linhasVazias([1, 2, 3]) });

  useEffect(() => {
    let ativo = true;
    listarColocacoesTabuleiro()
      .then((resposta) => { if (ativo) { setDados(resposta); setErro(''); } })
      .catch((falha) => { if (ativo) setErro(falha.mensagem); });
    return () => { ativo = false; };
  }, [recarga]);

  // A lista de escolas só serve ao formulário
  useEffect(() => {
    if (!isAdmin) return undefined;
    let ativo = true;
    listarEscolas().then((lista) => { if (ativo) setEscolas(lista); }).catch(() => {});
    return () => { ativo = false; };
  }, [isAdmin]);

  const configuracao = dados?.configuracao;
  const resultados = useMemo(() => dados?.resultados || [], [dados]);
  const pontosDe = useMemo(
    () => Object.fromEntries((configuracao?.pontuacao || []).map((p) => [p.posicao, p.pontos])),
    [configuracao]
  );

  // Um cartão por jogo (na ordem da configuração); dentro, um pódio por categoria
  const grupos = useMemo(() => {
    const mapa = new Map();
    for (const r of resultados) {
      if (!mapa.has(r.jogo)) mapa.set(r.jogo, { jogo: r.jogo, jogo_nome: r.jogo_nome, podios: new Map() });
      const grupo = mapa.get(r.jogo);
      if (!grupo.podios.has(r.categoria_id)) grupo.podios.set(r.categoria_id, []);
      grupo.podios.get(r.categoria_id).push(r);
    }
    const ordem = (configuracao?.jogos || []).map((j) => j.slug);
    return [...mapa.values()].sort((a, b) => ordem.indexOf(a.jogo) - ordem.indexOf(b.jogo));
  }, [resultados, configuracao]);

  const limpar = () => {
    setEditando(null);
    setForm((atual) => ({ ...atual, linhas: linhasVazias(configuracao?.colocacoes || [1, 2, 3]) }));
  };

  const mudarLinha = (colocacao, campo, valor) => setForm((atual) => ({
    ...atual,
    linhas: atual.linhas.map((l) => (l.colocacao === colocacao ? { ...l, [campo]: valor } : l))
  }));

  const editar = (podio) => {
    const [primeiro] = podio;
    setEditando(chaveDoPodio(primeiro));
    setForm({
      jogo: primeiro.jogo,
      categoria_id: String(primeiro.categoria_id),
      linhas: (configuracao?.colocacoes || [1, 2, 3]).map((colocacao) => {
        const gravada = podio.find((r) => r.colocacao === colocacao);
        return { colocacao, escola_id: gravada ? String(gravada.escola_id) : '', atleta_nome: gravada?.atleta_nome || '' };
      })
    });
    setAviso(null);
    document.getElementById('tab-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const salvar = async (evento) => {
    evento.preventDefault();
    const linhas = form.linhas
      .filter((l) => l.escola_id)
      .map((l) => ({ colocacao: l.colocacao, escola_id: Number(l.escola_id), atleta_nome: l.atleta_nome }));
    const semEscola = form.linhas.find((l) => !l.escola_id && l.atleta_nome.trim());
    if (semEscola) {
      setAviso({ tipo: 'error', texto: `Escolha a escola do ${semEscola.colocacao}º lugar.` });
      return;
    }
    if (linhas.length === 0) {
      setAviso({ tipo: 'error', texto: 'Escolha a escola de pelo menos uma colocação.' });
      return;
    }
    // Lançamento novo não pode cair em cima de um pódio que já existe sem o ADMIN ver
    if (!editando && resultados.some((r) => chaveDoPodio(r) === `${form.jogo}|${form.categoria_id}`)) {
      setAviso({ tipo: 'error', texto: 'Esse jogo e categoria já têm resultado lançado: use "Editar" no pódio dele.' });
      return;
    }

    setSalvando(true);
    try {
      const resposta = await salvarPodioTabuleiro({ jogo: form.jogo, categoria_id: Number(form.categoria_id), linhas });
      setAviso({ tipo: 'success', texto: resposta.mensagem });
      limpar();
      setRecarga((n) => n + 1);
    } catch (falha) {
      setAviso({ tipo: 'error', texto: falha.mensagem });
    } finally {
      setSalvando(false);
    }
  };

  const apagarPodio = async (podio) => {
    const [primeiro] = podio;
    const rotulo = `${primeiro.jogo_nome} ${primeiro.categoria_nome}`;
    if (!window.confirm(`Apagar o resultado de ${rotulo}? Os pontos saem da Tabela Geral.`)) return;
    setSalvando(true);
    try {
      for (const r of podio) await apagarColocacaoTabuleiro(r.id);
      setAviso({ tipo: 'success', texto: `Resultado de ${rotulo} apagado.` });
      if (editando === chaveDoPodio(primeiro)) limpar();
    } catch (falha) {
      setAviso({ tipo: 'error', texto: falha.mensagem });
    } finally {
      setSalvando(false);
      setRecarga((n) => n + 1);
    }
  };

  if (erro && !dados) {
    return (
      <div className="page"><div className="container-lg">
        <header className="page-header"><h1 className="page-title">Tabuleiro</h1></header>
        <div className="card"><div className="card-body">
          <p className="state-text">{erro}</p>
          <button type="button" className="btn btn-secondary btn-sm" style={{ marginTop: 12 }} onClick={() => setRecarga((n) => n + 1)}>
            Tentar novamente
          </button>
        </div></div>
      </div></div>
    );
  }

  if (!dados) {
    return (
      <div className="page"><div className="container-lg">
        <header className="page-header"><h1 className="page-title">Tabuleiro</h1></header>
        <p className="state-text">Carregando os resultados do tabuleiro...</p>
      </div></div>
    );
  }

  return (
    <div className="page">
      <div className="container-lg">
        <header className="page-header">
          <p className="eyebrow">Resultados</p>
          <h1 className="page-title">Tabuleiro</h1>
          <p className="page-subtitle">
            Xadrez, dama e dominó, disputas mistas e individuais. O 1º, o 2º e o 3º lugar de cada jogo
            valem {configuracao.colocacoes.map((c) => pontosDe[c]).join(', ').replace(/, ([^,]*)$/, ' e $1')} pontos
            para a escola na Tabela Geral, como nas modalidades coletivas.
          </p>
        </header>

        {aviso && <p className={`alert alert-${aviso.tipo} mb-lg`} role="status">{aviso.texto}</p>}

        {isAdmin && (
          <section className="card mb-lg" id="tab-form">
            <div className="card-body">
              <h2 className="card-title">{editando ? 'Corrigir resultado' : 'Lançar resultado'}</h2>
              <form onSubmit={salvar} className="form">
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label" htmlFor="tab-jogo">Jogo</label>
                    <select
                      id="tab-jogo" className="form-control" required disabled={Boolean(editando)}
                      value={form.jogo} onChange={(e) => setForm({ ...form, jogo: e.target.value })}
                    >
                      <option value="">Selecione</option>
                      {configuracao.jogos.map((j) => <option key={j.slug} value={j.slug}>{j.nome}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="tab-categoria">Categoria</label>
                    <select
                      id="tab-categoria" className="form-control" required disabled={Boolean(editando)}
                      value={form.categoria_id} onChange={(e) => setForm({ ...form, categoria_id: e.target.value })}
                    >
                      <option value="">Selecione</option>
                      {configuracao.categorias.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
                    </select>
                  </div>
                </div>

                {form.linhas.map((linha) => (
                  <div className="atletismo-linha" key={linha.colocacao}>
                    <span className="atletismo-posicao" aria-hidden="true">{MEDALHA[linha.colocacao]} {linha.colocacao}º</span>
                    <div className="form-group">
                      <label className="form-label" htmlFor={`tab-escola-${linha.colocacao}`}>Escola do {linha.colocacao}º lugar</label>
                      <select
                        id={`tab-escola-${linha.colocacao}`} className="form-control"
                        value={linha.escola_id} onChange={(e) => mudarLinha(linha.colocacao, 'escola_id', e.target.value)}
                      >
                        <option value="">{editando ? 'Sem resultado (apaga)' : 'Selecione a escola'}</option>
                        {escolas.map((escola) => {
                          // Uma escola só por jogo + categoria: a de outra linha fica indisponível
                          const usada = form.linhas.some((l) => l.colocacao !== linha.colocacao && l.escola_id === String(escola.id));
                          return <option key={escola.id} value={escola.id} disabled={usada}>{escola.nome}</option>;
                        })}
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label" htmlFor={`tab-atleta-${linha.colocacao}`}>Atleta <span className="form-hint">(opcional)</span></label>
                      <input
                        id={`tab-atleta-${linha.colocacao}`} className="form-control" type="text" maxLength={150}
                        placeholder="Nome do atleta" autoComplete="off"
                        value={linha.atleta_nome} onChange={(e) => mudarLinha(linha.colocacao, 'atleta_nome', e.target.value)}
                      />
                    </div>
                  </div>
                ))}

                <div className="atletismo-acoes">
                  <button type="submit" className="btn btn-primary" disabled={salvando}>
                    {salvando ? 'Salvando...' : editando ? 'Salvar correção' : 'Lançar resultado'}
                  </button>
                  {editando && (
                    <button type="button" className="btn btn-secondary" disabled={salvando} onClick={limpar}>Cancelar</button>
                  )}
                </div>
              </form>
            </div>
          </section>
        )}

        {grupos.length === 0 ? (
          <div className="card"><div className="card-body">
            <p className="state-text">Nenhum resultado do tabuleiro foi lançado ainda.</p>
          </div></div>
        ) : (
          grupos.map((grupo) => (
            <section className="card mb-lg" key={grupo.jogo}>
              <div className="card-body">
                <h2 className="card-title">{grupo.jogo_nome}</h2>
                <div className="atletismo-podios">
                  {[...grupo.podios.values()].map((podio) => (
                    <div className="atletismo-podio" key={podio[0].categoria_id}>
                      <div className="atletismo-podio-topo">
                        <h3 className="atletismo-genero">{podio[0].categoria_nome} · Misto</h3>
                        {isAdmin && (
                          <div className="btn-group">
                            <button type="button" className="btn btn-outline btn-sm" disabled={salvando} onClick={() => editar(podio)}>Editar</button>
                            <button type="button" className="btn btn-danger btn-sm" disabled={salvando} onClick={() => apagarPodio(podio)}>Apagar</button>
                          </div>
                        )}
                      </div>
                      <ol className="atletismo-lista">
                        {podio.map((r) => (
                          <li key={r.id}>
                            <span className="atletismo-medalha" aria-label={`${r.colocacao}º lugar`}>{MEDALHA[r.colocacao]}</span>
                            <span className="atletismo-quem">
                              <strong>{r.escola_nome}</strong>
                              {r.atleta_nome && <span className="text-soft">{r.atleta_nome}</span>}
                            </span>
                            <span className="atletismo-pontos">+{pontosDe[r.colocacao]}</span>
                          </li>
                        ))}
                      </ol>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          ))
        )}
      </div>
    </div>
  );
}

export default Tabuleiro;
