import { useState, useEffect } from 'react';
import { listarEscolas } from '../services/escolas';
import { cadastrarAtleta } from '../services/atletas';
import { listarEquipes } from '../services/equipes';
import { inscreverAtleta } from '../services/inscricoes';

const ROTULO_GENERO = { MASCULINO: 'Masculino', FEMININO: 'Feminino', MISTO: 'Misto' };

const FORM_VAZIO = {
  nome: '',
  rg: '',
  data_nascimento: '',
  sexo: '',
  escola_id: ''
};

// Duas etapas na mesma tela: cadastrar o atleta e, com ele criado, inscrevê-lo
// nas competições da escola dele. As recusas do backend (idade, sexo, teto de
// 14, limite de 2 competições coletivas) aparecem aqui, nunca em alert().
function CadastroAtleta() {
  const [form, setForm] = useState(FORM_VAZIO);
  const [escolas, setEscolas] = useState([]);
  const [salvando, setSalvando] = useState(false);
  const [erroCadastro, setErroCadastro] = useState('');

  // Atleta recém-criado: enquanto existir, a tela mostra a etapa de inscrição
  const [atleta, setAtleta] = useState(null);

  const [equipes, setEquipes] = useState(null);
  const [equipeId, setEquipeId] = useState('');
  const [numeroCamisa, setNumeroCamisa] = useState('');
  const [inscrevendo, setInscrevendo] = useState(false);
  const [erroInscricao, setErroInscricao] = useState('');
  const [inscricoes, setInscricoes] = useState([]);

  useEffect(() => {
    let ativo = true;

    listarEscolas()
      .then((dados) => {
        if (ativo) setEscolas(dados);
      })
      .catch((falha) => {
        if (ativo) setErroCadastro(falha.mensagem);
      });

    return () => {
      ativo = false;
    };
  }, []);

  // As equipes disponíveis são as da escola do atleta recém-cadastrado
  useEffect(() => {
    if (!atleta) return;

    let ativo = true;

    listarEquipes({ escola_id: atleta.escola_id })
      .then((dados) => {
        if (ativo) setEquipes(dados);
      })
      .catch((falha) => {
        if (ativo) setErroInscricao(falha.mensagem);
      });

    return () => {
      ativo = false;
    };
  }, [atleta]);

  const alterar = (campo) => (e) => setForm((atual) => ({ ...atual, [campo]: e.target.value }));

  const cadastrar = async (e) => {
    e.preventDefault();
    setErroCadastro('');
    setSalvando(true);

    try {
      const resposta = await cadastrarAtleta({
        nome: form.nome,
        rg: form.rg,
        data_nascimento: form.data_nascimento,
        sexo: form.sexo,
        escola_id: Number(form.escola_id)
      });

      const escola = escolas.find((x) => x.id === Number(form.escola_id));

      setAtleta({
        id: resposta.id_atleta,
        nome: form.nome,
        escola_id: Number(form.escola_id),
        escola_nome: escola ? escola.nome : ''
      });
    } catch (falha) {
      setErroCadastro(falha.mensagem);
    } finally {
      setSalvando(false);
    }
  };

  const inscrever = async (e) => {
    e.preventDefault();
    setErroInscricao('');
    setInscrevendo(true);

    try {
      const resposta = await inscreverAtleta({
        equipe_id: Number(equipeId),
        atleta_id: atleta.id,
        numero_camisa: numeroCamisa || null
      });

      const equipe = equipes.find((x) => x.id === Number(equipeId));

      setInscricoes((atual) => [...atual, {
        id: resposta.id_inscricao,
        equipe,
        numero_camisa: numeroCamisa,
        aviso: resposta.aviso
      }]);

      // Recarrega para os contadores (x/14) refletirem a inscrição nova
      listarEquipes({ escola_id: atleta.escola_id })
        .then(setEquipes)
        .catch(() => { /* os contadores ficam defasados, a tela segue */ });

      setEquipeId('');
      setNumeroCamisa('');
    } catch (falha) {
      setErroInscricao(falha.mensagem);
    } finally {
      setInscrevendo(false);
    }
  };

  const novoAtleta = () => {
    setForm(FORM_VAZIO);
    setAtleta(null);
    setEquipes(null);
    setEquipeId('');
    setNumeroCamisa('');
    setInscricoes([]);
    setErroCadastro('');
    setErroInscricao('');
  };

  const jaInscritas = new Set(inscricoes.map((i) => i.equipe?.id));
  const coletivasUsadas = inscricoes.filter((i) => i.equipe?.modalidade_tipo === 'COLETIVO').length;

  return (
    <div className="page">
      <div className="container-sm">
        <header className="page-header">
          <p className="eyebrow">Atletas</p>
          <h1 className="page-title">Cadastro de Atleta</h1>
          <p className="page-subtitle">
            Cadastre o atleta e, em seguida, inscreva-o nas competições da escola dele.
          </p>
        </header>

        {/* ---------- Etapa 1: o atleta ---------- */}
        <div className="card mb-lg">
          <form onSubmit={cadastrar} className="card-body form">
            <h2 className="card-title">1. Dados do atleta</h2>

            {erroCadastro && <p className="alert alert-error" style={{ margin: 0 }}>{erroCadastro}</p>}

            {atleta && (
              <p className="alert alert-success" style={{ margin: 0 }}>
                {atleta.nome} foi cadastrado. Agora escolha as competições abaixo.
              </p>
            )}

            <div className="form-group">
              <label className="form-label" htmlFor="nome">Nome</label>
              <input id="nome" className="form-control" type="text" value={form.nome}
                onChange={alterar('nome')} disabled={Boolean(atleta)} required />
            </div>

            <div className="form-linha">
              <div className="form-group">
                <label className="form-label" htmlFor="rg">RG</label>
                <input id="rg" className="form-control" type="text" value={form.rg}
                  onChange={alterar('rg')} disabled={Boolean(atleta)} required />
                <span className="form-hint">Obrigatório pelo regulamento. Pontos e traços são ignorados.</span>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="sexo">Sexo</label>
                <select id="sexo" className="form-control" value={form.sexo}
                  onChange={alterar('sexo')} disabled={Boolean(atleta)} required>
                  <option value="">Selecione...</option>
                  <option value="M">Masculino</option>
                  <option value="F">Feminino</option>
                </select>
                <span className="form-hint">Define em que competições ele pode entrar.</span>
              </div>
            </div>

            <div className="form-linha">
              <div className="form-group">
                <label className="form-label" htmlFor="nascimento">Data de nascimento</label>
                <input id="nascimento" className="form-control" type="date" value={form.data_nascimento}
                  onChange={alterar('data_nascimento')} disabled={Boolean(atleta)} required />
                <span className="form-hint">Define a categoria em que ele pode jogar.</span>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="escola">Escola</label>
                <select id="escola" className="form-control" value={form.escola_id}
                  onChange={alterar('escola_id')} disabled={Boolean(atleta) || escolas.length === 0} required>
                  <option value="">
                    {escolas.length === 0 ? 'Nenhuma escola cadastrada' : 'Selecione a escola'}
                  </option>
                  {escolas.map((escola) => (
                    <option key={escola.id} value={escola.id}>{escola.nome}</option>
                  ))}
                </select>
              </div>
            </div>

            {!atleta && (
              <button type="submit" className="btn btn-primary btn-block" disabled={salvando}>
                {salvando ? 'Cadastrando...' : 'Cadastrar atleta'}
              </button>
            )}
          </form>
        </div>

        {/* ---------- Etapa 2: as inscrições ---------- */}
        {atleta && (
          <div className="card mb-lg">
            <form onSubmit={inscrever} className="card-body form">
              <h2 className="card-title">2. Inscrever nas competições</h2>

              <p className="form-hint" style={{ marginTop: 0 }}>
                Equipes de {atleta.escola_nome}. O regulamento permite no máximo{' '}
                <strong>2 competições coletivas</strong> por atleta
                {coletivasUsadas > 0 && ` — ${coletivasUsadas} já usada${coletivasUsadas > 1 ? 's' : ''}`}.
              </p>

              {erroInscricao && <p className="alert alert-error" style={{ margin: 0 }}>{erroInscricao}</p>}

              {inscricoes.length > 0 && (
                <ul className="lista-inscricoes">
                  {inscricoes.map((inscricao) => (
                    <li key={inscricao.id}>
                      <span>
                        ✅ {inscricao.equipe?.modalidade_nome} · {inscricao.equipe?.categoria_nome}{' '}
                        {ROTULO_GENERO[inscricao.equipe?.genero] || ''}
                        {inscricao.numero_camisa && ` — camisa ${inscricao.numero_camisa}`}
                      </span>
                      {inscricao.aviso && <span className="form-hint">{inscricao.aviso}</span>}
                    </li>
                  ))}
                </ul>
              )}

              <div className="form-linha">
                <div className="form-group">
                  <label className="form-label" htmlFor="equipe">Competição</label>
                  <select id="equipe" className="form-control" value={equipeId}
                    onChange={(e) => setEquipeId(e.target.value)} required>
                    <option value="">
                      {equipes === null ? 'Carregando competições...' : 'Selecione a competição'}
                    </option>
                    {(equipes || [])
                      .filter((equipe) => !jaInscritas.has(equipe.id))
                      .map((equipe) => (
                        <option key={equipe.id} value={equipe.id}>
                          {equipe.modalidade_nome} · {equipe.categoria_nome}{' '}
                          {ROTULO_GENERO[equipe.genero] || equipe.genero}
                          {equipe.max_atletas ? ` (${equipe.total_inscritos}/${equipe.max_atletas})` : ''}
                        </option>
                      ))}
                  </select>
                  {equipes !== null && equipes.length === 0 && (
                    <span className="form-hint">Esta escola não tem equipe em nenhuma competição.</span>
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="camisa">
                    Número da camisa <span className="form-hint">(opcional)</span>
                  </label>
                  <input id="camisa" className="form-control" type="number" min="1" max="99"
                    value={numeroCamisa} onChange={(e) => setNumeroCamisa(e.target.value)} />
                </div>
              </div>

              <div className="acoes" style={{ justifyContent: 'flex-start' }}>
                <button type="submit" className="btn btn-primary" disabled={inscrevendo || !equipeId}>
                  {inscrevendo ? 'Inscrevendo...' : 'Inscrever'}
                </button>
                <button type="button" className="btn btn-outline" onClick={novoAtleta}>
                  Cadastrar outro atleta
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

export default CadastroAtleta;
