import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useReactToPrint } from 'react-to-print';
import { buscarSumulaPorJogo } from '../services/sumulas';
import FolhaFutsal from '../components/folhas/FolhaFutsal';
import FolhaBasquete from '../components/folhas/FolhaBasquete';
import FolhaVolei from '../components/folhas/FolhaVolei';
import FolhaHandebol from '../components/folhas/FolhaHandebol';
import FolhaBaleado from '../components/folhas/FolhaBaleado';

// A folha impressa segue os modelos em papel (docs/referencias/sumulas_modelos.md).
// Qual folha cada modalidade usa vem do backend, de src/config/folhasSumula.js:
// esta tela só escolhe o componente correspondente.
const FOLHAS = {
  FUTSAL: FolhaFutsal,
  BASQUETE: FolhaBasquete,
  VOLEI: FolhaVolei,
  HANDEBOL: FolhaHandebol,
  BALEADO: FolhaBaleado
};

function DetalhesSumula() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [carga, setCarga] = useState(null);
  // Em branco: mesma folha, sem os lançamentos — para levar à quadra.
  // ?em-branco=1 abre direto assim, para imprimir sem passar pela tela.
  const [busca, setBusca] = useSearchParams();
  const emBranco = busca.get('em-branco') === '1';
  const setEmBranco = (valor) => {
    const proximo = typeof valor === 'function' ? valor(emBranco) : valor;
    setBusca(proximo ? { 'em-branco': '1' } : {}, { replace: true });
  };

  const pronto = carga?.id === id;
  const sumula = pronto ? carga.dados : null;
  const erro = pronto ? carga.erro : '';

  const folhaRef = useRef(null);
  const imprimir = useReactToPrint({
    contentRef: folhaRef,
    documentTitle: `Sumula_Jogo_${sumula?.jogo?.numero_jogo || id}${emBranco ? '_em_branco' : ''}`,
    // margem 0 na página + margem própria na folha: é o que tira o cabeçalho
    // e o rodapé que o navegador imprime por conta própria.
    pageStyle: `
      @page { size: A4 portrait; margin: 0; }
      html, body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    `
  });

  useEffect(() => {
    let ativo = true;

    buscarSumulaPorJogo(id)
      .then((dados) => {
        if (ativo) setCarga({ id, dados, erro: '' });
      })
      .catch((falha) => {
        if (ativo) setCarga({ id, dados: null, erro: falha.mensagem });
      });

    return () => {
      ativo = false;
    };
  }, [id]);

  if (!pronto) {
    return (
      <div className="page"><div className="container-lg">
        <div className="card"><div className="state">
          <div className="spinner" />
          <p className="state-text">Carregando súmula...</p>
        </div></div>
      </div></div>
    );
  }

  if (erro) {
    return (
      <div className="page"><div className="container-lg">
        <div className="card"><div className="state state-error">
          <div className="state-icon">⚠️</div>
          <p className="state-title">Não foi possível carregar a súmula</p>
          <p className="state-text">{erro}</p>
        </div></div>
      </div></div>
    );
  }

  const { evento, jogo, equipes, folha, sets } = sumula;
  const Folha = FOLHAS[folha.tipo];

  return (
    <div className="page">
      <div className="container-lg">
        <div className="page-toolbar no-print">
          <button className="btn btn-outline" onClick={() => navigate(-1)}>← Voltar</button>

          <div className="acoes">
            <button
              type="button"
              className={`btn btn-sm ${emBranco ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setEmBranco((v) => !v)}
            >
              {emBranco ? 'Vendo: em branco' : 'Vendo: preenchida'}
            </button>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={imprimir}
              disabled={!Folha}
            >
              🖨️ Imprimir {emBranco ? 'em branco' : 'preenchida'}
            </button>
          </div>
        </div>

        {folha.provisoria && (
          <div className="alert alert-aviso mb-lg no-print">
            <p className="alert-titulo">⚠️ Folha provisória</p>
            <p className="alert-texto">
              {jogo.modalidade_nome} não tem folha oficial entre os modelos recebidos.
              Esta segue o desenho da do futsal, com a coluna de {folha.rotuloEstatistica?.toLowerCase()}
              {' '}no lugar dos gols — decisão de {folha.decididoEm}, a confirmar.
            </p>
          </div>
        )}

        {!Folha ? (
          <div className="card">
            <div className="state state-compact">
              <div className="state-icon">📄</div>
              <p className="state-title">A folha de {jogo.modalidade_nome} ainda não foi desenhada</p>
              <p className="state-text">
                Ela tem modelo próprio em papel e entra na fatia 6 — demais modalidades coletivas.
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* A folha tem o tamanho do papel (A4). Em tela estreita ela rola de
                lado dentro deste quadro, sem alargar a página */}
            <p className="folha-dica no-print">
              A folha está no tamanho do papel (A4). Arraste para o lado para ver a folha inteira.
            </p>
            <div className="folha-rolagem">
              <div ref={folhaRef} className={`folha-sumula print-area folha-tipo-${folha.tipo.toLowerCase()}`}>
                <Folha
                  evento={evento}
                  jogo={jogo}
                  equipes={equipes}
                  sets={sets}
                  folha={folha}
                  emBranco={emBranco}
                />
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default DetalhesSumula;
