import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useReactToPrint } from 'react-to-print';
import { listarAgenda } from '../services/agenda';
import { buscarSumulaPorJogo } from '../services/sumulas';
import { suspensosDoDia } from '../services/suspensoes';
import { agoraNoEventoLegivel, hojeNoEvento, dataPorExtenso } from '../services/datas';
import { useAuth } from '../context/useAuth';
import TelaRestrita from '../components/TelaRestrita';
import SuspensosDoLocal, { AvisoDaLista } from '../components/SuspensosDoLocal';
import { nomeDaCompeticao, nomeDaFase, nomeDaVaga, ROTULO_STATUS } from '../components/agendaTextos';
import FolhaFutsal from '../components/folhas/FolhaFutsal';
import FolhaBasquete from '../components/folhas/FolhaBasquete';
import FolhaVolei from '../components/folhas/FolhaVolei';
import FolhaHandebol from '../components/folhas/FolhaHandebol';
import FolhaBaleado from '../components/folhas/FolhaBaleado';

// Mesma escolha de folha da tela de uma súmula só (DetalhesSumula)
const FOLHAS = {
  FUTSAL: FolhaFutsal,
  BASQUETE: FolhaBasquete,
  VOLEI: FolhaVolei,
  HANDEBOL: FolhaHandebol,
  BALEADO: FolhaBaleado
};

// Quantas súmulas se pedem ao servidor ao mesmo tempo (o Render free é pequeno)
const SIMULTANEAS = 4;
// "Todos os locais do dia" (só o ADMIN)
const TODOS = 'todos';

const rotuloDoDia = (dia) => {
  const texto = dataPorExtenso(dia);
  return texto.charAt(0).toUpperCase() + texto.slice(1);
};

// Folha de abertura de um local (ADMIN): a lista dos jogos que vêm a seguir e os
// atletas suspensos nesses jogos. Abre o bloco de súmulas de cada local.
function AberturaDoLocal({ dia, local, jogos, suspensos, dados, geradoEm, erroSuspensos }) {
  return (
    <div className="papel papel-abertura">
      <p className="papel-sub">Jogos Estudantis 2026 · {rotuloDoDia(dia)}</p>
      <h2 className="papel-titulo">📍 {local.nome}</h2>
      <p className="papel-sub">{jogos.length} {jogos.length === 1 ? 'súmula' : 'súmulas'} a seguir, na ordem da tabela</p>
      <table className="papel-tabela">
        <thead>
          <tr><th>Nº</th><th>Hora</th><th>Competição</th><th>Jogo</th></tr>
        </thead>
        <tbody>
          {jogos.map((j) => (
            <tr key={j.id}>
              <td className="papel-num">{j.numero_tabela ?? '–'}</td>
              <td>{j.hora || '--:--'}</td>
              <td>{nomeDaCompeticao(j.competicao)} · {nomeDaFase(j)}</td>
              <td><strong>{nomeDaVaga(j.equipe_1)}</strong> x <strong>{nomeDaVaga(j.equipe_2)}</strong></td>
            </tr>
          ))}
        </tbody>
      </table>
      <h3 className="papel-secao-titulo">Atletas suspensos nestes jogos</h3>
      {erroSuspensos
        ? <p className="papel-vazio">Não foi possível carregar os suspensos ({erroSuspensos}). Confira em "Suspensos do dia".</p>
        : <SuspensosDoLocal suspensos={suspensos} />}
      <AvisoDaLista dados={dados} geradoEm={geradoEm} />
    </div>
  );
}

// Súmulas EM BRANCO de um dia (de um local ou, para o ADMIN, de todos), numa
// impressão só, cada uma numa folha A4, já com os atletas inscritos e as camisas
// atuais de cada equipe. Ordem da tabela do chefe: local pelo menor nº do dia e
// jogo pelo nº. Desde 17/11/2026 os locais não têm internet: a mesa anota no
// papel e o ADMIN lança depois.
function ImprimirSumulas() {
  const { localDaMesa, isPlacar, isAdmin } = useAuth();
  const [parametros, setParametros] = useSearchParams();
  const [agenda, setAgenda] = useState(null);
  const [tentativa, setTentativa] = useState(0);
  const [comEncerrados, setComEncerrados] = useState(false);
  const [comAbertura, setComAbertura] = useState(true);
  const [carga, setCarga] = useState(null);
  const [suspensos, setSuspensos] = useState(null);
  // Jogos DESMARCADOS, presos ao dia e ao local em que foram desmarcados: ao
  // trocar um dos dois a chave muda e todos voltam marcados
  const [desmarcadosDe, setDesmarcadosDe] = useState({ contexto: '', ids: [] });
  const loteRef = useRef(null);

  useEffect(() => {
    let ativo = true;
    listarAgenda()
      .then((jogos) => { if (ativo) setAgenda({ tentativa, jogos, erro: '' }); })
      .catch((falha) => { if (ativo) setAgenda({ tentativa, jogos: [], erro: falha.mensagem }); });
    return () => { ativo = false; };
  }, [tentativa]);

  const pronta = agenda?.tentativa === tentativa;
  const jogos = useMemo(() => (pronta ? agenda.jogos : []), [pronta, agenda]);
  const erroAgenda = pronta ? agenda.erro : '';

  const dias = useMemo(
    () => [...new Set(jogos.map((j) => j.data).filter(Boolean))].sort(),
    [jogos]
  );

  // Dia: o da URL; senão hoje (se tiver jogo) ou o primeiro dia.
  const hoje = hojeNoEvento();
  const dia = parametros.get('dia') || (dias.includes(hoje) ? hoje : dias[0] || '');

  // Locais do dia, na ordem da tabela (pelo menor nº de cada local naquele dia)
  const locais = useMemo(() => {
    const mapa = new Map();
    for (const j of jogos) {
      if (j.data !== dia || !j.local) continue;
      const id = String(j.local.id);
      const n = j.numero_tabela ?? Infinity;
      if (!mapa.has(id) || n < mapa.get(id).ordem) mapa.set(id, { id, nome: j.local.nome, ordem: n });
    }
    const todos = [...mapa.values()].sort((a, b) => a.ordem - b.ordem || a.nome.localeCompare(b.nome, 'pt-BR'));
    // A mesa só vê o local dela
    return isPlacar ? todos.filter((l) => localDaMesa && String(localDaMesa.id) === l.id) : todos;
  }, [jogos, dia, isPlacar, localDaMesa]);
  const ordemDoLocal = new Map(locais.map((l, i) => [l.id, i]));

  // Mesa: sempre o local dela, mesmo que a URL peça outro. ADMIN: o da URL; sem
  // nada na URL, todos os locais do dia.
  const pedido = parametros.get('local');
  const local = isPlacar
    ? (localDaMesa ? String(localDaMesa.id) : '')
    : (pedido === TODOS && isAdmin ? TODOS : pedido || (localDaMesa ? String(localDaMesa.id) : (isAdmin ? TODOS : '')));
  const todosOsLocais = local === TODOS;

  const mudar = (chave, valor) => {
    const novos = new URLSearchParams(parametros);
    // O padrão vira escolha explícita ao mexer, para o link ficar completo
    if (!novos.has('dia') && dia) novos.set('dia', dia);
    if (!novos.has('local') && local) novos.set('local', local);
    if (valor) novos.set(chave, valor); else novos.delete(chave);
    setParametros(novos, { replace: true });
  };

  const doLocalEDia = jogos
    .filter((j) => j.data === dia && local && (todosOsLocais || String(j.local?.id) === local))
    .sort((a, b) => (ordemDoLocal.get(String(a.local?.id)) ?? Infinity) - (ordemDoLocal.get(String(b.local?.id)) ?? Infinity)
      || (a.numero_tabela ?? Infinity) - (b.numero_tabela ?? Infinity)
      || (a.hora || '').localeCompare(b.hora || ''));
  const doLote = doLocalEDia.filter((j) => comEncerrados || j.status === 'AGENDADO' || j.status === 'EM_ANDAMENTO');
  const escondidos = doLocalEDia.length - doLote.length;

  // Blocos por local, na ordem da tabela
  const blocos = [];
  for (const j of doLote) {
    const id = String(j.local?.id ?? '');
    let bloco = blocos[blocos.length - 1];
    if (!bloco || bloco.id !== id) {
      bloco = { id, nome: j.local?.nome || 'Local a definir', jogos: [] };
      blocos.push(bloco);
    }
    bloco.jogos.push(j);
  }

  const chave = doLote.map((j) => j.id).join(',');

  const contexto = `${dia}|${local}`;
  const desmarcados = desmarcadosDe.contexto === contexto ? desmarcadosDe.ids : [];
  const marcado = (j) => !desmarcados.includes(j.id);
  const marcados = doLote.filter(marcado);
  const guardar = (ids) => setDesmarcadosDe({ contexto, ids });
  const alternar = (j) => guardar(marcado(j) ? [...desmarcados, j.id] : desmarcados.filter((id) => id !== j.id));

  // Busca as súmulas (em branco = o elenco inscrito) do lote, poucas por vez
  useEffect(() => {
    if (!chave) return undefined;
    let ativo = true;
    const ids = chave.split(',');
    const itens = {};
    const falhas = {};
    let proximo = 0;
    let feitos = 0;

    const trabalhador = async () => {
      while (ativo && proximo < ids.length) {
        const id = ids[proximo];
        proximo += 1;
        try {
          itens[id] = await buscarSumulaPorJogo(id);
        } catch (falha) {
          falhas[id] = falha.mensagem || 'Falha ao carregar.';
        }
        feitos += 1;
        if (ativo) setCarga({ chave, feitos, total: ids.length, itens: { ...itens }, falhas: { ...falhas } });
      }
    };
    Promise.all(Array.from({ length: Math.min(SIMULTANEAS, ids.length) }, trabalhador));
    return () => { ativo = false; };
  }, [chave]);

  // Suspensos do dia, para a folha de abertura (só o ADMIN: a rota é dele)
  useEffect(() => {
    if (!isAdmin || !dia) return undefined;
    let ativo = true;
    suspensosDoDia(dia)
      .then((dados) => { if (ativo) setSuspensos({ dia, dados, erro: '', geradoEm: agoraNoEventoLegivel() }); })
      .catch((falha) => { if (ativo) setSuspensos({ dia, dados: null, erro: falha.mensagem || 'falha' }); });
    return () => { ativo = false; };
  }, [isAdmin, dia, tentativa]);
  const suspensosDoDiaAtual = suspensos?.dia === dia ? suspensos : null;
  const suspensosDoBloco = (id) => suspensosDoDiaAtual?.dados?.locais
    .find((l) => String(l.local_id ?? '') === id)?.suspensos || [];

  const atual = carga?.chave === chave ? carga : null;
  const carregando = Boolean(chave) && (!atual || atual.feitos < atual.total);
  const folhaPronta = (j) => marcado(j) && atual?.itens[j.id] && FOLHAS[atual.itens[j.id].folha?.tipo];
  const folhasProntas = marcados.filter((j) => atual?.itens[j.id] && FOLHAS[atual.itens[j.id].folha?.tipo]);
  const usarAbertura = isAdmin && comAbertura;
  const aberturas = usarAbertura ? blocos.filter((b) => b.jogos.some(folhaPronta)).length : 0;

  const imprimir = useReactToPrint({
    contentRef: loteRef,
    documentTitle: `Sumulas_em_branco_${dia}_${todosOsLocais ? 'todos_os_locais' : local}`,
    pageStyle: `
      @page { size: A4 portrait; margin: 0; }
      html, body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    `
  });

  const nomeDoLocal = todosOsLocais ? 'Todos os locais' : (locais.find((l) => l.id === local)?.nome || '');
  const semAtletas = (j) => {
    const s = atual?.itens[j.id];
    return s ? s.equipes.map((e) => e.atletas.length) : [];
  };

  // Mesa sem local não imprime nada (o backend também barra a escrita; aqui a tela avisa)
  if (isPlacar && !localDaMesa) return <TelaRestrita texto="Mesa sem local definido. Fale com o administrador." />;

  const linhaDoJogo = (j) => {
    const falha = atual?.falhas[j.id];
    const sumula = atual?.itens[j.id];
    const sem = sumula && !FOLHAS[sumula.folha?.tipo];
    const contagens = semAtletas(j);
    const aDefinir = !j.equipe_1.escola || !j.equipe_2.escola;
    return (
      <li key={j.id}>
        <label className="lote-marca">
          <input type="checkbox" checked={marcado(j)} onChange={() => alternar(j)}
            aria-label={`Imprimir ${nomeDaVaga(j.equipe_1)} x ${nomeDaVaga(j.equipe_2)}`} />
        </label>
        <span className="lote-hora">
          {j.numero_tabela && <span className="agenda-numero">Nº{' '}{j.numero_tabela}</span>}
          {j.hora || '--:--'}
        </span>
        <span className="lote-jogo">
          <strong>{nomeDaVaga(j.equipe_1)} x {nomeDaVaga(j.equipe_2)}</strong>
          <span className="text-soft">
            {nomeDaCompeticao(j.competicao)} · {nomeDaFase(j)}
            {j.status !== 'AGENDADO' ? ` · ${ROTULO_STATUS[j.status] || j.status}` : ''}
          </span>
          {falha && <span className="lote-alerta">Não carregou: {falha}</span>}
          {sem && <span className="lote-alerta">Sem folha desenhada para esta modalidade.</span>}
          {sumula && !sem && aDefinir && (
            <span className="text-soft">Mata-mata ainda sem equipe: a folha sai com a vaga e as linhas em branco.</span>
          )}
          {sumula && !sem && !aDefinir && contagens.some((n) => n === 0) && (
            <span className="lote-alerta">
              Atenção: {contagens[0]} atletas em {nomeDaVaga(j.equipe_1)} e {contagens[1]} em {nomeDaVaga(j.equipe_2)}
              {' '}(a folha sai com linhas vazias onde faltar).
            </span>
          )}
          {sumula && !sem && contagens.every((n) => n > 0) && (
            <span className="text-soft">{contagens[0]} + {contagens[1]} atletas</span>
          )}
        </span>
      </li>
    );
  };

  return (
    <div className="page">
      <div className="container-lg">
        <header className="page-header no-print">
          <p className="eyebrow">Súmulas em papel</p>
          <h1 className="page-title">Imprimir súmulas em branco</h1>
          <p className="page-subtitle">
            Escolha o dia e o local{isAdmin ? ' (ou todos os locais do dia)' : ''}. Sai uma folha A4 por jogo, na ordem
            da tabela, com os atletas inscritos e as camisas atuais de cada equipe.
            {isAdmin && <> <Link to={`/imprimir-suspensos?dia=${dia}`}>Lista de suspensos do dia</Link></>}
          </p>
        </header>

        {!pronta && (
          <div className="card no-print"><div className="state">
            <div className="spinner" />
            <p className="state-text">Carregando os jogos… o servidor pode levar até um minuto para acordar.</p>
          </div></div>
        )}

        {erroAgenda && (
          <div className="card no-print"><div className="state state-error">
            <div className="state-icon">⚠️</div>
            <p className="state-title">Não foi possível carregar os jogos</p>
            <p className="state-text">{erroAgenda}</p>
            <button className="btn btn-primary" onClick={() => setTentativa((t) => t + 1)}>Tentar novamente</button>
          </div></div>
        )}

        {pronta && !erroAgenda && (
          <>
            <div className="card lote-filtros no-print">
              <div className="agenda-dias" role="group" aria-label="Dia">
                {dias.map((d) => (
                  <button
                    key={d}
                    type="button"
                    className={`agenda-dia-botao${dia === d ? ' ativo' : ''}`}
                    aria-pressed={dia === d}
                    onClick={() => mudar('dia', d)}
                  >
                    {d.slice(8, 10)}/{d.slice(5, 7)}
                  </button>
                ))}
              </div>

              <label className="lote-campo">
                <span>Local</span>
                <select value={local} onChange={(e) => mudar('local', e.target.value)}>
                  {!isAdmin && <option value="">Escolha o local…</option>}
                  {isAdmin && <option value={TODOS}>Todos os locais do dia</option>}
                  {locais.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.nome}{localDaMesa && String(localDaMesa.id) === l.id ? ' (sua mesa)' : ''}
                    </option>
                  ))}
                </select>
              </label>

              <label className="lote-campo lote-check">
                <input type="checkbox" checked={comEncerrados} onChange={(e) => setComEncerrados(e.target.checked)} />
                <span>Incluir jogos já encerrados ou com W.O.</span>
              </label>
              {isAdmin && (
                <label className="lote-campo lote-check">
                  <input type="checkbox" checked={comAbertura} onChange={(e) => setComAbertura(e.target.checked)} />
                  <span>Folha de abertura em cada local (lista de jogos e atletas suspensos)</span>
                </label>
              )}
            </div>

            {!local && (
              <div className="alert alert-aviso mb-lg no-print">Escolha o local para ver os jogos.</div>
            )}

            {local && doLote.length === 0 && (
              <div className="card no-print"><div className="state state-compact">
                <div className="state-icon">📄</div>
                <p className="state-text">
                  Nenhum jogo {comEncerrados ? '' : 'a jogar '}{todosOsLocais ? '' : `em ${nomeDoLocal} `}neste dia.
                </p>
              </div></div>
            )}

            {doLote.length > 0 && (
              <div className="card no-print">
                <div className="card-body">
                  <h2 className="card-title">{rotuloDoDia(dia)} · {nomeDoLocal}</h2>
                  <p className="text-soft">
                    {doLote.length} {doLote.length === 1 ? 'jogo' : 'jogos'}
                    {todosOsLocais && ` em ${blocos.length} ${blocos.length === 1 ? 'local' : 'locais'}`}
                    {escondidos > 0 && ` (mais ${escondidos} já encerrado${escondidos > 1 ? 's' : ''}, fora da impressão)`}.
                    {carregando && atual && ` Carregando súmulas… ${atual.feitos}/${atual.total}`}
                    {carregando && !atual && ' Carregando súmulas…'}
                  </p>
                  {usarAbertura && !suspensosDoDiaAtual && <p className="text-soft">Calculando os suspensos do dia…</p>}
                  {usarAbertura && suspensosDoDiaAtual?.erro && (
                    <p className="lote-alerta">Suspensos não carregaram: {suspensosDoDiaAtual.erro}. A abertura sai sem a lista.</p>
                  )}
                  {usarAbertura && suspensosDoDiaAtual?.dados?.jogos_anteriores_sem_sumula > 0 && (
                    <p className="lote-alerta">
                      {suspensosDoDiaAtual.dados.jogos_anteriores_sem_sumula} jogo(s) de dias anteriores ainda sem súmula no
                      sistema: as suspensões deles não entram na lista.
                    </p>
                  )}

                  <div className="lote-selecao">
                    <button type="button" className="btn btn-outline btn-sm" onClick={() => guardar([])}>
                      Marcar todos
                    </button>
                    <button type="button" className="btn btn-outline btn-sm" onClick={() => guardar(doLote.map((j) => j.id))}>
                      Desmarcar todos
                    </button>
                    <span className="text-soft" aria-live="polite">
                      {marcados.length} de {doLote.length} {doLote.length === 1 ? 'jogo selecionado' : 'jogos selecionados'}
                    </span>
                  </div>

                  {blocos.map((bloco) => (
                    <Fragment key={bloco.id}>
                      {todosOsLocais && <h3 className="agenda-local-titulo lote-local">📍 {bloco.nome}</h3>}
                      <ul className="lote-lista">{bloco.jogos.map(linhaDoJogo)}</ul>
                    </Fragment>
                  ))}

                  <div className="acoes">
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={imprimir}
                      disabled={carregando || marcados.length === 0 || folhasProntas.length === 0
                        || (usarAbertura && !suspensosDoDiaAtual)}
                    >
                      🖨️ Imprimir {marcados.length} {marcados.length === 1 ? 'súmula' : 'súmulas'} em branco
                      {aberturas > 0 && ` + ${aberturas} ${aberturas === 1 ? 'abertura' : 'aberturas'}`}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* As folhas ficam fora da tela: só existem para a impressão */}
        <div className="lote-fora-da-tela" aria-hidden="true">
          <div ref={loteRef}>
            {blocos.map((bloco) => {
              const prontas = bloco.jogos.filter(folhaPronta);
              if (prontas.length === 0) return null;
              return (
                <Fragment key={bloco.id}>
                  {usarAbertura && (
                    <div className="lote-folha">
                      <AberturaDoLocal
                        dia={dia}
                        local={bloco}
                        jogos={prontas}
                        suspensos={suspensosDoBloco(bloco.id)}
                        dados={suspensosDoDiaAtual?.dados}
                        geradoEm={suspensosDoDiaAtual?.geradoEm}
                        erroSuspensos={suspensosDoDiaAtual?.erro}
                      />
                    </div>
                  )}
                  {prontas.map((j) => {
                    const { evento, jogo, equipes, folha, sets } = atual.itens[j.id];
                    const Folha = FOLHAS[folha.tipo];
                    return (
                      <div key={j.id} className="lote-folha">
                        <div className={`folha-sumula print-area folha-tipo-${folha.tipo.toLowerCase()}`}>
                          <Folha evento={evento} jogo={jogo} equipes={equipes} sets={sets} folha={folha} emBranco />
                        </div>
                      </div>
                    );
                  })}
                </Fragment>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ImprimirSumulas;
