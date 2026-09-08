import { useState, useEffect } from 'react';
import api from '../services/api';

function Sumulas() {
  const [times, setTimes] = useState([]);
  const [grupo, setGrupo] = useState('A');
  const [timeA, setTimeA] = useState('');
  const [golsA, setGolsA] = useState(0);
  const [timeB, setTimeB] = useState('');
  const [golsB, setGolsB] = useState(0);
  const [mensagem, setMensagem] = useState('');

  // Carrega a lista de times do back-end para preencher os select boxes
  useEffect(() => {
    async function carregarTimes() {
      try {
        const resposta = await api.get('/escolas');
        setTimes(resposta.data);
      } catch (erro) {
        console.error("Erro ao carregar times:", erro);
      }
    }
    carregarTimes();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
  grupo,
  timeA_id: Number(timeA), // Conversão para número adicionada
  golsA: Number(golsA),
  timeB_id: Number(timeB), // Conversão para número adicionada
  golsB: Number(golsB)
};
      
      // Dispara o placar para a nossa nova rota unificada
      await api.post('/sumulas/placar', payload);
      setMensagem('Placar registrado! A classificação foi atualizada com sucesso.');
      
      // Zera os gols para a próxima inserção
      setGolsA(0);
      setGolsB(0);
    } catch (erro) {
      console.error(erro);
      setMensagem('Erro ao registrar placar.');
    }
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif' }}> 
      <h2>Registro de Súmulas 📝</h2>
      <p>Informe o placar da partida para atualizar a classificação automaticamente.</p>

      <form onSubmit={handleSubmit} style={{ maxWidth: '600px', backgroundColor: '#f9f9f9', padding: '20px', borderRadius: '8px', border: '1px solid #ccc', marginTop: '20px' }}>
        
        <div style={{ marginBottom: '20px' }}>
          <label style={{ fontWeight: 'bold' }}>Grupo da Partida: </label>
          <select value={grupo} onChange={(e) => setGrupo(e.target.value)} style={{ padding: '5px', marginLeft: '10px' }}>
            <option value="A">Grupo A</option>
            <option value="B">Grupo B</option>
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          
          {/* Time Mandante */}
          <div style={{ flex: '1', textAlign: 'center' }}>
            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Time Mandante</label>
            <select value={timeA} onChange={(e) => setTimeA(e.target.value)} required style={{ width: '90%', padding: '8px', marginBottom: '10px' }}>
              <option value="">Selecione o Time A...</option>
              {times.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
            </select>
            <input type="number" min="0" value={golsA} onChange={(e) => setGolsA(e.target.value)} style={{ width: '60px', padding: '8px', fontSize: '18px', textAlign: 'center' }} required />
          </div>

          <h3 style={{ margin: '0 15px', color: '#7f8c8d' }}>X</h3>

          {/* Time Visitante */}
          <div style={{ flex: '1', textAlign: 'center' }}>
            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Time Visitante</label>
            <select value={timeB} onChange={(e) => setTimeB(e.target.value)} required style={{ width: '90%', padding: '8px', marginBottom: '10px' }}>
              <option value="">Selecione o Time B...</option>
              {times.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
            </select>
            <input type="number" min="0" value={golsB} onChange={(e) => setGolsB(e.target.value)} style={{ width: '60px', padding: '8px', fontSize: '18px', textAlign: 'center' }} required />
          </div>
        </div>

        <button type="submit" style={{ width: '100%', padding: '10px', backgroundColor: '#2c3e50', color: 'white', border: 'none', borderRadius: '5px', fontSize: '16px', cursor: 'pointer', fontWeight: 'bold' }}>
          Registrar Placar
        </button>
        
        {mensagem && <p style={{ marginTop: '15px', fontWeight: 'bold', color: mensagem.includes('sucesso') ? 'green' : 'red', textAlign: 'center' }}>{mensagem}</p>}
      </form>
    </div>
  );
}

export default Sumulas;