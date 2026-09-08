import { useState } from 'react';
import api from '../services/api';

function Cadastro() {
  const [nome, setNome] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [etapaId, setEtapaId] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      await api.post('/escolas', {
        nome: nome,
        cnpj: cnpj,
        etapa_ensino_id: etapaId
      });
      
      alert('Cadastro realizado com sucesso!');
      setNome('');
      setCnpj('');
      setEtapaId('');
    } catch (erro) {
      console.error(erro);
      alert('Erro ao cadastrar. Verifique o console.');
    }
  };

  return (
    <div style={{ 
      padding: '40px 20px', 
      fontFamily: 'sans-serif',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center' 
    }}>
      <h2 style={{ marginBottom: '20px' }}>Novo Cadastro 📝</h2>
      
      <form onSubmit={handleSubmit} style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '15px', 
        width: '100%', 
        maxWidth: '400px'
      }}>
        <input 
          type="text" 
          placeholder="Nome da Escola/Time" 
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          required
          style={{ padding: '10px', borderRadius: '5px', border: '1px solid #ccc' }}
        />
        
        <input 
          type="text" 
          placeholder="CNPJ (opcional)" 
          value={cnpj}
          onChange={(e) => setCnpj(e.target.value)}
          style={{ padding: '10px', borderRadius: '5px', border: '1px solid #ccc' }}
        />
        
        <input 
          type="number" 
          placeholder="ID da Etapa de Ensino (ex: 1)" 
          value={etapaId}
          onChange={(e) => setEtapaId(e.target.value)}
          required
          style={{ padding: '10px', borderRadius: '5px', border: '1px solid #ccc' }}
        />
        
        <button type="submit" style={{ padding: '12px', backgroundColor: '#2c3e50', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold', fontSize: '16px' }}>
          Salvar Cadastro
        </button>
      </form>
    </div>
  );
}

export default Cadastro;