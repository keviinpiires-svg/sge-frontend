import { useState, useEffect } from 'react';
import { useAuth } from '../context/useAuth';
import { authHeaders, sessaoExpirada } from '../services/token';
import { API_URL } from '../services/config';
import { listarEscolas } from '../services/escolas';

function ListaAtletas() {
  const [escolaId, setEscolaId] = useState('');
  const [atletas, setAtletas] = useState([]);
  const [buscou, setBuscou] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [atletaEmEdicao, setAtletaEmEdicao] = useState(null);
  const { isAdmin } = useAuth();
  const [escolas, setEscolas] = useState([]);
  const [carregandoEscolas, setCarregandoEscolas] = useState(true);

  useEffect(() => {
    let ativo = true;

    listarEscolas()
      .then((data) => {
        if (ativo) setEscolas(data);
      })
      .catch((error) => {
        console.error('Erro ao buscar escolas:', error);
      })
      .finally(() => {
        if (ativo) setCarregandoEscolas(false);
      });

    return () => {
      ativo = false;
    };
  }, []);

  const buscarAtletas = async () => {
    if (!escolaId) {
      alert('Por favor, selecione a escola.');
      return;
    }

    setCarregando(true);
    try {
      const response = await fetch(`${API_URL}/api/atletas/equipe/${escolaId}`);
      if (response.ok) {
        const data = await response.json();
        console.log("Resposta do Backend:", data);

        // Se a resposta for um objeto (ex: { atletas: [...] }), extraímos o array
        const atletasRetornados = Array.isArray(data) ? data : (data.atletas || []);
        setAtletas(atletasRetornados);
      } else {
        setAtletas([]);
      }
    } catch (error) {
      console.error('Erro ao buscar atletas:', error);
      setAtletas([]);
    } finally {
      setBuscou(true);
      setCarregando(false);
    }
  };

  const formatarData = (dataStr) => {
    if (!dataStr) return '';
    // Tratamento simples caso venha formato ISO ou compatível
    const date = new Date(dataStr);
    if (isNaN(date.getTime())) return dataStr; // Retorna original se inválido
    return date.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
  };

  const formatarDataParaInput = (dataStr) => {
    if (!dataStr) return '';
    const date = new Date(dataStr);
    if (isNaN(date.getTime())) return dataStr;
    return date.toISOString().split('T')[0];
  };

  const handleEditar = (atleta) => {
    setAtletaEmEdicao({
      ...atleta,
      data_nascimento: formatarDataParaInput(atleta.data_nascimento)
    });
  };

  const handleSalvarEdicao = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${API_URL}/api/atletas/${atletaEmEdicao.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders()
        },
        body: JSON.stringify(atletaEmEdicao)
      });

      if (response.status === 401) {
        alert('Sua sessão expirou. Faça login novamente.');
        return sessaoExpirada();
      }

      if (response.ok) {
        alert('Atleta atualizado com sucesso!');
        setAtletaEmEdicao(null);
        buscarAtletas(); // Atualiza a tabela chamando a API de novo
      } else {
        alert('Falha ao atualizar o atleta. Tente novamente.');
      }
    } catch (error) {
      console.error('Erro ao salvar edicao:', error);
      alert('Ocorreu um erro de conexão ao tentar salvar.');
    }
  };

  const handleExcluir = async (id) => {
    if (window.confirm('Tem certeza que deseja excluir este atleta?')) {
      try {
        const response = await fetch(`${API_URL}/api/atletas/${id}`, {
          method: 'DELETE',
          headers: authHeaders()
        });

        if (response.status === 401) {
          alert('Sua sessão expirou. Faça login novamente.');
          return sessaoExpirada();
        }

        if (response.ok) {
          alert('Atleta excluído com sucesso!');
          setAtletas(atletas.filter((atleta) => atleta.id !== id));
        } else {
          alert('Falha ao excluir o atleta.');
        }
      } catch (error) {
        console.error('Erro ao excluir atleta:', error);
        alert('Ocorreu um erro de conexão.');
      }
    }
  };

  return (
    <div className="page">
      <div className="container">
        <header className="page-header">
          <p className="eyebrow">Atletas</p>
          <h1 className="page-title">Buscar Atletas por Equipe</h1>
          <p className="page-subtitle">Selecione a escola para listar os atletas cadastrados.</p>
        </header>

        <div className="card" style={{ marginBottom: '24px' }}>
          <div className="card-body" style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <select
              className="form-control"
              value={escolaId}
              onChange={(e) => setEscolaId(e.target.value)}
              disabled={carregandoEscolas || escolas.length === 0}
              aria-label="Escola"
              style={{ flex: '1 1 200px', width: 'auto' }}
            >
              <option value="">
                {carregandoEscolas
                  ? 'Carregando escolas...'
                  : escolas.length === 0
                    ? 'Nenhuma escola cadastrada'
                    : 'Selecione a escola'}
              </option>
              {escolas.map((escola) => (
                <option key={escola.id} value={escola.id}>{escola.nome}</option>
              ))}
            </select>
            <button className="btn btn-primary" onClick={buscarAtletas} disabled={carregando || !escolaId}>
              {carregando ? 'Buscando...' : '🔍 Buscar Atletas'}
            </button>
          </div>
        </div>

        {buscou && !atletaEmEdicao && (
          <div className="card">
            {atletas.length > 0 ? (
              <div className="table-wrap">
                <table className="table-sge" style={{ minWidth: '600px' }}>
                  <thead>
                    <tr>
                      <th className="text-left">Nome</th>
                      <th className="text-left">RG / Matrícula</th>
                      <th>Data de Nascimento</th>
                      <th>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {atletas.map((atleta, index) => (
                      <tr key={index}>
                        <td className="text-left strong">{atleta.nome}</td>
                        <td className="text-left text-soft">{atleta.rg_ou_matricula}</td>
                        <td className="text-soft">{formatarData(atleta.data_nascimento)}</td>
                        <td>
                          {isAdmin ? (
                            <div className="btn-group">
                              <button className="btn btn-outline btn-sm" onClick={() => handleEditar(atleta)}>Editar</button>
                              <button className="btn btn-danger btn-sm" onClick={() => handleExcluir(atleta.id)}>Excluir</button>
                            </div>
                          ) : (
                            <span className="text-muted">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="state">
                <div className="state-icon">🏃</div>
                <p className="state-title">Nenhum atleta encontrado</p>
                <p className="state-text">Não há atletas cadastrados para esta equipe.</p>
              </div>
            )}
          </div>
        )}

        {atletaEmEdicao && (
          <div className="card card-highlight">
            <form onSubmit={handleSalvarEdicao} className="card-body form">
              <h3 className="card-title" style={{ margin: 0 }}>Editar Atleta</h3>

              <div className="form-group">
                <label className="form-label" htmlFor="edit-nome">Nome</label>
                <input
                  id="edit-nome"
                  className="form-control"
                  type="text"
                  value={atletaEmEdicao.nome || ''}
                  onChange={(e) => setAtletaEmEdicao({...atletaEmEdicao, nome: e.target.value})}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="edit-rg">RG / Matrícula</label>
                <input
                  id="edit-rg"
                  className="form-control"
                  type="text"
                  value={atletaEmEdicao.rg_ou_matricula || ''}
                  onChange={(e) => setAtletaEmEdicao({...atletaEmEdicao, rg_ou_matricula: e.target.value})}
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label" htmlFor="edit-nascimento">Data de Nascimento</label>
                  <input
                    id="edit-nascimento"
                    className="form-control"
                    type="date"
                    value={atletaEmEdicao.data_nascimento || ''}
                    onChange={(e) => setAtletaEmEdicao({...atletaEmEdicao, data_nascimento: e.target.value})}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="edit-escola">Escola</label>
                  <select
                    id="edit-escola"
                    className="form-control"
                    value={atletaEmEdicao.escola_id || ''}
                    onChange={(e) => setAtletaEmEdicao({...atletaEmEdicao, escola_id: Number(e.target.value)})}
                    disabled={carregandoEscolas || escolas.length === 0}
                    required
                  >
                    <option value="">Selecione a escola</option>
                    {escolas.map((escola) => (
                      <option key={escola.id} value={escola.id}>{escola.nome}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="btn-row">
                <button type="button" className="btn btn-secondary" onClick={() => setAtletaEmEdicao(null)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">Salvar Alterações</button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

export default ListaAtletas;
