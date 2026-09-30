import { completarLinhas, sequencia, partesDaData, letraDaEquipe } from './comum';

// Folha do vôlei (docs/referencias/sumula_volei_modelo.pdf). É uma folha à
// parte, não uma variação da do futsal:
//  - cabeçalho sem caixa de placar (o resultado fica no rodapé);
//  - as duas equipes LADO A LADO, com nome da equipe e assinatura do capitão;
//  - CONTROLE DOS SETS: 3 sets, cada um com Saque A / Saque B, a sequência de
//    pontos 1 a 20 por equipe e o placar do set;
//  - RESULTADO FINAL: sets de cada equipe, vencedor, observações e as
//    assinaturas dos árbitros.
// Não há gols, cartões, faltas nem tempo técnico.
//
// O papel traz 12 linhas de atleta e aqui são 14 (decisão de 29/09/2026), com
// a linha um pouco mais baixa para a folha continuar cabendo em uma página.
//
// As caixas de Saque A/B saem em branco nas duas versões: o sistema guarda o
// placar dos sets, não quem sacou. Registrar isso exigiria uma coluna nova em
// jogo_sets.

// Em branco a folha repete o rótulo do papel ("____ SETS"); preenchida, com um
// set só, "1 SETS" ficaria errado.
const rotuloSets = (quantos, emBranco) => (!emBranco && quantos === 1 ? 'SET' : 'SETS');

// Coluna de uma equipe dentro de um set: a sequência 1 a 20, marcada até o
// ponto que a equipe fez.
function GradeDoSet({ pontos, folha }) {
  const { ate, porLinha } = folha.gradeDoSet;
  const linhas = Math.ceil(ate / porLinha);

  return (
    <table className="grade-set">
      <tbody>
        {sequencia(linhas).map((linha) => (
          <tr key={linha}>
            {sequencia(porLinha).map((coluna) => {
              const numero = linha * porLinha + coluna + 1;
              return (
                <td key={coluna} className={numero <= pontos ? 'marcada' : ''}>{numero}</td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function BlocoDaEquipe({ equipe, indice, folha }) {
  return (
    <div className="volei-equipe">
      <div className="volei-equipe-titulo">EQUIPE {letraDaEquipe(indice)}</div>
      <div className="volei-nome">Nome da Equipe: {equipe.escola_nome || ''}</div>

      <table className="volei-elenco">
        <colgroup>
          <col className="c-numero" /><col className="c-atleta" />
        </colgroup>
        <thead>
          <tr>
            <th className="rotulo">Nº</th>
            <th className="rotulo">Atleta</th>
          </tr>
        </thead>
        <tbody>
          {completarLinhas(equipe.atletas, folha.linhas).map((atleta, linha) => (
            <tr key={atleta ? atleta.atleta_id : `vazia-${linha}`}>
              <td className="numero">{atleta ? (atleta.numero_camisa ?? '') : ''}</td>
              <td className="atleta">{atleta ? atleta.nome : ''}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="volei-assinatura">Assinatura do Capitão:</div>
    </div>
  );
}

function FolhaVolei({ evento, jogo, equipes, sets, folha, emBranco }) {
  const [dia, mes, ano] = partesDaData(jogo.data_hora);
  // Sem lançamento a folha mostra os três espaços do papel zerados
  const doSet = (numero) => (sets || []).find((s) => s.numero_set === numero)
    || { numero_set: numero, pontos_1: 0, pontos_2: 0 };

  const lancado = (valor) => (emBranco ? '' : valor);
  const placarDoSet = (set, lado) => {
    if (emBranco) return '____';
    const pontos = lado === 0 ? set.pontos_1 : set.pontos_2;
    return pontos || pontos === 0 ? pontos : '____';
  };

  const setsVencidos = (lado) => (sets || []).reduce((total, set) => {
    const meus = lado === 0 ? set.pontos_1 : set.pontos_2;
    const deles = lado === 0 ? set.pontos_2 : set.pontos_1;
    return total + (meus > deles ? 1 : 0);
  }, 0);

  const vencedor = jogo.vencedor_equipe_id;

  return (
    <>
      <table className="folha-cabecalho volei">
        <colgroup>
          <col className="a" /><col className="b" /><col className="c" /><col className="d" />
        </colgroup>
        <tbody>
          <tr className="linha-titulo">
            <td className="logo"><img src="/logo-jogos-estudantis.png" alt="" /></td>
            <td className="titulo" colSpan={2}>{folha.titulo}</td>
            <td className="logo"><img src="/logo-barra-do-choca.png" alt="" /></td>
          </tr>
          <tr>
            <td colSpan={2}>CAMPEONATO: {evento.nome_evento}</td>
            <td>Nº DO JOGO ( {jogo.numero_jogo} )</td>
            <td>CATEGORIA: {jogo.categoria_nome} {jogo.genero ? jogo.genero.toLowerCase() : ''}</td>
          </tr>
          <tr>
            <td colSpan={2}>LOCAL: {jogo.local_nome || ''}</td>
            <td>Cidade: {evento.cidade}</td>
            <td className="data">
              Data: <span className="slot">{dia}</span> / <span className="slot">{mes}</span> / <span className="slot">{ano}</span>
            </td>
          </tr>
          <tr>
            <td colSpan={2}>Árbitro 1: {jogo.arbitro_1 || ''}</td>
            <td>Árbitro 2: {jogo.arbitro_2 || ''}</td>
            <td>Anotador: {jogo.anotador || ''}</td>
          </tr>
        </tbody>
      </table>

      <section className="volei-equipes">
        {equipes.map((equipe, indice) => (
          <BlocoDaEquipe key={equipe.equipe_id} equipe={equipe} indice={indice} folha={folha} />
        ))}
      </section>

      <section className="volei-sets">
        <div className="volei-faixa">CONTROLE DOS SETS</div>

        <table className="volei-controle">
          <colgroup>
            {sequencia(folha.maxSets * 2).map((i) => <col key={i} />)}
          </colgroup>
          <tbody>
            <tr className="linha-set">
              {sequencia(folha.maxSets).map((i) => (
                <td key={i} className="rotulo" colSpan={2}>{i + 1}º SET</td>
              ))}
            </tr>

            <tr className="linha-saque">
              {sequencia(folha.maxSets).map((i) => [
                <td key={`a${i}`}>Saque A ( )</td>,
                <td key={`b${i}`}>Saque B ( )</td>
              ])}
            </tr>

            <tr className="linha-grade">
              {sequencia(folha.maxSets).map((i) => [
                <td key={`ga${i}`}>
                  <GradeDoSet pontos={emBranco ? 0 : doSet(i + 1).pontos_1} folha={folha} />
                </td>,
                <td key={`gb${i}`}>
                  <GradeDoSet pontos={emBranco ? 0 : doSet(i + 1).pontos_2} folha={folha} />
                </td>
              ])}
            </tr>

            <tr className="linha-placar">
              {sequencia(folha.maxSets).map((i) => [
                <td key={`pa${i}`} className="rotulo">PLACAR</td>,
                <td key={`pb${i}`} className="placar-set">
                  <span className="slot">{placarDoSet(doSet(i + 1), 0)}</span>
                  {' x '}
                  <span className="slot">{placarDoSet(doSet(i + 1), 1)}</span>
                </td>
              ])}
            </tr>
          </tbody>
        </table>
      </section>

      <section className="volei-resultado">
        <div className="volei-faixa">RESULTADO FINAL</div>

        <table className="volei-final">
          <tbody>
            <tr>
              <td className="rotulo">EQUIPE A</td>
              <td><span className="slot">{lancado(setsVencidos(0))}</span> {rotuloSets(setsVencidos(0), emBranco)}</td>
              <td className="rotulo">EQUIPE B</td>
              <td><span className="slot">{lancado(setsVencidos(1))}</span> {rotuloSets(setsVencidos(1), emBranco)}</td>
            </tr>
            <tr>
              <td colSpan={2}>
                Vencedor: ( {!emBranco && vencedor === equipes[0].equipe_id ? 'X' : ' '} ) EQUIPE A
              </td>
              <td colSpan={2}>
                Vencedor: ( {!emBranco && vencedor === equipes[1].equipe_id ? 'X' : ' '} ) EQUIPE B
              </td>
            </tr>
            <tr className="linha-observacoes">
              <td colSpan={4}>Observações: {lancado(jogo.observacoes || '')}</td>
            </tr>
            <tr className="linha-assinaturas">
              <td colSpan={2}>Assinatura do Árbitro 1: __________________________</td>
              <td colSpan={2}>Assinatura do Árbitro 2: __________________________</td>
            </tr>
          </tbody>
        </table>
      </section>
    </>
  );
}

export default FolhaVolei;
