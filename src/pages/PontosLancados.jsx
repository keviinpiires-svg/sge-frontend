import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/useAuth';
import { FUSO_DO_EVENTO } from '../services/datas';
import {
  listarPontosLancados, salvarPontosLancados, apagarLancamento, listarHistorico
} from '../services/pontosLancados';

// Atletismo, xadrez, dama e dominó funcionam fora do sistema (chefe,
// 12/10/2026): o juiz entrega a folha e a mesa digita aqui os pontos de cada
// escola, por categoria e gênero. Os pontos somam na Tabela Geral.
//
// Feita para digitar rápido: Enter e Tab passam para o campo seguinte, os
// campos são grandes e a grade vira uma lista em tela estreita. Nada é
// gravado sem passar pelo resumo; valor inválido trava o salvamento, e valor
// acima do esperado destaca a linha e pede confirmação.

const ROTULO_GENERO = { MASCULINO: 'Masculino', FEMININO: 'Feminino' };

// A tela aparece no menu em duas entradas: Tabuleiro (xadrez, dama e dominó)
// e Atletismo. É a mesma tela e a mesma API; cada entrada mostra só as suas
// modalidades (os slugs vêm de regrasProvisorias.pontosLancados).
const GRUPOS = {
  tabuleiro: {
    modalidades: ['xadrez', 'dama', 'domino'],
    titulo: 'Tabuleiro',
    descricao: 'Xadrez, dama e dominó acontecem fora do sistema'
  },
  atletismo: {
    modalidades: ['atletismo'],
    titulo: 'Atletismo',
    descricao: 'O atletismo acontece fora do sistema'
  }
};

const chaveDe = (slug, categoria_id, genero, prova_id) => `${slug}|${categoria_id}|${genero}|${prova_id || ''}`;

// Instante (TIMESTAMP, em ISO): a conversão para o fuso de quem lê é a certa
const quando = (valor) => (valor
  ? new Date(valor).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
  : '');

// "14:20" no fuso do evento: o horário que a mesa lê no relógio de Barra do Choça
const hora = (valor) => (valor
  ? new Date(valor).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: FUSO_DO_EVENTO })
  : '');

// Comparação sem acento, maiúscula nem ponto ("J. Dias" acha "JOSE DIAS" pelo apelido)
const normalizar = (texto) => String(texto || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .toUpperCase().replace(/\./g, ' ').replace(/\s+/g, ' ').trim();

const comoTexto = (numero) => (numero === null || numero === undefined ? '' : String(numero));

// Só dígitos: o resto some ao digitar. Três dígitos cabem, para o 100 aparecer
// destacado como erro em vez de virar 10 em silêncio.
const soDigitos = (texto, maximo) => texto.replace(/\D/g, '').slice(0, maximo);

// Lê uma linha da grade: { pontos, colocacao, erro, acima }
const lerLinha = ({ pontos, colocacao }, esperado, teto) => {
  const p = pontos === '' ? null : Number(pontos);
  const c = colocacao === '' ? null : Number(colocacao);

  if (p !== null && p > teto) return { pontos: p, colocacao: c, erro: `Máximo ${teto} pontos.` };
  if (c !== null && (c < 1 || c > 99)) return { pontos: p, colocacao: c, erro: 'Colocação de 1 a 99.' };
  if (p === null && c !== null) return { pontos: p, colocacao: c, erro: 'Colocação sem pontos.' };
  return { pontos: p, colocacao: c, erro: null, acima: p !== null && p > esperado };
};

// Histórico das correções de um lançamento (db/17) — só o ADMIN vê. Busca
// quando é aberto e de novo a cada salvamento (recarga).
const TEXTO_ACAO = { ALTERACAO: 'corrigido', EXCLUSAO: 'tirado do lançamento', EXCLUSAO_LANCAMENTO: 'lançamento apagado' };
function HistoricoDeCorrecoes({ filtro, recarga }) {
  const [aberto, setAberto] = useState(false);
  const [resultado, setResultado] = useState(null);
  // O filtro como texto: o objeto nasce de novo a cada renderização
  const filtroTexto = JSON.stringify(filtro);
  const chave = `${filtroTexto}|${recarga}`;

  useEffect(() => {
    if (!aberto) return undefined;
    let ativo = true;
    listarHistorico(JSON.parse(filtroTexto))
      .then((historico) => { if (ativo) setResultado({ chave, historico, erro: '' }); })
      .catch((falha) => { if (ativo) setResultado({ chave, historico: [], erro: falha.mensagem }); });
    return () => { ativo = false; };
  }, [aberto, chave, filtroTexto]);

  const pronto = resultado?.chave === chave;
  return (
    <details className="historico-pontos" open={aberto} onToggle={(e) => setAberto(e.currentTarget.open)}>
      <summary>Histórico de correções (só o ADMIN vê)</summary>
      {aberto && !pronto && <p className="form-hint">Carregando...</p>}
      {pronto && resultado.erro && <p className="text-danger">{resultado.erro}</p>}
      {pronto && !resultado.erro && resultado.historico.length === 0 && (
        <p className="form-hint">Nenhuma correção neste lançamento.</p>
      )}
      {pronto && resultado.historico.length > 0 && (
        <ul className="historico-pontos-lista">
          {resultado.historico.map((h) => (
            <li key={h.id}>
              <span className="text-soft">{quando(h.feito_em)}</span> — <strong>{h.escola_nome}</strong>:{' '}
              {h.pontos_antes}{h.colocacao_antes ? ` (${h.colocacao_antes}º)` : ''} →{' '}
              {h.pontos_depois === null ? TEXTO_ACAO[h.acao] : `${h.pontos_depois}${h.colocacao_depois ? ` (${h.colocacao_depois}º)` : ''}`}
              <span className="text-soft">
                {' '}· por {h.usuario_nome}
                {h.anterior_por_nome && ` · o valor de antes era de ${h.anterior_por_nome}, ${quando(h.anterior_em)}`}
              </span>
            </li>
          ))}
        </ul>
      )}
    </details>
  );
}

function PontosLancados({ grupo = 'tabuleiro' }) {
  const doGrupo = GRUPOS[grupo] || GRUPOS.tabuleiro;
  const { isAdmin } = useAuth();

  const [resultado, setResultado] = useState(null);
  const [recarga, setRecarga] = useState(0);
  const [aba, setAba] = useState(null);
  const [escolhaPorAba, setEscolhaPorAba] = useState({});   // slug -> "categoria_id|genero"
  const [provaPorCombinacao, setProvaPorCombinacao] = useState({}); // "slug|categoria_id|genero" -> prova_id
  const [edicao, setEdicao] = useState(null);                // { chave, valores: { escola_id: { pontos, colocacao } } }
  const [revisando, setRevisando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [aviso, setAviso] = useState(null);
  const [busca, setBusca] = useState('');            // escola da folha a acrescentar
  const campos = useRef([]);
  const botaoRevisar = useRef(null);

  // Numa recarga (depois de salvar), a grade anterior fica na tela até a nova chegar
  const dados = resultado?.dados || null;
  const erro = resultado?.erro || '';

  useEffect(() => {
    let ativo = true;
    listarPontosLancados()
      .then((resposta) => { if (ativo) setResultado({ recarga, dados: resposta, erro: '' }); })
      .catch((falha) => { if (ativo) setResultado({ recarga, dados: null, erro: falha.mensagem }); });
    return () => { ativo = false; };
  }, [recarga]);

  if (!resultado) {
    return (
      <div className="page"><div className="container-lg">
        <div className="card"><div className="state">
          <div className="spinner" />
          <p className="state-text">Carregando os lançamentos...</p>
        </div></div>
      </div></div>
    );
  }

  if (erro || !dados) {
    return (
      <div className="page"><div className="container-lg">
        <div className="card"><div className="state state-error">
          <div className="state-icon">⚠️</div>
          <p className="state-title">Não foi possível carregar os lançamentos</p>
          <p className="state-text">{erro || 'Tente de novo em alguns segundos.'}</p>
        </div></div>
      </div></div>
    );
  }

  const { escolas, lancamentos } = dados;
  // Só as modalidades desta entrada do menu, na ordem do grupo
  const configuracao = {
    ...dados.configuracao,
    modalidades: doGrupo.modalidades
      .map((slug) => dados.configuracao.modalidades.find((m) => m.slug === slug))
      .filter(Boolean)
  };

  if (configuracao.modalidades.length === 0) {
    return (
      <div className="page"><div className="container-lg">
        <p className="alert alert-aviso">Nenhuma modalidade de {doGrupo.titulo.toLowerCase()} cadastrada para lançar pontos.</p>
      </div></div>
    );
  }
  const teto = configuracao.teto_absoluto;
  const modalidade = configuracao.modalidades.find((m) => m.slug === aba) || configuracao.modalidades[0];
  const escolhida = escolhaPorAba[modalidade.slug];
  const combinacao = modalidade.combinacoes.find((c) => `${c.categoria_id}|${c.genero}` === escolhida)
    || modalidade.combinacoes[0];

  if (!combinacao) {
    return (
      <div className="page"><div className="container-lg">
        <p className="alert alert-aviso">{modalidade.nome} não tem categoria liberada para lançar.</p>
      </div></div>
    );
  }

  // Atletismo: cada prova da categoria é um lançamento próprio (db/16)
  const provas = combinacao.provas || [];
  const chaveDaCombinacao = `${modalidade.slug}|${combinacao.categoria_id}|${combinacao.genero}`;
  const prova = provas.find((p) => p.id === provaPorCombinacao[chaveDaCombinacao]) || provas[0] || null;
  const chave = chaveDe(modalidade.slug, combinacao.categoria_id, combinacao.genero, prova?.id);
  const nomeDaCategoria = `${modalidade.nome} ${combinacao.categoria_nome} ${ROTULO_GENERO[combinacao.genero]}`;
  const nomeDoLancamento = prova ? `${nomeDaCategoria} — ${prova.rotulo}` : nomeDaCategoria;

  // O que está gravado neste lançamento, por escola
  const daCategoria = lancamentos.filter((l) => l.modalidade === modalidade.slug
    && l.categoria_id === combinacao.categoria_id && l.genero === combinacao.genero);
  const salvos = daCategoria.filter((l) => (l.prova_id || null) === (prova?.id || null));
  // Com mais de uma prova, a soma da escola na categoria (a Tabela Geral soma igual)
  const totalNaCategoria = (escola_id) => {
    const doEscola = daCategoria.filter((l) => l.escola_id === escola_id);
    return {
      total: doEscola.reduce((soma, l) => soma + l.pontos, 0),
      partes: provas.map((p) => `${p.rotulo} ${doEscola.find((l) => l.prova_id === p.id)?.pontos ?? '—'}`).join(' + ')
    };
  };
  const salvoDe = new Map(salvos.map((l) => [l.escola_id, l]));

  const valoresSalvos = Object.fromEntries(escolas.map((e) => [e.id, {
    pontos: comoTexto(salvoDe.get(e.id)?.pontos),
    colocacao: comoTexto(salvoDe.get(e.id)?.colocacao)
  }]));
  const valores = edicao?.chave === chave ? edicao.valores : valoresSalvos;

  // Só as escolas da folha: primeiro as já lançadas, depois as que a mesa
  // acrescentou agora pela busca (21/10/2026). Nada de 18 escolas fixas.
  const adicionadas = edicao?.chave === chave ? (edicao.adicionadas || []) : [];
  const escolaPorId = new Map(escolas.map((e) => [e.id, e]));
  const idsNaGrade = [...salvos.map((l) => l.escola_id), ...adicionadas.filter((id) => !salvoDe.has(id))];
  const linhas = idsNaGrade
    .map((id) => escolaPorId.get(id))
    .filter(Boolean)
    .map((escola) => ({
      escola,
      salvo: salvoDe.get(escola.id),
      nova: !salvoDe.has(escola.id),
      valor: valores[escola.id],
      ...lerLinha(valores[escola.id], combinacao.esperado, teto)
    }));

  // Sugestões da busca: nome ou apelido, fora as que já estão na grade
  const termo = normalizar(busca);
  const sugestoes = termo
    ? escolas.filter((e) => !idsNaGrade.includes(e.id)
      && [e.nome, ...(e.apelidos || [])].some((n) => normalizar(n).includes(termo))).slice(0, 6)
    : [];

  const alterada = (l) => (l.valor.pontos !== valoresSalvos[l.escola.id].pontos)
    || (l.valor.colocacao !== valoresSalvos[l.escola.id].colocacao);
  const mudou = linhas.some(alterada);
  const comErro = linhas.filter((l) => l.erro);
  const acima = linhas.filter((l) => !l.erro && l.acima);
  const lancadas = linhas.filter((l) => l.pontos !== null && !l.erro);
  const total = lancadas.reduce((soma, l) => soma + l.pontos, 0);
  // Linhas que trocam ou apagam um valor já gravado: a revisão mostra cada
  // uma e só grava depois de "Confirmar e substituir" (a API também exige)
  const substituicoes = linhas.filter((l) => l.salvo && !l.erro
    && (l.pontos !== l.salvo.pontos || (l.colocacao ?? null) !== (l.salvo.colocacao ?? null)));
  const resumoTexto = `${nomeDoLancamento}: ${lancadas.length} ${lancadas.length === 1 ? 'escola' : 'escolas'}, `
    + `total ${total} pontos`;

  const ultimo = [...salvos]
    .map((l) => ({ em: l.alterado_em || l.criado_em, por: l.alterado_por_nome || l.criado_por_nome }))
    .sort((a, b) => new Date(b.em) - new Date(a.em))[0];

  // Trocar de aba ou de categoria com coisa digitada e não salva: pergunta
  const podeSair = () => !mudou
    || window.confirm(`Há pontos digitados e não salvos em ${nomeDoLancamento}. Descartar?`);

  const trocarAba = (slug) => {
    if (slug === modalidade.slug || !podeSair()) return;
    setEdicao(null);
    setRevisando(false);
    setAviso(null);
    setAba(slug);
  };

  const trocarCombinacao = (c) => {
    const valor = `${c.categoria_id}|${c.genero}`;
    if (valor === `${combinacao.categoria_id}|${combinacao.genero}` || !podeSair()) return;
    setEdicao(null);
    setRevisando(false);
    setAviso(null);
    setEscolhaPorAba((atual) => ({ ...atual, [modalidade.slug]: valor }));
  };

  const trocarProva = (p) => {
    if (p.id === prova?.id || !podeSair()) return;
    setEdicao(null);
    setRevisando(false);
    setAviso(null);
    setProvaPorCombinacao((atual) => ({ ...atual, [chaveDaCombinacao]: p.id }));
  };

  const mudarCampo = (escola_id, campo, texto) => {
    setRevisando(false);
    setEdicao({
      chave,
      adicionadas,
      valores: {
        ...valores,
        [escola_id]: { ...valores[escola_id], [campo]: soDigitos(texto, campo === 'pontos' ? 3 : 2) }
      }
    });
  };

  // Acrescenta a escola da folha e já põe o cursor no campo de pontos dela
  const adicionarEscola = (escola) => {
    setRevisando(false);
    setEdicao({ chave, valores, adicionadas: [...adicionadas, escola.id] });
    setBusca('');
    const indice = idsNaGrade.length;
    setTimeout(() => { campos.current[indice * 2]?.focus(); }, 0);
  };

  // Tira da grade uma escola acrescentada e ainda não salva
  const removerAdicionada = (escola_id) => {
    setEdicao({
      chave,
      adicionadas: adicionadas.filter((id) => id !== escola_id),
      valores: { ...valores, [escola_id]: valoresSalvos[escola_id] }
    });
  };

  // Enter vai para o campo de PONTOS da escola seguinte (pula a colocação,
  // que é opcional: o Tab ainda passa por ela); na última, vai ao botão
  const aoTeclar = (evento, indice) => {
    if (evento.key !== 'Enter') return;
    evento.preventDefault();
    const proximo = campos.current[(Math.floor(indice / 2) + 1) * 2];
    if (proximo) {
      proximo.focus();
      proximo.select();
    } else {
      botaoRevisar.current?.focus();
    }
  };

  const salvar = async () => {
    setSalvando(true);
    setAviso(null);
    try {
      const resposta = await salvarPontosLancados({
        modalidade: modalidade.slug,
        categoria_id: combinacao.categoria_id,
        genero: combinacao.genero,
        prova_id: prova?.id || null,
        linhas: linhas.map((l) => ({ escola_id: l.escola.id, pontos: l.pontos, colocacao: l.colocacao })),
        base: salvos.map((l) => ({ escola_id: l.escola_id, pontos: l.pontos, colocacao: l.colocacao })),
        confirmado: acima.length > 0,
        substituir: substituicoes.length > 0
      });
      setEdicao(null);
      setRevisando(false);
      setAviso({ tipo: 'success', texto: resposta.mensagem });
      setRecarga((r) => r + 1);
    } catch (falha) {
      setRevisando(false);
      setAviso({
        tipo: 'error',
        texto: falha.mensagem,
        recarregar: falha.response?.status === 409
      });
    } finally {
      setSalvando(false);
    }
  };

  const recarregarDescartando = () => {
    setEdicao(null);
    setAviso(null);
    setRecarga((r) => r + 1);
  };

  const apagar = async () => {
    const totalSalvo = salvos.reduce((soma, l) => soma + l.pontos, 0);
    const confirmou = window.confirm(
      `Apagar o lançamento inteiro de ${nomeDoLancamento} (${salvos.length} `
      + `${salvos.length === 1 ? 'escola' : 'escolas'}, total ${totalSalvo} pontos)? Os pontos saem da Tabela Geral.`
    );
    if (!confirmou) return;

    setSalvando(true);
    try {
      const resposta = await apagarLancamento(modalidade.slug, combinacao.categoria_id, combinacao.genero, prova?.id);
      setEdicao(null);
      setAviso({ tipo: 'success', texto: resposta.mensagem });
      setRecarga((r) => r + 1);
    } catch (falha) {
      setAviso({ tipo: 'error', texto: falha.mensagem });
    } finally {
      setSalvando(false);
    }
  };

  // Quantas escolas já têm pontos em cada categoria e gênero (marca nos botões)
  const lancadasEm = (c) => lancamentos.filter((l) => l.modalidade === modalidade.slug
    && l.categoria_id === c.categoria_id && l.genero === c.genero).length;
  const categorias = [...new Map(modalidade.combinacoes.map((c) => [c.categoria_id, c.categoria_nome])).entries()];

  return (
    <div className="page">
      <div className="container-lg">
        <header className="page-header">
          <p className="eyebrow">Mesa</p>
          <h1 className="page-title">{doGrupo.titulo}</h1>
          <p className="page-subtitle">
            {doGrupo.descricao}: digite aqui os pontos de
            cada escola conforme a folha do juiz.{' '}
            {/* No celular a explicação some, para a grade subir */}
            <span className="so-tela-larga">
              Os pontos somam na Tabela Geral, mas não entram no desempate por 1º, 2º e 3º lugares.
            </span>
          </p>
        </header>

        {/* Botões de modalidade só no Tabuleiro: o Atletismo é uma só */}
        {configuracao.modalidades.length > 1 && (
        <div className="abas-pontos" role="tablist" aria-label="Modalidades">
          {configuracao.modalidades.map((m) => (
            <button
              key={m.slug}
              type="button"
              role="tab"
              aria-selected={m.slug === modalidade.slug}
              className={`aba-pontos ${m.slug === modalidade.slug ? 'ativa' : ''}`}
              onClick={() => trocarAba(m.slug)}
            >
              {m.nome}
            </button>
          ))}
        </div>
        )}

        {/* Categoria e gênero numa linha só (21/10/2026): a grade fica perto do
            topo, também no celular. A lista marca quantas escolas já têm pontos. */}
        <div className="seletor-pontos">
          <label className="seletor-pontos-categoria">
            <span className="form-label">Categoria</span>
            <select
              className="form-control"
              value={combinacao.categoria_id}
              onChange={(e) => {
                const id = Number(e.target.value);
                const destino = modalidade.combinacoes.find((c) => c.categoria_id === id && c.genero === combinacao.genero)
                  || modalidade.combinacoes.find((c) => c.categoria_id === id);
                if (destino) trocarCombinacao(destino);
              }}
            >
              {categorias.map(([categoria_id, categoria_nome]) => {
                const quantas = modalidade.combinacoes
                  .filter((c) => c.categoria_id === categoria_id)
                  .reduce((soma, c) => soma + lancadasEm(c), 0);
                return (
                  <option key={categoria_id} value={categoria_id}>
                    {categoria_nome}{quantas > 0 ? ` ✓${quantas}` : ''}
                  </option>
                );
              })}
            </select>
          </label>
          <div className="seletor-pontos-genero" role="group" aria-label="Gênero">
            {modalidade.combinacoes.filter((c) => c.categoria_id === combinacao.categoria_id).map((c) => {
              const ativa = c.genero === combinacao.genero;
              const quantas = lancadasEm(c);
              return (
                <button
                  key={c.genero}
                  type="button"
                  className={`btn ${ativa ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => trocarCombinacao(c)}
                  aria-pressed={ativa}
                >
                  {ROTULO_GENERO[c.genero]}{quantas > 0 && ` ✓${quantas}`}
                </button>
              );
            })}
          </div>
        </div>

        {provas.length > 0 && (
          <div className="provas-pontos" role="group" aria-label="Prova">
            <span className="provas-pontos-rotulo">Prova:</span>
            {provas.map((p) => {
              const lancadasNaProva = daCategoria.filter((l) => l.prova_id === p.id).length;
              return (
                <button
                  key={p.id}
                  type="button"
                  className={`btn ${p.id === prova?.id ? 'btn-primary' : 'btn-secondary'}`}
                  aria-pressed={p.id === prova?.id}
                  onClick={() => trocarProva(p)}
                >
                  {p.rotulo}{lancadasNaProva > 0 && ` ✓${lancadasNaProva}`}
                </button>
              );
            })}
            {provas.length > 1 && (
              <span className="form-hint">Cada prova é uma folha: digite uma de cada vez. As provas somam sozinhas.</span>
            )}
          </div>
        )}

        {aviso && (
          <div className={`alert alert-${aviso.tipo} mb-lg`}>
            {aviso.texto}
            {aviso.recarregar && (
              <div className="btn-row" style={{ marginTop: '10px' }}>
                <button type="button" className="btn btn-secondary btn-sm" onClick={recarregarDescartando}>
                  Recarregar (descarta o que foi digitado)
                </button>
              </div>
            )}
          </div>
        )}

        <section className="card mb-lg">
          <div className="card-body">
            <h2 className="card-title">{nomeDoLancamento}</h2>
            <p className="form-hint">
              Pontos esperados por escola: até {combinacao.esperado}. Acima disso a linha fica
              destacada e o sistema pede confirmação; acima de {teto}, não salva.
              {ultimo
                ? ` Último salvamento: ${ultimo.por}, ${quando(ultimo.em)}.`
                : ' Ainda não há pontos lançados aqui.'}
            </p>
          </div>

          <div className="busca-escola-pontos">
            <label className="form-label" htmlFor="busca-escola">Escola da folha</label>
            <input
              id="busca-escola"
              className="form-control"
              type="search"
              autoComplete="off"
              placeholder="Digite o nome ou o apelido (ex.: J. Dias)"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && sugestoes[0]) { e.preventDefault(); adicionarEscola(sugestoes[0]); }
              }}
            />
            {termo && (
              <ul className="sugestoes-escola" role="listbox" aria-label="Escolas encontradas">
                {sugestoes.map((e) => (
                  <li key={e.id}>
                    <button type="button" role="option" aria-selected="false" onClick={() => adicionarEscola(e)}>
                      {e.nome}
                      {e.apelidos?.length > 0 && <span className="text-soft"> · {e.apelidos.join(', ')}</span>}
                    </button>
                  </li>
                ))}
                {sugestoes.length === 0 && <li className="form-hint">Nenhuma escola fora da grade com esse nome.</li>}
              </ul>
            )}
          </div>

          {linhas.length === 0 && (
            <p className="form-hint grade-pontos-vazia">Nenhuma escola nesta folha ainda: busque a escola acima.</p>
          )}

          {linhas.length > 0 && (
          <div className="grade-pontos" role="table" aria-label={`Pontos de ${nomeDoLancamento}`}>
            <div className="grade-pontos-cabecalho" role="row">
              <span role="columnheader">Escola</span>
              <span role="columnheader">Pontos</span>
              <span role="columnheader">Colocação <small>(opcional)</small></span>
            </div>

            {linhas.map((linha, i) => {
              const estado = linha.erro ? 'com-erro' : linha.acima ? 'acima' : '';
              return (
                <div key={linha.escola.id} className={`grade-pontos-linha ${estado}`} role="row">
                  <div className="grade-pontos-escola" role="cell">
                    <span className="grade-pontos-nome">
                      {linha.escola.nome}
                      {linha.nova && (
                        <button
                          type="button"
                          className="remover-escola-pontos"
                          aria-label={`Tirar ${linha.escola.nome} da grade`}
                          onClick={() => removerAdicionada(linha.escola.id)}
                        >
                          ×
                        </button>
                      )}
                    </span>
                    {provas.length > 1 && totalNaCategoria(linha.escola.id).total > 0 && (
                      <span className="grade-pontos-rastro">
                        Total em {nomeDaCategoria}: {totalNaCategoria(linha.escola.id).total} ({totalNaCategoria(linha.escola.id).partes})
                      </span>
                    )}
                    {linha.salvo && (
                      <span className="grade-pontos-rastro">
                        Digitado por {linha.salvo.criado_por_nome}, {quando(linha.salvo.criado_em)}
                        {linha.salvo.alterado_em
                          && ` · alterado por ${linha.salvo.alterado_por_nome}, ${quando(linha.salvo.alterado_em)}`}
                      </span>
                    )}
                    {linha.erro && <span className="grade-pontos-alerta erro">{linha.erro}</span>}
                    {!linha.erro && linha.acima && (
                      <span className="grade-pontos-alerta">Acima dos {combinacao.esperado} esperados: confira.</span>
                    )}
                  </div>
                  <div role="cell">
                    <input
                      ref={(el) => { campos.current[i * 2] = el; }}
                      className="form-control campo-ponto"
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      autoComplete="off"
                      aria-label={`Pontos de ${linha.escola.nome}`}
                      value={linha.valor.pontos}
                      onChange={(e) => mudarCampo(linha.escola.id, 'pontos', e.target.value)}
                      onKeyDown={(e) => aoTeclar(e, i * 2)}
                      onFocus={(e) => e.target.select()}
                    />
                  </div>
                  <div role="cell">
                    <input
                      ref={(el) => { campos.current[i * 2 + 1] = el; }}
                      className="form-control campo-ponto campo-colocacao"
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      autoComplete="off"
                      aria-label={`Colocação de ${linha.escola.nome}`}
                      placeholder="—"
                      value={linha.valor.colocacao}
                      onChange={(e) => mudarCampo(linha.escola.id, 'colocacao', e.target.value)}
                      onKeyDown={(e) => aoTeclar(e, i * 2 + 1)}
                      onFocus={(e) => e.target.select()}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          )}

          <div className="card-body">
            <p className="resumo-pontos"><strong>{resumoTexto}</strong>{mudou ? ' (não salvo)' : ''}</p>
            {comErro.length > 0 && (
              <p className="text-danger">
                Corrija {comErro.length === 1 ? 'a linha destacada' : `as ${comErro.length} linhas destacadas`} para salvar.
              </p>
            )}

            {revisando && comErro.length === 0 ? (
              <div className="alert alert-aviso mb-lg">
                <p className="alert-titulo">Conferir antes de salvar</p>
                <p className="alert-texto">{resumoTexto}.</p>
                {substituicoes.length > 0 && (
                  <ul className="substituicoes-pontos">
                    {substituicoes.map((l) => (
                      <li key={l.escola.id}>
                        ⚠️ <strong>{l.escola.nome}</strong> já tinha {l.salvo.pontos}
                        {l.salvo.colocacao ? ` (${l.salvo.colocacao}º)` : ''}, digitado por{' '}
                        {l.salvo.alterado_por_nome || l.salvo.criado_por_nome} às{' '}
                        {hora(l.salvo.alterado_em || l.salvo.criado_em)} —{' '}
                        {l.pontos === null ? 'tirar do lançamento?' : `substituir por ${l.pontos}${l.colocacao ? ` (${l.colocacao}º)` : ''}?`}
                      </li>
                    ))}
                  </ul>
                )}
                {acima.length > 0 && (
                  <p className="alert-texto">
                    ⚠️ {acima.length === 1 ? 'Uma escola passou' : `${acima.length} escolas passaram`} dos{' '}
                    {combinacao.esperado} pontos esperados:{' '}
                    {acima.map((l) => `${l.escola.nome} (${l.pontos})`).join(', ')}. Confirme só se a folha do
                    juiz diz isso.
                  </p>
                )}
                <div className="btn-row" style={{ marginTop: '12px' }}>
                  <button type="button" className="btn btn-primary" onClick={salvar} disabled={salvando}>
                    {salvando ? 'Salvando...'
                      : substituicoes.length ? 'Confirmar e substituir'
                        : acima.length ? 'Confirmar e salvar mesmo assim' : 'Confirmar e salvar'}
                  </button>
                  <button type="button" className="btn btn-secondary" onClick={() => setRevisando(false)} disabled={salvando}>
                    Voltar e corrigir
                  </button>
                </div>
              </div>
            ) : (
              <div className="btn-row">
                <button
                  ref={botaoRevisar}
                  type="button"
                  className="btn btn-primary btn-lg"
                  onClick={() => setRevisando(true)}
                  disabled={!mudou || comErro.length > 0 || salvando}
                >
                  Revisar e salvar
                </button>
                {mudou && (
                  <button type="button" className="btn btn-secondary" onClick={() => setEdicao(null)} disabled={salvando}>
                    Desfazer o que foi digitado
                  </button>
                )}
              </div>
            )}

            {isAdmin && (
              <HistoricoDeCorrecoes
                recarga={recarga}
                filtro={{ modalidade: modalidade.slug, categoria_id: combinacao.categoria_id, genero: combinacao.genero, prova_id: prova?.id || null }}
              />
            )}

            {isAdmin && salvos.length > 0 && (
              <div className="btn-row" style={{ marginTop: '16px' }}>
                <button type="button" className="btn btn-danger btn-sm" onClick={apagar} disabled={salvando}>
                  Apagar o lançamento inteiro
                </button>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

export default PontosLancados;
