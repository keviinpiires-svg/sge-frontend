import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useReactToPrint } from 'react-to-print';
import { listarAgenda } from '../services/agenda';
import { buscarSumulaPorJogo } from '../services/sumulas';
import { hojeNoEvento, dataPorExtenso } from '../services/datas';
import { useAuth } from '../context/useAuth';
import { nomeDaCompeticao, nomeDaFase, ROTULO_STATUS } from '../components/agendaTextos';
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

const rotuloDoDia = (dia) => {
  const texto = dataPorExtenso(dia);
  return texto.charAt(0).toUpperCase() + texto.slice(1);
};

// Plano B em papel: todas as súmulas EM BRANCO de um dia e de um local, numa
// impressão só, cada uma numa folha A4, já com os atletas inscritos de cada equipe.
function ImprimirSumulas() {
  const { localDaMesa } = useAuth();
  const [parametros, setParametros] = useSearchParams();
  const [agenda, setAgenda] = useState(null);
  const [tentativa, setTentativa] = useState(0);
  const [comEncerrados, setComEncerrados] = useState(false);
  const [carga, setCarga] = useState(null);
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
  const locais = useMemo(() => {
    const mapa = new Map();
    jogos.forEach((j) => { if (j.local) mapa.set(String(j.local.id), j.local.nome); });
    return [...mapa.entries()].sort((a, b) => a[1].localeCompare(b[1], 'pt-BR'));
  }, [jogos]);

  // Dia: o da URL; senão hoje (se tiver jogo) ou o primeiro dia. Local: o da URL
  // ou o da mesa; sem nenhum dos dois, a pessoa escolhe.
  const hoje = hojeNoEvento();
  const dia = parametros.get('dia') || (dias.includes(hoje) ? hoje : dias[0] || '');
  const local = parametros.get('local') || (localDaMesa ? String(localDaMesa.id) : '');

  const mudar = (chave, valor) => {
    const novos = new URLSearchParams(parametros);
    // O padrão vira escolha explícita ao mexer, para o link ficar completo
    if (!novos.has('dia') && dia) novos.set('dia', dia);
    if (!novos.has('local') && local) novos.set('local', local);
    if (valor) novos.set(chave, valor); else novos.delete(chave);
    setParametros(novos, { replace: true });
  };

  const doLocalEDia = jogos.filter((j) => j.data === dia && local && String(j.local?.id) === local);
  const doLote = doLocalEDia.filter((j) => comEncerrados || j.status === 'AGENDADO' || j.status === 'EM_ANDAMENTO');
  const escondidos = doLocalEDia.length - doLote.length;

  const chave = doLote.map((j) => j.id).join(',');

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

  const atual = carga?.chave === chave ? carga : null;
  const carregando = Boolean(chave) && (!atual || atual.feitos < atual.total);
  const folhasProntas = doLote.filter((j) => atual?.itens[j.id] && FOLHAS[atual.itens[j.id].folha?.tipo]);

  const imprimir = useReactToPrint({
    contentRef: loteRef,
    documentTitle: `Sumulas_em_branco_${dia}_${local}`,
    pageStyle: `
      @page { size: A4 portrait; margin: 0; }
      html, body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    `
  });

  const nomeDoLocal = locais.find(([id]) => id === local)?.[1] || '';
  const semAtletas = (j) => {
    const s = atual?.itens[j.id];
    return s ? s.equipes.map((e) => e.atletas.length) : [];
  };

  return (
    <div className="page">
      <div className="container-lg">
        <header className="page-header no-print">
          <p className="eyebrow">Plano B em papel</p>
          <h1 className="page-title">Imprimir súmulas em branco</h1>
          <p className="page-subtitle">
            Escolha o dia e o local. Sai uma folha A4 por jogo, com os atletas inscritos de cada equipe e
            espaço para gols, cartões e assinaturas.
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
                  <option value="">Escolha o local…</option>
                  {locais.map(([id, nome]) => (
                    <option key={id} value={id}>
                      {nome}{localDaMesa && String(localDaMesa.id) === id ? ' (sua mesa)' : ''}
                    </option>
                  ))}
                </select>
              </label>

              <label className="lote-campo lote-check">
                <input type="checkbox" checked={comEncerrados} onChange={(e) => setComEncerrados(e.target.checked)} />
                <span>Incluir jogos já encerrados ou com W.O.</span>
              </label>
            </div>

            {!local && (
              <div className="alert alert-aviso mb-lg no-print">Escolha o local para ver os jogos.</div>
            )}

            {local && doLote.length === 0 && (
              <div className="card no-print"><div className="state state-compact">
                <div className="state-icon">📄</div>
                <p className="state-text">
                  Nenhum jogo {comEncerrados ? '' : 'a jogar '}em {nomeDoLocal} neste dia.
                </p>
              </div></div>
            )}

            {doLote.length > 0 && (
              <div className="card no-print">
                <div className="card-body">
                  <h2 className="card-title">{rotuloDoDia(dia)} · {nomeDoLocal}</h2>
                  <p className="text-soft">
                    {doLote.length} {doLote.length === 1 ? 'jogo' : 'jogos'}
                    {escondidos > 0 && ` (mais ${escondidos} já encerrado${escondidos > 1 ? 's' : ''}, fora da impressão)`}.
                    {carregando && atual && ` Carregando súmulas… ${atual.feitos}/${atual.total}`}
                    {carregando && !atual && ' Carregando súmulas…'}
                  </p>

                  <ul className="lote-lista">
                    {doLote.map((j) => {
                      const falha = atual?.falhas[j.id];
                      const sumula = atual?.itens[j.id];
                      const sem = sumula && !FOLHAS[sumula.folha?.tipo];
                      const contagens = semAtletas(j);
                      return (
                        <li key={j.id}>
                          <span className="lote-hora">{j.hora || '--:--'}</span>
                          <span className="lote-jogo">
                            <strong>{j.equipe_1.escola} x {j.equipe_2.escola}</strong>
                            <span className="text-soft">
                              {nomeDaCompeticao(j.competicao)} · {nomeDaFase(j)}
                              {j.numero_tabela ? ` · Tabela nº ${j.numero_tabela}` : ''}
                              {j.status !== 'AGENDADO' ? ` · ${ROTULO_STATUS[j.status] || j.status}` : ''}
                            </span>
                            {falha && <span className="lote-alerta">Não carregou: {falha}</span>}
                            {sem && <span className="lote-alerta">Sem folha desenhada para esta modalidade.</span>}
                            {sumula && !sem && contagens.some((n) => n === 0) && (
                              <span className="lote-alerta">
                                Atenção: {contagens[0]} atletas em {j.equipe_1.escola} e {contagens[1]} em {j.equipe_2.escola}
                                {' '}(a folha sai com linhas vazias onde faltar).
                              </span>
                            )}
                            {sumula && !sem && contagens.every((n) => n > 0) && (
                              <span className="text-soft">{contagens[0]} + {contagens[1]} atletas</span>
                            )}
                          </span>
                        </li>
                      );
                    })}
                  </ul>

                  <div className="acoes">
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={imprimir}
                      disabled={carregando || folhasProntas.length === 0}
                    >
                      🖨️ Imprimir {folhasProntas.length} {folhasProntas.length === 1 ? 'súmula' : 'súmulas'} em branco
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
            {folhasProntas.map((j) => {
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
          </div>
        </div>
      </div>
    </div>
  );
}

export default ImprimirSumulas;
