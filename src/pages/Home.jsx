import { useState, useEffect } from 'react';
import api from '../services/api';

function Home() {
  const [escolas, setEscolas] = useState([]);

  useEffect(() => {
    async function carregarDados() {
      try {
        const resposta = await api.get('/escolas'); 
        setEscolas(resposta.data);
      } catch (erro) {
        console.error("Erro ao conectar com a API:", erro);
      }
    }
    carregarDados();
  }, []);

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
      <h1>Painel do Campeonato 🏆</h1>
      <p>Escolas cadastradas no banco de dados:</p>

      <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', marginTop: '20px' }}>
        {escolas.map((escola) => (
          <div key={escola.id} style={{
            padding: '15px',
            border: '1px solid #ccc',
            borderRadius: '8px',
            minWidth: '200px',
            backgroundColor: '#f9f9f9'
          }}>
            <h3 style={{ margin: '0 0 10px 0', color: '#2c3e50' }}>{escola.nome}</h3>
            <p style={{ margin: 0, fontSize: '14px', color: '#666' }}>ID: {escola.id}</p>
          </div>
        ))}
      </div>
      
      {escolas.length === 0 && <p>Nenhuma escola encontrada ou aguardando conexão...</p>}
    </div>
  );
}

export default Home;