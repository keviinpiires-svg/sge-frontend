import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import Contador from '../components/Contador';
import TelaRestrita from '../components/TelaRestrita';
import AdicionarAtletaMesa from '../components/AdicionarAtletaMesa';
import { retirarAtletaPelaMesa } from '../services/mesaAtletas';
import { useAuth } from '../context/useAuth';
import { buscarSumulaPorJogo, registrarSumula } from '../services/sumulas';
import { iniciarJogo } from '../services/jogos';
import { suspensosNoJogo } from '../services/suspensoes';
import { salvarCamisas } from '../services/equipes';
import { protegerSessao } from '../services/token';
import { FUSO_DO_EVENTO } from '../services/datas';
import { fotografarSumula, lerRascunho, gravarRascunho, apagarRascunho, lerSegundoTempo, gravarSegundoTempo, limparSegundoTempo } from '../services/rascunhoSumula';

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
  const { podeLancarNoLocal, localDaMesa, isPlacar, isAdmin } = useAuth();

  const [carga, setCarga] = useState(null);      // { id, dados, erro }
  const [equipes, setEquipes] = useState(null);  // cópia editável da folha
  const [penaltis, setPenaltis] = useState({ penaltis_1: 0, penaltis_2: 0 });
  const [sets, setSets] = useState(null);       // vôlei: os três sets do papel
  const [prorrogacao, setProrrogacao] = useState(false);
  // Semifinal ou final do baleado empatada: quem baleou primeiro no acréscimo
  const [baleouPrimeiro, setBaleouPrimeiro] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const [aviso, setAviso] = useState(null);
  // Duas etapas (pré-jogo e partida): "iniciada" vale desde o clique em Iniciar partida, sem recarregar
  // a súmula (nada do que foi digitado se perde); "preenchendo" abre a tabela de atletas no pré-jogo
  const [iniciada, setIniciada] = useState(false);
  const [preenchendo, setPreenchendo] = useState(false);
  const [iniciando, setIniciando] = useState(false);
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
  // Futsal e society: até a mesa clicar em "Iniciar 2º tempo", toda falta de atleta conta no 1º tempo; depois, no 2º
  const [segundoTempo, setSegundoTempo] = useState(false);
  const tempoDasFaltas = segundoTempo ? 2 : 1;
  const [editandoCamisas, setEditandoCamisas] = useState({}); // equipe_id -> true quando "Editar camisas" destravou a equipe
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
        // o 2º tempo já começou? (guardado no navegador, ou deduzido de faltas do 2º tempo já gravadas)
        // (jogo ainda agendado = jogo novo: qualquer marca de 2º tempo que tenha sobrado no navegador é descartada)
        if (dados.jogo.status === 'AGENDADO') limparSegundoTempo(id);
        setSegundoTempo(dados.jogo.status !== 'AGENDADO' && (lerSegundoTempo(id) || dados.equipes.some((e) => Number(e.faltas_2t || 0) > 0)));
        // vermelho_auto: o vermelho que acompanha 2 amarelos é o do 2º amarelo (some se voltar para 1)
        setEquipes(dados.equipes.map((equipe) => ({
          ...equipe,
          atletas: equipe.atletas.map((atleta) => ({
            ...atleta,
            vermelho_auto: dados.folha.maxAmarelos >= 2 && Number(atleta.amarelos) >= 2 && Boolean(atleta.vermelho)
          }))
        })));
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
        // (rascunho antigo, de quando a tela tinha o campo Técnico, é lido sem o técnico)
        const igualAoBanco = guardado
          && JSON.stringify({
            ...guardado.dados,
            equipes: (guardado.dados.equipes || []).map(({ tecnico_nome, ...equipe }) => equipe), // eslint-disable-line no-unused-vars
            camisas: guardado.dados.camisas || {}
          }) === inicial.current;
        setRascunho(guardado && !igualAoBanco ? guardado : null);
        // Número de camisa é cadastro da equipe, não lançamento do jogo: o que foi digitado e não salvo volta
        // sozinho para os campos (continua "por salvar" e é gravado ao iniciar a partida ou ao salvar)
        const idsDaTela = new Set(dados.equipes.flatMap((e) => e.atletas.map((a) => String(a.atleta_id))));
        const digitadas = Object.fromEntries(
          Object.entries(guardado?.dados?.camisas || {}).filter(([atleta]) => idsDaTela.has(String(atleta)))
        );
        if (Object.keys(digitadas).length > 0) {
          setCamisas({ ...camisasDoBanco, ...digitadas });
          setAviso({
            tipo: 'aviso',
            texto: 'Números de camisa que você digitou e não salvou voltaram para os campos. Eles são gravados ao iniciar a partida ou ao salvar.'
          });
        }
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
      const { atletas: atletasSalvos, tecnico_nome, ...resto } = salva; // eslint-disable-line no-unused-vars
      return {
        ...equipe,
        ...resto,
        atletas: equipe.atletas.map((atleta) => {
          const daMesa = atletasSalvos.find((a) => a.atleta_id === atleta.atleta_id);
          if (!daMesa) return atleta;
          const restaurado = { ...atleta, ...daMesa };
          // o vermelho que acompanha 2 amarelos é o do 2º amarelo (some se a mesa voltar para 1)
          restaurado.vermelho_auto = sumula.folha.maxAmarelos >= 2 && Number(restaurado.amarelos) >= 2 && Boolean(restaurado.vermelho);
          return restaurado;
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
    setCamisas(camisasSalvas);
    setRascunho(null);
  };

  // Atleta que a mesa acabou de adicionar (db/45): entra na lista sem recarregar a súmula,
  // para não perder o que já foi digitado (gols, cartões, presença)
  const adicionouAtleta = (equipeId, dados) => {
    setEquipes((atual) => atual.map((equipe) => (
      equipe.equipe_id !== equipeId ? equipe : {
        ...equipe,
        atletas: [...equipe.atletas, {
          inscricao_id: dados.inscricao_id,
          atleta_id: dados.atleta.id,
          nome: dados.atleta.nome,
          numero_camisa: null,
          presente: true,
          capitao: false,
          gols: 0,
          amarelos: 0,
          faltas: 0,
          vermelho: false,
          desqualificado: false,
          adicionado_pela_mesa: true,
          adicionado_por_mim: true
        }]
      }
    )));
  };

  // Só o que esta mesa colocou pode sair (o backend confere: ficha e atleta de outra mesa dão 403)
  const retirarAtleta = async (atleta) => {
    if (!window.confirm(`Retirar ${atleta.nome} desta equipe?`)) return;
    try {
      await retirarAtletaPelaMesa(id, atleta.inscricao_id);
      setEquipes((atual) => atual.map((equipe) => ({
        ...equipe,
        atletas: equipe.atletas.filter((a) => a.inscricao_id !== atleta.inscricao_id)
      })));
      setAviso({ tipo: 'success', texto: `${atleta.nome} saiu da equipe.` });
    } catch (falha) {
      setAviso({ tipo: 'error', texto: falha.mensagem });
    }
  };

  // Futsal e society: a falta lançada no atleta conta no tempo selecionado (1º ou 2º) e soma no total da equipe
  // por tempo (faltas_1t / faltas_2t, que a impressão lê). O "−" só desconta do tempo selecionado.
  const mudarFaltaDoAtleta = (indiceEquipe, atletaId, novo) => {
    const campo = `faltas_${tempoDasFaltas}t`;
    setEquipes((atual) => atual.map((equipe, i) => {
      if (i !== indiceEquipe) return equipe;
      const alvo = equipe.atletas.find((a) => a.atleta_id === atletaId);
      const delta = novo - Number(alvo?.faltas || 0);
      if (delta === 0) return equipe;
      return {
        ...equipe,
        [campo]: Math.max(0, Number(equipe[campo] || 0) + delta),
        atletas: equipe.atletas.map((a) => (a.atleta_id === atletaId ? { ...a, faltas: novo } : a))
      };
    }));
  };

  const mudarAtleta = (indiceEquipe, atletaId, campo, valor) => {
    setEquipes((atual) => atual.map((equipe, i) => (
      i !== indiceEquipe ? equipe : {
        ...equipe,
        atletas: equipe.atletas.map((atleta) => {
          if (atleta.atleta_id !== atletaId) return atleta;
          const novo = { ...atleta, [campo]: valor };
          // Futsal e society (2 caixas de amarelo): o 2º amarelo é expulsão e marca o vermelho sozinho; se a mesa
          // voltar para 1, só sai o vermelho que foi marcado automaticamente (o direto, marcado à mão, fica)
          if (campo === 'amarelos' && sumula.folha.maxAmarelos >= 2) {
            if (valor >= 2 && !atleta.vermelho) { novo.vermelho = true; novo.vermelho_auto = true; }
            if (valor < 2 && atleta.vermelho_auto) { novo.vermelho = false; novo.vermelho_auto = false; }
          }
          // mexer à mão no vermelho torna o vermelho "da mesa": não é mais o automático
          if (campo === 'vermelho') novo.vermelho_auto = false;
          return novo;
        })
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

  // silencioso: quem chama (o "Iniciar partida") mostra o próprio aviso; devolve { ok, texto? }
  const enviar = async (finalizar, { silencioso = false } = {}) => {
    if (!silencioso) setAviso(null);
    setSalvando(true);

    // Camisas digitadas e ainda não salvas vão ANTES da súmula; com erro, a súmula não é salva
    if (!(await salvarCamisasPendentes())) {
      setSalvando(false);
      return { ok: false };
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
          // O técnico não é mais digitado na tela (a folha impressa tem a linha em branco para escrever à mão);
          // o que já estava gravado segue como está
          tecnico_nome: equipe.tecnico_nome,
          faltas_1t: equipe.faltas_1t,
          faltas_2t: equipe.faltas_2t,
          tempo_tecnico_1t: equipe.tempo_tecnico_1t,
          tempo_tecnico_2t: equipe.tempo_tecnico_2t,
          baleados: sumula.folha.eliminacoesPorAtleta ? eliminadasPor(equipe) : (equipe.baleados || 0),
          // Folha sem coluna por atleta (baleado, vôlei): nada vai na coluna,
          // nem o que uma súmula antiga tenha gravado nela
          atletas: sumula.folha.rotuloEstatistica || sumula.folha.eliminacoesPorAtleta
            ? equipe.atletas
            : equipe.atletas.map((atleta) => ({ ...atleta, gols: 0 }))
        }))
      });

      // Salva no servidor: o rascunho do navegador não é mais necessário
      clearTimeout(esperaRascunho.current);
      apagarRascunho(id);
      inicial.current = JSON.stringify(fotografarSumula({ equipes, penaltis, sets, prorrogacao, baleouPrimeiro, camisas: {} }));
      setSessaoVencida(false);

      if (!silencioso) {
        setAviso({
          tipo: 'success',
          texto: `${resposta.mensagem} Placar ${resposta.placar_1} x ${resposta.placar_2}.`
        });
      }

      if (finalizar) navigate(`/detalhes-sumula/${id}`);
      return { ok: true };
    } catch (falha) {
      const texto = falha.response?.status === 401
        ? 'Sua sessão expirou, entre de novo. Nada foi salvo: o que você digitou continua na tela.'
        : falha.mensagem;
      if (!silencioso) setAviso({ tipo: 'error', texto });
      return { ok: false, texto };
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
    // pula os campos travados (camisa já salva): o Enter vai para o próximo campo editável
    let k = posicao + 1;
    let proximo = campos.current[`${equipeId}:${k}`];
    while (proximo && proximo.disabled) { k += 1; proximo = campos.current[`${equipeId}:${k}`]; }
    if (!proximo) proximo = campos.current[`${equipeId}:salvar`];
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
      setEditandoCamisas((atual) => ({ ...atual, [equipe.equipe_id]: false })); // salvou: trava de novo
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
  const salvarCamisasPendentes = async (acao = 'A súmula NÃO foi salva') => {
    for (const equipe of equipes) {
      if (equipe.a_definir) continue;
      const { alterados, marcados } = conferirCamisas(equipe);
      if (!alterados.length) continue;
      if (!(await salvarCamisasDaEquipe(equipe))) {
        setAviso({
          tipo: 'error',
          texto: `${acao}: o número da camisa de ${equipe.escola_nome} deu erro (veja o aviso na equipe). Corrija e tente de novo.`
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

  // "Editar camisas" destrava os números já salvos da equipe; "Cancelar" devolve tudo ao que está salvo e trava
  const editarCamisas = (equipeId) => {
    setEditandoCamisas((atual) => ({ ...atual, [equipeId]: true }));
    setMsgCamisa((atual) => ({ ...atual, [equipeId]: null }));
  };
  const cancelarEdicaoCamisas = (equipe) => {
    setCamisas((atual) => ({
      ...atual,
      ...Object.fromEntries(equipe.atletas.map((a) => [a.atleta_id, camisasSalvas[a.atleta_id] ?? '']))
    }));
    setEditandoCamisas((atual) => ({ ...atual, [equipe.equipe_id]: false }));
    setMsgCamisa((atual) => ({ ...atual, [equipe.equipe_id]: null }));
  };

  // Futsal e society: depois do clique, as faltas passam a contar no 2º tempo (não volta)
  const iniciarSegundoTempo = () => {
    if (!window.confirm('Iniciar o 2º tempo?')) return;
    gravarSegundoTempo(id);
    setSegundoTempo(true);
    setAviso({ tipo: 'success', texto: '2º tempo iniciado. As próximas faltas contam no 2º tempo.' });
  };

  // Iniciar partida: a rota de sempre (PUT /jogos/:id/iniciar, com a trava de local). Depois dela o
  // placar é liberado; a súmula não é recarregada, então camisas e rascunho digitados continuam na tela
  const iniciarPartida = async () => {
    if (!window.confirm('Iniciar a partida agora?')) return;
    setAviso(null);
    setIniciando(true);
    try {
      // Camisas digitadas e ainda não salvas são gravadas ANTES (mesmo PUT /equipes/:id/camisas do
      // "Salvar camisas"); se alguma der erro, a partida não é iniciada
      const tinhaCamisa = Object.keys(camisasAlteradas(camisas, camisasSalvas)).length > 0;
      if (!(await salvarCamisasPendentes('A partida NÃO foi iniciada'))) return;
      await iniciarJogo(id);
      limparSegundoTempo(id); // partida nova começa no 1º tempo
      setSegundoTempo(false);
      setIniciada(true);
      // Logo depois de iniciar, grava a súmula parcial (presença, capitão e camisas): a presença não depende
      // mais de um "Salvar parcial" e não se perde se a página for recarregada
      const gravou = await enviar(false, { silencioso: true });
      setAviso(gravou.ok
        ? {
          tipo: 'success',
          texto: tinhaCamisa
            ? 'Partida iniciada. As camisas, a presença e o capitão foram salvos e o placar está liberado.'
            : 'Partida iniciada. A presença e o capitão foram salvos e o placar está liberado.'
        }
        : {
          tipo: 'error',
          texto: `Partida iniciada, mas a súmula parcial (presença e capitão) NÃO foi salva${gravou.texto ? `: ${gravou.texto}` : ''}. Toque em "Salvar parcial".`
        });
    } catch (falha) {
      setAviso({
        tipo: 'error',
        texto: falha.response?.status === 401
          ? 'Sua sessão expirou, entre de novo. A partida não foi iniciada e o que você digitou continua na tela.'
          : falha.mensagem
      });
    } finally {
      setIniciando(false);
    }
  };

  // "Salvar parcial" antes da partida: grava só as camisas (no servidor) — o resto (técnico, presença,
  // capitão) fica no rascunho deste navegador até a partida iniciar. Não chama POST /sumulas, que
  // iniciaria o jogo sozinho.
  const salvarPreJogo = async () => {
    setAviso(null);
    setSalvando(true);
    try {
      const tinhaCamisa = Object.keys(camisasAlteradas(camisas, camisasSalvas)).length > 0;
      if (!(await salvarCamisasPendentes())) return;
      setAviso({
        tipo: 'success',
        texto: tinhaCamisa
          ? 'Camisas salvas. O que mais você preencheu fica guardado como rascunho neste navegador até iniciar a partida.'
          : 'Nada de camisa por salvar. O que você preencheu fica guardado como rascunho neste navegador até iniciar a partida.'
      });
    } finally {
      setSalvando(false);
    }
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
  // Fase da súmula: AGENDADO = pré-jogo (placar bloqueado), EM_ANDAMENTO = partida (iniciada agora ou antes)
  const statusAtual = iniciada && jogo.status === 'AGENDADO' ? 'EM_ANDAMENTO' : jogo.status;
  const agendado = statusAtual === 'AGENDADO';
  const encerrado = ['FINALIZADO', 'WO'].includes(statusAtual);
  const somenteLeitura = encerrado && !isAdmin;       // a mesa só consulta um jogo encerrado
  const semPlacar = agendado || somenteLeitura;       // gols, cartões, faltas, sets, eliminadas, cobranças
  const tabelaAberta = !agendado || preenchendo;      // no pré-jogo a tabela abre em "Preencher súmula"
  const mostraPlacar = !agendado;                     // colunas e campos de placar: só depois de iniciar (escondidos antes)
  // A coluna Presente só existe no pré-jogo; depois de iniciar a tabela mostra só os atletas presentes
  const atletasDaTabela = (equipe) => (agendado ? equipe.atletas : equipe.atletas.filter((a) => a.presente));
  // "Adicionar atleta" e "Remover": só a mesa do local do jogo, com o jogo agendado ou em andamento
  // (16/11/2026: só no pré-jogo; depois de "Iniciar partida" o elenco e as camisas ficam só leitura)
  const mesaMexeNoElenco = isPlacar && podeLancarNoLocal(jogo.local_id) && agendado;
  // Mesa de outro local (ou sem local): a tela não abre. O backend também barra (403)
  if (!podeLancarNoLocal(jogo.local_id)) {
    return (
      <TelaRestrita texto={localDaMesa
        ? `Esta súmula é de um jogo de ${jogo.local_nome || 'outro local'}. Sua mesa é do local ${localDaMesa.nome}.`
        : 'Mesa sem local definido. Fale com o administrador.'} />
    );
  }
  // Jogo encerrado (finalizado ou W.O.): o número da camisa é só leitura
  const editaCamisas = !encerrado;
  // Camisa já salva fica travada (só leitura). Continuam editáveis: campo vazio, número digitado e ainda
  // não salvo (diferente do salvo) e qualquer campo da equipe depois de "Editar camisas".
  const camisaTravada = (equipe, atleta) => {
    const salva = camisasSalvas[atleta.atleta_id] ?? '';
    // depois de iniciar a partida todos os números ficam só leitura
    if (!agendado) return true;
    return editaCamisas && !editandoCamisas[equipe.equipe_id] && salva !== ''
      && normalizarCamisa(camisas[atleta.atleta_id] ?? '') === normalizarCamisa(salva);
  };
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
  // 16/11/2026: cada atleta tem o seu contador (guardado em sumula_atletas.gols) e o total da equipe é a SOMA.
  // Súmula antiga, gravada só com o total da equipe (nenhum atleta com contador), segue valendo com esse total.
  const eliminacoesDosAtletas = (equipe) => equipe.atletas.reduce((total, a) => total + Number(a.gols || 0), 0);
  const totalLegado = (equipe) => {
    const original = sumula.equipes.find((e) => e.equipe_id === equipe.equipe_id);
    return original && Number(original.baleados || 0) > 0 && original.atletas.every((a) => Number(a.gols || 0) === 0)
      ? Number(original.baleados) : 0;
  };
  const eliminadasPor = (equipe) => {
    const soma = eliminacoesDosAtletas(equipe);
    return soma > 0 ? soma : totalLegado(equipe);
  };
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
  const colunasDaTabela = 3 + (agendado ? 1 : 0) + (mostraPlacar
    ? (folha.rotuloEstatistica ? 1 : 0) + (folha.eliminacoesPorAtleta ? 1 : 0)
      + (folha.faltasIndividuais > 0 || folha.faltasPorAtleta ? 1 : 0) + (folha.cartoes ? 2 : 0)
    : 0);
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
            {folha.baleadosPorEquipe && 'Lance as eliminações de cada atleta (as adversárias que ELE baleou): '
              + 'o placar de cada equipe é a soma, de 0 a 10.'}
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

        {/* O aviso amarelo de regra de suspensão ("sem regra definida") é para o administrador; a mesa não o vê.
            O vermelho "Atleta suspenso nesta partida" continua para todos. */}
        {!isPlacar && avisosSuspensao.map((item) => (
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

        {!encerrado && (
          <div className="card mb-lg">
            <div className="card-body">
              {agendado ? (
                <>
                  <div className="acoes etapas-sumula">
                    <button
                      type="button"
                      className={`btn ${preenchendo ? 'btn-secondary' : 'btn-outline'}`}
                      aria-pressed={preenchendo}
                      disabled={equipes.some((e) => e.a_definir)}
                      onClick={() => setPreenchendo((aberto) => !aberto)}
                    >
                      📝 Preencher súmula
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary"
                      disabled={iniciando || equipes.some((e) => e.a_definir)}
                      onClick={iniciarPartida}
                    >
                      {iniciando ? 'Iniciando...' : '▶ Iniciar partida'}
                    </button>
                  </div>
                  <p className="form-hint">
                    Antes do jogo: preencha as camisas, a presença e o capitão. O placar (gols, cartões, faltas, sets) só
                    abre depois de iniciar a partida.
                  </p>
                </>
              ) : (
                <div className="acoes" style={{ alignItems: 'center', justifyContent: 'flex-start' }}>
                  <span className="badge badge-accent">
                    {folha.faltasPorAtleta && segundoTempo ? '▶ 2º tempo' : '▶ Partida em andamento'}
                  </span>
                  {folha.faltasPorAtleta && !segundoTempo && (
                    <button type="button" className="btn btn-outline btn-sm" onClick={iniciarSegundoTempo}>
                      Iniciar 2º tempo
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {somenteLeitura && (
          <div className="alert alert-aviso mb-lg">
            Este jogo já terminou: a súmula é só de consulta. Para ver ou imprimir, use o botão no fim da página.
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

        {mostraPlacar && folha.sets && sets && (
          <section className="card mb-lg">
            <div className="card-body">
              <h2 className="card-title">Controle dos sets</h2>
              <p className="form-hint">
                Lance os pontos de cada set. Todo set, o 3º inclusive, termina em
                {' '}{folha.pontosPorSet} pontos, com 2 de vantagem, e o jogo acaba quando uma equipe
                vence {folha.setsParaVencer} sets — aí o 3º set não se joga.
              </p>

              <div className="table-wrap">
                <table className="table-sge compact tabela-sumula tabela-sets">
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
                          <td className="strong" data-rotulo="Set">{set.numero_set}º</td>
                          <td data-rotulo={equipes[0].escola_nome}>
                            <Contador
                              valor={um}
                              rotulo={`pontos de ${equipes[0].escola_nome} no ${set.numero_set}º set`}
                              desabilitado={semPlacar}
                              aoMudar={(v) => mudarSet(set.numero_set, 'pontos_1', v)}
                            />
                          </td>
                          <td data-rotulo={equipes[1].escola_nome}>
                            <Contador
                              valor={dois}
                              rotulo={`pontos de ${equipes[1].escola_nome} no ${set.numero_set}º set`}
                              desabilitado={semPlacar}
                              aoMudar={(v) => mudarSet(set.numero_set, 'pontos_2', v)}
                            />
                          </td>
                          <td data-rotulo="Vencedor do set">
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

        {tabelaAberta && equipes.map((equipe, indice) => {
          const conferencia = conferirCamisas(equipe);
          const msg = msgCamisa[equipe.equipe_id];
          return (
          <section key={equipe.equipe_id} className="card mb-lg">
            <div className="card-body">
              <h2 className="card-title">{equipe.escola_nome}</h2>

              <div className="table-wrap">
                <table className="table-sge compact tabela-sumula">
                  <thead>
                    <tr>
                      <th>Nº</th>
                      <th className="text-left">Atleta</th>
                      {mostraPlacar && folha.rotuloEstatistica && <th>{folha.rotuloEstatistica}</th>}
                      {mostraPlacar && folha.eliminacoesPorAtleta && <th>Eliminou</th>}
                      {mostraPlacar && (folha.faltasIndividuais > 0 || folha.faltasPorAtleta) && <th>Faltas</th>}
                      {mostraPlacar && folha.cartoes && <th>Amarelos</th>}
                      {mostraPlacar && folha.cartoes && <th>🟥</th>}
                      <th>Cap.</th>
                      {agendado && <th>Presente</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {atletasDaTabela(equipe).map((atleta, posicao) => (
                      <tr
                        key={atleta.atleta_id}
                        className={suspensoPorAtleta.has(atleta.atleta_id) ? 'row-suspenso' : ''}
                      >
                        <td className="strong" data-rotulo="Nº">
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
                              disabled={camisaTravada(equipe, atleta)}
                              aria-label={`Camisa de ${atleta.nome}`}
                              aria-invalid={conferencia.marcados.has(atleta.atleta_id)}
                              onChange={(e) => mudarCamisa(equipe.equipe_id, atleta.atleta_id, e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') { e.preventDefault(); proximoCampo(equipe.equipe_id, posicao); }
                              }}
                            />
                          ) : (atleta.numero_camisa ?? '—')}
                        </td>
                        <td className="text-left" data-rotulo="Atleta">
                          {atleta.nome}
                          {atleta.adicionado_pela_mesa && (
                            <span className="badge badge-accent" style={{ marginLeft: 8 }}>adicionado pela mesa</span>
                          )}
                          {mesaMexeNoElenco && atleta.adicionado_por_mim && (
                            <button type="button" className="btn btn-outline btn-sm" style={{ marginLeft: 8 }}
                              onClick={() => retirarAtleta(atleta)}>
                              Remover
                            </button>
                          )}
                          {suspensoPorAtleta.has(atleta.atleta_id) && (
                            <span
                              className="tag-suspenso"
                              title={suspensoPorAtleta.get(atleta.atleta_id).motivo}
                            >
                              suspenso
                            </span>
                          )}
                        </td>
                        {mostraPlacar && folha.rotuloEstatistica && (
                          <td data-rotulo={folha.rotuloEstatistica}>
                            <Contador
                              valor={Number(atleta.gols)}
                              rotulo={`${folha.rotuloEstatistica.toLowerCase()} de ${atleta.nome}`}
                              desabilitado={semPlacar}
                              aoMudar={(v) => mudarAtleta(indice, atleta.atleta_id, 'gols', v)}
                            />
                          </td>
                        )}

                        {mostraPlacar && folha.eliminacoesPorAtleta && (
                          <td data-rotulo="Eliminou">
                            <Contador
                              valor={Number(atleta.gols)}
                              max={Math.min(folha.baleadosPorEquipe, Number(atleta.gols) + (folha.baleadosPorEquipe - eliminacoesDosAtletas(equipe)))}
                              rotulo={`eliminações de ${atleta.nome}`}
                              desabilitado={semPlacar}
                              aoMudar={(v) => mudarAtleta(indice, atleta.atleta_id, 'gols', v)}
                            />
                          </td>
                        )}

                        {mostraPlacar && folha.faltasPorAtleta && (
                          <td data-rotulo="Faltas">
                            <Contador
                              valor={Number(atleta.faltas || 0)}
                              max={folha.maxFaltasPorAtleta}
                              minimo={Number(equipe[`faltas_${tempoDasFaltas}t`] || 0) === 0 ? Number(atleta.faltas || 0) : 0}
                              rotulo={`faltas de ${atleta.nome} no ${tempoDasFaltas}º tempo`}
                              desabilitado={semPlacar}
                              aoMudar={(v) => mudarFaltaDoAtleta(indice, atleta.atleta_id, v)}
                            />
                          </td>
                        )}

                        {mostraPlacar && folha.faltasIndividuais > 0 && (
                          <td data-rotulo="Faltas">
                            <Contador
                              valor={Number(atleta.faltas || 0)}
                              max={folha.faltasIndividuais}
                              rotulo={`faltas de ${atleta.nome}`}
                              desabilitado={semPlacar}
                              aoMudar={(v) => mudarAtleta(indice, atleta.atleta_id, 'faltas', v)}
                            />
                          </td>
                        )}

                        {mostraPlacar && folha.cartoes && (
                          <td data-rotulo="Amarelos">
                            <Contador
                              valor={Number(atleta.amarelos)}
                              max={folha.maxAmarelos}
                              rotulo={`amarelos de ${atleta.nome}`}
                              desabilitado={semPlacar}
                              aoMudar={(v) => mudarAtleta(indice, atleta.atleta_id, 'amarelos', v)}
                            />
                          </td>
                        )}

                        {mostraPlacar && folha.cartoes && (
                          <td data-rotulo="Vermelho">
                            <input
                              type="checkbox"
                              checked={atleta.vermelho}
                              disabled={semPlacar || (folha.maxAmarelos >= 2 && Number(atleta.amarelos) >= 2)}
                              title={folha.maxAmarelos >= 2 && Number(atleta.amarelos) >= 2 ? '2º amarelo = expulsão' : undefined}
                              onChange={(e) => mudarAtleta(indice, atleta.atleta_id, 'vermelho', e.target.checked)}
                              aria-label={`Cartão vermelho para ${atleta.nome}`}
                            />
                          </td>
                        )}
                        <td data-rotulo="Capitão">
                          <input
                            type="checkbox"
                            checked={atleta.capitao}
                            disabled={somenteLeitura}
                            onChange={() => marcarCapitao(indice, atleta.atleta_id)}
                            aria-label={`Capitão: ${atleta.nome}`}
                          />
                        </td>
                        {agendado && (
                          <td data-rotulo="Presente">
                            <input
                              type="checkbox"
                              checked={atleta.presente}
                              disabled={somenteLeitura}
                              onChange={(e) => mudarAtleta(indice, atleta.atleta_id, 'presente', e.target.checked)}
                              aria-label={`Presente: ${atleta.nome}`}
                            />
                          </td>
                        )}
                      </tr>
                    ))}

                    {atletasDaTabela(equipe).length === 0 && (
                      <tr>
                        <td colSpan={colunasDaTabela} className="text-left">
                          {equipe.atletas.length === 0 ? 'Nenhum atleta inscrito nesta equipe.' : 'Nenhum atleta presente nesta equipe.'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {mostraPlacar && folha.faltasPorAtleta && (
                <div className="mb-lg">
                  <p className="form-label" style={{ marginBottom: 4 }}>
                    Faltas da equipe: 1º T <strong>{Number(equipe.faltas_1t || 0)}</strong> · 2º T <strong>{Number(equipe.faltas_2t || 0)}</strong>
                  </p>
                  {[1, 2].filter((tempo) => Number(equipe[`faltas_${tempo}t`] || 0) >= 5).map((tempo) => (
                    <p key={tempo} className="alert alert-aviso" role="status" style={{ margin: '4px 0' }}>
                      {equipe.escola_nome}, {tempo}º tempo: {Number(equipe[`faltas_${tempo}t`])} faltas. Próxima falta: tiro livre.
                    </p>
                  ))}
                </div>
              )}

              {mesaMexeNoElenco && !equipe.a_definir && (
                <AdicionarAtletaMesa jogoId={id} equipe={equipe} aoAdicionar={adicionouAtleta} />
              )}

              {agendado && editaCamisas && !equipe.a_definir && equipe.atletas.length > 0 && (
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
                  {!editandoCamisas[equipe.equipe_id] && equipe.atletas.some((a) => camisaTravada(equipe, a)) && (
                    <button type="button" className="btn btn-outline btn-sm" onClick={() => editarCamisas(equipe.equipe_id)}>
                      ✏️ Editar camisas
                    </button>
                  )}
                  {editandoCamisas[equipe.equipe_id] && (
                    <button type="button" className="btn btn-outline btn-sm" onClick={() => cancelarEdicaoCamisas(equipe)}>
                      Cancelar
                    </button>
                  )}
                  {msg && <span className={`camisa-msg camisa-msg-${msg.tipo}`} role="status">{msg.tipo === 'success' ? '✓ ' : ''}{msg.texto}</span>}
                  {conferencia.repetidos.map(([numero, lista]) => (
                    <span key={numero} className="camisa-msg camisa-msg-error" role="alert">
                      Número {numero} repetido: {lista.map((a) => a.nome).join(' e ')}.
                    </span>
                  ))}
                  {conferencia.invalidos.size > 0 && (
                    <span className="camisa-msg camisa-msg-error" role="alert">O número vai de 1 a 99.</span>
                  )}
                  <span className="form-hint">Campo vazio = sem número. Números salvos ficam travados: use "Editar camisas" para corrigir. Vale para os próximos jogos da equipe.</span>
                </div>
              )}

              {mostraPlacar && folha.faltasIndividuais > 0 && (
                <p className="form-hint">
                  Falta individual vai de 0 a {folha.faltasIndividuais}: com {folha.faltasIndividuais} o
                  atleta está excluído. As faltas acumulativas da equipe vão até {folha.faltasAcumuladas} por tempo.
                </p>
              )}

              {mostraPlacar && (folha.baleadosPorEquipe > 0 || (folha.faltasAcumuladas > 0 && !folha.faltasPorAtleta) || folha.lancaTempoTecnico) && (
              <div className="rodape-equipe">
                {folha.baleadosPorEquipe > 0 && (
                  <div className="form-group">
                    <span className="form-label">
                      Adversárias eliminadas por esta equipe <small>(soma dos atletas, de 0 a {folha.baleadosPorEquipe})</small>
                    </span>
                    <strong className="total-eliminadas" aria-label={`total de eliminações de ${equipe.escola_nome}`}>
                      {eliminadasPor(equipe)} de {folha.baleadosPorEquipe}
                    </strong>
                    {eliminacoesDosAtletas(equipe) === 0 && totalLegado(equipe) > 0 && (
                      <span className="form-hint">
                        Súmula gravada só com o total da equipe ({totalLegado(equipe)}). Se você lançar eliminações por
                        atleta, o total passa a ser a soma.
                      </span>
                    )}
                  </div>
                )}

                {folha.faltasAcumuladas > 0 && !folha.faltasPorAtleta && (
                  <div className="form-group">
                    <span className="form-label">
                      Faltas 1º tempo <small>(até {folha.faltasAcumuladas})</small>
                    </span>
                    <Contador
                      valor={Number(equipe.faltas_1t)}
                      max={folha.faltasAcumuladas}
                      rotulo="faltas do primeiro tempo"
                      desabilitado={semPlacar}
                      aoMudar={(v) => mudarEquipe(indice, 'faltas_1t', v)}
                    />
                  </div>
                )}

                {folha.faltasAcumuladas > 0 && !folha.faltasPorAtleta && (
                  <div className="form-group">
                    <span className="form-label">
                      Faltas 2º tempo <small>(até {folha.faltasAcumuladas})</small>
                    </span>
                    <Contador
                      valor={Number(equipe.faltas_2t)}
                      max={folha.faltasAcumuladas}
                      rotulo="faltas do segundo tempo"
                      desabilitado={semPlacar}
                      aoMudar={(v) => mudarEquipe(indice, 'faltas_2t', v)}
                    />
                  </div>
                )}

                {folha.lancaTempoTecnico && (
                  <div className="form-group">
                    <span className="form-label">Tempo técnico</span>
                    <div className="linha-checks">
                      <label>
                        <input
                          type="checkbox"
                          checked={equipe.tempo_tecnico_1t}
                          disabled={semPlacar}
                          onChange={(e) => mudarEquipe(indice, 'tempo_tecnico_1t', e.target.checked)}
                        /> 1º T
                      </label>
                      <label>
                        <input
                          type="checkbox"
                          checked={equipe.tempo_tecnico_2t}
                          disabled={semPlacar}
                          onChange={(e) => mudarEquipe(indice, 'tempo_tecnico_2t', e.target.checked)}
                        /> 2º T
                      </label>
                    </div>
                  </div>
                )}
              </div>
              )}
            </div>
          </section>
          );
        })}

        {!agendado && empatado && exigeProrrogacao && (
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
                  disabled={somenteLeitura}
                  onChange={(e) => setProrrogacao(e.target.checked)}
                />{' '}
                Houve prorrogação e o empate continuou
              </label>
            </div>
          </div>
        )}

        {!agendado && comAcrescimo && (
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
                      disabled={somenteLeitura}
                      onChange={() => setBaleouPrimeiro(equipe.equipe_id)}
                    />{' '}
                    {equipe.escola_nome}
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}

        {!agendado && empatePendente && (
          <div className="alert alert-aviso mb-lg">
            <p className="alert-titulo">⚠️ {somaEmpatada ? (jogoUnico ? 'Jogo empatado' : 'Soma dos dois jogos empatada') : 'Empate no mata-mata'}: regra pendente</p>
            <p className="alert-texto">
              Em {jogo.modalidade_nome}, {desempate.motivo}. A regra está pendente com a
              organização: salve a súmula sem finalizar e aguarde a decisão. O sistema não
              finaliza este jogo empatado.
            </p>
          </div>
        )}

        {!agendado && precisaPenaltis && (
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
                    desabilitado={somenteLeitura}
                    aoMudar={(v) => setPenaltis((p) => ({ ...p, penaltis_1: v }))}
                  />
                </div>
                <div className="form-group">
                  <span className="form-label">{equipes[1].escola_nome}</span>
                  <Contador
                    valor={penaltis.penaltis_2}
                    rotulo={`${desempate.nomeCobranca} da segunda equipe`}
                    desabilitado={somenteLeitura}
                    aoMudar={(v) => setPenaltis((p) => ({ ...p, penaltis_2: v }))}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="page-toolbar barra-sumula">
          <div className="acoes">
            {agendado && (
              <button type="button" className="btn btn-outline" onClick={salvarPreJogo} disabled={salvando}>
                {salvando ? 'Salvando...' : 'Salvar parcial'}
              </button>
            )}
            {!agendado && !somenteLeitura && (
              <>
                <button type="button" className="btn btn-outline" onClick={() => enviar(false)} disabled={salvando}>
                  {salvando ? 'Salvando...' : 'Salvar parcial'}
                </button>
                <button type="button" className="btn btn-primary" onClick={() => enviar(true)} disabled={salvando}>
                  Finalizar súmula
                </button>
              </>
            )}
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
