import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useReactToPrint } from 'react-to-print';

function DetalhesSumula() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [jogo, setJogo] = useState(null);
  const [eventos, setEventos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');

  // Área impressa no PDF: placar + tabela de eventos
  const sumulaRef = useRef(null);
  const exportarPdf = useReactToPrint({
    contentRef: sumulaRef,
    documentTitle: () => `Sumula_Jogo_${jogo?.numero_jogo || id}`,
    pageStyle: '@page { size: A4; margin: 12mm; } html, body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }',
  });

  useEffect(() => {
    async function carregarRelatorio() {
      try {
        const response = await fetch(`http://localhost:3000/api/sumulas/${id}`);
        if (!response.ok) {
          throw new Error('Falha ao carregar detalhes da súmula.');
        }

        const data = await response.json();

        // Estratégia flexível de leitura, caso o backend retorne array (JOINs) ou objeto estruturado
        if (Array.isArray(data)) {
          if (data.length > 0) {
            setJogo({
              escola_1: data[0].escola_1 || data[0].escola_mandante,
              escola_2: data[0].escola_2 || data[0].escola_visitante,
              placar_escola_1: data[0].placar_escola_1,
              placar_escola_2: data[0].placar_escola_2,
              fase: data[0].fase,
              numero_jogo: data[0].numero_jogo
            });
            setEventos(data);
          } else {
            // Sem eventos, tenta recuperar os dados básicos do jogo
            const resJogo = await fetch(`http://localhost:3000/api/jogos/${id}`);
            if (resJogo.ok) {
              const infoJogo = await resJogo.json();
              setJogo(Array.isArray(infoJogo) ? infoJogo[0] : infoJogo);
            }
            setEventos([]);
          }
        } else {
          // Quando o backend já retorna num JSON estruturado { jogo: {}, eventos: [] }
          setJogo(data.jogo || data);
          setEventos(data.eventos || []);
        }
      } catch (err) {
        console.error(err);
        setErro(err.message || 'Ocorreu um erro de conexão.');
      } finally {
        setCarregando(false);
      }
    }

    if (id) {
      carregarRelatorio();
    }
  }, [id]);

  const botaoVoltar = (
    <div className="text-center mt-lg">
      <button className="btn btn-secondary btn-pill btn-lg" onClick={() => navigate('/lista-jogos')}>
        ← Voltar para a Tabela de Jogos
      </button>
    </div>
  );

  if (carregando) {
    return (
      <div className="page">
        <div className="container card">
          <div className="state">
            <div className="spinner" />
            <p className="state-text">Buscando relatório da súmula...</p>
          </div>
        </div>
      </div>
    );
  }

  if (erro) {
    return (
      <div className="page">
        <div className="container">
          <div className="card">
            <div className="state state-error">
              <div className="state-icon">⚠️</div>
              <p className="state-title">Não foi possível carregar a súmula</p>
              <p className="state-text">{erro}</p>
            </div>
          </div>
          {botaoVoltar}
        </div>
      </div>
    );
  }

  const placar = (valor) => (valor !== null && valor !== undefined ? valor : '-');
  const vazio = <span className="text-muted" style={{ fontWeight: 400 }}>-</span>;

  return (
    <div className="page">
      <div className="container stack">

        <div className="page-toolbar">
          <button className="btn btn-secondary" onClick={() => navigate('/lista-jogos')}>← Voltar</button>
          <button className="btn btn-outline" onClick={exportarPdf}>📄 Exportar PDF</button>
        </div>

        <div ref={sumulaRef} className="stack print-area">
        {/* Cabeçalho exibido apenas no documento impresso/PDF */}
        <header className="print-only print-header">
          <p className="eyebrow">Jogos Estudantis — Sistema de Gestão Esportiva</p>
          <h1 className="page-title">Súmula Oficial da Partida</h1>
          <p className="page-subtitle">Documento gerado em {new Date().toLocaleString('pt-BR')}</p>
        </header>

        {/* Placar estilo Esportivo (Stadium View) */}
        <section className="scoreboard">
          <p className="eyebrow">Relatório Final Oficial</p>
          <p className="scoreboard-meta">
            JOGO {jogo?.numero_jogo ? `#${jogo.numero_jogo}` : id} {jogo?.fase && `— ${jogo.fase}`}
          </p>

          <div className="scoreboard-row">
            <h2 className="scoreboard-team home">{jogo?.escola_1 || 'Equipe Mandante'}</h2>
            <div className="scoreboard-scores">
              <div className="score-box">{placar(jogo?.placar_escola_1)}</div>
              <span className="scoreboard-x">X</span>
              <div className="score-box">{placar(jogo?.placar_escola_2)}</div>
            </div>
            <h2 className="scoreboard-team away">{jogo?.escola_2 || 'Equipe Visitante'}</h2>
          </div>
        </section>

        {/* Listagem de Eventos da Súmula */}
        <section className="card">
          <div className="card-body" style={{ paddingBottom: eventos.length ? 0 : undefined }}>
            <h3 className="card-title" style={{ marginBottom: eventos.length ? 0 : undefined, borderBottom: eventos.length ? 'none' : undefined }}>
              Atletas com Registro na Súmula
            </h3>
          </div>

          {eventos.length === 0 ? (
            <div className="state state-compact">
              <div className="state-icon">📋</div>
              <p className="state-text">Nenhum evento (gols ou cartões) foi registrado nesta súmula.</p>
            </div>
          ) : (
            <div className="table-wrap">
              <table className="table-sge" style={{ minWidth: '560px' }}>
                <thead>
                  <tr>
                    <th className="text-left">Atleta</th>
                    <th className="text-left">Escola</th>
                    <th>⚽ Gols</th>
                    <th>🟨 Amarelos</th>
                    <th>🟥 Vermelhos</th>
                  </tr>
                </thead>
                <tbody>
                  {eventos.map((evento, index) => (
                    <tr key={index}>
                      <td className="text-left strong">
                        {evento.nome_atleta || evento.atleta || evento.aluno || evento.nome || `Atleta #${evento.aluno_id || evento.atleta_id}`}
                      </td>
                      <td className="text-left text-soft">{evento.nome_escola || evento.escola || '-'}</td>
                      <td className="text-success num-lg">
                        {evento.gols > 0 ? evento.gols : vazio}
                      </td>
                      <td className="text-accent num-lg">
                        {evento.cartoes_amarelos > 0 ? evento.cartoes_amarelos : vazio}
                      </td>
                      <td className="text-danger num-lg">
                        {(evento.cartao_vermelho > 0 || evento.cartoes_vermelhos > 0) ? (evento.cartao_vermelho || evento.cartoes_vermelhos) : vazio}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Campos de assinatura para o registro físico */}
        <footer className="print-only print-signatures">
          <div><span />Árbitro</div>
          <div><span />Representante — {jogo?.escola_1 || 'Equipe Mandante'}</div>
          <div><span />Representante — {jogo?.escola_2 || 'Equipe Visitante'}</div>
        </footer>
        </div>

        {botaoVoltar}
      </div>
    </div>
  );
}

export default DetalhesSumula;
