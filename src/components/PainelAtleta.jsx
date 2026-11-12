import { useEffect, useRef, useState } from 'react';
import { buscarAtletaPorId, listarInscricoesDoAtleta } from '../services/atletas';
import { soAData } from '../services/datas';

const ROTULO_GENERO = { MASCULINO: 'Masculino', FEMININO: 'Feminino', MISTO: 'Misto' };

// Painel com as competições em que o atleta está inscrito. Abre por cima da lista; fecha pelo X,
// pela tecla Esc ou clicando fora. RG e nascimento só chegam para o ADMIN (rota própria).
function PainelAtleta({ atleta, escolaNome, isAdmin, aoFechar }) {
  const [estado, setEstado] = useState({ id: null, dados: null, pessoais: null, erro: '' });
  const botaoFechar = useRef(null);

  useEffect(() => {
    let ativo = true;

    Promise.all([
      listarInscricoesDoAtleta(atleta.id),
      isAdmin ? buscarAtletaPorId(atleta.id).catch(() => null) : Promise.resolve(null)
    ])
      .then(([dados, pessoais]) => {
        if (ativo) setEstado({ id: atleta.id, dados, pessoais, erro: '' });
      })
      .catch((falha) => {
        if (ativo) {
          setEstado({
            id: atleta.id,
            dados: null,
            pessoais: null,
            erro: falha.mensagem || 'Não foi possível carregar as inscrições.'
          });
        }
      });

    return () => {
      ativo = false;
    };
  }, [atleta.id, isAdmin]);

  // Esc fecha; o foco vai para o botão X ao abrir; a página de trás não rola
  useEffect(() => {
    const aoTeclar = (e) => {
      if (e.key === 'Escape') aoFechar();
    };
    document.addEventListener('keydown', aoTeclar);
    botaoFechar.current?.focus();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', aoTeclar);
      document.body.style.overflow = overflow;
    };
  }, [aoFechar]);

  const pronto = estado.id === atleta.id;
  const dados = pronto ? estado.dados : null;
  const inscricoes = dados?.inscricoes || [];
  const coletivas = dados?.total_coletivas ?? 0;

  return (
    <div className="painel-fundo" onClick={aoFechar} role="presentation">
      <div
        className="painel-atleta card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="painel-atleta-titulo"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="card-body">
          <div className="painel-atleta-topo">
            <div>
              <h2 className="card-title" id="painel-atleta-titulo" style={{ margin: 0 }}>{atleta.nome}</h2>
              <p className="text-soft" style={{ margin: '4px 0 0' }}>
                {escolaNome || dados?.atleta?.escola_nome || ''}
                {isAdmin && estado.pessoais && (
                  <>
                    {' · '}Nasc. {soAData(estado.pessoais.data_nascimento)}
                    {' · '}RG {estado.pessoais.rg}
                  </>
                )}
              </p>
            </div>
            <button
              type="button"
              ref={botaoFechar}
              className="btn btn-outline btn-sm"
              onClick={aoFechar}
              aria-label="Fechar"
            >
              ✕
            </button>
          </div>

          {!pronto && (
            <div className="state state-compact">
              <div className="spinner" />
              <p className="state-text">Carregando...</p>
            </div>
          )}

          {pronto && estado.erro && <p className="alert alert-error">{estado.erro}</p>}

          {pronto && !estado.erro && inscricoes.length === 0 && (
            <div className="state state-compact">
              <p className="state-text">Nenhuma inscrição</p>
            </div>
          )}

          {pronto && !estado.erro && inscricoes.length > 0 && (
            <>
              <p className={coletivas > 2 ? 'alert alert-aviso' : 'text-soft'} style={{ margin: '12px 0' }}>
                Competições coletivas: <strong>{coletivas}</strong>
                {coletivas > 2 && ' — acima do limite de 2 do regulamento'}
              </p>
              <div className="table-wrap">
                <table className="table-sge compact">
                  <thead>
                    <tr>
                      <th className="text-left">Modalidade</th>
                      <th>Categoria</th>
                      <th>Gênero</th>
                      {isAdmin && <th>Exceção</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {inscricoes.map((i) => (
                      <tr key={i.inscricao_id}>
                        <td className="text-left strong">{i.modalidade}</td>
                        <td>{i.categoria}</td>
                        <td>{ROTULO_GENERO[i.genero] || i.genero}</td>
                        {isAdmin && <td>{i.excecao ? <span className="badge">Exceção</span> : '—'}</td>}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default PainelAtleta;
