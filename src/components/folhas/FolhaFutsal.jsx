import CabecalhoFolha from './CabecalhoFolha';
import { completarLinhas, sequencia, letraDaEquipe } from './comum';

// Folha do futsal (docs/referencias/sumula_futsal_modelo.pdf). A mesma folha
// vale para o Futebol Society e o Handebol — muda só o título — e, por decisão
// provisória de 30/09/2026, para o Baleado, onde a grade conta ELIMINAÇÕES em
// vez de gols. O papel traz 12 linhas; aqui são 14, o elenco do regulamento.
// O desenho (quantas caixas, quantas faltas, se tem cartão) vem do backend,
// de src/config/folhasSumula.js.

// Uma falta lançada marca as caixas de 1 até o total do tempo
const lancouFalta = (total, indice, emBranco) => !emBranco && Number(total || 0) > indice;

// A faixa da grade ocupa 42,35% da largura da folha (medido no PDF do futsal) e
// é dividida pelo número de caixas: 11 no futsal, 14 no baleado. A largura vive
// aqui, e não no CSS, para acompanhar o que folhasSumula.js definir.
const FAIXA_DA_GRADE = 42.35;

function BlocoDaEquipe({ equipe, indice, folha, emBranco }) {
  const caixas = folha.caixasEstatistica;
  const faltasPorTempo = folha.faltasAcumuladas;
  // Sem faltas acumuladas (baleado) o rodapé tem só duas células
  const semFaltas = faltasPorTempo === 0;
  const larguraDaCaixa = `${(FAIXA_DA_GRADE / caixas).toFixed(3)}%`;
  const valor = (v) => (emBranco ? '' : (v ?? ''));

  return (
    <section className="folha-equipe">
      <div className="folha-equipe-titulo">
        EQUIPE {letraDaEquipe(indice)}
        {equipe.escola_nome ? ` — ${equipe.escola_nome}` : ''}
      </div>

      <table className="folha-tabela">
        <colgroup>
          <col className="c-cartao" /><col className="c-cartao" /><col className="c-cartao" />
          <col className="c-numero" />
          <col className="c-atleta" />
          {sequencia(caixas).map((i) => (
            <col key={i} className="c-gol" style={{ width: larguraDaCaixa }} />
          ))}
          <col className="c-capitao" />
        </colgroup>

        <thead>
          <tr>
            <th className="rotulo" colSpan={3}>Cartões</th>
            <th className="rotulo">Nº</th>
            <th className="rotulo">Atletas</th>
            <th className="rotulo" colSpan={caixas}>{folha.rotuloEstatistica}</th>
            <th className="celula-capitao-topo" />
          </tr>
        </thead>

        <tbody>
          {completarLinhas(equipe.atletas, folha.linhas).map((atleta, linha) => {
            const lancado = atleta && !emBranco;
            const marcas = lancado ? Number(atleta.gols || 0) : 0;

            return (
              <tr key={atleta ? atleta.atleta_id : `vazia-${linha}`}>
                <td className="cartao">{lancado && atleta.amarelos >= 1 ? '✕' : 'A'}</td>
                <td className="cartao">{lancado && atleta.amarelos >= 2 ? '✕' : 'A'}</td>
                <td className="cartao">{lancado && atleta.vermelho ? '✕' : 'V'}</td>
                <td className="numero">{atleta ? (atleta.numero_camisa ?? '') : ''}</td>
                <td className="atleta">{atleta ? atleta.nome : ''}</td>
                {sequencia(caixas).map((i) => (
                  <td key={i} className="gol">{i < marcas ? '✕' : ''}</td>
                ))}
                {linha === 0 && (
                  <td className="celula-capitao" rowSpan={folha.linhas}>
                    <span className="texto-vertical">Capitão:</span>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>

      <table className="folha-rodape">
        <tbody>
          {!semFaltas && (
            <tr>
              <td className="rotulo esquerda" colSpan={2}>Faltas acumuladas</td>
              <td className="rotulo tempo">1º T</td>
              {sequencia(faltasPorTempo).map((i) => (
                <td key={`f1-${i}`} className={`falta ${lancouFalta(equipe.faltas_1t, i, emBranco) ? 'marcada' : ''}`}>
                  {i + 1}
                </td>
              ))}
              <td className="rotulo tempo">2º T</td>
              {sequencia(faltasPorTempo).map((i) => (
                <td key={`f2-${i}`} className={`falta ${lancouFalta(equipe.faltas_2t, i, emBranco) ? 'marcada' : ''}`}>
                  {i + 1}
                </td>
              ))}
            </tr>
          )}
          <tr>
            <td
              className={`rotulo esquerda ${semFaltas ? 'larga' : ''}`}
              colSpan={semFaltas ? 1 : 2}
            >
              Tempo técnico
            </td>
            <td className="sem-borda" colSpan={semFaltas ? 1 : faltasPorTempo * 2 + 2}>
              <table className="folha-tempo">
                <tbody>
                  <tr>
                    <td className="rotulo">1º T</td>
                    <td className="rotulo">2º T</td>
                    <td className="tecnico" rowSpan={2}>Técnico: {valor(equipe.tecnico_nome)}</td>
                  </tr>
                  <tr>
                    <td className="caixa">{emBranco || !equipe.tempo_tecnico_1t ? '' : '✕'}</td>
                    <td className="caixa">{emBranco || !equipe.tempo_tecnico_2t ? '' : '✕'}</td>
                  </tr>
                </tbody>
              </table>
            </td>
          </tr>
        </tbody>
      </table>
    </section>
  );
}

function FolhaFutsal({ evento, jogo, equipes, folha, emBranco }) {
  return (
    <>
      <CabecalhoFolha evento={evento} jogo={jogo} equipes={equipes} folha={folha} emBranco={emBranco} />

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

export default FolhaFutsal;
