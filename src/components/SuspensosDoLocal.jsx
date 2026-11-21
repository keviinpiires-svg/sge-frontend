import { nomeDaCompeticao } from './agendaTextos';

// Tabela dos atletas suspensos que cumprem suspensão nos jogos de UM local num
// dia (GET /api/suspensoes/dia/:data). Feita para o papel: vai na folha de
// abertura de cada local e na lista de suspensos do dia.
function SuspensosDoLocal({ suspensos }) {
  if (!suspensos || suspensos.length === 0) {
    return <p className="papel-vazio">Nenhum atleta suspenso lançado no sistema para os jogos deste local.</p>;
  }
  return (
    <table className="papel-tabela">
      <thead>
        <tr>
          <th>Cumpre no jogo</th>
          <th>Atleta</th>
          <th>Escola</th>
          <th>Competição</th>
          <th>Motivo</th>
        </tr>
      </thead>
      <tbody>
        {suspensos.map((s) => (
          <tr key={`${s.atleta_id}-${s.jogo.id}`}>
            <td className="papel-num">
              Nº {s.jogo.numero_tabela ?? '–'}{s.jogo.hora ? ` · ${s.jogo.hora}` : ''}
            </td>
            <td><strong>{s.atleta_nome}</strong></td>
            <td>{s.escola_nome}</td>
            <td>{nomeDaCompeticao(s.competicao)}</td>
            <td>
              {s.motivo}
              {s.jogos_pendentes > 1 && ` (jogo ${s.cumprimento} de ${s.jogos_pendentes} da suspensão)`}
              {s.restam_depois > 0 && s.cumprimento === s.jogos_pendentes - s.restam_depois
                && ` · faltam ${s.restam_depois} depois deste dia`}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// Rodapé com o limite da lista: só sai o que já foi lançado no sistema
export function AvisoDaLista({ dados, geradoEm }) {
  if (!dados) return null;
  return (
    <p className="papel-aviso">
      Situação em {geradoEm}, com as súmulas lançadas no sistema até então.
      {dados.jogos_anteriores_sem_sumula > 0 && (
        <> <strong>{dados.jogos_anteriores_sem_sumula} jogo(s) anterior(es) destas competições ainda sem súmula no sistema</strong>: o que aconteceu neles não entra.</>
      )}
      {' '}Expulsão num jogo deste mesmo dia não aparece: a mesa confere na súmula do jogo anterior.
      {' '}Futsal e society: 2 amarelos = 1 jogo; expulsão = 1 jogo. Handebol: vermelho = 1 jogo.
      {dados.modalidades_sem_regra?.length > 0 && ` Sem regra de suspensão: ${dados.modalidades_sem_regra.join(', ')}.`}
    </p>
  );
}

export default SuspensosDoLocal;
