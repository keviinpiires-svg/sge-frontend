import { useState, useEffect } from 'react';
import { artilhariaDaCompeticao } from '../services/artilharia';

// Artilharia de uma competição. Vive na página da competição porque somar
// gols de futsal com pontos de basquete não significaria nada.
function ArtilhariaCompeticao({ competicao }) {
  const [resultado, setResultado] = useState(null);

  const pronto = resultado?.id === competicao.id;
  const dados = pronto ? resultado.dados : null;
  const erro = pronto ? resultado.erro : '';

  useEffect(() => {
    let ativo = true;

    artilhariaDaCompeticao(competicao.id)
      .then((d) => {
        if (ativo) setResultado({ id: competicao.id, dados: d, erro: '' });
      })
      .catch((falha) => {
        if (ativo) setResultado({ id: competicao.id, dados: null, erro: falha.mensagem });
      });

    return () => {
      ativo = false;
    };
  }, [competicao.id]);

  const rotulo = dados?.rotulo || 'gols';
  const artilheiros = dados?.artilheiros || [];

  return (
    <section className="card mb-lg">
      <div className="card-body">
        <h2 className="card-title">⚽ Artilharia</h2>

        {!pronto && (
          <div className="state state-compact">
            <div className="spinner" />
            <p className="state-text">Carregando artilharia...</p>
          </div>
        )}

        {pronto && erro && <p className="alert alert-error" style={{ margin: 0 }}>{erro}</p>}

        {pronto && !erro && artilheiros.length === 0 && (
          <div className="state state-compact">
            <p className="state-text">
              Nenhum {rotulo === 'gols' ? 'gol' : 'ponto'} lançado nesta competição ainda.
            </p>
          </div>
        )}

        {pronto && !erro && artilheiros.length > 0 && (
          <div className="table-wrap">
            <table className="table-sge compact">
              <thead>
                <tr>
                  <th>#</th>
                  <th className="text-left">Atleta</th>
                  <th className="text-left">Escola</th>
                  <th style={{ textTransform: 'capitalize' }}>{rotulo}</th>
                  <th>Jogos</th>
                  <th>🟨</th>
                  <th>🟥</th>
                </tr>
              </thead>
              <tbody>
                {artilheiros.map((atleta, posicao) => (
                  <tr key={atleta.atleta_id} className={posicao === 0 ? 'row-leader' : undefined}>
                    <td className="strong">{posicao + 1}</td>
                    <td className="text-left strong">{atleta.atleta_nome}</td>
                    <td className="text-left">{atleta.escola_nome}</td>
                    <td className="strong">{atleta.gols}</td>
                    <td>{atleta.jogos}</td>
                    <td>{atleta.amarelos || '—'}</td>
                    <td>{atleta.vermelhos || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <p className="form-hint">
              Somada das súmulas. Gols de W.O. não entram, porque um W.O. não tem súmula.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

export default ArtilhariaCompeticao;
