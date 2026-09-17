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
    <div className="page">
      <div className="container-sm">
        <header className="page-header">
          <p className="eyebrow">Resultados</p>
          <h1 className="page-title">Registro de Súmulas</h1>
          <p className="page-subtitle">Informe o placar da partida para atualizar a classificação automaticamente.</p>
        </header>

        <div className="card">
          <form onSubmit={handleSubmit} className="card-body form">
            <div className="form-group">
              <label className="form-label" htmlFor="grupo">Grupo da Partida</label>
              <select id="grupo" className="form-control" value={grupo} onChange={(e) => setGrupo(e.target.value)}>
                <option value="A">Grupo A</option>
                <option value="B">Grupo B</option>
              </select>
            </div>

            <div className="form-row" style={{ alignItems: 'end' }}>
              {/* Time Mandante */}
              <div className="form-group">
                <label className="form-label" htmlFor="timeA">Time Mandante</label>
                <select id="timeA" className="form-control" value={timeA} onChange={(e) => setTimeA(e.target.value)} required>
                  <option value="">Selecione o Time A...</option>
                  {times.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
                </select>
                <input className="form-control input-score" type="number" min="0" value={golsA} onChange={(e) => setGolsA(e.target.value)} required aria-label="Gols do mandante" style={{ alignSelf: 'center' }} />
              </div>

              {/* Time Visitante */}
              <div className="form-group">
                <label className="form-label" htmlFor="timeB">Time Visitante</label>
                <select id="timeB" className="form-control" value={timeB} onChange={(e) => setTimeB(e.target.value)} required>
                  <option value="">Selecione o Time B...</option>
                  {times.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
                </select>
                <input className="form-control input-score" type="number" min="0" value={golsB} onChange={(e) => setGolsB(e.target.value)} required aria-label="Gols do visitante" style={{ alignSelf: 'center' }} />
              </div>
            </div>

            <button type="submit" className="btn btn-primary btn-block">Registrar Placar</button>

            {mensagem && (
              <p className={`alert ${mensagem.includes('sucesso') ? 'alert-success' : 'alert-error'}`} style={{ margin: 0 }}>
                {mensagem}
              </p>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}

export default Sumulas;
