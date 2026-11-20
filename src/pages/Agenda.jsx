import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { listarAgenda } from '../services/agenda';
import { useAuth } from '../context/useAuth';
import { dataPorExtenso, hojeNoEvento } from '../services/datas';
import {
  CLASSE_STATUS, ROTULO_GENERO, ROTULO_STATUS, nomeDaCompeticao, nomeDaFase, classeDaFase, ordemNasCompeticoes, normalizar, nomeDaVaga, vagaEmAberto
} from '../components/agendaTextos';

// Agenda de Jogos — pública e só de leitura, pensada para o celular.
// Uma chamada só traz todos os jogos (GET /api/agenda); os filtros rodam aqui,
// e ficam na URL para o link poder ser compartilhado.

const PRIMEIRO_DIA = '2026-11-18';
const ULTIMO_DIA = '2026-11-21';
const SEM_DATA = 'sem-data';
const TODOS = '';

// "Terça-feira, 24 de novembro"
const rotuloDoDia = (dia) => {
  if (dia === SEM_DATA) return 'Sem data marcada';
  const texto = dataPorExtenso(dia);
  return texto.charAt(0).toUpperCase() + texto.slice(1);
};

// "Ter 24/11", para os botões de dia
const rotuloCurtoDoDia = (dia) => {
  if (dia === SEM_DATA) return 'Sem data';
  const [, mes, d] = dia.split('-');
  const semana = dataPorExtenso(dia).slice(0, 3);
  return `${semana.charAt(0).toUpperCase()}${semana.slice(1)} ${d}/${mes}`;
};

// Dia padrão: hoje, se estiver entre 18 e 21/11/2026; senão o primeiro dia
// que tem jogo
const diaPadrao = (dias) => {
  const hoje = hojeNoEvento();
  if (hoje >= PRIMEIRO_DIA && hoje <= ULTIMO_DIA) return hoje;
  return dias[0] || TODOS;
};

function Esqueleto() {
  return (
    <div className="agenda-esqueleto" aria-busy="true" aria-label="Carregando a agenda">
      <p className="state-text">
        Carregando a agenda… o servidor pode levar até um minuto para acordar.
      </p>
      {[0, 1, 2].map((bloco) => (
        <div key={bloco} className="agenda-esqueleto-bloco">
          <div className="esqueleto esqueleto-titulo" />
          {[0, 1, 2].map((linha) => <div key={linha} className="esqueleto esqueleto-linha" />)}
        </div>
      ))}
    </div>
  );
}

function Agenda() {
  const [resultado, setResultado] = useState(null);
  const [tentativa, setTentativa] = useState(0);
  const [parametros, setParametros] = useSearchParams();
  const [filtrosAbertos, setFiltrosAbertos] = useState(false);
  // Mesa com local (db/18): o local dela vem primeiro e marcado; os outros
  // continuam na lista
  const { localDaMesa, podeLancarNoLocal } = useAuth();
  // "Ver todos os locais" da mesa vive só neste estado (não na URL, nem no navegador): toda vez que a
  // Agenda abre, a mesa começa vendo só o local dela
  const [verTodosOsLocais, setVerTodosOsLocais] = useState(false);
  const idDaMesa = localDaMesa ? String(localDaMesa.id) : null;

  useEffect(() => {
    let ativo = true;
    listarAgenda()
      .then((jogos) => { if (ativo) setResultado({ tentativa, jogos, erro: '' }); })
      .catch((falha) => { if (ativo) setResultado({ tentativa, jogos: [], erro: falha.mensagem }); });
    return () => { ativo = false; };
  }, [tentativa]);

  const pronto = resultado?.tentativa === tentativa;
  const jogos = useMemo(() => (pronto ? resultado.jogos : []), [pronto, resultado]);
  // Ordem de cada jogo na competição ("Final – jogo 1" e "jogo 2" no melhor de dois jogos),
  // sobre a lista inteira, não a filtrada
  const ordemDosJogos = useMemo(
    () => ordemNasCompeticoes(jogos, (j) => j.competicao.id, (j) => (j.data ? `${j.data} ${j.hora || ''}` : null)),
    [jogos]
  );
  const erro = pronto ? resultado.erro : '';

  // Opções dos filtros, tiradas dos próprios jogos
  const opcoes = useMemo(() => {
    const unicos = (lista) => [...new Map(lista.map((x) => [x.valor, x])).values()]
      .sort((a, b) => a.rotulo.localeCompare(b.rotulo, 'pt-BR'));
    const dias = [...new Set(jogos.map((j) => j.data || SEM_DATA))]
      .sort((a, b) => (a === SEM_DATA ? 1 : b === SEM_DATA ? -1 : a.localeCompare(b)));
    return {
      dias,
      locais: unicos(jogos.filter((j) => j.local).map((j) => ({ valor: String(j.local.id), rotulo: j.local.nome }))),
      modalidades: unicos(jogos.map((j) => ({ valor: j.competicao.modalidade_slug, rotulo: j.competicao.modalidade }))),
      categorias: unicos(jogos.map((j) => ({
        valor: `${j.competicao.categoria}|${j.competicao.genero}`,
        rotulo: `${j.competicao.categoria} ${ROTULO_GENERO[j.competicao.genero] || j.competicao.genero}`
      }))),
      escolas: unicos(jogos.flatMap((j) => [j.equipe_1.escola, j.equipe_2.escola]).filter(Boolean).map((e) => ({ valor: e, rotulo: e })))
    };
  }, [jogos]);

  const filtro = {
    dia: parametros.has('dia') ? parametros.get('dia') : diaPadrao(opcoes.dias),
    // Mesa com local: por padrão só o local dela; o botão "Ver todos os locais" mostra tudo (só consulta).
    // Um `local=` na URL só vale se for um id (link antigo com `local=todos` é ignorado).
    local: /^[0-9]+$/.test(parametros.get('local') || '')
      ? parametros.get('local')
      : (idDaMesa && !verTodosOsLocais ? idDaMesa : TODOS),
    modalidade: parametros.get('modalidade') || TODOS,
    categoria: parametros.get('categoria') || TODOS,
    escola: parametros.get('escola') || TODOS,
    busca: parametros.get('busca') || ''
  };

  const mudar = (chave, valor) => {
    const novos = new URLSearchParams(parametros);
    if (chave === 'dia') novos.set('dia', valor);
    // mesa com local: escolher "todos" no filtro é ver todos os locais; escolher um local é só ele
    else if (chave === 'local' && idDaMesa) { setVerTodosOsLocais(!valor); novos.delete('local'); if (valor && valor !== idDaMesa) novos.set('local', valor); }
    else if (valor) novos.set(chave, valor);
    else novos.delete(chave);
    setParametros(novos, { replace: true });
  };

  const limpar = () => {
    const novos = new URLSearchParams();
    if (parametros.has('dia')) novos.set('dia', parametros.get('dia'));
    setVerTodosOsLocais(false); // a mesa volta a ver só o local dela
    setParametros(novos, { replace: true });
  };

  const filtrosAtivos = [filtro.local, filtro.modalidade, filtro.categoria, filtro.escola].filter(Boolean).length;
  const temFiltro = Boolean(filtrosAtivos || filtro.busca);

  const filtrados = jogos.filter((j) => {
    if (filtro.dia && (j.data || SEM_DATA) !== filtro.dia) return false;
    if (filtro.local && String(j.local?.id) !== filtro.local) return false;
    if (filtro.modalidade && j.competicao.modalidade_slug !== filtro.modalidade) return false;
    if (filtro.categoria && `${j.competicao.categoria}|${j.competicao.genero}` !== filtro.categoria) return false;
    if (filtro.escola && j.equipe_1.escola !== filtro.escola && j.equipe_2.escola !== filtro.escola) return false;
    if (filtro.busca) {
      // Só número ("163" ou "nº 163"): procura o número da tabela do chefe;
      // senão, o nome da escola (sem acento nem maiúscula)
      const numero = /^\s*(?:n[º°o]?\.?\s*)?(\d+)\s*$/i.exec(filtro.busca);
      if (numero) {
        if (j.numero_tabela !== Number(numero[1])) return false;
      } else {
        const busca = normalizar(filtro.busca);
        if (!normalizar(j.equipe_1.escola).includes(busca) && !normalizar(j.equipe_2.escola).includes(busca)) return false;
      }
    }
    return true;
  });

  // Ordem da tabela do chefe (numero_tabela, nº 1 a 299): dia -> local -> jogo.
  // Em cada dia, os locais vêm na ordem em que aparecem na tabela (pelo menor nº
  // de cada local naquele dia, contado em TODOS os jogos, não só nos filtrados),
  // e os jogos de cada local em ordem de nº. Jogo sem nº vai para o fim do local,
  // pelo horário. Vale para todas as abas, a busca e os filtros; o local da mesa
  // não sobe para o topo.
  const ordemDoLocal = new Map();
  for (const j of jogos) {
    if (j.numero_tabela == null) continue;
    const chave = `${j.data || SEM_DATA}|${j.local?.id ?? ''}`;
    if (!ordemDoLocal.has(chave) || j.numero_tabela < ordemDoLocal.get(chave)) ordemDoLocal.set(chave, j.numero_tabela);
  }
  const posicaoDoLocal = (j) => ordemDoLocal.get(`${j.data || SEM_DATA}|${j.local?.id ?? ''}`) ?? Infinity;
  const naOrdemDaTabela = [...filtrados].sort((a, b) => {
    const diaA = a.data || SEM_DATA;
    const diaB = b.data || SEM_DATA;
    if (diaA !== diaB) return diaA === SEM_DATA ? 1 : diaB === SEM_DATA ? -1 : diaA.localeCompare(diaB);
    const localA = posicaoDoLocal(a);
    const localB = posicaoDoLocal(b);
    if (localA !== localB) return localA - localB;
    const nA = a.numero_tabela ?? Infinity;
    const nB = b.numero_tabela ?? Infinity;
    if (nA !== nB) return nA - nB;
    return (a.hora || '99:99').localeCompare(b.hora || '99:99') || a.id - b.id;
  });

  const porDia = [];
  for (const jogo of naOrdemDaTabela) {
    const dia = jogo.data || SEM_DATA;
    let grupoDia = porDia.find((g) => g.dia === dia);
    if (!grupoDia) { grupoDia = { dia, locais: [] }; porDia.push(grupoDia); }
    const nomeLocal = jogo.local?.nome || 'Local a definir';
    let grupoLocal = grupoDia.locais.find((g) => g.nome === nomeLocal);
    if (!grupoLocal) {
      grupoLocal = { nome: nomeLocal, localId: jogo.local?.id ?? null, daMesa: idDaMesa !== null && String(jogo.local?.id) === idDaMesa, jogos: [] };
      grupoDia.locais.push(grupoLocal);
    }
    grupoLocal.jogos.push(jogo);
  }
  const soOMeuLocal = idDaMesa !== null && filtro.local === idDaMesa;

  const query = parametros.toString();

  const renderLista = () => {
    if (!pronto) return <Esqueleto />;

    if (erro) {
      return (
        <div className="card">
          <div className="state state-error">
            <div className="state-icon">⚠️</div>
            <p className="state-title">Não foi possível carregar a agenda</p>
            <p className="state-text">{erro}</p>
            <button className="btn btn-primary" onClick={() => setTentativa((t) => t + 1)}>
              Tentar novamente
            </button>
          </div>
        </div>
      );
    }

    if (jogos.length === 0) {
      return (
        <div className="card">
          <div className="state state-compact">
            <div className="state-icon">📅</div>
            <p className="state-text">Nenhum jogo cadastrado ainda.</p>
          </div>
        </div>
      );
    }

    if (porDia.length === 0) {
      return (
        <div className="card">
          <div className="state state-compact">
            <div className="state-icon">🔎</div>
            <p className="state-text">Nenhum jogo com esses filtros{filtro.dia ? ' neste dia' : ''}.</p>
            {temFiltro && <button className="btn btn-outline btn-sm" onClick={limpar}>Limpar filtros</button>}
          </div>
        </div>
      );
    }

    return porDia.map((grupoDia) => (
      <section key={grupoDia.dia} className="agenda-dia">
        <h2 className="agenda-dia-titulo">{rotuloDoDia(grupoDia.dia)}</h2>
        {grupoDia.locais.map((grupoLocal) => (
          <div key={grupoLocal.nome} className="agenda-local">
            <h3 className="agenda-local-titulo">
              📍 {grupoLocal.nome}
              {grupoLocal.daMesa && <span className="badge badge-accent" style={{ marginLeft: '8px' }}>sua mesa</span>}
              {/* Só o ADMIN e a mesa DESTE local: a Agenda é pública */}
              {podeLancarNoLocal(grupoLocal.localId) && grupoDia.dia !== SEM_DATA && (
                <Link className="btn btn-outline btn-sm agenda-imprimir"
                  to={`/imprimir-sumulas?dia=${grupoDia.dia}&local=${grupoLocal.localId}`}>
                  🖨️ Súmulas em branco
                </Link>
              )}
            </h3>
            <ul className="agenda-jogos">
              {grupoLocal.jogos.map((jogo) => (
                <li key={jogo.id}>
                  <Link className="agenda-jogo" to={`/agenda/${jogo.id}${query ? `?${query}` : ''}`}>
                    <span className="agenda-hora">
                      {jogo.numero_tabela && <span className="agenda-numero">Nº{' '}{jogo.numero_tabela}</span>}
                      {jogo.hora || '--:--'}
                    </span>
                    <span className="agenda-corpo">
                      <span className="agenda-competicao">
                        {nomeDaCompeticao(jogo.competicao)} · {classeDaFase(jogo)
                          ? <span className={classeDaFase(jogo)}>{nomeDaFase(jogo, ordemDosJogos.get(jogo.id))}</span>
                          : nomeDaFase(jogo)} · Jogo{'\u00a0'}{jogo.numero_jogo}
                      </span>
                      <span className="agenda-confronto">
                        <span className={vagaEmAberto(jogo.equipe_1) ? 'agenda-a-definir' : undefined}>{nomeDaVaga(jogo.equipe_1)}</span>
                        {jogo.placar
                          ? <strong className="agenda-placar"> {jogo.placar.equipe_1} × {jogo.placar.equipe_2} </strong>
                          : <span className="agenda-x"> x </span>}
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
          </div>
        ))}
      </section>
    ));
  };

  return (
    <div className="page">
      <div className="container-lg">
        <header className="page-header">
          <p className="eyebrow">Jogos Estudantis 2026</p>
          <h1 className="page-title">Agenda de Jogos</h1>
          <p className="page-subtitle">Horários de Barra do Choça. Toque num jogo para ver os atletas.</p>
        </header>

        {localDaMesa && (
          <div className="alert alert-aviso mb-lg">
            Sua mesa é do local <b>{localDaMesa.nome}</b>: {soOMeuLocal ? 'você vê só os jogos dele' : 'os jogos dele estão marcados como "sua mesa", na ordem da tabela'}.
            Você só inicia e lança súmula de jogo deste local; os outros locais são só para consulta.{' '}
            <button type="button" className="btn btn-outline btn-sm"
              onClick={() => mudar('local', soOMeuLocal ? TODOS : idDaMesa)}>
              {soOMeuLocal ? 'Ver todos os locais' : 'Só o meu local'}
            </button>
          </div>
        )}

        {pronto && !erro && jogos.length > 0 && (
          <div className="agenda-filtros">
            <div className="agenda-dias" role="group" aria-label="Dia">
              {opcoes.dias.map((dia) => (
                <button
                  key={dia}
                  type="button"
                  className={`agenda-dia-botao${filtro.dia === dia ? ' ativo' : ''}`}
                  aria-pressed={filtro.dia === dia}
                  onClick={() => mudar('dia', dia)}
                >
                  {rotuloCurtoDoDia(dia)}
                </button>
              ))}
              <button
                type="button"
                className={`agenda-dia-botao${filtro.dia === TODOS ? ' ativo' : ''}`}
                aria-pressed={filtro.dia === TODOS}
                onClick={() => mudar('dia', TODOS)}
              >
                Todos
              </button>
            </div>

            <div className="agenda-campos">
              <label className="form-group">
                <span className="form-label">Buscar escola ou nº da tabela</span>
                <input
                  type="search"
                  className="form-control"
                  placeholder="Ex.: José Dias ou 163"
                  value={filtro.busca}
                  onChange={(e) => mudar('busca', e.target.value)}
                />
              </label>
            </div>
            {/* No celular os outros filtros ficam recolhidos, para os jogos
                aparecerem logo na primeira tela */}
            <details className="agenda-mais-filtros" open={filtrosAbertos}>
              <summary onClick={(e) => { e.preventDefault(); setFiltrosAbertos((v) => !v); }}>
                Mais filtros{filtrosAtivos ? ` (${filtrosAtivos} ${filtrosAtivos === 1 ? 'ativo' : 'ativos'})` : ''}
              </summary>
              <div className="agenda-campos agenda-campos-extra">
              <label className="form-group">
                <span className="form-label">Local</span>
                <select className="form-control" value={filtro.local} onChange={(e) => mudar('local', e.target.value)}>
                  <option value="">Todos os locais</option>
                  {opcoes.locais.map((o) => <option key={o.valor} value={o.valor}>{o.rotulo}</option>)}
                </select>
              </label>
              <label className="form-group">
                <span className="form-label">Modalidade</span>
                <select className="form-control" value={filtro.modalidade} onChange={(e) => mudar('modalidade', e.target.value)}>
                  <option value="">Todas</option>
                  {opcoes.modalidades.map((o) => <option key={o.valor} value={o.valor}>{o.rotulo}</option>)}
                </select>
              </label>
              <label className="form-group">
                <span className="form-label">Categoria e gênero</span>
                <select className="form-control" value={filtro.categoria} onChange={(e) => mudar('categoria', e.target.value)}>
                  <option value="">Todas</option>
                  {opcoes.categorias.map((o) => <option key={o.valor} value={o.valor}>{o.rotulo}</option>)}
                </select>
              </label>
              <label className="form-group">
                <span className="form-label">Escola</span>
                <select className="form-control" value={filtro.escola} onChange={(e) => mudar('escola', e.target.value)}>
                  <option value="">Todas</option>
                  {opcoes.escolas.map((o) => <option key={o.valor} value={o.valor}>{o.rotulo}</option>)}
                </select>
              </label>
              </div>
            </details>
            {temFiltro && (
              <button type="button" className="btn btn-outline btn-sm agenda-limpar" onClick={limpar}>
                Limpar filtros
              </button>
            )}
          </div>
        )}

        <p className="agenda-contagem" aria-live="polite">
          {pronto && !erro && jogos.length > 0 && `${filtrados.length} ${filtrados.length === 1 ? 'jogo' : 'jogos'}`}
        </p>

        {renderLista()}
      </div>
    </div>
  );
}

export default Agenda;
