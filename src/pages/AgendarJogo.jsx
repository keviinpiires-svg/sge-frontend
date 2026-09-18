import { useState, useEffect } from 'react';
import { listarEscolas } from '../services/escolas';
import { listarLocais } from '../services/locais';
import { listarGrupos } from '../services/grupos';
import { agendarJogo as agendar } from '../services/jogos';

function AgendarJogo() {
  // Agendamento manual cobre apenas a fase de grupos: semifinais e final
  // nascem do cruzamento automático na tela de Mata-Mata
  const [fase, setFase] = useState('Classificatoria');
  const [grupoId, setGrupoId] = useState('');
  const [localId, setLocalId] = useState('');
  const [dataHora, setDataHora] = useState('');
  const [escola1Id, setEscola1Id] = useState('');
  const [escola2Id, setEscola2Id] = useState('');
  const [carregando, setCarregando] = useState(false);

  const [escolas, setEscolas] = useState([]);
  const [locais, setLocais] = useState([]);
  const [grupos, setGrupos] = useState([]);
  const [carregandoListas, setCarregandoListas] = useState(true);

  useEffect(() => {
    let ativo = true;

    // Uma lista que falhe não impede as outras de carregarem
    const semFalhar = (promessa, nome) =>
      promessa.catch((error) => {
        console.error(`Erro ao buscar ${nome}:`, error);
        return [];
      });

    Promise.all([
      semFalhar(listarEscolas(), 'escolas'),
      semFalhar(listarLocais(), 'locais'),
      semFalhar(listarGrupos(), 'grupos')
    ])
      .then(([dadosEscolas, dadosLocais, dadosGrupos]) => {
        if (!ativo) return;
        setEscolas(dadosEscolas);
        setLocais(dadosLocais);
        setGrupos(dadosGrupos);
      })
      .finally(() => {
        if (ativo) setCarregandoListas(false);
      });

    return () => {
      ativo = false;
    };
  }, []);

  const rotuloLocal = (local) => local.nome || local.nome_local || local.descricao || `Local ${local.id}`;
  const rotuloGrupo = (grupo) => {
    const nome = grupo.nome || grupo.nome_grupo || grupo.letra || grupo.id;
    return `${nome}`.length <= 2 ? `Grupo ${nome}` : `${nome}`;
  };

  // Texto do primeiro item de cada dropdown
  const placeholder = (lista, vazio, escolha) =>
    carregandoListas ? 'Carregando...' : lista.length === 0 ? vazio : escolha;

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Sem um local válido o MySQL recusaria o insert por chave estrangeira
    if (!Number(localId)) {
      alert('Selecione um local de disputa válido antes de agendar o jogo.');
      return;
    }

    if (!Number(escola1Id) || !Number(escola2Id)) {
      alert('Selecione as duas escolas do confronto.');
      return;
    }

    setCarregando(true);

    const payload = {
      fase,
      grupo_id: grupoId ? Number(grupoId) : null,
      local_id: Number(localId),
      data_hora: dataHora,
      escola_1_id: Number(escola1Id),
      escola_2_id: Number(escola2Id)
    };

    try {
      const data = await agendar(payload);
      alert(data.mensagem || 'Jogo agendado com sucesso!');
      // Limpar os estados
      setFase('Classificatoria');
      setGrupoId('');
      setLocalId('');
      setDataHora('');
      setEscola1Id('');
      setEscola2Id('');
    } catch (error) {
      console.error('Erro na requisição:', error);
      alert(`Falha ao agendar jogo: ${error.mensagem}`);
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
                <input id="numero" className="form-control" type="text" placeholder="Gerado automaticamente" disabled />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="fase">Fase</label>
                <select
                  id="fase"
                  className="form-control"
                  value={fase}
                  onChange={(e) => setFase(e.target.value)}
                  required
                >
                  <option value="Classificatoria">Classificatória</option>
                </select>
                <span className="form-hint">Semifinais e final são geradas na tela de Mata-Mata.</span>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label" htmlFor="grupo">Grupo <span className="form-hint">(opcional)</span></label>
                <select
                  id="grupo"
                  className="form-control"
                  value={grupoId}
                  onChange={(e) => setGrupoId(e.target.value)}
                  disabled={carregandoListas || grupos.length === 0}
                >
                  <option value="">{placeholder(grupos, 'Nenhum grupo cadastrado', 'Sem grupo')}</option>
                  {grupos.map((grupo) => (
                    <option key={grupo.id} value={grupo.id}>{rotuloGrupo(grupo)}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="local">Local de Disputa</label>
                <select
                  id="local"
                  className="form-control"
                  value={localId}
                  onChange={(e) => setLocalId(e.target.value)}
                  disabled={carregandoListas || locais.length === 0}
                  required
                >
                  <option value="">{placeholder(locais, 'Nenhum local cadastrado', 'Selecione o local')}</option>
                  {locais.map((local) => (
                    <option key={local.id} value={local.id}>{rotuloLocal(local)}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="dataHora">Data e Hora</label>
              <input id="dataHora" className="form-control" type="datetime-local" value={dataHora} onChange={(e) => setDataHora(e.target.value)} required />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label" htmlFor="escola1">Escola 1 <span className="form-hint">(mandante)</span></label>
                <select
                  id="escola1"
                  className="form-control"
                  value={escola1Id}
                  onChange={(e) => setEscola1Id(e.target.value)}
                  disabled={carregandoListas || escolas.length === 0}
                  required
                >
                  <option value="">{placeholder(escolas, 'Nenhuma escola cadastrada', 'Selecione a escola')}</option>
                  {escolas
                    .filter((escola) => String(escola.id) !== escola2Id)
                    .map((escola) => (
                      <option key={escola.id} value={escola.id}>{escola.nome}</option>
                    ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="escola2">Escola 2 <span className="form-hint">(visitante)</span></label>
                <select
                  id="escola2"
                  className="form-control"
                  value={escola2Id}
                  onChange={(e) => setEscola2Id(e.target.value)}
                  disabled={carregandoListas || escolas.length === 0}
                  required
                >
                  <option value="">{placeholder(escolas, 'Nenhuma escola cadastrada', 'Selecione a escola')}</option>
                  {escolas
                    .filter((escola) => String(escola.id) !== escola1Id)
                    .map((escola) => (
                      <option key={escola.id} value={escola.id}>{escola.nome}</option>
                    ))}
                </select>
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
