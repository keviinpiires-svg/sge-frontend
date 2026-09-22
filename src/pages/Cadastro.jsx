import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { listarEscolas, cadastrarEscola, atualizarEscola } from '../services/escolas';

function Cadastro() {
  // Sem :id na URL a tela cadastra; com :id, edita a escola existente
  const { id } = useParams();
  const navigate = useNavigate();
  const editando = Boolean(id);

  const [nome, setNome] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [carregando, setCarregando] = useState(editando);

  // O backend não tem GET /escolas/:id, então buscamos a lista e filtramos
  useEffect(() => {
    if (!editando) return;

    let ativo = true;

    listarEscolas()
      .then((escolas) => {
        if (!ativo) return;
        const escola = escolas.find((e) => String(e.id) === String(id));
        if (escola) {
          setNome(escola.nome || '');
          setCnpj(escola.cnpj || '');
        } else {
          setErro('Escola não encontrada.');
        }
      })
      .catch((falha) => {
        if (ativo) setErro(falha.mensagem);
      })
      .finally(() => {
        if (ativo) setCarregando(false);
      });

    return () => {
      ativo = false;
    };
  }, [id, editando]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErro('');
    setSucesso('');
    setSalvando(true);

    try {
      const resposta = editando
        ? await atualizarEscola(id, { nome, cnpj })
        : await cadastrarEscola({ nome, cnpj });

      setSucesso(resposta.mensagem);

      // Só o cadastro limpa o formulário: na edição os campos seguem valendo
      if (!editando) {
        setNome('');
        setCnpj('');
      }
    } catch (falha) {
      console.error(falha);
      // Mensagem real do backend (409 de nome/CNPJ duplicado, por exemplo),
      // já normalizada pelo interceptor do Axios
      setErro(falha.mensagem);
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="page">
      <div className="container-sm">
        <header className="page-header">
          <p className="eyebrow">Equipes</p>
          <h1 className="page-title">{editando ? 'Editar Escola' : 'Novo Cadastro'}</h1>
          <p className="page-subtitle">
            {editando
              ? 'Altere os dados da escola e salve.'
              : 'Registre uma nova escola/time no campeonato.'}
          </p>
        </header>

        <div className="card">
          {carregando ? (
            <div className="state">
              <div className="spinner" />
              <p className="state-text">Carregando dados da escola...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="card-body form">
              {erro && <p className="alert alert-error" style={{ margin: 0 }}>{erro}</p>}
              {sucesso && <p className="alert alert-success" style={{ margin: 0 }}>{sucesso}</p>}

              <div className="form-group">
                <label className="form-label" htmlFor="nome">Nome da Escola/Time</label>
                <input id="nome" className="form-control" type="text" value={nome} onChange={(e) => setNome(e.target.value)} required />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="cnpj">CNPJ <span className="form-hint">(opcional)</span></label>
                <input id="cnpj" className="form-control" type="text" value={cnpj} onChange={(e) => setCnpj(e.target.value)} />
              </div>

              <button type="submit" className="btn btn-primary btn-block" disabled={salvando}>
                {salvando ? 'Salvando...' : editando ? 'Salvar Alterações' : 'Salvar Cadastro'}
              </button>

              {editando && (
                <button type="button" className="btn btn-outline btn-block" onClick={() => navigate('/')}>
                  Voltar ao painel
                </button>
              )}
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default Cadastro;
