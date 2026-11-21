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

// Cada linha tem uma chave própria: com empate (db/51, 21/11/2026) a mesma colocação
// pode aparecer em mais de uma linha. As linhas `extra` são as colocações empatadas.
const linhasVazias = (colocacoes) => colocacoes.map((colocacao) => ({ chave: `c${colocacao}`, colocacao, escola_id: '', atleta_nome: '' }));
let proximaChave = 0;
const linhaDeEmpate = (colocacao = 1, escola_id = '') => {
  proximaChave += 1;
  return { chave: `e${proximaChave}`, colocacao, escola_id, atleta_nome: '', extra: true };
};
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
  const [form, setForm] = useState({ jogo: '', categoria_id: '', linhas: linhasVazias([1, 2, 3, 4, 5]) });

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
  // Tabuleiro numa colocação só (db/48): com um jogo, o campo Jogo some e ele vai sozinho
  const jogoUnico = configuracao?.jogos?.length === 1 ? configuracao.jogos[0].slug : '';
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
    setForm((atual) => ({ ...atual, linhas: linhasVazias(configuracao?.colocacoes || [1, 2, 3, 4, 5]) }));
  };

  const mudarLinha = (chave, campo, valor) => setForm((atual) => ({
    ...atual,
    linhas: atual.linhas.map((l) => (l.chave === chave ? { ...l, [campo]: valor } : l))
  }));

  // Empate: mais uma escola numa colocação que já tem escola
  const adicionarEmpate = () => setForm((atual) => ({ ...atual, linhas: [...atual.linhas, linhaDeEmpate()] }));
  const tirarEmpate = (chave) => setForm((atual) => ({ ...atual, linhas: atual.linhas.filter((l) => l.chave !== chave) }));

  const editar = (podio) => {
    const [primeiro] = podio;
    setEditando(chaveDoPodio(primeiro));
    setForm({
      jogo: primeiro.jogo,
      categoria_id: String(primeiro.categoria_id),
      linhas: [
        ...(configuracao?.colocacoes || [1, 2, 3, 4, 5]).map((colocacao) => {
          const gravada = podio.find((r) => r.colocacao === colocacao);
          return { chave: `c${colocacao}`, colocacao, escola_id: gravada ? String(gravada.escola_id) : '', atleta_nome: '' };
        }),
        // As empatadas: da 2ª escola em diante na mesma colocação
        ...podio.filter((r, i) => podio.findIndex((o) => o.colocacao === r.colocacao) !== i)
          .map((r) => linhaDeEmpate(r.colocacao, String(r.escola_id)))
      ]
    });
    setAviso(null);
    document.getElementById('tab-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const salvar = async (evento) => {
    evento.preventDefault();
    const jogo = form.jogo || jogoUnico;
    const linhas = form.linhas
      .filter((l) => l.escola_id)
      .map((l) => ({ colocacao: l.colocacao, escola_id: Number(l.escola_id) }));
    if (linhas.length === 0) {
      setAviso({ tipo: 'error', texto: 'Escolha a escola de pelo menos uma colocação.' });
      return;
    }
    // Lançamento novo não pode cair em cima de um pódio que já existe sem o ADMIN ver
    if (!editando && resultados.some((r) => chaveDoPodio(r) === `${jogo}|${form.categoria_id}`)) {
      setAviso({ tipo: 'error', texto: 'Essa categoria já tem resultado lançado: use "Editar" nela.' });
      return;
    }

    setSalvando(true);
    try {
      const resposta = await salvarPodioTabuleiro({ jogo, categoria_id: Number(form.categoria_id), linhas });
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
            Colocação final das escolas nos jogos de tabuleiro (xadrez, dama e dominó juntos), por categoria. Do 1º ao 5º lugar,
            as escolas valem {configuracao.colocacoes.map((c) => pontosDe[c]).join(', ').replace(/, ([^,]*)$/, ' e $1')} pontos
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
                  {!jogoUnico && <div className="form-group">
                    <label className="form-label" htmlFor="tab-jogo">Jogo</label>
                    <select
                      id="tab-jogo" className="form-control" required disabled={Boolean(editando)}
                      value={form.jogo} onChange={(e) => setForm({ ...form, jogo: e.target.value })}
                    >
                      <option value="">Selecione</option>
                      {configuracao.jogos.map((j) => <option key={j.slug} value={j.slug}>{j.nome}</option>)}
                    </select>
                  </div>}
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
                  <div className={`atletismo-linha so-escola${linha.extra ? ' linha-empate' : ''}`} key={linha.chave}>
                    {linha.extra ? (
                      <select
                        className="form-control atletismo-posicao-escolha" aria-label="Colocação empatada"
                        value={linha.colocacao} onChange={(e) => mudarLinha(linha.chave, 'colocacao', Number(e.target.value))}
                      >
                        {(configuracao.colocacoes || [1, 2, 3, 4, 5]).map((c) => <option key={c} value={c}>{c}º</option>)}
                      </select>
                    ) : (
                      <span className="atletismo-posicao" aria-hidden="true">{MEDALHA[linha.colocacao] || '🏅'} {linha.colocacao}º</span>
                    )}
                    <div className="form-group">
                      <label className="form-label" htmlFor={`tab-escola-${linha.chave}`}>
                        {linha.extra ? `Escola empatada no ${linha.colocacao}º lugar` : `Escola do ${linha.colocacao}º lugar`}
                      </label>
                      <div className="linha-empate-campos">
                        <select
                          id={`tab-escola-${linha.chave}`} className="form-control"
                          value={linha.escola_id} onChange={(e) => mudarLinha(linha.chave, 'escola_id', e.target.value)}
                        >
                          <option value="">{editando ? 'Sem resultado (apaga)' : 'Selecione a escola'}</option>
                          {escolas.map((escola) => {
                            // Uma escola só por categoria: a de outra linha fica indisponível
                            const usada = form.linhas.some((l) => l.chave !== linha.chave && l.escola_id === String(escola.id));
                            return <option key={escola.id} value={escola.id} disabled={usada}>{escola.nome}</option>;
                          })}
                        </select>
                        {linha.extra && (
                          <button type="button" className="btn btn-outline btn-sm" onClick={() => tirarEmpate(linha.chave)}>Tirar</button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                <div>
                  <button type="button" className="btn btn-outline btn-sm" disabled={salvando} onClick={adicionarEmpate}>
                    + Adicionar colocação (empate)
                  </button>
                  <p className="form-hint" style={{ marginTop: 6 }}>
                    Empate: escolha a colocação e a escola. As escolas empatadas levam os pontos inteiros da colocação.
                  </p>
                </div>

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
                            <span className={`atletismo-medalha${MEDALHA[r.colocacao] ? '' : ' numero'}`} aria-label={`${r.colocacao}º lugar`}>{MEDALHA[r.colocacao] || `${r.colocacao}º`}</span>
                            <span className="atletismo-quem">
                              <strong>{r.escola_nome}</strong>
                              {podio.filter((o) => o.colocacao === r.colocacao).length > 1 && <span className="text-soft">empate</span>}
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
