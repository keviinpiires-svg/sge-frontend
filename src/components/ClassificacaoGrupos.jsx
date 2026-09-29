import { useState, useEffect } from 'react';
import { classificacaoDaCompeticao } from '../services/classificacao';

// Cabeçalho das colunas de placar conforme a modalidade
const COLUNAS_PLACAR = {
  GOLS: { pro: 'GP', contra: 'GC', saldo: 'SG', titulo: 'gols' },
  PONTOS: { pro: 'PP', contra: 'PC', saldo: 'SP', titulo: 'pontos' },
  SETS: { pro: 'SV', contra: 'SP', saldo: 'SS', titulo: 'sets' },
  ELIMINADOS: { pro: 'EL+', contra: 'EL-', saldo: 'SE', titulo: 'eliminados' }
};

function ClassificacaoGrupos({ competicao }) {
  // O resultado carrega o id de origem: o estado de carga é derivado e
  // nenhum setState roda no corpo do efeito.
  const [resultado, setResultado] = useState(null);

  const pronto = resultado?.id === competicao.id;
  const dados = pronto ? resultado.dados : null;
  const erro = pronto ? resultado.erro : '';

  useEffect(() => {
    let ativo = true;

    classificacaoDaCompeticao(competicao.id)
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

  if (!pronto) {
    return (
      <section className="card mb-lg">
        <div className="state state-compact">
          <div className="spinner" />
          <p className="state-text">Carregando classificação...</p>
        </div>
      </section>
    );
  }

  if (erro) {
    return (
      <section className="card mb-lg">
        <div className="state state-compact state-error">
          <p className="state-title">Não foi possível montar a classificação</p>
          <p className="state-text">{erro}</p>
        </div>
      </section>
    );
  }

  const colunas = COLUNAS_PLACAR[dados.competicao.tipo_placar] || COLUNAS_PLACAR.GOLS;
  const classificados = dados.competicao.proxima_fase === 'NENHUMA'
    ? 0
    : dados.competicao.classificados_por_grupo;

  return (
    <>
      {/* Regras ainda em aberto: aparecem antes da tabela, de propósito */}
      {dados.avisos.map((aviso) => (
        <div key={aviso.titulo} className="alert alert-aviso mb-lg">
          <p className="alert-titulo">⚠️ {aviso.titulo}</p>
          <p className="alert-texto">{aviso.texto}</p>
        </div>
      ))}

      {dados.grupos.map((grupo) => (
        <section key={grupo.id ?? 'sem-grupo'} className="card mb-lg">
          <div className="card-body" style={{ paddingBottom: 0 }}>
            <h2 className="card-title" style={{ marginBottom: 0, borderBottom: 'none' }}>
              {grupo.nome.startsWith('Sem') ? grupo.nome : `Grupo ${grupo.nome}`}
            </h2>
          </div>

          <div className="table-wrap">
            <table className="table-sge compact" style={{ minWidth: '680px' }}>
              <thead>
                <tr>
                  <th>Pos</th>
                  <th className="text-left">Escola</th>
                  <th title="Pontos">P</th>
                  <th title="Jogos">J</th>
                  <th title="Vitórias">V</th>
                  <th title="Empates">E</th>
                  <th title="Derrotas">D</th>
                  <th title={`${colunas.titulo} a favor`}>{colunas.pro}</th>
                  <th title={`${colunas.titulo} contra`}>{colunas.contra}</th>
                  <th title={`Saldo de ${colunas.titulo}`}>{colunas.saldo}</th>
                  <th title="Cartões amarelos e vermelhos">🟨/🟥</th>
                </tr>
              </thead>
              <tbody>
                {grupo.equipes.map((equipe) => (
                  <tr
                    key={equipe.equipe_id}
                    className={classificados > 0 && equipe.posicao <= classificados ? 'row-classificado' : ''}
                  >
                    <td>
                      <span className={`rank ${equipe.posicao <= 3 ? `rank-${equipe.posicao}` : ''}`}>
                        {equipe.posicao}
                      </span>
                    </td>
                    <td className="text-left strong">
                      {equipe.escola_nome}
                      {equipe.sorteio && (
                        <span className="tag-sorteio" title="Empate que o regulamento resolve por sorteio">
                          sorteio
                        </span>
                      )}
                      {!equipe.sorteio && equipe.criterio_desempate && (
                        <span className="tag-desempate" title={`Posição definida por ${equipe.criterio_desempate}`}>
                          {equipe.criterio_desempate}
                        </span>
                      )}
                      {equipe.wo > 0 && (
                        <span className="tag-desempate" title="Jogos decididos por W.O.">
                          {equipe.wo === 1 ? '1 W.O.' : `${equipe.wo} W.O.`}
                        </span>
                      )}
                    </td>
                    <td className="text-accent num-lg">{equipe.pontos}</td>
                    <td className="text-soft">{equipe.jogos}</td>
                    <td className="text-soft">{equipe.vitorias}</td>
                    <td className="text-soft">{equipe.empates}</td>
                    <td className="text-soft">{equipe.derrotas}</td>
                    <td className="text-soft">{equipe.marcados}</td>
                    <td className="text-soft">{equipe.sofridos}</td>
                    <td className={equipe.saldo > 0 ? 'text-success' : equipe.saldo < 0 ? 'text-danger' : 'text-soft'}>
                      {equipe.saldo > 0 ? `+${equipe.saldo}` : equipe.saldo}
                    </td>
                    <td className="text-soft">
                      {equipe.amarelos}/{equipe.vermelhos}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {grupo.equipes.every((equipe) => equipe.jogos === 0) && (
            <div className="state state-compact">
              <p className="state-text">Nenhum jogo finalizado neste grupo ainda.</p>
            </div>
          )}
        </section>
      ))}

      <p className="legenda-desempate">
        <b>Desempate ({dados.competicao.modalidade_nome}):</b> pontos → {dados.criterios_desempate.join(' → ')} → sorteio.
        {classificados > 0 && ` Em destaque, ${classificados === 1 ? 'o 1º de cada grupo' : `os ${classificados} primeiros de cada grupo`}.`}
        {dados.competicao.melhores_segundos > 0 && ' Há vaga para melhor segundo colocado.'}
      </p>
    </>
  );
}

export default ClassificacaoGrupos;
