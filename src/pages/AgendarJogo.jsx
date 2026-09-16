import { useState } from 'react';

function AgendarJogo() {
  const [numeroJogo, setNumeroJogo] = useState('');
  const [fase, setFase] = useState('');
  const [grupoId, setGrupoId] = useState('');
  const [localId, setLocalId] = useState('');
  const [dataHora, setDataHora] = useState('');
  const [escola1Id, setEscola1Id] = useState('');
  const [escola2Id, setEscola2Id] = useState('');
  const [carregando, setCarregando] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setCarregando(true);

    const payload = {
      numero_jogo: Number(numeroJogo),
      fase,
      grupo_id: grupoId ? Number(grupoId) : null,
      local_id: Number(localId),
      data_hora: dataHora,
      escola_1_id: Number(escola1Id),
      escola_2_id: Number(escola2Id)
    };

    try {
      const response = await fetch('http://localhost:3000/api/jogos/agendar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (response.status === 201) {
        alert('Jogo agendado com sucesso!');
        // Limpar os estados
        setNumeroJogo('');
        setFase('');
        setGrupoId('');
        setLocalId('');
        setDataHora('');
        setEscola1Id('');
        setEscola2Id('');
      } else {
        // Tenta capturar a mensagem de erro do backend, se houver
        const data = await response.json().catch(() => ({}));
        const mensagemErro = data.message || data.erro || data.error || 'Verifique os dados enviados.';
        alert(`Falha ao agendar jogo: ${mensagemErro}`);
      }
    } catch (error) {
      console.error('Erro na requisição:', error);
      alert('Ocorreu um erro de conexão ao tentar agendar o jogo.');
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif', maxWidth: '600px', margin: '0 auto' }}>
      <h2>Agendar Partida 🗓️</h2>
      <p>Preencha os dados abaixo para agendar um novo jogo no sistema.</p>

      <form onSubmit={handleSubmit} style={{ backgroundColor: '#f9f9f9', padding: '20px', borderRadius: '8px', border: '1px solid #ccc', marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
        
        <div>
          <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Número do Jogo</label>
          <input 
            type="number" 
            value={numeroJogo} 
            onChange={(e) => setNumeroJogo(e.target.value)} 
            required 
            style={{ width: '100%', padding: '8px', boxSizing: 'border-box', borderRadius: '4px', border: '1px solid #ccc' }} 
          />
        </div>

        <div>
          <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Fase</label>
          <input 
            type="text" 
            value={fase} 
            onChange={(e) => setFase(e.target.value)} 
            required 
            placeholder="Ex: Classificatória, Semifinal, Final"
            style={{ width: '100%', padding: '8px', boxSizing: 'border-box', borderRadius: '4px', border: '1px solid #ccc' }} 
          />
        </div>

        <div>
          <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>ID do Grupo (Opcional)</label>
          <input 
            type="number" 
            value={grupoId} 
            onChange={(e) => setGrupoId(e.target.value)} 
            style={{ width: '100%', padding: '8px', boxSizing: 'border-box', borderRadius: '4px', border: '1px solid #ccc' }} 
          />
        </div>

        <div>
          <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>ID do Local</label>
          <input 
            type="number" 
            value={localId} 
            onChange={(e) => setLocalId(e.target.value)} 
            required 
            style={{ width: '100%', padding: '8px', boxSizing: 'border-box', borderRadius: '4px', border: '1px solid #ccc' }} 
          />
        </div>

        <div>
          <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Data e Hora</label>
          <input 
            type="datetime-local" 
            value={dataHora} 
            onChange={(e) => setDataHora(e.target.value)} 
            required 
            style={{ width: '100%', padding: '8px', boxSizing: 'border-box', borderRadius: '4px', border: '1px solid #ccc' }} 
          />
        </div>

        <div style={{ display: 'flex', gap: '15px' }}>
          <div style={{ flex: '1' }}>
            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>ID da Escola 1</label>
            <input 
              type="number" 
              value={escola1Id} 
              onChange={(e) => setEscola1Id(e.target.value)} 
              required 
              style={{ width: '100%', padding: '8px', boxSizing: 'border-box', borderRadius: '4px', border: '1px solid #ccc' }} 
            />
          </div>
          
          <div style={{ flex: '1' }}>
            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>ID da Escola 2</label>
            <input 
              type="number" 
              value={escola2Id} 
              onChange={(e) => setEscola2Id(e.target.value)} 
              required 
              style={{ width: '100%', padding: '8px', boxSizing: 'border-box', borderRadius: '4px', border: '1px solid #ccc' }} 
            />
          </div>
        </div>

        <button 
          type="submit" 
          disabled={carregando}
          style={{ 
            width: '100%', 
            padding: '12px', 
            backgroundColor: '#28a745', 
            color: 'white', 
            border: 'none', 
            borderRadius: '5px', 
            fontSize: '16px', 
            cursor: carregando ? 'not-allowed' : 'pointer', 
            fontWeight: 'bold',
            marginTop: '10px'
          }}
        >
          {carregando ? 'Agendando...' : 'Agendar Partida'}
        </button>
      </form>
    </div>
  );
}

export default AgendarJogo;

