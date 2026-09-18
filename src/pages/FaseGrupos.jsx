import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { useAuth } from '../context/useAuth';

function FaseGrupos() {
  const { isAdmin } = useAuth();
  const [classificacao, setClassificacao] = useState([]);
  const [escolas, setEscolas] = useState([]);
  const [atribuicoes, setAtribuicoes] = useState({});
  const [painelAberto, setPainelAberto] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState('');

  const buscarDados = useCallback(async () => {
    const [respClassificacao, respEscolas, respGrupos] = await Promise.all([
      api.get('/classificacao'),
      api.get('/escolas'),
      api.get('/grupos')
    ]);

    // Monta { escolaId: 'A' } a partir dos vínculos já salvos
    const atuais = {};
    for (const grupo of respGrupos.data) {
      for (const escola of grupo.escolas) {
        atuais[escola.id] = grupo.nome;
      }
    }

    return { classificacao: respClassificacao.data, escolas: respEscolas.data, atribuicoes: atuais };
  }, []);

  const aplicarDados = useCallback((dados) => {
    setClassificacao(dados.classificacao);
    setEscolas(dados.escolas);
    setAtribuicoes(dados.atribuicoes);
  }, []);

  useEffect(() => {
    let ativo = true;

    buscarDados()
      .then((dados) => {
        if (ativo) aplicarDados(dados);
      })
      .catch((erro) => console.error('Erro ao carregar a fase de grupos:', erro));

    return () => {
      ativo = false;
    };
  }, [buscarDados, aplicarDados]);

  const definirGrupo = (escolaId, grupo) => {
    setAtribuicoes((atual) => ({ ...atual, [escolaId]: grupo }));
  };

  // Embaralha as escolas e distribui alternando entre A e B
  const sortear = () => {
    const ids = escolas.map((escola) => escola.id);
    for (let i = ids.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [ids[i], ids[j]] = [ids[j], ids[i]];
    }

    const sorteado = {};
    ids.forEach((id, indice) => {
      sorteado[id] = indice % 2 === 0 ? 'A' : 'B';
    });
    setAtribuicoes(sorteado);
    setMensagem('Sorteio gerado. Revise a distribuição e clique em Salvar.');
  };

  const salvar = async () => {
    setSalvando(true);
    setMensagem('');

    const distribuicao = { A: [], B: [] };
    for (const [escolaId, grupo] of Object.entries(atribuicoes)) {
      if (grupo === 'A' || grupo === 'B') {
        distribuicao[grupo].push(Number(escolaId));
      }
    }

    try {
      await api.put('/grupos/distribuicao', { distribuicao });
      aplicarDados(await buscarDados());
      setMensagem('Distribuição salva com sucesso!');
    } catch (erro) {
      console.error(erro);
      setMensagem(erro.response?.data?.erro || 'Erro ao salvar a distribuição.');
    } finally {
      setSalvando(false);
    }
  };

  const grupoA = classificacao.filter((time) => time.grupo === 'A');
  const grupoB = classificacao.filter((time) => time.grupo === 'B');
  const semGrupo = classificacao.filter((time) => !time.grupo);

  const renderGrupo = (titulo, times) => (
    <div className="card">
      <div className="card-body" style={{ paddingBottom: 0 }}>
        <h3 className="card-title" style={{ marginBottom: 0, borderBottom: 'none' }}>{titulo}</h3>
      </div>
      <div className="table-wrap">
        <table className="table-sge compact">
          <thead>
            <tr>
              <th>Pos</th>
              <th className="text-left">Time</th>
              <th>P</th>
              <th>J</th>
              <th>V</th>
            </tr>
          </thead>
          <tbody>
            {times.map((time, index) => (
              <tr key={time.id}>
                <td>
                  <span className={`rank ${index < 3 ? `rank-${index + 1}` : ''}`}>{index + 1}</span>
                </td>
                <td className="text-left strong">{time.escola_nome}</td>
                <td className="text-accent num-lg">{time.pontos}</td>
                <td className="text-soft">{time.jogos}</td>
                <td className="text-soft">{time.vitorias}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {times.length === 0 && (
        <div className="state state-compact">
          <p className="state-text">Nenhum time neste grupo ainda.</p>
        </div>
      )}
    </div>
  );

  return (
    <div className="page">
      <div className="container-lg">
        <header className="page-header">
          <p className="eyebrow">Campeonato</p>
          <h1 className="page-title">Fase de Grupos ⚽</h1>
          <p className="page-subtitle">Classificação e pontuação do campeonato.</p>
        </header>

        {isAdmin && (
          <div className="card" style={{ marginBottom: '24px' }}>
            <div className="card-body">
              <div className="btn-row" style={{ justifyContent: 'space-between' }}>
                <button className="btn btn-secondary" onClick={() => setPainelAberto((aberto) => !aberto)}>
                  🎲 {painelAberto ? 'Fechar sorteio' : 'Sorteio e grupos'}
                </button>
                {semGrupo.length > 0 && !painelAberto && (
                  <span className="text-muted" style={{ alignSelf: 'center' }}>
                    {semGrupo.length} escola(s) ainda sem grupo
                  </span>
                )}
              </div>

              {painelAberto && (
                <>
                  <p className="page-subtitle" style={{ marginTop: '18px' }}>
                    Escolha o grupo de cada escola ou use o sorteio automático. Salvar substitui a distribuição atual.
                  </p>

                  <div className="grid-cards" style={{ margin: '18px 0' }}>
                    {escolas.map((escola) => (
                      <div key={escola.id} className="tile">
                        <p className="tile-title">{escola.nome}</p>
                        <div className="btn-group" style={{ justifyContent: 'flex-start' }}>
                          {['A', 'B', ''].map((opcao) => (
                            <button
                              key={opcao || 'sem'}
                              type="button"
                              className={`btn btn-sm ${
                                (atribuicoes[escola.id] || '') === opcao ? 'btn-primary' : 'btn-secondary'
                              }`}
                              onClick={() => definirGrupo(escola.id, opcao)}
                            >
                              {opcao === '' ? 'Sem grupo' : `Grupo ${opcao}`}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="btn-row">
                    <button className="btn btn-outline" onClick={sortear} disabled={escolas.length === 0}>
                      🎲 Sortear automaticamente
                    </button>
                    <button className="btn btn-primary" onClick={salvar} disabled={salvando}>
                      {salvando ? 'Salvando...' : '💾 Salvar distribuição'}
                    </button>
                  </div>

                  {mensagem && (
                    <p
                      className={`alert ${mensagem.includes('sucesso') || mensagem.includes('gerado') ? 'alert-success' : 'alert-error'}`}
                      style={{ marginTop: '16px' }}
                    >
                      {mensagem}
                    </p>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        <div className="grid-2">
          {renderGrupo('Grupo A', grupoA)}
          {renderGrupo('Grupo B', grupoB)}
        </div>
      </div>
    </div>
  );
}

export default FaseGrupos;
