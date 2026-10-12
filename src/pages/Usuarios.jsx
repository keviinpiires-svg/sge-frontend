import { useState, useEffect } from 'react';
import { useAuth } from '../context/useAuth';
import {
  listarUsuarios, criarUsuario, atualizarUsuario, trocarSenhaUsuario
} from '../services/usuarios';

const MINIMO_SENHA = 8;

const ROTULO_PERFIL = { ADMIN: 'Administrador', PLACAR: 'Mesa (placar)' };

const DESCRICAO_PERFIL = {
  ADMIN: 'Faz tudo: cadastra escolas e atletas, agenda jogos, gera o mata-mata e aplica punições.',
  PLACAR: 'Só lança placar e súmula. Não cadastra nem pune — é a conta de quem fica na mesa.'
};

const FORM_VAZIO = { id: null, nome: '', email: '', perfil: 'PLACAR', senha: '' };

const formatarData = (valor) =>
  valor ? new Date(valor).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '';

function Usuarios() {
  const { usuario: eu } = useAuth();

  const [resultado, setResultado] = useState(null);
  const [recarga, setRecarga] = useState(0);
  const [form, setForm] = useState(FORM_VAZIO);
  const [senhaDe, setSenhaDe] = useState(null);   // usuário em redefinição de senha
  const [novaSenha, setNovaSenha] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [aviso, setAviso] = useState(null);

  const pronto = resultado?.recarga === recarga;
  const usuarios = pronto ? resultado.usuarios : [];
  const erro = pronto ? resultado.erro : '';

  useEffect(() => {
    let ativo = true;

    listarUsuarios()
      .then((lista) => {
        if (ativo) setResultado({ recarga, usuarios: lista, erro: '' });
      })
      .catch((falha) => {
        if (ativo) setResultado({ recarga, usuarios: [], erro: falha.mensagem });
      });

    return () => {
      ativo = false;
    };
  }, [recarga]);

  const recarregar = (texto) => {
    setAviso({ tipo: 'success', texto });
    setRecarga((r) => r + 1);
  };

  const salvar = async (evento) => {
    evento.preventDefault();
    setSalvando(true);
    setAviso(null);

    try {
      if (form.id) {
        // Na edição vai só o que a tela deixa mudar. O perfil da própria conta
        // nem é enviado: o backend recusa, e com razão.
        const campos = { nome: form.nome.trim(), email: form.email.trim() };
        if (form.id !== eu?.id) campos.perfil = form.perfil;

        const resposta = await atualizarUsuario(form.id, campos);
        setForm(FORM_VAZIO);
        recarregar(resposta.mensagem);
      } else {
        const resposta = await criarUsuario({
          nome: form.nome.trim(),
          email: form.email.trim(),
          perfil: form.perfil,
          senha: form.senha
        });
        setForm(FORM_VAZIO);
        recarregar(resposta.mensagem);
      }
    } catch (falha) {
      setAviso({ tipo: 'error', texto: falha.mensagem });
    } finally {
      setSalvando(false);
    }
  };

  const alternarAtivo = async (usuario) => {
    const desativando = Boolean(usuario.ativo);

    const confirmou = window.confirm(
      desativando
        ? `Desativar a conta de ${usuario.nome} (${usuario.email})?\n\n`
          + 'Ela perde o acesso imediatamente, mas continua registrada no que já fez '
          + '(punições e suspensões guardam quem aplicou).'
        : `Reativar a conta de ${usuario.nome} (${usuario.email})?\n\n`
          + 'A senha continua a mesma de antes — se ela foi esquecida, use "Nova senha".'
    );
    if (!confirmou) return;

    setSalvando(true);
    setAviso(null);

    try {
      const resposta = await atualizarUsuario(usuario.id, { ativo: !usuario.ativo });
      recarregar(resposta.mensagem);
    } catch (falha) {
      setAviso({ tipo: 'error', texto: falha.mensagem });
    } finally {
      setSalvando(false);
    }
  };

  const redefinirSenha = async (evento) => {
    evento.preventDefault();
    setSalvando(true);
    setAviso(null);

    try {
      const resposta = await trocarSenhaUsuario(senhaDe.id, novaSenha);
      const nome = senhaDe.nome;
      setSenhaDe(null);
      setNovaSenha('');
      recarregar(`${resposta.mensagem} Avise ${nome} da nova senha.`);
    } catch (falha) {
      setAviso({ tipo: 'error', texto: falha.mensagem });
    } finally {
      setSalvando(false);
    }
  };

  if (!pronto) {
    return (
      <div className="page"><div className="container-lg">
        <div className="card"><div className="state">
          <div className="spinner" />
          <p className="state-text">Carregando os usuários...</p>
        </div></div>
      </div></div>
    );
  }

  if (erro) {
    return (
      <div className="page"><div className="container-lg">
        <div className="card"><div className="state state-error">
          <div className="state-icon">⚠️</div>
          <p className="state-title">Não foi possível carregar os usuários</p>
          <p className="state-text">{erro}</p>
        </div></div>
      </div></div>
    );
  }

  const admins = usuarios.filter((u) => u.perfil === 'ADMIN' && u.ativo).length;
  const mesas = usuarios.filter((u) => u.perfil === 'PLACAR' && u.ativo).length;
  const inativas = usuarios.filter((u) => !u.ativo).length;

  const editando = Boolean(form.id);
  const editandoEu = form.id === eu?.id;

  return (
    <div className="page">
      <div className="container-lg">
        <header className="page-header">
          <p className="eyebrow">Acesso ao sistema</p>
          <h1 className="page-title">Usuários</h1>
          <p className="page-subtitle">
            Duas espécies de conta: <b>administrador</b>, que faz tudo, e <b>mesa</b>, que só lança
            placar e súmula. Podem existir quantas contas de mesa forem necessárias — uma por
            quadra, por exemplo.
          </p>
        </header>

        <p className="legenda-desempate">
          Hoje: <b>{admins}</b> {admins === 1 ? 'administrador' : 'administradores'} e{' '}
          <b>{mesas}</b> {mesas === 1 ? 'conta de mesa' : 'contas de mesa'} com acesso
          {inativas > 0 && <>, mais {inativas} {inativas === 1 ? 'desativada' : 'desativadas'}</>}.
        </p>

        {aviso && <p className={`alert alert-${aviso.tipo} mb-lg`}>{aviso.texto}</p>}

        <section className="card mb-lg">
          <div className="table-wrap">
            <table className="table-sge compact">
              <thead>
                <tr>
                  <th className="text-left">Nome</th>
                  <th className="text-left">E-mail</th>
                  <th className="text-left">Perfil</th>
                  <th>Acesso</th>
                  <th className="text-left">Criada em</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {usuarios.map((usuario) => {
                  const souEu = usuario.id === eu?.id;

                  return (
                    <tr key={usuario.id} className={usuario.ativo ? '' : 'row-inativa'}>
                      <td className="text-left strong">
                        {usuario.nome}
                        {souEu && <span className="badge badge-accent" style={{ marginLeft: '8px' }}>você</span>}
                      </td>
                      <td className="text-left text-soft">{usuario.email}</td>
                      <td className="text-left">
                        <span
                          className={`badge ${usuario.perfil === 'ADMIN' ? 'badge-accent' : ''}`}
                          title={DESCRICAO_PERFIL[usuario.perfil]}
                        >
                          {ROTULO_PERFIL[usuario.perfil] || usuario.perfil}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${usuario.ativo ? 'badge-success' : 'badge-suspenso'}`}>
                          {usuario.ativo ? 'ativa' : 'desativada'}
                        </span>
                      </td>
                      <td className="text-left text-soft">{formatarData(usuario.criado_em)}</td>
                      <td>
                        <div className="btn-group">
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            disabled={salvando}
                            onClick={() => {
                              setSenhaDe(null);
                              setForm({
                                id: usuario.id,
                                nome: usuario.nome,
                                email: usuario.email,
                                perfil: usuario.perfil,
                                senha: ''
                              });
                            }}
                          >
                            Editar
                          </button>

                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            disabled={salvando}
                            onClick={() => {
                              setForm(FORM_VAZIO);
                              setNovaSenha('');
                              setSenhaDe(usuario);
                            }}
                          >
                            Nova senha
                          </button>

                          {/* Ninguém desativa a própria conta: o sistema pode
                              ficar sem nenhum administrador para desfazer isso. */}
                          <button
                            type="button"
                            className={`btn btn-sm ${usuario.ativo ? 'btn-danger' : 'btn-success'}`}
                            disabled={salvando || souEu}
                            title={souEu ? 'Você não pode desativar a própria conta.' : ''}
                            onClick={() => alternarAtivo(usuario)}
                          >
                            {usuario.ativo ? 'Desativar' : 'Reativar'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {senhaDe && (
          <section className="card mb-lg">
            <div className="card-body">
              <h2 className="card-title">Nova senha de {senhaDe.nome}</h2>

              <form onSubmit={redefinirSenha} className="form">
                <div className="form-group">
                  <label className="form-label" htmlFor="nova-senha">Senha</label>
                  <input
                    id="nova-senha"
                    className="form-control"
                    type="password"
                    autoComplete="new-password"
                    minLength={MINIMO_SENHA}
                    value={novaSenha}
                    onChange={(e) => setNovaSenha(e.target.value)}
                    required
                  />
                  <span className="form-hint">
                    No mínimo {MINIMO_SENHA} caracteres. Não é preciso saber a senha antiga —
                    isto serve justamente para quem esqueceu a dela.
                  </span>
                </div>

                <div className="btn-row">
                  <button type="submit" className="btn btn-primary" disabled={salvando}>
                    {salvando ? 'Salvando...' : '🔑 Trocar a senha'}
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => { setSenhaDe(null); setNovaSenha(''); }}
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          </section>
        )}

        <section className="card mb-lg">
          <div className="card-body">
            <h2 className="card-title">{editando ? `Editando ${form.nome || 'usuário'}` : 'Nova conta'}</h2>

            <form onSubmit={salvar} className="form">
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label" htmlFor="nome">Nome</label>
                  <input
                    id="nome"
                    className="form-control"
                    type="text"
                    maxLength={150}
                    value={form.nome}
                    onChange={(e) => setForm({ ...form, nome: e.target.value })}
                    placeholder="Ex.: Mesa 1 — Ginásio Municipal"
                    required
                  />
                  <span className="form-hint">
                    É o que aparece no topo da tela de quem entra. Numa conta de mesa, vale dizer
                    de qual quadra ela é.
                  </span>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="email">E-mail</label>
                  <input
                    id="email"
                    className="form-control"
                    type="email"
                    maxLength={150}
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="nome@exemplo.com"
                    required
                  />
                  <span className="form-hint">É com ele que se entra no sistema. Não pode repetir.</span>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label" htmlFor="perfil">Perfil</label>
                  <select
                    id="perfil"
                    className="form-control"
                    value={form.perfil}
                    disabled={editandoEu}
                    onChange={(e) => setForm({ ...form, perfil: e.target.value })}
                  >
                    <option value="PLACAR">{ROTULO_PERFIL.PLACAR}</option>
                    <option value="ADMIN">{ROTULO_PERFIL.ADMIN}</option>
                  </select>
                  <span className="form-hint">
                    {editandoEu
                      ? 'Você não pode mudar o próprio perfil.'
                      : DESCRICAO_PERFIL[form.perfil]}
                  </span>
                </div>

                {!editando && (
                  <div className="form-group">
                    <label className="form-label" htmlFor="senha">Senha</label>
                    <input
                      id="senha"
                      className="form-control"
                      type="password"
                      autoComplete="new-password"
                      minLength={MINIMO_SENHA}
                      value={form.senha}
                      onChange={(e) => setForm({ ...form, senha: e.target.value })}
                      required
                    />
                    <span className="form-hint">
                      No mínimo {MINIMO_SENHA} caracteres. Você entrega a senha à pessoa, que depois
                      pode pedir uma nova por aqui.
                    </span>
                  </div>
                )}
              </div>

              <div className="btn-row">
                <button type="submit" className="btn btn-primary" disabled={salvando}>
                  {salvando ? 'Salvando...' : editando ? '💾 Salvar alterações' : '➕ Criar conta'}
                </button>
                {editando && (
                  <button type="button" className="btn btn-secondary" onClick={() => setForm(FORM_VAZIO)}>
                    Cancelar
                  </button>
                )}
              </div>
            </form>
          </div>
        </section>

        <p className="legenda-desempate">
          <b>Contas não são apagadas, são desativadas.</b> Uma punição e uma suspensão guardam quem
          as aplicou; apagar a conta apagaria essa autoria. Desativar tira o acesso na hora e
          preserva o histórico.
        </p>
      </div>
    </div>
  );
}

export default Usuarios;
