import { useEffect, useState } from 'react';
import { listarAtletasAdicionadosPelasMesas } from '../services/mesaAtletas';

const ROTULO_GENERO = { MASCULINO: 'Masculino', FEMININO: 'Feminino', MISTO: 'Misto' };

// "2026-11-18 14:32:10" ou ISO do TIMESTAMP -> "18/11/2026 14:32"
const quando = (valor) => {
  if (!valor) return '—';
  const d = new Date(valor);
  if (Number.isNaN(d.getTime())) return String(valor);
  return d.toLocaleString('pt-BR', {
    timeZone: 'America/Bahia', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
  });
};

// Conferência (só ADMIN): os atletas que as mesas colocaram na hora do jogo, para revisar
// depois do evento. "Novo" = a mesa cadastrou o atleta (o código provisório e o documento
// se completam em Listar Atletas); sem marca = atleta que já existia, só foi inscrito.
function AtletasDasMesas() {
  const [resultado, setResultado] = useState(null);
  const [tentativa, setTentativa] = useState(0);

  useEffect(() => {
    let ativo = true;
    listarAtletasAdicionadosPelasMesas()
      .then((linhas) => { if (ativo) setResultado({ tentativa, linhas, erro: '' }); })
      .catch((falha) => { if (ativo) setResultado({ tentativa, linhas: [], erro: falha.mensagem }); });
    return () => { ativo = false; };
  }, [tentativa]);

  const pronto = resultado?.tentativa === tentativa;
  const linhas = pronto ? resultado.linhas : [];
  const erro = pronto ? resultado.erro : '';

  return (
    <div className="page">
      <div className="container-lg">
        <header className="page-header">
          <p className="eyebrow">Conferência</p>
          <h1 className="page-title">Atletas adicionados pelas mesas</h1>
          <p className="page-subtitle">
            Atletas que a mesa inscreveu na equipe durante o jogo. Revise depois do evento: os marcados como
            &quot;novo&quot; foram cadastrados pela mesa e podem estar sem documento.
          </p>
        </header>

        <div className="card">
          <div className="card-body">
            {!pronto && (
              <div className="state state-compact"><div className="spinner" /><p className="state-text">Carregando…</p></div>
            )}
            {pronto && erro && (
              <div className="state state-error">
                <p className="state-text">{erro}</p>
                <button type="button" className="btn btn-primary" onClick={() => setTentativa((t) => t + 1)}>Tentar novamente</button>
              </div>
            )}
            {pronto && !erro && linhas.length === 0 && (
              <div className="state state-compact"><p className="state-text">Nenhuma mesa adicionou atleta até agora.</p></div>
            )}
            {pronto && !erro && linhas.length > 0 && (
              <div className="table-wrap">
                <table className="table-sge compact tabela-sumula tabela-mesas">
                  <thead>
                    <tr>
                      <th className="text-left">Quando</th>
                      <th className="text-left">Mesa</th>
                      <th className="text-left">Escola</th>
                      <th className="text-left">Equipe</th>
                      <th className="text-left">Atleta</th>
                    </tr>
                  </thead>
                  <tbody>
                    {linhas.map((l) => (
                      <tr key={l.inscricao_id}>
                        <td className="text-left" data-rotulo="Quando">{quando(l.criado_em)}</td>
                        <td className="text-left" data-rotulo="Mesa">
                          {l.mesa}
                          {l.local_da_mesa && <span className="form-hint" style={{ display: 'block' }}>{l.local_da_mesa}</span>}
                        </td>
                        <td className="text-left" data-rotulo="Escola">{l.escola}</td>
                        <td className="text-left" data-rotulo="Equipe">{l.modalidade} · {l.categoria} · {ROTULO_GENERO[l.genero] || l.genero}</td>
                        <td className="text-left" data-rotulo="Atleta">
                          {l.atleta}
                          {l.atleta_novo && <span className="badge badge-accent" style={{ marginLeft: 8 }}>novo</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default AtletasDasMesas;
