import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { listarAgenda } from '../services/agenda';
import { dataPorExtenso, hojeNoEvento } from '../services/datas';
import {
  CLASSE_STATUS, ROTULO_GENERO, ROTULO_STATUS, nomeDaCompeticao, nomeDaFase, normalizar
} from '../components/agendaTextos';

// Agenda de Jogos — pública e só de leitura, pensada para o celular.
// Uma chamada só traz todos os jogos (GET /api/agenda); os filtros rodam aqui,
// e ficam na URL para o link poder ser compartilhado.

const PRIMEIRO_DIA = '2026-11-23';
const ULTIMO_DIA = '2026-11-28';
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

// Dia padrão: hoje, se estiver entre 23 e 28/11/2026; senão o primeiro dia
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

  useEffect(() => {
    let ativo = true;
    listarAgenda()
      .then((jogos) => { if (ativo) setResultado({ tentativa, jogos, erro: '' }); })
      .catch((falha) => { if (ativo) setResultado({ tentativa, jogos: [], erro: falha.mensagem }); });
    return () => { ativo = false; };
  }, [tentativa]);

  const pronto = resultado?.tentativa === tentativa;
  const jogos = useMemo(() => (pronto ? resultado.jogos : []), [pronto, resultado]);
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
      escolas: unicos(jogos.flatMap((j) => [j.equipe_1.escola, j.equipe_2.escola]).map((e) => ({ valor: e, rotulo: e })))
    };
  }, [jogos]);

  const filtro = {
    dia: parametros.has('dia') ? parametros.get('dia') : diaPadrao(opcoes.dias),
    local: parametros.get('local') || TODOS,
    modalidade: parametros.get('modalidade') || TODOS,
    categoria: parametros.get('categoria') || TODOS,
    escola: parametros.get('escola') || TODOS,
    busca: parametros.get('busca') || ''
  };

  const mudar = (chave, valor) => {
    const novos = new URLSearchParams(parametros);
    if (chave === 'dia') novos.set('dia', valor);
    else if (valor) novos.set(chave, valor);
    else novos.delete(chave);
    setParametros(novos, { replace: true });
  };

  const limpar = () => {
    const novos = new URLSearchParams();
    if (parametros.has('dia')) novos.set('dia', parametros.get('dia'));
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
      const busca = normalizar(filtro.busca);
      if (!normalizar(j.equipe_1.escola).includes(busca) && !normalizar(j.equipe_2.escola).includes(busca)) return false;
    }
    return true;
  });

  // Dia -> local -> jogos (o backend já manda em ordem de dia, local e hora)
  const porDia = [];
  for (const jogo of filtrados) {
    const dia = jogo.data || SEM_DATA;
    let grupoDia = porDia.find((g) => g.dia === dia);
    if (!grupoDia) { grupoDia = { dia, locais: [] }; porDia.push(grupoDia); }
    const nomeLocal = jogo.local?.nome || 'Local a definir';
    let grupoLocal = grupoDia.locais.find((g) => g.nome === nomeLocal);
    if (!grupoLocal) { grupoLocal = { nome: nomeLocal, jogos: [] }; grupoDia.locais.push(grupoLocal); }
    grupoLocal.jogos.push(jogo);
  }

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
            <h3 className="agenda-local-titulo">📍 {grupoLocal.nome}</h3>
            <ul className="agenda-jogos">
              {grupoLocal.jogos.map((jogo) => (
                <li key={jogo.id}>
                  <Link className="agenda-jogo" to={`/agenda/${jogo.id}${query ? `?${query}` : ''}`}>
                    <span className="agenda-hora">{jogo.hora || '--:--'}</span>
                    <span className="agenda-corpo">
                      <span className="agenda-competicao">
                        {nomeDaCompeticao(jogo.competicao)} · {nomeDaFase(jogo)} · Jogo {jogo.numero_jogo}
                      </span>
                      <span className="agenda-confronto">
                        {jogo.equipe_1.escola}
                        {jogo.placar
                          ? <strong className="agenda-placar"> {jogo.placar.equipe_1} × {jogo.placar.equipe_2} </strong>
                          : <span className="agenda-x"> x </span>}
                        {jogo.equipe_2.escola}
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
                <span className="form-label">Buscar escola</span>
                <input
                  type="search"
                  className="form-control"
                  placeholder="Ex.: José Dias"
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
