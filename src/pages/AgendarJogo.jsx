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
    <div className="page">
      <div className="container-sm">
        <header className="page-header">
          <p className="eyebrow">Calendário</p>
          <h1 className="page-title">Agendar Partida</h1>
          <p className="page-subtitle">Preencha os dados abaixo para agendar um novo jogo no sistema.</p>
        </header>

        <div className="card">
          <form onSubmit={handleSubmit} className="card-body form">
            <div className="form-row">
              <div className="form-group">
                <label className="form-label" htmlFor="numero">Número do Jogo</label>
                <input id="numero" className="form-control" type="number" value={numeroJogo} onChange={(e) => setNumeroJogo(e.target.value)} required />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="fase">Fase</label>
                <input
                  id="fase"
                  className="form-control"
                  type="text"
                  value={fase}
                  onChange={(e) => setFase(e.target.value)}
                  required
                  placeholder="Ex: Classificatória, Semifinal, Final"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label" htmlFor="grupo">ID do Grupo <span className="form-hint">(opcional)</span></label>
                <input id="grupo" className="form-control" type="number" value={grupoId} onChange={(e) => setGrupoId(e.target.value)} />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="local">ID do Local</label>
                <input id="local" className="form-control" type="number" value={localId} onChange={(e) => setLocalId(e.target.value)} required />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="dataHora">Data e Hora</label>
              <input id="dataHora" className="form-control" type="datetime-local" value={dataHora} onChange={(e) => setDataHora(e.target.value)} required />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label" htmlFor="escola1">ID da Escola 1</label>
                <input id="escola1" className="form-control" type="number" value={escola1Id} onChange={(e) => setEscola1Id(e.target.value)} required />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="escola2">ID da Escola 2</label>
                <input id="escola2" className="form-control" type="number" value={escola2Id} onChange={(e) => setEscola2Id(e.target.value)} required />
              </div>
            </div>

            <button type="submit" className="btn btn-primary btn-block" disabled={carregando}>
              {carregando ? 'Agendando...' : 'Agendar Partida'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default AgendarJogo;
