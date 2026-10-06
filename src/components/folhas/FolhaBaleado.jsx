import CabecalhoOficial from './CabecalhoOficial';
import { completarLinhas, sequencia, letraDaEquipe, linhasDaFolha } from './comum';

// Folha oficial do baleado (docs/referencias/SUMULA BALEADO.pdf). Por equipe:
// Nº | ATLETAS | BALEADOS | CAPITÃO: e, no rodapé, só o TÉCNICO. Não tem
// cartões, faltas nem tempo técnico.
//
// BALEADOS é um contador DA EQUIPE, não por atleta: no topo da área, uma
// linha com os números de 1 a 10 e, logo abaixo, a linha de caixas onde se
// marca cada atleta da equipe que foi baleada. O resto da área é riscado com
// um X grande, de canto a canto, como no papel. O placar de uma equipe é o
// número de baleadas da adversária.

function BlocoDaEquipe({ equipe, indice, folha, emBranco }) {
  const caixas = folha.baleadosPorEquipe;
  const linhas = linhasDaFolha(folha, equipe, emBranco);
  const baleados = emBranco ? 0 : Number(equipe.baleados || 0);
  const capitao = !emBranco ? equipe.atletas.find((a) => a.capitao) : null;
  // A 1ª linha de atleta fica ao lado dos números; a 2ª, ao lado das caixas;
  // da 3ª em diante, ao lado da área riscada
  const linhasRiscadas = linhas - 2;

  return (
    <section className="folha-equipe folha-oficial-equipe">
      <div className="oficial-equipe-titulo">
        EQUIPE-{letraDaEquipe(indice)}
        {equipe.escola_nome ? ` — ${equipe.escola_nome}` : ''}
      </div>

      <table className="folha-tabela oficial-tabela">
        <colgroup>
          <col style={{ width: '6.7%' }} />
          <col style={{ width: '35%' }} />
          {sequencia(caixas).map((i) => (
            <col key={i} style={{ width: `${(43.3 / caixas).toFixed(3)}%` }} />
          ))}
          <col style={{ width: '15%' }} />
        </colgroup>

        {/* Um tbody só: a célula do capitão e a área riscada atravessam as
            linhas, e rowSpan não passa de thead para tbody */}
        <tbody>
          <tr>
            <th className="rotulo esquerda">Nº</th>
            <th className="rotulo">ATLETAS</th>
            <th className="rotulo" colSpan={caixas}>BALEADOS</th>
            <th className="rotulo esquerda capitao-oficial" rowSpan={linhas + 1}>
              CAPITÃO:
              {capitao && <span className="capitao-nome">{capitao.nome}</span>}
            </th>
          </tr>

          {completarLinhas(equipe.atletas, linhas).slice(0, linhas).map((atleta, linha) => (
            <tr key={atleta ? atleta.atleta_id : `vazia-${linha}`}>
              <td className="numero">{atleta ? (atleta.numero_camisa ?? '') : ''}</td>
              <td className="atleta">{atleta ? atleta.nome : ''}</td>

              {linha === 0 && sequencia(caixas).map((i) => (
                <td key={i} className="numero-baleado">{i + 1}</td>
              ))}

              {linha === 1 && sequencia(caixas).map((i) => (
                <td key={i} className="caixa-oficial">{i < baleados ? 'X' : ''}</td>
              ))}

              {linha === 2 && linhasRiscadas > 0 && (
                <td className="area-riscada" colSpan={caixas} rowSpan={linhasRiscadas}>
                  <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
                    <line x1="0" y1="0" x2="100" y2="100" stroke="#000" strokeWidth="1.2" vectorEffect="non-scaling-stroke" />
                    <line x1="0" y1="100" x2="100" y2="0" stroke="#000" strokeWidth="1.2" vectorEffect="non-scaling-stroke" />
                  </svg>
                </td>
              )}
            </tr>
          ))}

          {/* A linha em branco que o papel tem antes do rodapé */}
          <tr className="linha-vazia"><td colSpan={2 + caixas + 1} /></tr>
        </tbody>
      </table>

      <table className="oficial-rodape">
        <tbody>
          <tr>
            <td className="rotulo esquerda so-tecnico">
              TÉCNICO: <span className="valor">{emBranco ? '' : (equipe.tecnico_nome || '')}</span>
            </td>
          </tr>
        </tbody>
      </table>
    </section>
  );
}

function FolhaBaleado({ jogo, equipes, folha, emBranco }) {
  // Cada bloco conta as baleadas da própria equipe: o placar de A são as
  // baleadas de B, e vice-versa
  const placar = [Number(equipes[1].baleados || 0), Number(equipes[0].baleados || 0)];

  return (
    <>
      <CabecalhoOficial jogo={jogo} folha={folha} emBranco={emBranco} placar={placar} />
      {equipes.map((equipe, indice) => (
        <BlocoDaEquipe
          key={equipe.equipe_id}
          equipe={equipe}
          indice={indice}
          folha={folha}
          emBranco={emBranco}
        />
      ))}
    </>
  );
}

export default FolhaBaleado;
