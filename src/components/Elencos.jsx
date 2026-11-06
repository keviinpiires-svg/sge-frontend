import ElencoEquipe from './ElencoEquipe';

// Seção "Equipes e elencos" do detalhe da competição: as equipes agrupadas
// pelo grupo a que pertencem, cada uma abrindo o próprio elenco.
function Elencos({ competicao }) {
  return (
    <section className="card mb-lg">
      <div className="card-body">
        <h2 className="card-title">👥 Equipes e elencos</h2>

        {competicao.grupos.map((grupo) => (
          <div key={grupo.id ?? 'sem-grupo'} className="elenco-grupo">
            <h3 className="secao-titulo">
              {grupo.nome.startsWith('Sem') ? grupo.nome : `Grupo ${grupo.nome}`}
            </h3>

            {grupo.equipes.map((equipe) => (
              <ElencoEquipe key={equipe.id} equipe={equipe} competicao={competicao} />
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}

export default Elencos;
