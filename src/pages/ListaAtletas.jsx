import { useState } from 'react';

function ListaAtletas() {
  const [escolaId, setEscolaId] = useState('');
  const [atletas, setAtletas] = useState([]);
  const [buscou, setBuscou] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [atletaEmEdicao, setAtletaEmEdicao] = useState(null);

  const buscarAtletas = async () => {
    if (!escolaId) {
      alert('Por favor, informe o ID da Escola.');
      return;
    }

    setCarregando(true);
    try {
      const response = await fetch(`http://localhost:3000/api/atletas/equipe/${escolaId}`);
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
      const response = await fetch(`http://localhost:3000/api/atletas/${atletaEmEdicao.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(atletaEmEdicao)
      });
      
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
        const response = await fetch(`http://localhost:3000/api/atletas/${id}`, {
          method: 'DELETE',
        });
        
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
    <div style={{ padding: '20px', fontFamily: 'sans-serif', maxWidth: '800px', margin: '0 auto' }}>
      <h2>Buscar Atletas por Equipe 🔍</h2>
      <p>Informe o ID da Escola para listar os atletas cadastrados.</p>

      <div style={{ display: 'flex', gap: '10px', marginBottom: '30px', alignItems: 'center', marginTop: '20px' }}>
        <input 
          type="number" 
          placeholder="ID da Escola"
          value={escolaId}
          onChange={(e) => setEscolaId(e.target.value)}
          style={{ padding: '10px', fontSize: '16px', borderRadius: '5px', border: '1px solid #ccc', flex: '1', boxSizing: 'border-box' }}
        />
        <button 
          onClick={buscarAtletas}
          disabled={carregando}
          style={{ 
            padding: '10px 20px', 
            backgroundColor: '#2c3e50', 
            color: 'white', 
            border: 'none', 
            borderRadius: '5px', 
            fontSize: '16px', 
            cursor: carregando ? 'not-allowed' : 'pointer', 
            fontWeight: 'bold',
            whiteSpace: 'nowrap'
          }}
        >
          {carregando ? 'Buscando...' : 'Buscar Atletas'}
        </button>
      </div>

      {buscou && !atletaEmEdicao && (
        <div style={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #ddd', overflow: 'hidden' }}>
          {atletas.length > 0 ? (
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead style={{ backgroundColor: '#f9f9f9' }}>
                <tr>
                  <th style={{ padding: '12px 15px', borderBottom: '2px solid #ddd', color: '#333' }}>Nome</th>
                  <th style={{ padding: '12px 15px', borderBottom: '2px solid #ddd', color: '#333' }}>RG / Matrícula</th>
                  <th style={{ padding: '12px 15px', borderBottom: '2px solid #ddd', color: '#333' }}>Data de Nascimento</th>
                  <th style={{ padding: '12px 15px', borderBottom: '2px solid #ddd', color: '#333', textAlign: 'center' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {atletas.map((atleta, index) => (
                  <tr key={index} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '12px 15px', color: '#555' }}>{atleta.nome}</td>
                    <td style={{ padding: '12px 15px', color: '#555' }}>{atleta.rg_ou_matricula}</td>
                    <td style={{ padding: '12px 15px', color: '#555' }}>{formatarData(atleta.data_nascimento)}</td>
                    <td style={{ padding: '12px 15px', textAlign: 'center' }}>
                      <button 
                        onClick={() => handleEditar(atleta)}
                        style={{ padding: '6px 12px', marginRight: '8px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold' }}
                      >
                        Editar
                      </button>
                      <button 
                        onClick={() => handleExcluir(atleta.id)}
                        style={{ padding: '6px 12px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold' }}
                      >
                        Excluir
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div style={{ padding: '20px', textAlign: 'center', color: '#777', fontStyle: 'italic' }}>
              Nenhum atleta encontrado para esta equipe
            </div>
          )}
        </div>
      )}

      {atletaEmEdicao && (
        <div style={{ backgroundColor: '#f9f9f9', padding: '20px', borderRadius: '8px', border: '1px solid #ccc', marginTop: '20px' }}>
          <h3>Editar Atleta</h3>
          <form onSubmit={handleSalvarEdicao}>
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Nome</label>
              <input 
                type="text" 
                value={atletaEmEdicao.nome || ''} 
                onChange={(e) => setAtletaEmEdicao({...atletaEmEdicao, nome: e.target.value})} 
                required 
                style={{ width: '100%', padding: '8px', boxSizing: 'border-box', borderRadius: '4px', border: '1px solid #ccc' }} 
              />
            </div>
            
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>RG / Matrícula</label>
              <input 
                type="text" 
                value={atletaEmEdicao.rg_ou_matricula || ''} 
                onChange={(e) => setAtletaEmEdicao({...atletaEmEdicao, rg_ou_matricula: e.target.value})} 
                required 
                style={{ width: '100%', padding: '8px', boxSizing: 'border-box', borderRadius: '4px', border: '1px solid #ccc' }} 
              />
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Data de Nascimento</label>
              <input 
                type="date" 
                value={atletaEmEdicao.data_nascimento || ''} 
                onChange={(e) => setAtletaEmEdicao({...atletaEmEdicao, data_nascimento: e.target.value})} 
                required 
                style={{ width: '100%', padding: '8px', boxSizing: 'border-box', borderRadius: '4px', border: '1px solid #ccc' }} 
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Código da Escola</label>
              <input 
                type="number" 
                value={atletaEmEdicao.escola_id || ''} 
                onChange={(e) => setAtletaEmEdicao({...atletaEmEdicao, escola_id: Number(e.target.value)})} 
                required 
                style={{ width: '100%', padding: '8px', boxSizing: 'border-box', borderRadius: '4px', border: '1px solid #ccc' }} 
              />
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button 
                type="button" 
                onClick={() => setAtletaEmEdicao(null)}
                style={{ padding: '10px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '5px', fontSize: '16px', cursor: 'pointer', fontWeight: 'bold', flex: '1' }}
              >
                Cancelar
              </button>
              <button 
                type="submit" 
                style={{ padding: '10px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '5px', fontSize: '16px', cursor: 'pointer', fontWeight: 'bold', flex: '1' }}
              >
                Salvar Alterações
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

export default ListaAtletas;
