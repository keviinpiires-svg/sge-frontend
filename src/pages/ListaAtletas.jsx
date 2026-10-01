import { useState, useEffect } from 'react';
import { useAuth } from '../context/useAuth';
import { listarEscolas } from '../services/escolas';
import {
  listarAtletasPorEquipe, buscarAtletaPorId, atualizarAtleta, excluirAtleta
} from '../services/atletas';
import { soAData, paraCampoData } from '../services/datas';

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
      setAtletas(await listarAtletasPorEquipe(escolaId));
    } catch (error) {
      console.error('Erro ao buscar atletas:', error);
      setAtletas([]);
    } finally {
      setBuscou(true);
      setCarregando(false);
    }
  };

  const formatarData = (dataStr) => soAData(dataStr);

  const formatarDataParaInput = (dataStr) => paraCampoData(dataStr);

  // A lista pública não traz o RG de propósito; para editar é preciso buscar o
  // atleta inteiro na rota de ADMIN, senão o RG volta vazio e o backend recusa.
  const handleEditar = async (atleta) => {
    try {
      const completo = await buscarAtletaPorId(atleta.id);
      setAtletaEmEdicao({
        ...completo,
        data_nascimento: formatarDataParaInput(completo.data_nascimento)
      });
    } catch (error) {
      console.error('Erro ao buscar o atleta:', error);
      alert(error.mensagem);
    }
  };

  const handleSalvarEdicao = async (e) => {
    e.preventDefault();
    try {
      await atualizarAtleta(atletaEmEdicao.id, atletaEmEdicao);
      alert('Atleta atualizado com sucesso!');
      setAtletaEmEdicao(null);
      buscarAtletas(); // Atualiza a tabela chamando a API de novo
    } catch (error) {
      console.error('Erro ao salvar edicao:', error);
      alert(error.mensagem);
    }
  };

  const handleExcluir = async (id) => {
    if (window.confirm('Tem certeza que deseja excluir este atleta?')) {
      try {
        await excluirAtleta(id);
        alert('Atleta excluído com sucesso!');
        setAtletas(atletas.filter((atleta) => atleta.id !== id));
      } catch (error) {
        console.error('Erro ao excluir atleta:', error);
        alert(error.mensagem);
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
                      <th>Sexo</th>
                      <th>Data de Nascimento</th>
                      <th>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {atletas.map((atleta, index) => (
                      <tr key={index}>
                        <td className="text-left strong">{atleta.nome}</td>
                        {/* O RG não aparece aqui: a lista é pública */}
                        <td className="text-soft">{atleta.sexo === 'F' ? 'Feminino' : 'Masculino'}</td>
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

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label" htmlFor="edit-rg">RG</label>
                  <input
                    id="edit-rg"
                    className="form-control"
                    type="text"
                    maxLength={20}
                    value={atletaEmEdicao.rg || ''}
                    onChange={(e) => setAtletaEmEdicao({ ...atletaEmEdicao, rg: e.target.value })}
                    required
                  />
                  <span className="form-hint">Obrigatório e único: é o que identifica o atleta.</span>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="edit-sexo">Sexo</label>
                  <select
                    id="edit-sexo"
                    className="form-control"
                    value={atletaEmEdicao.sexo || ''}
                    onChange={(e) => setAtletaEmEdicao({ ...atletaEmEdicao, sexo: e.target.value })}
                    required
                  >
                    <option value="">Selecione</option>
                    <option value="M">Masculino</option>
                    <option value="F">Feminino</option>
                  </select>
                  <span className="form-hint">Define em quais competições o atleta pode entrar.</span>
                </div>
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
