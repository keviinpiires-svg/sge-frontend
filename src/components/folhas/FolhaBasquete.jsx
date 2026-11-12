import CabecalhoFolha from './CabecalhoFolha';
import { completarLinhas, sequencia, letraDaEquipe } from './comum';

// Folha do basquete (docs/referencias/SUMULA_BASQUETE_MODELO.pdf).
// Colunas do papel: FALTAS INDIVIDUAIS (1 a 5), Nº, ATLETAS, PONTOS e o
// Capitão na faixa da direita. Rodapé: FALTAS ACUMULATIVAS 1ºT e 2ºT (1 a 7),
// TEMPO TÉCNICO e TÉCNICO. Não há cartões.
//
// A grade de PONTOS do papel é a **pontuação corrida da equipe** — 2 a 97, em
// 8 colunas de 12 —, não o placar de cada atleta: o anotador risca o número
// conforme a equipe pontua. Por isso ela é um bloco só, ao lado das linhas.
// O papel tem 12 linhas de atleta e aqui são 14 (decisão de 29/09/2026), então
// a grade mantém os seus 12 degraus e as linhas correm ao lado.
//
// A coluna "Pts" é acréscimo nosso: o sistema guarda os pontos por atleta
// (é o que alimenta o cestinha) e a folha preenchida mostra isso. No papel
// oficial ela não existe.

const marcada = (valor, emBranco) => (!emBranco && valor ? 'marcada' : '');

function BlocoDaEquipe({ equipe, indice, folha, emBranco }) {
  const { de, colunas, porColuna } = folha.pontuacaoCorrida;
  const faltasPorTempo = folha.faltasAcumuladas;
  const maxFaltas = folha.faltasIndividuais;
  const pontosDaEquipe = emBranco ? 0 : Number(equipe.gols || 0);

  return (
    <section className="folha-equipe">
      <div className="folha-equipe-titulo">
        EQUIPE {letraDaEquipe(indice)}
        {equipe.escola_nome ? ` — ${equipe.escola_nome}` : ''}
      </div>

      <table className="folha-tabela folha-basquete">
        <colgroup>
          {sequencia(maxFaltas).map((i) => <col key={i} className="c-falta" />)}
          <col className="c-numero" />
          <col className="c-atleta" />
          <col className="c-pts" />
          <col className="c-pontos" />
          <col className="c-capitao" />
        </colgroup>

        <thead>
          <tr>
            <th className="rotulo" colSpan={maxFaltas}>Faltas individuais</th>
            <th className="rotulo">Nº</th>
            <th className="rotulo">Atletas</th>
            <th className="rotulo">Pts</th>
            <th className="rotulo">Pontos</th>
            <th className="celula-capitao-topo" />
          </tr>
        </thead>

        <tbody>
          {completarLinhas(equipe.atletas, folha.linhas).map((atleta, linha) => {
            const lancado = atleta && !emBranco;
            const faltas = lancado ? Number(atleta.faltas || 0) : 0;

            return (
              <tr key={atleta ? atleta.atleta_id : `vazia-${linha}`}>
                {sequencia(maxFaltas).map((i) => (
                  <td key={i} className={`falta-individual ${i < faltas ? 'marcada' : ''}`}>{i + 1}</td>
                ))}
                <td className="numero">{atleta ? (atleta.numero_camisa ?? '') : ''}</td>
                <td className="atleta">{atleta ? atleta.nome : ''}</td>
                <td className="pts">{lancado && atleta.gols ? atleta.gols : ''}</td>

                {linha === 0 && (
                  <td className="celula-pontos" rowSpan={folha.linhas}>
                    <table className="grade-pontos">
                      <tbody>
                        {sequencia(porColuna).map((i) => (
                          <tr key={i}>
                            {sequencia(colunas).map((j) => {
                              const numero = de + i + porColuna * j;
                              return (
                                <td
                                  key={j}
                                  className={numero <= pontosDaEquipe ? 'marcada' : ''}
                                >
                                  {numero}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </td>
                )}

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
          <tr>
            <td className="rotulo esquerda" colSpan={2}>Faltas acumulativas</td>
            <td className="rotulo tempo">1º T</td>
            {sequencia(faltasPorTempo).map((i) => (
              <td key={`f1-${i}`} className={`falta ${marcada(Number(equipe.faltas_1t || 0) > i, emBranco)}`}>
                {i + 1}
              </td>
            ))}
            <td className="rotulo tempo">2º T</td>
            {sequencia(faltasPorTempo).map((i) => (
              <td key={`f2-${i}`} className={`falta ${marcada(Number(equipe.faltas_2t || 0) > i, emBranco)}`}>
                {i + 1}
              </td>
            ))}
          </tr>
          <tr>
            <td className="rotulo esquerda" colSpan={2}>Tempo técnico</td>
            <td className="sem-borda" colSpan={faltasPorTempo * 2 + 2}>
              <table className="folha-tempo">
                <tbody>
                  <tr>
                    <td className="rotulo">1º T</td>
                    <td className="rotulo">2º T</td>
                    <td className="tecnico" rowSpan={2}>
                      Técnico: {emBranco ? '' : (equipe.tecnico_nome || '')}
                    </td>
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

function FolhaBasquete({ evento, jogo, equipes, folha, emBranco }) {
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

export default FolhaBasquete;
