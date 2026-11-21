import CabecalhoOficial from './CabecalhoOficial';
import { completarLinhas, sequencia, letraDaEquipe, linhasDaFolha } from './comum';

// Folha oficial do handebol (docs/referencias/SUMULA_HANDEBOL.pdf). Por equipe:
// CARTÕES (A e V) | Nº | ATLETAS | GOLS (10 caixas) | CAPITÃO: — uma célula
// só, onde se escreve o nome —, e no rodapé TEMPO TÉCNICO 1º T / 2ºT e
// TÉCNICO. Não tem falta individual nem falta acumulada. As caixas de gols e
// as linhas vêm de src/config/folhasSumula.js.

function BlocoDaEquipe({ equipe, indice, folha, emBranco }) {
  const caixas = folha.caixasEstatistica;
  const linhas = linhasDaFolha(folha, equipe, emBranco);
  const capitao = !emBranco ? equipe.atletas.find((a) => a.capitao) : null;

  return (
    <section className="folha-equipe folha-oficial-equipe">
      <div className="oficial-equipe-titulo">
        EQUIPE-{letraDaEquipe(indice)}
        {equipe.escola_nome ? ` — ${equipe.escola_nome}` : ''}
      </div>

      <table className="folha-tabela oficial-tabela">
        <colgroup>
          <col style={{ width: '6.7%' }} /><col style={{ width: '6.5%' }} />
          <col style={{ width: '5.5%' }} />
          <col style={{ width: '22.9%' }} />
          {sequencia(caixas).map((i) => (
            <col key={i} style={{ width: `${(42.7 / caixas).toFixed(3)}%` }} />
          ))}
          <col style={{ width: '15.7%' }} />
        </colgroup>

        {/* Cabeçalho e linhas no mesmo tbody: a célula do capitão desce do
            cabeçalho até a última linha, como no papel, e rowSpan não
            atravessa de thead para tbody */}
        <tbody>
          <tr>
            <th className="rotulo esquerda" colSpan={2}>CARTÕES</th>
            <th className="rotulo">Nº</th>
            <th className="rotulo">ATLETAS</th>
            <th className="rotulo" colSpan={caixas}>GOLS</th>
            <th className="rotulo esquerda capitao-oficial" rowSpan={linhas + 1}>
              CAPITÃO:
              {capitao && <span className="capitao-nome">{capitao.nome}</span>}
            </th>
          </tr>
          {completarLinhas(equipe.atletas, linhas).slice(0, linhas).map((atleta, linha) => {
            // completarLinhas só completa; slice corta o elenco na folha em branco (12)
            const lancado = atleta && !emBranco;
            const gols = lancado ? Number(atleta.gols || 0) : 0;

            return (
              <tr key={atleta ? atleta.atleta_id : `vazia-${linha}`}>
                <td className="letra-cartao">{lancado && atleta.amarelos >= 1 ? 'X' : 'A'}</td>
                <td className="letra-cartao">{lancado && atleta.vermelho ? 'X' : 'V'}</td>
                <td className="numero">{atleta ? (atleta.numero_camisa ?? '') : ''}</td>
                <td className="atleta">{atleta ? atleta.nome : ''}</td>
                {sequencia(caixas).map((i) => (
                  <td key={i} className="caixa-oficial">{i < gols ? 'X' : ''}</td>
                ))}
              </tr>
            );
          })}
          {/* A linha em branco que o papel tem antes do rodapé */}
          <tr className="linha-vazia"><td colSpan={4 + caixas + 1} /></tr>
        </tbody>
      </table>

      <table className="oficial-rodape">
        <colgroup>
          <col style={{ width: '23.2%' }} /><col style={{ width: '8%' }} />
          <col style={{ width: '6.3%' }} /><col style={{ width: '62.5%' }} />
        </colgroup>
        <tbody>
          <tr>
            <td className="rotulo esquerda" rowSpan={2}>TEMPO TÉCNICO</td>
            <td className="rotulo esquerda">1º T</td>
            <td className="rotulo esquerda">2ºT</td>
            <td className="rotulo esquerda tecnico-oficial" rowSpan={2}>
              TÉCNICO: <span className="valor">{emBranco ? '' : (equipe.tecnico_nome || '')}</span>
            </td>
          </tr>
          <tr>
            <td className="caixa-tempo">{!emBranco && equipe.tempo_tecnico_1t ? 'X' : ''}</td>
            <td className="caixa-tempo">{!emBranco && equipe.tempo_tecnico_2t ? 'X' : ''}</td>
          </tr>
        </tbody>
      </table>
    </section>
  );
}

function FolhaHandebol({ jogo, equipes, folha, emBranco }) {
  const placar = [equipes[0].gols, equipes[1].gols];

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

export default FolhaHandebol;
