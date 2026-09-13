import { useState } from 'react';

function CadastroAtleta() {
  const [nome, setNome] = useState('');
  const [rgMatricula, setRgMatricula] = useState('');
  const [dataNascimento, setDataNascimento] = useState('');
  const [codigoEscola, setCodigoEscola] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();

    const atleta = {
      nome: nome,
      rg_ou_matricula: rgMatricula,
      data_nascimento: dataNascimento,
      escola_id: Number(codigoEscola)
    };

    try {
      const response = await fetch('http://localhost:3000/api/atletas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(atleta)
      });

      if (response.ok) {
        alert('Cadastro realizado com sucesso!');
        setNome('');
        setRgMatricula('');
        setDataNascimento('');
        setCodigoEscola('');
      } else {
        alert('Falha ao realizar o cadastro. Tente novamente.');
      }
    } catch (error) {
      console.error('Erro:', error);
      alert('Falha ao realizar o cadastro. Erro de conexão.');
    }
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif' }}> 
      <h2>Cadastro de Atleta 🏃</h2>
      <p>Preencha os dados abaixo para registrar um novo atleta.</p>

      <form onSubmit={handleSubmit} style={{ maxWidth: '600px', backgroundColor: '#f9f9f9', padding: '20px', borderRadius: '8px', border: '1px solid #ccc', marginTop: '20px' }}>
        
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Nome</label>
          <input 
            type="text" 
            value={nome} 
            onChange={(e) => setNome(e.target.value)} 
            required 
            style={{ width: '100%', padding: '8px', boxSizing: 'border-box', borderRadius: '4px', border: '1px solid #ccc' }} 
          />
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>RG / Matrícula</label>
          <input 
            type="text" 
            value={rgMatricula} 
            onChange={(e) => setRgMatricula(e.target.value)} 
            required 
            style={{ width: '100%', padding: '8px', boxSizing: 'border-box', borderRadius: '4px', border: '1px solid #ccc' }} 
          />
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Data de Nascimento</label>
          <input 
            type="date" 
            value={dataNascimento} 
            onChange={(e) => setDataNascimento(e.target.value)} 
            required 
            style={{ width: '100%', padding: '8px', boxSizing: 'border-box', borderRadius: '4px', border: '1px solid #ccc' }} 
          />
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Código da Escola</label>
          <input 
            type="number" 
            value={codigoEscola} 
            onChange={(e) => setCodigoEscola(e.target.value)} 
            required 
            style={{ width: '100%', padding: '8px', boxSizing: 'border-box', borderRadius: '4px', border: '1px solid #ccc' }} 
          />
        </div>

        <button type="submit" style={{ width: '100%', padding: '10px', backgroundColor: '#2c3e50', color: 'white', border: 'none', borderRadius: '5px', fontSize: '16px', cursor: 'pointer', fontWeight: 'bold' }}>
          Cadastrar Atleta
        </button>
      </form>
    </div>
  );
}

export default CadastroAtleta;
