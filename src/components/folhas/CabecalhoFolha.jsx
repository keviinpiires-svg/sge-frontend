import { partesDaData } from './comum';

// Cabeçalho comum a todas as folhas (docs/referencias/sumulas_modelos.md):
// campeonato, local, nº do jogo, cidade, categoria, data, árbitros, anotador e
// o confronto com as caixas de placar. Muda só o título, que é o nome da
// modalidade do jogo.
function CabecalhoFolha({ evento, jogo, equipes, folha, emBranco, placar }) {
  const [dia, mes, ano] = partesDaData(jogo.data_hora);
  // No vôlei o placar da caixa é o de sets; nas outras, a soma da folha.
  const caixas = placar || [equipes[0].gols, equipes[1].gols];

  return (
    <table className="folha-cabecalho">
      <colgroup>
        <col className="a" /><col className="b" /><col className="c" /><col className="d" />
      </colgroup>
      <tbody>
        <tr className="linha-titulo">
          <td className="logo"><img src="/logo-jogos-estudantis.png" alt="" /></td>
          {/* O título vem da folha, não do nome da modalidade: o papel do
              basquete diz BASQUETEBOL (src/config/folhasSumula.js). */}
          <td className="titulo" colSpan={2}>{folha.titulo}</td>
          <td className="logo"><img src="/logo-barra-do-choca.png" alt="" /></td>
        </tr>
        <tr>
          <td colSpan={4}>Campeonato:&nbsp;&nbsp;&nbsp;{evento.nome_evento}</td>
        </tr>
        <tr>
          <td colSpan={2}>LOCAL: {jogo.local_nome || ''}</td>
          <td>Nº DO JOGO ( {jogo.numero_jogo} )</td>
          <td>Cidade: {evento.cidade}</td>
        </tr>
        <tr>
          <td colSpan={2}>Categoria: {jogo.categoria_nome} {jogo.genero ? jogo.genero.toLowerCase() : ''}</td>
          <td colSpan={2} className="data">
            Data: <span className="slot">{dia}</span> / <span className="slot">{mes}</span> / <span className="slot">{ano}</span>
          </td>
        </tr>
        <tr>
          <td colSpan={2}>Árbitro 1: {jogo.arbitro_1 || ''}</td>
          <td colSpan={2} />
        </tr>
        <tr>
          <td colSpan={2}>Árbitro 2: {jogo.arbitro_2 || ''}</td>
          <td colSpan={2} />
        </tr>
        <tr>
          <td colSpan={2}>Anotador: {jogo.anotador || ''}</td>
          <td colSpan={2} />
        </tr>
        <tr className="linha-equipes">
          <td colSpan={4}>
            <div className="confronto">
              <span className="nome-equipe">EQUIPE A</span>
              <span className="caixa-placar">{emBranco ? '' : caixas[0]}</span>
              <span className="x">X</span>
              <span className="caixa-placar">{emBranco ? '' : caixas[1]}</span>
              <span className="nome-equipe">EQUIPE B</span>
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  );
}

export default CabecalhoFolha;
