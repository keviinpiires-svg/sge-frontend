import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/useAuth';
import {
  listarPontosLancados, salvarPontosLancados, apagarLancamento
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

const chaveDe = (slug, categoria_id, genero) => `${slug}|${categoria_id}|${genero}`;

// Instante (TIMESTAMP, em ISO): a conversão para o fuso de quem lê é a certa
const quando = (valor) => (valor
  ? new Date(valor).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
  : '');

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

function PontosLancados() {
  const { isAdmin } = useAuth();

  const [resultado, setResultado] = useState(null);
  const [recarga, setRecarga] = useState(0);
  const [aba, setAba] = useState(null);
  const [escolhaPorAba, setEscolhaPorAba] = useState({});   // slug -> "categoria_id|genero"
  const [edicao, setEdicao] = useState(null);                // { chave, valores: { escola_id: { pontos, colocacao } } }
  const [revisando, setRevisando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [aviso, setAviso] = useState(null);
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

  const { configuracao, escolas, lancamentos } = dados;
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

  const chave = chaveDe(modalidade.slug, combinacao.categoria_id, combinacao.genero);
  const nomeDoLancamento = `${modalidade.nome} ${combinacao.categoria_nome} ${ROTULO_GENERO[combinacao.genero]}`;

  // O que está gravado neste lançamento, por escola
  const salvos = lancamentos.filter((l) => l.modalidade === modalidade.slug
    && l.categoria_id === combinacao.categoria_id && l.genero === combinacao.genero);
  const salvoDe = new Map(salvos.map((l) => [l.escola_id, l]));

  const valoresSalvos = Object.fromEntries(escolas.map((e) => [e.id, {
    pontos: comoTexto(salvoDe.get(e.id)?.pontos),
    colocacao: comoTexto(salvoDe.get(e.id)?.colocacao)
  }]));
  const valores = edicao?.chave === chave ? edicao.valores : valoresSalvos;

  const linhas = escolas.map((escola) => ({
    escola,
    salvo: salvoDe.get(escola.id),
    valor: valores[escola.id],
    ...lerLinha(valores[escola.id], combinacao.esperado, teto)
  }));

  const alterada = (l) => (l.valor.pontos !== valoresSalvos[l.escola.id].pontos)
    || (l.valor.colocacao !== valoresSalvos[l.escola.id].colocacao);
  const mudou = linhas.some(alterada);
  const comErro = linhas.filter((l) => l.erro);
  const acima = linhas.filter((l) => !l.erro && l.acima);
  const lancadas = linhas.filter((l) => l.pontos !== null && !l.erro);
  const total = lancadas.reduce((soma, l) => soma + l.pontos, 0);
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

  const mudarCampo = (escola_id, campo, texto) => {
    setRevisando(false);
    setEdicao({
      chave,
      valores: {
        ...valores,
        [escola_id]: { ...valores[escola_id], [campo]: soDigitos(texto, campo === 'pontos' ? 3 : 2) }
      }
    });
  };

  // Enter passa para o campo seguinte, como o Tab; no último, vai ao botão
  const aoTeclar = (evento, indice) => {
    if (evento.key !== 'Enter') return;
    evento.preventDefault();
    const proximo = campos.current[indice + 1];
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
        linhas: linhas.map((l) => ({ escola_id: l.escola.id, pontos: l.pontos, colocacao: l.colocacao })),
        base: salvos.map((l) => ({ escola_id: l.escola_id, pontos: l.pontos, colocacao: l.colocacao })),
        confirmado: acima.length > 0
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
      const resposta = await apagarLancamento(modalidade.slug, combinacao.categoria_id, combinacao.genero);
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
          <h1 className="page-title">Pontos lançados</h1>
          <p className="page-subtitle">
            Atletismo, xadrez, dama e dominó acontecem fora do sistema: digite aqui os pontos de
            cada escola conforme a folha do juiz. Os pontos somam na Tabela Geral, mas não entram
            no desempate por 1º, 2º e 3º lugares. Escola em branco fica fora do lançamento.
          </p>
        </header>

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

        <section className="card mb-lg">
          <div className="card-body">
            <h2 className="card-title">Categoria e gênero</h2>
            <div className="combinacoes-pontos">
              {categorias.map(([categoria_id, categoria_nome]) => (
                <div key={categoria_id} className="combinacao-pontos">
                  <span className="combinacao-categoria">{categoria_nome}</span>
                  {modalidade.combinacoes.filter((c) => c.categoria_id === categoria_id).map((c) => {
                    const ativa = c.categoria_id === combinacao.categoria_id && c.genero === combinacao.genero;
                    const quantas = lancadasEm(c);
                    return (
                      <button
                        key={c.genero}
                        type="button"
                        className={`btn btn-sm ${ativa ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={() => trocarCombinacao(c)}
                        aria-pressed={ativa}
                      >
                        {ROTULO_GENERO[c.genero]}{quantas > 0 && ` ✓${quantas}`}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </section>

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
                    <span className="grade-pontos-nome">{linha.escola.nome}</span>
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
                    {salvando ? 'Salvando...' : acima.length ? 'Confirmar e salvar mesmo assim' : 'Confirmar e salvar'}
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
