import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useReactToPrint } from 'react-to-print';
import { buscarAtletasDaEscola } from '../services/escolas';
import { hojeNoEvento, partesDaData, soAData } from '../services/datas';

// Documento "Atletas (PDF)" da escola (só ADMIN): um bloco por equipe,
// com os atletas inscritos, e o total de atletas diferentes no fim. Mesmo
// esquema das súmulas: folha A4 em tela, impressa pelo navegador ("Salvar como
// PDF"), com as logos de impressão das súmulas. Atletismo e tabuleiro ficam de
// fora (são individuais e não têm equipe). Não mostra RG, CPF nem código
// provisório: o backend nem manda.

const ROTULO_GENERO = { MASCULINO: 'Masculino', FEMININO: 'Feminino', MISTO: 'Misto' };

const dataDeGeracao = () => {
  const [dia, mes, ano] = partesDaData(hojeNoEvento());
  return `${dia}/${mes}/${ano}`;
};

const plural = (n, singular, pluralTexto) => `${n} ${n === 1 ? singular : pluralTexto}`;

function EscolaAtletasPdf() {
  const { id } = useParams();
  const [carga, setCarga] = useState(null);
  const [tentativa, setTentativa] = useState(0);
  const folhaRef = useRef(null);

  useEffect(() => {
    let ativo = true;
    buscarAtletasDaEscola(id)
      .then((dados) => { if (ativo) setCarga({ id, tentativa, dados, erro: '' }); })
      .catch((falha) => { if (ativo) setCarga({ id, tentativa, dados: null, erro: falha.mensagem }); });
    return () => { ativo = false; };
  }, [id, tentativa]);

  const pronto = carga?.id === id && carga?.tentativa === tentativa;
  const dados = pronto ? carga.dados : null;
  const erro = pronto ? carga.erro : '';

  const imprimir = useReactToPrint({
    contentRef: folhaRef,
    documentTitle: `Atletas_${(dados?.escola?.nome || `escola_${id}`).replace(/\s+/g, '_')}`,
    // margem 0 na página + margem própria na folha: é o que tira o cabeçalho
    // e o rodapé que o navegador imprime por conta própria
    pageStyle: `
      @page { size: A4 portrait; margin: 0; }
      html, body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    `
  });

  if (!pronto) {
    return (
      <div className="page"><div className="container-lg">
        <div className="card"><div className="state">
          <div className="spinner" />
          <p className="state-text">Montando a lista de atletas… o servidor pode levar até um minuto para acordar.</p>
        </div></div>
      </div></div>
    );
  }

  if (erro) {
    return (
      <div className="page"><div className="container-lg">
        <div className="card"><div className="state state-error">
          <div className="state-icon">⚠️</div>
          <p className="state-title">Não foi possível montar a lista</p>
          <p className="state-text">{erro}</p>
          <button type="button" className="btn btn-primary" onClick={() => setTentativa((t) => t + 1)}>Tentar novamente</button>
        </div></div>
      </div></div>
    );
  }

  const { escola, equipes, total_atletas_diferentes: totalDiferentes } = dados;

  return (
    <div className="page">
      <div className="container-lg">
        <header className="page-header no-print">
          <p className="eyebrow">Documento da escola</p>
          <h1 className="page-title">Atletas — {escola.nome}</h1>
          <p className="page-subtitle">
            {plural(equipes.length, 'equipe', 'equipes')} e {plural(totalDiferentes, 'atleta diferente', 'atletas diferentes')}.
            {' '}Use "Imprimir / salvar PDF" e, na janela do navegador, escolha "Salvar como PDF".
          </p>
          <div className="btn-group" style={{ justifyContent: 'flex-start', marginTop: 12 }}>
            <Link to="/" className="btn btn-secondary">← Voltar</Link>
            <button type="button" className="btn btn-primary" onClick={imprimir}>🖨️ Imprimir / salvar PDF</button>
          </div>
        </header>

        <p className="folha-dica no-print">
          A folha está no tamanho do papel (A4). Arraste para o lado para ver a folha inteira.
        </p>
        <div className="folha-rolagem">
          <div ref={folhaRef} className="folha-sumula relatorio-escola print-area">
            {/* A página tem margem 0 (é o que tira o cabeçalho e o rodapé do navegador), então
                o conteúdo ficaria colado na borda de cima a partir da 2ª página. Esta tabela
                de uma linha só repete um espaçador no topo e no pé de CADA página impressa. */}
            <table className="relatorio-paginas">
              <thead><tr><td><div className="relatorio-margem" /></td></tr></thead>
              <tfoot><tr><td><div className="relatorio-margem" /></td></tr></tfoot>
              <tbody><tr><td>
            <header className="relatorio-cabecalho">
              <img src="/logo-jogos-estudantis.png" alt="" />
              <div className="relatorio-titulo">
                <span className="relatorio-evento">JOGOS ESTUDANTIS 2026</span>
                <span className="relatorio-escola-nome">{escola.nome}</span>
                <span className="relatorio-subtitulo">Atletas por equipe</span>
              </div>
              <img src="/logo-barra-do-choca.png" alt="" />
            </header>
            <p className="relatorio-gerado">Gerado em {dataDeGeracao()}</p>

            {equipes.length === 0 && (
              <p className="relatorio-vazio">Esta escola ainda não tem equipe em modalidade coletiva.</p>
            )}

            {equipes.map((equipe) => (
              <section className="relatorio-equipe" key={equipe.equipe_id}>
                <h2 className="relatorio-equipe-titulo">
                  {equipe.modalidade_nome} – {equipe.categoria_nome} – {ROTULO_GENERO[equipe.genero] || equipe.genero}
                </h2>
                <table className="relatorio-tabela">
                  <colgroup>
                    <col className="r-ordem" />
                    <col className="r-nome" />
                    <col className="r-nascimento" />
                    <col className="r-camisa" />
                  </colgroup>
                  <thead>
                    <tr>
                      <th>Nº</th>
                      <th className="esquerda">Atleta</th>
                      <th>Nascimento</th>
                      <th>Camisa</th>
                    </tr>
                  </thead>
                  <tbody>
                    {equipe.atletas.length === 0 ? (
                      <tr><td className="relatorio-sem-atletas" colSpan={4}>sem atletas inscritos</td></tr>
                    ) : (
                      equipe.atletas.map((atleta, indice) => (
                        <tr key={atleta.atleta_id}>
                          <td className="centro">{indice + 1}</td>
                          <td className="esquerda">{atleta.nome}</td>
                          <td className="centro">{soAData(atleta.data_nascimento)}</td>
                          <td className="centro">{atleta.numero_camisa ?? ''}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
                <p className="relatorio-total">Total: {plural(equipe.atletas.length, 'atleta', 'atletas')}</p>
              </section>
            ))}

            <p className="relatorio-total-geral">
              Total de atletas diferentes da escola: {totalDiferentes}
            </p>
              </td></tr></tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

export default EscolaAtletasPdf;
