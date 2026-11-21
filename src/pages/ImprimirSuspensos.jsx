import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useReactToPrint } from 'react-to-print';
import { suspensosDoDia } from '../services/suspensoes';
import { agoraNoEventoLegivel, dataPorExtenso, hojeNoEvento } from '../services/datas';
import SuspensosDoLocal, { AvisoDaLista } from '../components/SuspensosDoLocal';

// Lista de suspensos para imprimir (ADMIN; 17/11/2026): os atletas suspensos
// para os jogos de um dia, por local, na ordem da tabela, com o jogo em que
// cumprem. Vai junto com as súmulas em branco (os locais não têm internet).

const DIAS = ['2026-11-18', '2026-11-19', '2026-11-20', '2026-11-21'];

const rotuloDoDia = (dia) => {
  const texto = dataPorExtenso(dia);
  return texto.charAt(0).toUpperCase() + texto.slice(1);
};

function ImprimirSuspensos() {
  const [parametros, setParametros] = useSearchParams();
  const hoje = hojeNoEvento();
  const dia = parametros.get('dia') || (DIAS.includes(hoje) ? hoje : DIAS[0]);
  const [tentativa, setTentativa] = useState(0);
  const [resultado, setResultado] = useState(null);
  const papelRef = useRef(null);

  const chave = `${dia}|${tentativa}`;
  useEffect(() => {
    let ativo = true;
    suspensosDoDia(dia)
      .then((dados) => { if (ativo) setResultado({ chave, dados, erro: '', geradoEm: agoraNoEventoLegivel() }); })
      .catch((falha) => { if (ativo) setResultado({ chave, dados: null, erro: falha.mensagem }); });
    return () => { ativo = false; };
  }, [chave, dia]);

  const pronto = resultado?.chave === chave;
  const dados = pronto ? resultado.dados : null;

  const imprimir = useReactToPrint({
    contentRef: papelRef,
    documentTitle: `Suspensos_${dia}`,
    pageStyle: '@page { size: A4 portrait; margin: 10mm; } html, body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }'
  });

  return (
    <div className="page">
      <div className="container-lg">
        <header className="page-header no-print">
          <p className="eyebrow">Plano em papel</p>
          <h1 className="page-title">Suspensos do dia</h1>
          <p className="page-subtitle">
            Atletas que cumprem suspensão nos jogos do dia, por local. Vai junto com as súmulas em branco.{' '}
            <Link to={`/imprimir-sumulas?dia=${dia}&local=todos`}>Imprimir as súmulas do dia</Link>
          </p>
        </header>

        <div className="card lote-filtros no-print">
          <div className="agenda-dias" role="group" aria-label="Dia">
            {DIAS.map((d) => (
              <button key={d} type="button" className={`agenda-dia-botao${dia === d ? ' ativo' : ''}`}
                aria-pressed={dia === d} onClick={() => setParametros({ dia: d }, { replace: true })}>
                {d.slice(8, 10)}/{d.slice(5, 7)}
              </button>
            ))}
          </div>
          <div className="acoes">
            <button type="button" className="btn btn-primary" onClick={imprimir} disabled={!dados}>🖨️ Imprimir lista</button>
            <button type="button" className="btn btn-outline" onClick={() => setTentativa((t) => t + 1)}>Atualizar</button>
          </div>
        </div>

        {!pronto && (
          <div className="card no-print"><div className="state"><div className="spinner" />
            <p className="state-text">Calculando… o servidor pode levar até um minuto para acordar.</p></div></div>
        )}
        {pronto && resultado.erro && <p className="alert alert-error no-print">{resultado.erro}</p>}

        {dados && (
          <div className="papel-moldura">
            <div ref={papelRef} className="papel">
              <h2 className="papel-titulo">Atletas suspensos · {rotuloDoDia(dia)}</h2>
              <p className="papel-sub">Jogos Estudantis 2026 · {dados.total} {dados.total === 1 ? 'registro' : 'registros'}</p>
              {dados.locais.length === 0 && <p className="papel-vazio">Nenhum jogo neste dia.</p>}
              {dados.locais.map((local) => (
                <section key={local.local_id ?? 0} className="papel-secao">
                  <h3>📍 {local.local_nome}</h3>
                  <SuspensosDoLocal suspensos={local.suspensos} />
                </section>
              ))}
              <AvisoDaLista dados={dados} geradoEm={resultado.geradoEm} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ImprimirSuspensos;
