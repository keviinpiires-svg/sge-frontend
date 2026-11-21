import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { listarLideres } from '../services/artilharia';

const ROTULO_GENERO = { MASCULINO: 'Masculino', FEMININO: 'Feminino', MISTO: 'Misto' };

// O artilheiro de cada competição. Não existe "artilheiro dos Jogos": somar
// gols de futsal com pontos de basquete não diria nada.
function Artilheiros() {
  const navigate = useNavigate();
  const [resultado, setResultado] = useState(null);

  useEffect(() => {
    let ativo = true;

    listarLideres()
      .then((lideres) => {
        if (ativo) setResultado({ lideres, erro: '' });
      })
      .catch((falha) => {
        if (ativo) setResultado({ lideres: [], erro: falha.mensagem });
      });

    return () => {
      ativo = false;
    };
  }, []);

  // Enquanto ninguém marcou, o bloco não aparece: um card vazio no painel
  // só ocupa espaço.
  if (!resultado || resultado.erro || resultado.lideres.length === 0) return null;

  return (
    <section className="card stat-card-wide">
      <div className="card-body">
        <h3 className="card-title">⚽ Artilheiros por competição</h3>

        <div className="grid-cards">
          {resultado.lideres.map((lider) => (
            <button
              key={`${lider.competicao_id}-${lider.atleta_id}`}
              type="button"
              className="tile tile-clicavel"
              onClick={() => navigate(`/competicoes/${lider.competicao_id}`)}
            >
              <p className="tile-meta">
                {lider.modalidade_nome} · {lider.categoria_nome}{' '}
                {ROTULO_GENERO[lider.genero] || lider.genero}
              </p>
              <p className="tile-title">{lider.atleta_nome}</p>
              <p className="tile-meta">
                {lider.escola_nome} — {lider.gols} {lider.rotulo}
              </p>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

export default Artilheiros;
