import { partesDaData } from './comum';

// Cabeçalho das folhas oficiais de 2026 (handebol e baleado), linha a linha
// como no papel (docs/referencias/SUMULA HANDEBOL.pdf e SUMULA BALEADO.pdf):
//   1. logo dos Jogos | título | logo da Prefeitura
//   2. CAMPEONATO: JOGOS ESTUDANTIS 2026 (fixo)
//   3. LOCAL | CIDADE (fixa: Barra do Choça)
//   4. CATEGORIA | Nº DO JOGO ( ) | DATA
//   5–7. ÁRBITRO 1, ÁRBITRO 2 e ANOTADOR — sempre em branco, nas duas versões:
//        quem assina é a mesa, à mão
//   8. EQUIPE – A [placar] X [placar] EQUIPE – B
// Cada linha é uma célula só: o papel não tem divisória entre LOCAL e CIDADE,
// nem entre CATEGORIA, Nº DO JOGO e DATA. Futsal, basquete e vôlei seguem com
// o CabecalhoFolha, que tem outra ordem.

const CAMPEONATO = 'JOGOS ESTUDANTIS 2026';
const CIDADE = 'Barra do Choça';

function CabecalhoOficial({ jogo, folha, emBranco, placar }) {
  const [dia, mes, ano] = partesDaData(jogo.data_hora);
  const categoria = [jogo.categoria_nome, jogo.genero ? jogo.genero.toLowerCase() : '']
    .filter(Boolean).join(' ');

  return (
    <table className="folha-cabecalho folha-oficial-cabecalho">
      <tbody>
        <tr className="linha-titulo">
          <td>
            <div className="oficial-titulo">
              <img src="/logo-jogos-estudantis.png" alt="" />
              <span>{folha.titulo}</span>
              <img src="/logo-barra-do-choca.png" alt="" />
            </div>
          </td>
        </tr>
        <tr>
          <td><b>CAMPEONATO:</b>&nbsp;&nbsp;&nbsp;<b>{CAMPEONATO}</b></td>
        </tr>
        <tr>
          <td>
            <div className="oficial-linha">
              <span><b>LOCAL:</b> {jogo.local_nome || ''}</span>
              <span className="largura-2"><b>CIDADE:</b> {CIDADE}</span>
            </div>
          </td>
        </tr>
        <tr>
          <td>
            <div className="oficial-linha">
              <span><b>CATEGORIA:</b> {categoria}</span>
              <span className="centro"><b>Nº DO JOGO (</b> {jogo.numero_jogo} <b>)</b></span>
              <span>
                <b>DATA:</b> <span className="slot">{dia}</span><b>/</b>
                <span className="slot">{mes}</span><b>/</b><span className="slot">{ano}</span>
              </span>
            </div>
          </td>
        </tr>
        <tr><td><b>ÁRBITRO 1:</b></td></tr>
        <tr><td><b>ÁRBITRO 2:</b></td></tr>
        <tr><td><b>ANOTADOR:</b></td></tr>
        <tr className="linha-equipes">
          <td>
            <div className="oficial-confronto">
              <span className="rotulo-oficial">EQUIPE – A</span>
              <span className="caixa-placar-oficial">{emBranco ? '' : placar[0]}</span>
              <span className="rotulo-oficial x">X</span>
              <span className="caixa-placar-oficial">{emBranco ? '' : placar[1]}</span>
              <span className="rotulo-oficial">EQUIPE – B</span>
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  );
}

export default CabecalhoOficial;
