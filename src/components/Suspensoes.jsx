import { useState, useEffect } from 'react';
import { suspensoesDaCompeticao } from '../services/suspensoes';

// Cartões e suspensões da competição. Some da tela quando não há nada
// lançado: antes do primeiro cartão não há o que mostrar.
function Suspensoes({ competicao }) {
  const [resultado, setResultado] = useState(null);

  const pronto = resultado?.id === competicao.id;
  const dados = pronto ? resultado.dados : null;

  useEffect(() => {
    let ativo = true;

    suspensoesDaCompeticao(competicao.id)
      .then((dados) => {
        if (ativo) setResultado({ id: competicao.id, dados, erro: '' });
      })
      .catch((falha) => {
        if (ativo) setResultado({ id: competicao.id, dados: null, erro: falha.mensagem });
      });

    return () => {
      ativo = false;
    };
  }, [competicao.id]);

  if (!pronto || !dados) return null;
  if (dados.atletas.length === 0 && dados.avisos.length === 0) return null;

  return (
    <>
      {dados.avisos.map((aviso) => (
        <div key={aviso.titulo} className="alert alert-aviso mb-lg">
          <p className="alert-titulo">⚠️ {aviso.titulo}</p>
          <p className="alert-texto">{aviso.texto}</p>
        </div>
      ))}

      {dados.atletas.length > 0 && (
        <section className="card mb-lg">
          <div className="card-body" style={{ paddingBottom: 0 }}>
            <h2 className="card-title" style={{ marginBottom: 0, borderBottom: 'none' }}>
              Cartões e suspensões
            </h2>
          </div>

          <div className="table-wrap">
            <table className="table-sge compact" style={{ minWidth: '620px' }}>
              <thead>
                <tr>
                  <th className="text-left">Atleta</th>
                  <th className="text-left">Escola</th>
                  <th title="Amarelos na fase atual">🟨 fase</th>
                  <th title="Amarelos no total">🟨 total</th>
                  <th title="Expulsões">🟥</th>
                  <th>Situação</th>
                </tr>
              </thead>
              <tbody>
                {dados.atletas.map((atleta) => (
                  <tr key={atleta.atleta_id} className={atleta.pendentes > 0 ? 'row-suspenso' : ''}>
                    <td className="text-left strong">{atleta.nome}</td>
                    <td className="text-left text-soft">{atleta.escola_nome}</td>
                    <td className="text-accent">{atleta.amarelos_na_fase}</td>
                    <td className="text-soft">{atleta.amarelos_total}</td>
                    <td className={atleta.vermelhos > 0 ? 'text-danger' : 'text-soft'}>{atleta.vermelhos}</td>
                    <td>
                      {atleta.pendentes > 0 ? (
                        <span className="badge badge-suspenso" title={atleta.motivos.join('; ')}>
                          {atleta.pendentes === 1 ? 'suspenso — 1 jogo' : `suspenso — ${atleta.pendentes} jogos`}
                        </span>
                      ) : (
                        <span className="badge">liberado</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {dados.regra_definida && (
            <p className="legenda-desempate" style={{ padding: '0 24px 18px' }}>
              <b>Regra:</b> 2 amarelos = 1 jogo de suspensão, amarelos zerados na 2ª fase,
              expulsão = 1 jogo automático mais julgamento. A suspensão é cumprida no primeiro
              jogo seguinte em que o atleta não entra na súmula.
            </p>
          )}
        </section>
      )}
    </>
  );
}

export default Suspensoes;
