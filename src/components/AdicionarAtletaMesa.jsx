import { useEffect, useState } from 'react';
import { buscarAtletasDaEscola, adicionarAtletaPelaMesa } from '../services/mesaAtletas';

const ROTULO_GENERO = { MASCULINO: 'Masc.', FEMININO: 'Fem.', MISTO: 'Misto' };
const MIN_LETRAS = 3;
const FORM_VAZIO = { nome: '', data_nascimento: '', sexo: '', documento: '' };

const rotuloDaEquipe = (e) => `${e.modalidade} ${e.categoria} ${ROTULO_GENERO[e.genero] || e.genero}`;

// Texto de um erro da API. Para a mesa, regra que barra (403 com "detalhe") vira
// "Precisa de autorização do administrador." + o motivo curto. Para o ADMIN vem o
// motivo direto e, se a "Exceção autorizada" resolveria, `pode_excecao`.
const dizerErro = (falha) => ({
  texto: falha.mensagem,
  detalhe: falha.response?.data?.detalhe || '',
  podeExcecao: Boolean(falha.response?.data?.pode_excecao)
});

// Botão "Adicionar atleta" de uma equipe, na tela da súmula: a mesa do local do jogo (jogo agendado),
// e desde 17/11/2026 o ADMIN, que lança a súmula do papel (também em jogo em andamento ou finalizado)
// e tem a caixa "Exceção autorizada" (a regra da importação: dispensa só a idade e o limite de 2 coletivas). Busca atleta já cadastrado na mesma escola (só
// nome e as equipes em que ele já está) ou cadastra um novo. As regras são do backend; a mesa
// não abre exceção.
function AdicionarAtletaMesa({ jogoId, equipe, aoAdicionar, admin = false }) {
  const [aberto, setAberto] = useState(false);
  const [busca, setBusca] = useState('');
  const [resultado, setResultado] = useState(null); // { busca, atletas, erro }
  const [novo, setNovo] = useState(false);
  const [form, setForm] = useState(FORM_VAZIO);
  const [enviando, setEnviando] = useState(false);
  const [msg, setMsg] = useState(null); // { tipo, texto, detalhe, podeExcecao }
  const [excecao, setExcecao] = useState(false); // só o ADMIN

  const termo = busca.trim();
  const buscando = aberto && termo.length >= MIN_LETRAS && resultado?.busca !== termo;

  useEffect(() => {
    if (!aberto || termo.length < MIN_LETRAS) return undefined;
    let ativo = true;
    const espera = setTimeout(() => {
      buscarAtletasDaEscola(jogoId, equipe.equipe_id, termo)
        .then((atletas) => { if (ativo) setResultado({ busca: termo, atletas, erro: '' }); })
        .catch((falha) => { if (ativo) setResultado({ busca: termo, atletas: [], erro: falha.mensagem }); });
    }, 350);
    return () => { ativo = false; clearTimeout(espera); };
  }, [aberto, termo, jogoId, equipe.equipe_id]);

  const fechar = () => {
    setAberto(false); setBusca(''); setResultado(null); setNovo(false); setForm(FORM_VAZIO); setMsg(null); setExcecao(false);
  };

  const adicionar = async (corpo) => {
    setEnviando(true);
    setMsg(null);
    try {
      const dados = await adicionarAtletaPelaMesa(jogoId, equipe.equipe_id, admin && excecao ? { ...corpo, excecao: true } : corpo);
      aoAdicionar(equipe.equipe_id, dados);
      setMsg({
        tipo: 'success',
        texto: `${dados.atleta.nome} entrou na equipe.`
          + (dados.excecao_dispensou?.length ? ` Exceção autorizada: dispensou ${dados.excecao_dispensou.join(' e ')}.` : '')
          + (dados.sem_documento ? (admin ? ' Cadastrado sem documento: complete o RG em Listar Atletas.' : ' Cadastrado sem documento: o administrador completa depois.') : '')
          + (dados.aviso ? ` ${dados.aviso}` : '')
      });
      setExcecao(false);
      setBusca('');
      setResultado(null);
      setForm(FORM_VAZIO);
      setNovo(false);
    } catch (falha) {
      setMsg({ tipo: 'error', ...dizerErro(falha) });
    } finally {
      setEnviando(false);
    }
  };

  const enviarNovo = (e) => {
    e.preventDefault();
    adicionar({
      nome: form.nome,
      data_nascimento: form.data_nascimento,
      sexo: form.sexo,
      documento: form.documento || undefined
    });
  };

  if (!aberto) {
    return (
      <div className="acoes" style={{ marginTop: 12 }}>
        <button type="button" className="btn btn-outline btn-sm" onClick={() => setAberto(true)}>
          ➕ Adicionar atleta
        </button>
      </div>
    );
  }

  return (
    <div className="card" style={{ marginTop: 12 }}>
      <div className="card-body">
        <h3 className="card-title">Adicionar atleta — {equipe.escola_nome}</h3>
        <p className="form-hint">
          Procure pelo nome o atleta que já está cadastrado na escola. Se não existir, cadastre um novo.
          {admin
            ? 'Valem as regras do cadastro normal. Se a idade ou o limite de 2 competições coletivas barrar, marque "Exceção autorizada".'
            : 'Valem as mesmas regras do cadastro normal; se alguma barrar, só o administrador autoriza.'}
        </p>

        {admin && (
          <label className="lote-check" style={{ display: 'flex', gap: 8, alignItems: 'center', minHeight: 44 }}>
            <input type="checkbox" checked={excecao} onChange={(e) => setExcecao(e.target.checked)} />
            <span><strong>Exceção autorizada</strong> (dispensa só a idade da categoria e o limite de 2 competições coletivas; fica registrada no log)</span>
          </label>
        )}

        {msg && (
          <div className={`alert alert-${msg.tipo === 'success' ? 'success' : 'error'}`} role="status">
            {msg.tipo === 'success' ? msg.texto : (
              <>
                <p className="alert-titulo">{msg.texto}</p>
                {msg.detalhe && <p className="alert-texto">{msg.detalhe}</p>}
                {admin && msg.podeExcecao && !excecao && (
                  <p className="alert-texto">Se a organização autorizou, marque "Exceção autorizada" acima e tente de novo.</p>
                )}
              </>
            )}
          </div>
        )}

        <label className="form-group">
          <span className="form-label">Nome do atleta</span>
          <input
            className="form-control"
            type="search"
            autoComplete="off"
            placeholder={`Pelo menos ${MIN_LETRAS} letras`}
            value={busca}
            onChange={(e) => { setBusca(e.target.value); setMsg(null); }}
          />
        </label>

        {termo.length >= MIN_LETRAS && (
          <div style={{ marginBottom: 12 }}>
            {buscando && <p className="state-text">Buscando…</p>}
            {!buscando && resultado?.erro && <p className="alert alert-error">{resultado.erro}</p>}
            {!buscando && resultado && !resultado.erro && resultado.atletas.length === 0 && (
              <p className="state-text">Ninguém com esse nome na escola (ou já está nesta equipe).</p>
            )}
            {!buscando && resultado && !resultado.erro && resultado.atletas.length > 0 && (
              <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                {resultado.atletas.map((a) => (
                  <li key={a.id} style={{ display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'space-between', padding: '6px 0', flexWrap: 'wrap' }}>
                    <span>
                      <strong>{a.nome}</strong>
                      <span className="form-hint" style={{ display: 'block' }}>
                        {a.equipes.length === 0 ? 'Ainda sem equipe' : `Já está em: ${a.equipes.map(rotuloDaEquipe).join(' · ')}`}
                      </span>
                    </span>
                    <button type="button" className="btn btn-primary btn-sm" disabled={enviando}
                      onClick={() => adicionar({ atleta_id: a.id })}>
                      Inscrever
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {!novo ? (
          <button type="button" className="btn btn-outline btn-sm" onClick={() => { setNovo(true); setForm({ ...FORM_VAZIO, nome: busca.trim() }); }}>
            Não achou? Cadastrar novo atleta
          </button>
        ) : (
          <form onSubmit={enviarNovo}>
            <label className="form-group">
              <span className="form-label">Nome completo</span>
              <input className="form-control" required maxLength={150} value={form.nome}
                onChange={(e) => setForm({ ...form, nome: e.target.value })} />
            </label>
            <label className="form-group">
              <span className="form-label">Data de nascimento</span>
              <input className="form-control" type="date" required value={form.data_nascimento}
                onChange={(e) => setForm({ ...form, data_nascimento: e.target.value })} />
            </label>
            <label className="form-group">
              <span className="form-label">Sexo</span>
              <select className="form-control" required value={form.sexo}
                onChange={(e) => setForm({ ...form, sexo: e.target.value })}>
                <option value="">Escolha</option>
                <option value="M">Masculino</option>
                <option value="F">Feminino</option>
              </select>
            </label>
            <label className="form-group">
              <span className="form-label">Documento (RG ou CPF) — opcional</span>
              <input className="form-control" maxLength={20} autoComplete="off" value={form.documento}
                onChange={(e) => setForm({ ...form, documento: e.target.value })} />
              <span className="form-hint">Sem documento, o sistema gera um código provisório e o administrador completa depois.</span>
            </label>
            <div className="acoes">
              <button type="submit" className="btn btn-primary btn-sm" disabled={enviando}>
                {enviando ? 'Salvando…' : 'Cadastrar e inscrever'}
              </button>
              <button type="button" className="btn btn-outline btn-sm" onClick={() => { setNovo(false); setForm(FORM_VAZIO); }}>
                Cancelar
              </button>
            </div>
          </form>
        )}

        <div className="acoes" style={{ marginTop: 12 }}>
          <button type="button" className="btn btn-secondary btn-sm" onClick={fechar}>Fechar</button>
        </div>
      </div>
    </div>
  );
}

export default AdicionarAtletaMesa;
