import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import Contador from '../components/Contador';
import { buscarSumulaPorJogo, registrarSumula } from '../services/sumulas';
import { suspensosNoJogo } from '../services/suspensoes';
import { salvarCamisas } from '../services/equipes';
import { protegerSessao } from '../services/token';
import { FUSO_DO_EVENTO } from '../services/datas';
import { fotografarSumula, lerRascunho, gravarRascunho, apagarRascunho } from '../services/rascunhoSumula';

const TEXTO_DO_PLACAR = {
  Gols: 'a soma dos gols lançados',
  Pontos: 'a soma dos pontos lançados'
};

// A súmula é regravada inteira a cada envio, então o estado local é a folha
// toda: as duas equipes, cada uma com o seu rodapé e as suas linhas.
// Quais colunas existem (cartões, faltas, quanto cabe em cada uma) vem do
// backend, de src/config/folhasSumula.js: o basquete não tem cartão e o
// futsal não tem falta por atleta.
// Número da camisa em texto comparável ("07" = "7", vazio = sem número)
const normalizarCamisa = (texto) => (texto === '' || texto === undefined ? '' : String(Number(texto)));

// Só as camisas digitadas que diferem do que está gravado na inscrição (atleta_id -> texto)
const camisasAlteradas = (atuais, salvas) => Object.fromEntries(
  Object.entries(atuais).filter(([atleta, texto]) => normalizarCamisa(texto) !== normalizarCamisa(salvas[atleta] ?? ''))
);

function PreencherSumula() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [carga, setCarga] = useState(null);      // { id, dados, erro }
  const [equipes, setEquipes] = useState(null);  // cópia editável da folha
  const [penaltis, setPenaltis] = useState({ penaltis_1: 0, penaltis_2: 0 });
  const [sets, setSets] = useState(null);       // vôlei: os três sets do papel
  const [prorrogacao, setProrrogacao] = useState(false);
  // Semifinal ou final do baleado empatada: quem baleou primeiro no acréscimo
  const [baleouPrimeiro, setBaleouPrimeiro] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const [aviso, setAviso] = useState(null);
  const [suspensao, setSuspensao] = useState(null);
  // A sessão (o token) venceu com a súmula aberta: a tela avisa e mantém o que foi digitado
  const [sessaoVencida, setSessaoVencida] = useState(false);
  // Rascunho achado no navegador ao abrir, à espera de a mesa decidir se restaura
  const [rascunho, setRascunho] = useState(null);
  // Como a súmula estava quando foi carregada ou salva: só o que difere disso vira rascunho
  const inicial = useRef('');
  // Espera de 600 ms do rascunho: cancelada ao salvar a súmula, para não gravar rascunho depois de salvar
  const esperaRascunho = useRef(null);
  // Número da camisa: digitado aqui e gravado na INSCRIÇÃO (PUT /equipes/:id/camisas). Fica fora do
  // rascunho da súmula, porque não é lançamento do jogo e sim cadastro da equipe.
  const [camisas, setCamisas] = useState({});             // atleta_id -> texto digitado
  const [camisasSalvas, setCamisasSalvas] = useState({}); // atleta_id -> texto que está gravado
  const [msgCamisa, setMsgCamisa] = useState({});         // equipe_id -> { tipo, texto }
  const [salvandoCamisa, setSalvandoCamisa] = useState(null);
  const campos = useRef({});                              // "equipe:posição" -> campo, para o Enter

  const pronto = carga?.id === id;
  const erro = pronto ? carga.erro : '';
  const sumula = pronto ? carga.dados : null;

  useEffect(() => {
    let ativo = true;

    buscarSumulaPorJogo(id)
      .then((dados) => {
        if (!ativo) return;
        setCarga({ id, dados, erro: '' });
        setEquipes(dados.equipes);
        setSets(dados.sets);
        setPenaltis({
          penaltis_1: dados.jogo.penaltis_1 ?? 0,
          penaltis_2: dados.jogo.penaltis_2 ?? 0
        });
        setBaleouPrimeiro(dados.jogo.baleou_primeiro_equipe_id ?? null);
        const camisasDoBanco = {};
        dados.equipes.forEach((e) => e.atletas.forEach((a) => {
          camisasDoBanco[a.atleta_id] = a.numero_camisa === null || a.numero_camisa === undefined ? '' : String(a.numero_camisa);
        }));
        setCamisas(camisasDoBanco);
        setCamisasSalvas(camisasDoBanco);
        setMsgCamisa({});
        inicial.current = JSON.stringify(fotografarSumula({
          equipes: dados.equipes,
          penaltis: { penaltis_1: dados.jogo.penaltis_1 ?? 0, penaltis_2: dados.jogo.penaltis_2 ?? 0 },
          sets: dados.sets,
          prorrogacao: false,
          baleouPrimeiro: dados.jogo.baleou_primeiro_equipe_id ?? null,
          camisas: {}
        }));
        const guardado = lerRascunho(id);
        // Rascunho antigo, sem o campo das camisas, é lido como "nenhuma camisa digitada"
        const igualAoBanco = guardado
          && JSON.stringify({ ...guardado.dados, camisas: guardado.dados.camisas || {} }) === inicial.current;
        setRascunho(guardado && !igualAoBanco ? guardado : null);
      })
      .catch((falha) => {
        if (ativo) setCarga({ id, dados: null, erro: falha.mensagem });
      });

    return () => {
      ativo = false;
    };
  }, [id]);

  useEffect(() => {
    let ativo = true;

    suspensosNoJogo(id)
      .then((dados) => {
        if (ativo) setSuspensao({ id, dados });
      })
      .catch(() => {
        // A súmula não depende disto para ser preenchida: sem a lista, a
        // tela segue sem os avisos em vez de travar.
        if (ativo) setSuspensao({ id, dados: null });
      });

    return () => {
      ativo = false;
    };
  }, [id]);

  // Token vencido durante a súmula: em vez de mandar para o login (o que recarrega a página e
  // apaga a folha), a tela mostra o aviso e segue com os dados na tela
  useEffect(() => protegerSessao(() => {
    setSessaoVencida(true);
    return true;
  }), []);

  // Rascunho no navegador: a cada mudança (com uma pequena espera), até a súmula ser salva
  useEffect(() => {
    if (carga?.id !== id || !equipes || !inicial.current || rascunho) return undefined;
    const agora = JSON.stringify(fotografarSumula({
      equipes, penaltis, sets, prorrogacao, baleouPrimeiro, camisas: camisasAlteradas(camisas, camisasSalvas)
    }));
    // Nada difere do que está no servidor (por exemplo, depois de salvar): não sobra rascunho
    if (agora === inicial.current) {
      apagarRascunho(id);
      return undefined;
    }
    esperaRascunho.current = setTimeout(() => {
      // Conferido de novo na hora: se a súmula foi salva nesse meio tempo, não há o que guardar
      if (agora !== inicial.current) gravarRascunho(id, JSON.parse(agora));
    }, 600);
    return () => clearTimeout(esperaRascunho.current);
  }, [id, carga, equipes, penaltis, sets, prorrogacao, baleouPrimeiro, camisas, camisasSalvas, rascunho]);

  const restaurarRascunho = () => {
    const guardado = rascunho.dados;
    setEquipes((atual) => atual.map((equipe) => {
      const salva = guardado.equipes.find((e) => e.equipe_id === equipe.equipe_id);
      if (!salva) return equipe;
      const { atletas: atletasSalvos, ...resto } = salva;
      return {
        ...equipe,
        ...resto,
        atletas: equipe.atletas.map((atleta) => {
          const daMesa = atletasSalvos.find((a) => a.atleta_id === atleta.atleta_id);
          return daMesa ? { ...atleta, ...daMesa } : atleta;
        })
      };
    }));
    setPenaltis(guardado.penaltis);
    setSets(guardado.sets);
    setProrrogacao(guardado.prorrogacao);
    setBaleouPrimeiro(guardado.baleouPrimeiro);
    // Camisas digitadas e não salvas voltam para o campo (continuam por salvar)
    setCamisas((atual) => ({ ...atual, ...(guardado.camisas || {}) }));
    setRascunho(null);
  };

  const descartarRascunho = () => {
    apagarRascunho(id);
    setRascunho(null);
  };

  const mudarAtleta = (indiceEquipe, atletaId, campo, valor) => {
    setEquipes((atual) => atual.map((equipe, i) => (
      i !== indiceEquipe ? equipe : {
        ...equipe,
        atletas: equipe.atletas.map((atleta) => (
          atleta.atleta_id === atletaId ? { ...atleta, [campo]: valor } : atleta
        ))
      }
    )));
  };

  // O backend recusa duas capitanias na mesma equipe, então marcar um
  // desmarca o anterior em vez de deixar o erro acontecer no envio.
  const marcarCapitao = (indiceEquipe, atletaId) => {
    setEquipes((atual) => atual.map((equipe, i) => (
      i !== indiceEquipe ? equipe : {
        ...equipe,
        atletas: equipe.atletas.map((atleta) => ({
          ...atleta,
          capitao: atleta.atleta_id === atletaId ? !atleta.capitao : false
        }))
      }
    )));
  };

  const mudarEquipe = (indiceEquipe, campo, valor) => {
    setEquipes((atual) => atual.map((equipe, i) => (
      i === indiceEquipe ? { ...equipe, [campo]: valor } : equipe
    )));
  };

  const golsDe = (equipe) => equipe.atletas.reduce((total, a) => total + Number(a.gols || 0), 0);

  const mudarSet = (numero_set, campo, valor) => {
    setSets((atual) => atual.map((set) => (
      set.numero_set === numero_set ? { ...set, [campo]: valor } : set
    )));
  };

  const enviar = async (finalizar) => {
    setAviso(null);
    setSalvando(true);

    // Camisas digitadas e ainda não salvas vão ANTES da súmula; com erro, a súmula não é salva
    if (!(await salvarCamisasPendentes())) {
      setSalvando(false);
      return;
    }

    try {
      const resposta = await registrarSumula({
        jogo_id: Number(id),
        finalizar,
        penaltis_1: penaltis.penaltis_1,
        penaltis_2: penaltis.penaltis_2,
        prorrogacao,
        baleou_primeiro_equipe_id: baleouPrimeiro,
        sets,
        equipes: equipes.map((equipe) => ({
          equipe_id: equipe.equipe_id,
          tecnico_nome: equipe.tecnico_nome,
          faltas_1t: equipe.faltas_1t,
          faltas_2t: equipe.faltas_2t,
          tempo_tecnico_1t: equipe.tempo_tecnico_1t,
          tempo_tecnico_2t: equipe.tempo_tecnico_2t,
          baleados: equipe.baleados || 0,
          // Folha sem coluna por atleta (baleado, vôlei): nada vai na coluna,
          // nem o que uma súmula antiga tenha gravado nela
          atletas: sumula.folha.rotuloEstatistica
            ? equipe.atletas
            : equipe.atletas.map((atleta) => ({ ...atleta, gols: 0 }))
        }))
      });

      // Salva no servidor: o rascunho do navegador não é mais necessário
      clearTimeout(esperaRascunho.current);
      apagarRascunho(id);
      inicial.current = JSON.stringify(fotografarSumula({ equipes, penaltis, sets, prorrogacao, baleouPrimeiro, camisas: {} }));
      setSessaoVencida(false);

      setAviso({
        tipo: 'success',
        texto: `${resposta.mensagem} Placar ${resposta.placar_1} x ${resposta.placar_2}.`
      });

      if (finalizar) navigate(`/detalhes-sumula/${id}`);
    } catch (falha) {
      setAviso({
        tipo: 'error',
        texto: falha.response?.status === 401
          ? 'Sua sessão expirou, entre de novo. Nada foi salvo: o que você digitou continua na tela.'
          : falha.mensagem
      });
    } finally {
      setSalvando(false);
    }
  };

  // ---- Camisas (número 1 a 99, vazio = sem número, único dentro da equipe) ----
  const mudarCamisa = (equipeId, atletaId, texto) => {
    setCamisas((atual) => ({ ...atual, [atletaId]: texto.replace(/\D/g, '').slice(0, 2) }));
    setMsgCamisa((atual) => ({ ...atual, [equipeId]: null }));
  };

  // Enter vai para o próximo atleta; no último, para o botão "Salvar camisas"
  const proximoCampo = (equipeId, posicao) => {
    const proximo = campos.current[`${equipeId}:${posicao + 1}`] || campos.current[`${equipeId}:salvar`];
    if (proximo) {
      proximo.focus();
      if (proximo.select) proximo.select();
    }
  };

  // Repetidos e inválidos na hora, antes de qualquer envio (o backend confere de novo)
  const conferirCamisas = (equipe) => {
    const porNumero = new Map();
    const invalidos = new Set();
    equipe.atletas.forEach((a) => {
      const texto = camisas[a.atleta_id] ?? '';
      if (texto === '') return;
      const numero = Number(texto);
      if (!(numero >= 1 && numero <= 99)) { invalidos.add(a.atleta_id); return; }
      porNumero.set(numero, [...(porNumero.get(numero) || []), a]);
    });
    const repetidos = [...porNumero].filter(([, lista]) => lista.length > 1);
    const marcados = new Set([...invalidos, ...repetidos.flatMap(([, lista]) => lista.map((a) => a.atleta_id))]);
    const alterados = equipe.atletas.filter(
      (a) => normalizarCamisa(camisas[a.atleta_id] ?? '') !== normalizarCamisa(camisasSalvas[a.atleta_id] ?? '')
    );
    return { repetidos, invalidos, marcados, alterados };
  };

  // Devolve true quando não há o que salvar ou salvou; false quando algo impediu (mostra o erro na equipe)
  const salvarCamisasDaEquipe = async (equipe) => {
    const { alterados, repetidos, invalidos } = conferirCamisas(equipe);
    if (!alterados.length) return true;

    // Repetido ou fora de 1 a 99: nem tenta (o backend confere de novo)
    if (repetidos.length || invalidos.size) {
      const textos = repetidos.map(([numero, lista]) => `Número ${numero} repetido: ${lista.map((a) => a.nome).join(' e ')}.`);
      if (invalidos.size) textos.push('O número vai de 1 a 99.');
      setMsgCamisa((atual) => ({ ...atual, [equipe.equipe_id]: { tipo: 'error', texto: textos.join(' ') } }));
      return false;
    }

    setSalvandoCamisa(equipe.equipe_id);
    setMsgCamisa((atual) => ({ ...atual, [equipe.equipe_id]: null }));
    try {
      await salvarCamisas(equipe.equipe_id, Number(id), alterados.map((a) => ({
        inscricaoId: a.inscricao_id,
        numero: normalizarCamisa(camisas[a.atleta_id]) === '' ? null : Number(camisas[a.atleta_id])
      })));
      const gravados = Object.fromEntries(alterados.map((a) => [a.atleta_id, normalizarCamisa(camisas[a.atleta_id])]));
      setCamisasSalvas((atual) => ({ ...atual, ...gravados }));
      setCamisas((atual) => ({ ...atual, ...gravados }));
      setMsgCamisa((atual) => ({ ...atual, [equipe.equipe_id]: { tipo: 'success', texto: 'Camisas salvas.' } }));
      return true;
    } catch (falha) {
      setMsgCamisa((atual) => ({
        ...atual,
        [equipe.equipe_id]: {
          tipo: 'error',
          texto: falha.response?.status === 401
            ? 'Sua sessão expirou, entre de novo. As camisas não foram salvas.'
            : falha.mensagem
        }
      }));
      return false;
    } finally {
      setSalvandoCamisa(null);
    }
  };

  // Salvar a súmula (parcial ou final) grava antes as camisas pendentes das duas equipes
  const salvarCamisasPendentes = async () => {
    for (const equipe of equipes) {
      if (equipe.a_definir) continue;
      const { alterados, marcados } = conferirCamisas(equipe);
      if (!alterados.length) continue;
      if (!(await salvarCamisasDaEquipe(equipe))) {
        setAviso({
          tipo: 'error',
          texto: `A súmula NÃO foi salva: o número da camisa de ${equipe.escola_nome} deu erro (veja o aviso na equipe). Corrija e salve de novo.`
        });
        // Leva o foco ao campo com problema (ou ao primeiro alterado)
        let posicao = equipe.atletas.findIndex((a) => marcados.has(a.atleta_id));
        if (posicao < 0) posicao = equipe.atletas.findIndex((a) => alterados.includes(a));
        const campo = campos.current[`${equipe.equipe_id}:${posicao}`];
        if (campo) campo.focus();
        return false;
      }
    }
    return true;
  };

  if (!pronto || (!erro && !equipes)) {
    return (
      <div className="page"><div className="container-lg">
        <div className="card"><div className="state">
          <div className="spinner" />
          <p className="state-text">Carregando súmula...</p>
        </div></div>
      </div></div>
    );
  }

  if (erro) {
    return (
      <div className="page"><div className="container-lg">
        <div className="card"><div className="state state-error">
          <div className="state-icon">⚠️</div>
          <p className="state-title">Não foi possível carregar</p>
          <p className="state-text">{erro}</p>
        </div></div>
      </div></div>
    );
  }

  const { jogo, folha } = sumula;
  // Jogo encerrado (finalizado ou W.O.): o número da camisa é só leitura
  const editaCamisas = !['FINALIZADO', 'WO'].includes(jogo.status);
  const listaSuspensos = suspensao?.id === id && suspensao.dados ? suspensao.dados.suspensos : [];
  const avisosSuspensao = suspensao?.id === id && suspensao.dados ? suspensao.dados.avisos : [];
  const suspensoPorAtleta = new Map(listaSuspensos.map((s) => [s.atleta_id, s]));

  // No vôlei o placar são os sets vencidos, não a soma de uma coluna.
  const setsVencidos = (lado) => (sets || []).reduce((total, set) => {
    const meus = Number(lado === 0 ? set.pontos_1 : set.pontos_2);
    const deles = Number(lado === 0 ? set.pontos_2 : set.pontos_1);
    return total + (meus > deles ? 1 : 0);
  }, 0);

  // No baleado cada equipe marca as ADVERSÁRIAS que eliminou, e o placar dela
  // é o próprio contador (chefe, 12/10/2026).
  const eliminadasPor = (equipe) => Number(equipe.baleados || 0);
  let placar1 = golsDe(equipes[0]);
  let placar2 = golsDe(equipes[1]);
  if (folha.sets) {
    placar1 = setsVencidos(0);
    placar2 = setsVencidos(1);
  } else if (folha.baleadosPorEquipe) {
    placar1 = eliminadasPor(equipes[0]);
    placar2 = eliminadasPor(equipes[1]);
  }

  // Nº, atleta, capitão e presente são fixos; a coluna de estatística, as
  // faltas e os cartões dependem da folha da modalidade.
  const colunasDaTabela = 4 + (folha.rotuloEstatistica ? 1 : 0)
    + (folha.faltasIndividuais > 0 ? 1 : 0) + (folha.cartoes ? 2 : 0);
  // A regra de desempate vem do backend (src/config/regrasProvisorias.js):
  // a tela não guarda cópia de qual modalidade joga prorrogação. Sem regra,
  // não há cobrança genérica: o empate fica pendente com a organização.
  const desempate = sumula.desempate || {
    sequencia: [], nomeCobranca: null, pendente: true, motivo: 'a regra de desempate não chegou do servidor'
  };
  const exigeProrrogacao = desempate.sequencia.includes('PRORROGACAO');
  // "Melhor de dois jogos" (ida e volta sem mata-mata): o backend manda o
  // placar do outro jogo, do lado deste. Com ele encerrado, este é o último
  // jogo, e a soma empatada pede o desempate aqui (20/10/2026).
  const ida = sumula.soma_dos_dois_jogos;
  const somaEmpatada = Boolean(ida?.resolvidos)
    && placar1 + ida.soma_1 === placar2 + ida.soma_2;
  // Competição de 2 escolas com um jogo só (Handebol M Sub 9): fala do jogo
  const jogoUnico = ida?.outros_jogos === 0;
  const empatado = somaEmpatada || (jogo.fase !== 'GRUPOS' && placar1 === placar2);
  // Baleado (07, 12 e 20/10/2026): acréscimo de 4 minutos na semifinal, na
  // final e no 2º jogo do ida e volta com a soma empatada; vence quem balear
  // primeiro. Onde vale vem do backend (desempate.acrescimo).
  const comAcrescimo = empatado && Boolean(desempate.acrescimo) && (somaEmpatada
    ? Boolean(desempate.acrescimo.somaDosDoisJogos)
    : desempate.acrescimo.fases.includes(jogo.fase));
  const empatePendente = empatado && Boolean(desempate.pendente) && !comAcrescimo;
  // Só há cobrança onde a modalidade tem uma (o vôlei, por exemplo, não empata)
  const precisaPenaltis = empatado && !desempate.pendente && Boolean(desempate.nomeCobranca)
    && (!exigeProrrogacao || prorrogacao);

  return (
    <div className="page">
      <div className="container-lg">
        <header className="page-header">
          <p className="eyebrow">
            {jogo.modalidade_nome} · {jogo.categoria_nome} · Jogo nº {jogo.numero_jogo}
          </p>
          <h1 className="page-title">Preencher Súmula</h1>
          <p className="page-subtitle">
            {folha.sets && `O placar do jogo são os sets: vence quem ganhar ${folha.setsParaVencer} sets `
              + `de ${folha.pontosPorSet} pontos, com 2 de vantagem.`}
            {folha.baleadosPorEquipe && 'Em cada equipe, marque as adversárias que ELA eliminou (baleou): '
              + 'o placar de cada equipe é o próprio contador.'}
            {!folha.sets && !folha.baleadosPorEquipe
              && `O placar é ${TEXTO_DO_PLACAR[folha.rotuloEstatistica]}: não existe campo de placar para digitar.`}
          </p>
        </header>

        {sessaoVencida && (
          <div className="alert alert-error mb-lg" role="alert">
            <p className="alert-titulo">🔒 Sua sessão expirou, entre de novo</p>
            <p className="alert-texto">
              O que você digitou continua nesta tela e também fica guardado como rascunho neste navegador.
              Entre de novo <a href="/login" target="_blank" rel="noopener noreferrer">em outra aba</a>,
              volte para esta e toque em Salvar. Não feche nem recarregue esta aba antes de salvar.
            </p>
          </div>
        )}

        {rascunho && (
          <div className="alert alert-aviso mb-lg">
            <p className="alert-titulo">📝 Há um rascunho não salvo deste jogo</p>
            <p className="alert-texto">
              Guardado neste navegador em{' '}
              {new Date(rascunho.salvoEm).toLocaleString('pt-BR', {
                timeZone: FUSO_DO_EVENTO, day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
              })}. Quer continuar de onde parou?
            </p>
            <div className="acoes">
              <button type="button" className="btn btn-primary btn-sm" onClick={restaurarRascunho}>Restaurar</button>
              <button type="button" className="btn btn-outline btn-sm" onClick={descartarRascunho}>Descartar</button>
            </div>
          </div>
        )}

        {aviso && <p className={`alert alert-${aviso.tipo}`}>{aviso.texto}</p>}

        {avisosSuspensao.map((item) => (
          <div key={item.titulo} className="alert alert-aviso mb-lg">
            <p className="alert-titulo">⚠️ {item.titulo}</p>
            <p className="alert-texto">{item.texto}</p>
          </div>
        ))}

        {equipes.some((e) => e.a_definir) && (
          <div className="alert alert-aviso mb-lg">
            <p className="alert-titulo">Equipes ainda não definidas</p>
            <p className="alert-texto">
              Este jogo de mata-mata espera o resultado que define {equipes.filter((e) => e.a_definir).map((e) => e.escola_nome).join(' e ')}.
              A súmula só pode ser salva quando as duas equipes estiverem definidas; dá para imprimi-la em branco.
            </p>
          </div>
        )}

        {listaSuspensos.length > 0 && (
          <div className="alert alert-error mb-lg">
            <p className="alert-titulo">🚫 Atleta suspenso nesta partida</p>
            <p className="alert-texto">
              {listaSuspensos
                .map((s) => `${s.nome} (${s.escola_nome}) — ${s.motivo}`)
                .join(' · ')}
              . O regulamento não permite escalar quem está cumprindo suspensão.
            </p>
          </div>
        )}

        <div className="card mb-lg">
          <div className="card-body placar-ao-vivo">
            <div>
              <p className="placar-equipe">{equipes[0].escola_nome}</p>
              <p className="placar-numero">{placar1}</p>
            </div>
            <span className="placar-x">x</span>
            <div>
              <p className="placar-equipe">{equipes[1].escola_nome}</p>
              <p className="placar-numero">{placar2}</p>
            </div>
          </div>
        </div>

        {folha.sets && sets && (
          <section className="card mb-lg">
            <div className="card-body">
              <h2 className="card-title">Controle dos sets</h2>
              <p className="form-hint">
                Lance os pontos de cada set. Todo set, o 3º inclusive, termina em
                {' '}{folha.pontosPorSet} pontos, com 2 de vantagem, e o jogo acaba quando uma equipe
                vence {folha.setsParaVencer} sets — aí o 3º set não se joga.
              </p>

              <div className="table-wrap">
                <table className="table-sge compact">
                  <thead>
                    <tr>
                      <th>Set</th>
                      <th>{equipes[0].escola_nome}</th>
                      <th>{equipes[1].escola_nome}</th>
                      <th>Vencedor do set</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sets.map((set) => {
                      const um = Number(set.pontos_1);
                      const dois = Number(set.pontos_2);
                      const fechado = Math.max(um, dois) >= folha.pontosPorSet
                        && Math.abs(um - dois) >= 2;

                      return (
                        <tr key={set.numero_set}>
                          <td className="strong">{set.numero_set}º</td>
                          <td>
                            <Contador
                              valor={um}
                              rotulo={`pontos de ${equipes[0].escola_nome} no ${set.numero_set}º set`}
                              aoMudar={(v) => mudarSet(set.numero_set, 'pontos_1', v)}
                            />
                          </td>
                          <td>
                            <Contador
                              valor={dois}
                              rotulo={`pontos de ${equipes[1].escola_nome} no ${set.numero_set}º set`}
                              aoMudar={(v) => mudarSet(set.numero_set, 'pontos_2', v)}
                            />
                          </td>
                          <td>
                            {um === 0 && dois === 0 ? '—'
                              : fechado ? (um > dois ? equipes[0].escola_nome : equipes[1].escola_nome)
                                : 'set em andamento'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        {equipes.map((equipe, indice) => {
          const conferencia = conferirCamisas(equipe);
          const msg = msgCamisa[equipe.equipe_id];
          return (
          <section key={equipe.equipe_id} className="card mb-lg">
            <div className="card-body">
              <h2 className="card-title">{equipe.escola_nome}</h2>

              <div className="table-wrap">
                <table className="table-sge compact">
                  <thead>
                    <tr>
                      <th>Nº</th>
                      <th className="text-left">Atleta</th>
                      {folha.rotuloEstatistica && <th>{folha.rotuloEstatistica}</th>}
                      {folha.faltasIndividuais > 0 && <th>Faltas</th>}
                      {folha.cartoes && <th>Amarelos</th>}
                      {folha.cartoes && <th>🟥</th>}
                      <th>Cap.</th>
                      <th>Presente</th>
                    </tr>
                  </thead>
                  <tbody>
                    {equipe.atletas.map((atleta, posicao) => (
                      <tr
                        key={atleta.atleta_id}
                        className={suspensoPorAtleta.has(atleta.atleta_id) ? 'row-suspenso' : ''}
                      >
                        <td className="strong">
                          {editaCamisas && !equipe.a_definir ? (
                            <input
                              ref={(el) => { campos.current[`${equipe.equipe_id}:${posicao}`] = el; }}
                              className={`form-control camisa-campo${conferencia.marcados.has(atleta.atleta_id) ? ' camisa-invalida' : ''}`}
                              type="text"
                              inputMode="numeric"
                              pattern="[0-9]*"
                              maxLength={2}
                              autoComplete="off"
                              value={camisas[atleta.atleta_id] ?? ''}
                              aria-label={`Camisa de ${atleta.nome}`}
                              aria-invalid={conferencia.marcados.has(atleta.atleta_id)}
                              onChange={(e) => mudarCamisa(equipe.equipe_id, atleta.atleta_id, e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') { e.preventDefault(); proximoCampo(equipe.equipe_id, posicao); }
                              }}
                            />
                          ) : (atleta.numero_camisa ?? '—')}
                        </td>
                        <td className="text-left">
                          {atleta.nome}
                          {suspensoPorAtleta.has(atleta.atleta_id) && (
                            <span
                              className="tag-suspenso"
                              title={suspensoPorAtleta.get(atleta.atleta_id).motivo}
                            >
                              suspenso
                            </span>
                          )}
                        </td>
                        {folha.rotuloEstatistica && (
                          <td>
                            <Contador
                              valor={Number(atleta.gols)}
                              rotulo={`${folha.rotuloEstatistica.toLowerCase()} de ${atleta.nome}`}
                              aoMudar={(v) => mudarAtleta(indice, atleta.atleta_id, 'gols', v)}
                            />
                          </td>
                        )}

                        {folha.faltasIndividuais > 0 && (
                          <td>
                            <Contador
                              valor={Number(atleta.faltas || 0)}
                              max={folha.faltasIndividuais}
                              rotulo={`faltas de ${atleta.nome}`}
                              aoMudar={(v) => mudarAtleta(indice, atleta.atleta_id, 'faltas', v)}
                            />
                          </td>
                        )}

                        {folha.cartoes && (
                          <td>
                            <Contador
                              valor={Number(atleta.amarelos)}
                              max={folha.maxAmarelos}
                              rotulo={`amarelos de ${atleta.nome}`}
                              aoMudar={(v) => mudarAtleta(indice, atleta.atleta_id, 'amarelos', v)}
                            />
                          </td>
                        )}

                        {folha.cartoes && (
                          <td>
                            <input
                              type="checkbox"
                              checked={atleta.vermelho}
                              onChange={(e) => mudarAtleta(indice, atleta.atleta_id, 'vermelho', e.target.checked)}
                              aria-label={`Cartão vermelho para ${atleta.nome}`}
                            />
                          </td>
                        )}
                        <td>
                          <input
                            type="checkbox"
                            checked={atleta.capitao}
                            onChange={() => marcarCapitao(indice, atleta.atleta_id)}
                            aria-label={`Capitão: ${atleta.nome}`}
                          />
                        </td>
                        <td>
                          <input
                            type="checkbox"
                            checked={atleta.presente}
                            onChange={(e) => mudarAtleta(indice, atleta.atleta_id, 'presente', e.target.checked)}
                            aria-label={`Presente: ${atleta.nome}`}
                          />
                        </td>
                      </tr>
                    ))}

                    {equipe.atletas.length === 0 && (
                      <tr>
                        <td colSpan={colunasDaTabela} className="text-left">
                          Nenhum atleta inscrito nesta equipe.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {editaCamisas && !equipe.a_definir && equipe.atletas.length > 0 && (
                <div className="camisas-acoes">
                  <button
                    type="button"
                    ref={(el) => { campos.current[`${equipe.equipe_id}:salvar`] = el; }}
                    className="btn btn-outline btn-sm"
                    disabled={salvandoCamisa !== null || !conferencia.alterados.length
                      || conferencia.repetidos.length > 0 || conferencia.invalidos.size > 0}
                    onClick={() => salvarCamisasDaEquipe(equipe)}
                  >
                    {salvandoCamisa === equipe.equipe_id ? 'Salvando...' : 'Salvar camisas'}
                  </button>
                  {msg && <span className={`camisa-msg camisa-msg-${msg.tipo}`} role="status">{msg.tipo === 'success' ? '✓ ' : ''}{msg.texto}</span>}
                  {conferencia.repetidos.map(([numero, lista]) => (
                    <span key={numero} className="camisa-msg camisa-msg-error" role="alert">
                      Número {numero} repetido: {lista.map((a) => a.nome).join(' e ')}.
                    </span>
                  ))}
                  {conferencia.invalidos.size > 0 && (
                    <span className="camisa-msg camisa-msg-error" role="alert">O número vai de 1 a 99.</span>
                  )}
                  <span className="form-hint">Campo vazio = sem número. Vale para os próximos jogos da equipe.</span>
                </div>
              )}

              {folha.faltasIndividuais > 0 && (
                <p className="form-hint">
                  Falta individual vai de 0 a {folha.faltasIndividuais}: com {folha.faltasIndividuais} o
                  atleta está excluído. As faltas acumulativas da equipe vão até {folha.faltasAcumuladas} por tempo.
                </p>
              )}

              <div className="rodape-equipe">
                <div className="form-group">
                  <label className="form-label" htmlFor={`tecnico-${indice}`}>Técnico</label>
                  <input
                    id={`tecnico-${indice}`}
                    className="form-control"
                    type="text"
                    value={equipe.tecnico_nome || ''}
                    onChange={(e) => mudarEquipe(indice, 'tecnico_nome', e.target.value)}
                  />
                </div>

                {folha.baleadosPorEquipe > 0 && (
                  <div className="form-group">
                    <span className="form-label">
                      Adversárias eliminadas por esta equipe <small>(0 a {folha.baleadosPorEquipe})</small>
                    </span>
                    <Contador
                      valor={Number(equipe.baleados || 0)}
                      max={folha.baleadosPorEquipe}
                      rotulo={`adversárias eliminadas por ${equipe.escola_nome}`}
                      aoMudar={(v) => mudarEquipe(indice, 'baleados', v)}
                    />
                  </div>
                )}

                {folha.faltasAcumuladas > 0 && (
                  <div className="form-group">
                    <span className="form-label">
                      Faltas 1º tempo <small>(até {folha.faltasAcumuladas})</small>
                    </span>
                    <Contador
                      valor={Number(equipe.faltas_1t)}
                      max={folha.faltasAcumuladas}
                      rotulo="faltas do primeiro tempo"
                      aoMudar={(v) => mudarEquipe(indice, 'faltas_1t', v)}
                    />
                  </div>
                )}

                {folha.faltasAcumuladas > 0 && (
                  <div className="form-group">
                    <span className="form-label">
                      Faltas 2º tempo <small>(até {folha.faltasAcumuladas})</small>
                    </span>
                    <Contador
                      valor={Number(equipe.faltas_2t)}
                      max={folha.faltasAcumuladas}
                      rotulo="faltas do segundo tempo"
                      aoMudar={(v) => mudarEquipe(indice, 'faltas_2t', v)}
                    />
                  </div>
                )}

                {folha.tempoTecnico && (
                  <div className="form-group">
                    <span className="form-label">Tempo técnico</span>
                    <div className="linha-checks">
                      <label>
                        <input
                          type="checkbox"
                          checked={equipe.tempo_tecnico_1t}
                          onChange={(e) => mudarEquipe(indice, 'tempo_tecnico_1t', e.target.checked)}
                        /> 1º T
                      </label>
                      <label>
                        <input
                          type="checkbox"
                          checked={equipe.tempo_tecnico_2t}
                          onChange={(e) => mudarEquipe(indice, 'tempo_tecnico_2t', e.target.checked)}
                        /> 2º T
                      </label>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>
          );
        })}

        {empatado && exigeProrrogacao && (
          <div className="card mb-lg">
            <div className="card-body">
              <h2 className="card-title">Prorrogação</h2>
              <p className="form-hint">
                Empate no mata-mata: em {jogo.modalidade_nome} joga-se prorrogação antes das
                cobranças. Lance os gols da prorrogação nas linhas dos atletas acima; se o
                empate persistir depois dela, marque abaixo para informar as cobranças.
              </p>
              <label className="linha-checks">
                <input
                  type="checkbox"
                  checked={prorrogacao}
                  onChange={(e) => setProrrogacao(e.target.checked)}
                />{' '}
                Houve prorrogação e o empate continuou
              </label>
            </div>
          </div>
        )}

        {comAcrescimo && (
          <div className="card mb-lg">
            <div className="card-body">
              <h2 className="card-title">Acréscimo de {desempate.acrescimo.minutosDeAcrescimo} minutos</h2>
              <p className="form-hint">{desempate.acrescimo.descricao} Marque a equipe que baleou primeiro.</p>
              <div className="linha-checks">
                {equipes.map((equipe) => (
                  <label key={equipe.equipe_id}>
                    <input
                      type="radio"
                      name="baleou-primeiro"
                      checked={baleouPrimeiro === equipe.equipe_id}
                      onChange={() => setBaleouPrimeiro(equipe.equipe_id)}
                    />{' '}
                    {equipe.escola_nome}
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}

        {empatePendente && (
          <div className="alert alert-aviso mb-lg">
            <p className="alert-titulo">⚠️ {somaEmpatada ? (jogoUnico ? 'Jogo empatado' : 'Soma dos dois jogos empatada') : 'Empate no mata-mata'}: regra pendente</p>
            <p className="alert-texto">
              Em {jogo.modalidade_nome}, {desempate.motivo}. A regra está pendente com a
              organização: salve a súmula sem finalizar e aguarde a decisão. O sistema não
              finaliza este jogo empatado.
            </p>
          </div>
        )}

        {precisaPenaltis && (
          <div className="card mb-lg">
            <div className="card-body">
              <h2 className="card-title" style={{ textTransform: 'capitalize' }}>
                {desempate.nomeCobranca}
              </h2>
              <p className="form-hint">
                {somaEmpatada
                  ? (jogoUnico ? 'O jogo terminou empatado' : 'A soma dos dois jogos está empatada')
                  : 'Empate no mata-mata não decide nada'}: informe {desempate.nomeCobranca} para finalizar.
              </p>
              <div className="rodape-equipe">
                <div className="form-group">
                  <span className="form-label">{equipes[0].escola_nome}</span>
                  <Contador
                    valor={penaltis.penaltis_1}
                    rotulo={`${desempate.nomeCobranca} da primeira equipe`}
                    aoMudar={(v) => setPenaltis((p) => ({ ...p, penaltis_1: v }))}
                  />
                </div>
                <div className="form-group">
                  <span className="form-label">{equipes[1].escola_nome}</span>
                  <Contador
                    valor={penaltis.penaltis_2}
                    rotulo={`${desempate.nomeCobranca} da segunda equipe`}
                    aoMudar={(v) => setPenaltis((p) => ({ ...p, penaltis_2: v }))}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="page-toolbar">
          <div className="acoes">
            <button type="button" className="btn btn-outline" onClick={() => enviar(false)} disabled={salvando}>
              {salvando ? 'Salvando...' : 'Salvar parcial'}
            </button>
            <button type="button" className="btn btn-primary" onClick={() => enviar(true)} disabled={salvando}>
              Finalizar súmula
            </button>
          </div>

          <Link className="btn btn-outline btn-sm" to={`/detalhes-sumula/${id}`}>
            🖨️ Ver / imprimir
          </Link>
        </div>
      </div>
    </div>
  );
}

export default PreencherSumula;
