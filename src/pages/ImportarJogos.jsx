import { useState } from 'react';
import { previaImportacao, importarJogos } from '../services/importacaoJogos';
import { dataEHora } from '../services/datas';

// Importação dos jogos da fase de grupos por CSV (só ADMIN). Primeiro a
// prévia, que não grava nada; depois a importação, que o servidor refaz do
// zero numa transação única. Linha com erro não entra; aviso não bloqueia.
// Reimportar o mesmo arquivo não duplica: o jogo que já existe é reconhecido
// pela competição, pelas duas equipes e pela data e hora.

const COLUNAS = [
  'Modalidade', 'Categoria', 'Gênero', 'Grupo', 'Equipe 1', 'Equipe 2',
  'Data', 'Hora', 'Local', 'Rodada', 'Árbitro'
];

const SITUACAO = {
  NOVA: { rotulo: 'Nova', classe: 'badge-success' },
  EXISTENTE: { rotulo: 'Já existe', classe: '' },
  DUPLICADA: { rotulo: 'Repetida no arquivo', classe: '' },
  ERRO: { rotulo: 'Erro: não entra', classe: 'badge-suspenso' }
};

// O Excel em português costuma salvar o CSV em Windows-1252, não em UTF-8.
// Tenta UTF-8 a sério e, se o arquivo não for, lê como Windows-1252.
const lerArquivo = async (arquivo) => {
  const bytes = await arquivo.arrayBuffer();
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    return new TextDecoder('windows-1252').decode(bytes);
  }
};

const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;

function ImportarJogos() {
  const [arquivo, setArquivo] = useState(null);   // { nome, texto }
  const [analise, setAnalise] = useState(null);   // resposta da prévia ou da importação
  const [importado, setImportado] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [aviso, setAviso] = useState(null);

  const escolher = async (evento) => {
    const escolhido = evento.target.files?.[0];
    evento.target.value = '';
    if (!escolhido) return;

    setAviso(null);
    setAnalise(null);
    setImportado(false);
    setCarregando(true);

    try {
      const texto = await lerArquivo(escolhido);
      setArquivo({ nome: escolhido.name, texto });
      setAnalise(await previaImportacao(texto));
    } catch (falha) {
      setArquivo(null);
      setAviso({ tipo: 'error', texto: falha.mensagem || 'Não foi possível ler o arquivo.' });
    } finally {
      setCarregando(false);
    }
  };

  const importar = async () => {
    setCarregando(true);
    setAviso(null);
    try {
      const resultado = await importarJogos(arquivo.texto);
      setAnalise(resultado);
      setImportado(true);
      setAviso({ tipo: 'success', texto: resultado.mensagem });
    } catch (falha) {
      setAviso({ tipo: 'error', texto: falha.mensagem });
    } finally {
      setCarregando(false);
    }
  };

  const recomecar = () => {
    setArquivo(null);
    setAnalise(null);
    setImportado(false);
    setAviso(null);
  };

  const resumo = analise?.resumo;

  return (
    <div className="page">
      <div className="container-lg">
        <header className="page-header">
          <p className="eyebrow">Agenda</p>
          <h1 className="page-title">Importar jogos</h1>
          <p className="page-subtitle">
            Carregue a lista de jogos da fase de grupos em CSV. Primeiro aparece a prévia, linha
            a linha, e nada é gravado até você confirmar. Linha com erro não entra; aviso não
            impede a importação.
          </p>
        </header>

        {aviso && <p className={`alert alert-${aviso.tipo} mb-lg`}>{aviso.texto}</p>}

        <section className="card mb-lg">
          <div className="card-body">
            <h2 className="card-title">Arquivo</h2>
            <p className="form-hint">
              Colunas, nesta ou em qualquer ordem, com o cabeçalho na primeira linha:{' '}
              <strong>{COLUNAS.join(', ')}</strong>. Separador ponto e vírgula (o do Excel) ou
              vírgula. Escola pelo nome ou por um apelido cadastrado, sem diferença de acento
              ou maiúscula. Data em DD/MM/AAAA e hora em HH:MM; sem as duas, o jogo entra sem
              agenda. Grupo e local são opcionais, mas o local precisa estar cadastrado.
              Modelo: <code>docs/modelo_importacao_jogos.csv</code>, no repositório do backend.
            </p>
            <div className="btn-row">
              <label className={`btn btn-primary ${carregando ? 'disabled' : ''}`}>
                {arquivo ? 'Escolher outro arquivo' : 'Escolher arquivo CSV'}
                <input
                  type="file"
                  accept=".csv,text/csv,text/plain"
                  onChange={escolher}
                  disabled={carregando}
                  hidden
                />
              </label>
              {arquivo && <span className="text-soft">{arquivo.nome}</span>}
            </div>
            {carregando && <p className="form-hint">Analisando...</p>}
          </div>
        </section>

        {resumo && (
          <section className="card mb-lg">
            <div className="card-body">
              <h2 className="card-title">{importado ? 'Resultado da importação' : 'Prévia'}</h2>
              <p>
                {plural(resumo.linhas, 'linha', 'linhas')}:{' '}
                <strong>
                  {plural(resumo.novas, importado ? 'jogo importado' : 'jogo novo',
                    importado ? 'jogos importados' : 'jogos novos')}
                </strong>
                , {plural(resumo.existentes, 'já existia', 'já existiam')}
                , {plural(resumo.duplicadas, 'repetida no arquivo', 'repetidas no arquivo')}
                , <span className={resumo.erros ? 'text-danger' : ''}>
                  {plural(resumo.erros, 'com erro', 'com erro')}
                </span>
                {' '}e {plural(resumo.com_avisos, 'com aviso', 'com aviso')}.
                {resumo.numeros_a_preencher > 0 && (
                  <>
                    {' '}<strong>
                      {plural(resumo.numeros_a_preencher,
                        importado ? 'jogo que já existia ganhou o Nº Tabela' : 'jogo que já existe vai ganhar o Nº Tabela',
                        importado ? 'jogos que já existiam ganharam o Nº Tabela' : 'jogos que já existem vão ganhar o Nº Tabela')}
                    </strong>.
                  </>
                )}
              </p>
              <p className="form-hint">
                Os jogos novos de cada competição são numerados por data e hora, depois dos que
                ela já tem. Jogo que já existe (mesma competição, mesmas equipes, mesma data e
                hora) não é alterado — só ganha o Nº Tabela (coluna opcional), se ainda estiver sem.
              </p>

              {!importado && (
                <div className="btn-row">
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={importar}
                    disabled={carregando || (resumo.novas === 0 && !resumo.numeros_a_preencher)}
                  >
                    {resumo.novas === 0 && !resumo.numeros_a_preencher && 'Nada novo para importar'}
                    {resumo.novas > 0 && `Importar ${plural(resumo.novas, 'jogo', 'jogos')}`}
                    {resumo.novas === 0 && resumo.numeros_a_preencher > 0
                      && `Preencher o Nº Tabela de ${plural(resumo.numeros_a_preencher, 'jogo', 'jogos')}`}
                  </button>
                  <button type="button" className="btn btn-secondary" onClick={recomecar} disabled={carregando}>
                    Cancelar
                  </button>
                </div>
              )}
              {importado && (
                <div className="btn-row">
                  <button type="button" className="btn btn-secondary" onClick={recomecar}>
                    Importar outro arquivo
                  </button>
                </div>
              )}
            </div>

            <div className="table-wrap">
              <table className="table-sge compact">
                <thead>
                  <tr>
                    <th>Linha</th>
                    <th className="text-left">Situação</th>
                    <th>Jogo nº</th>
                    <th>Nº Tabela</th>
                    <th className="text-left">Competição</th>
                    <th>Grupo</th>
                    <th className="text-left">Confronto</th>
                    <th>Data e hora</th>
                    <th className="text-left">Local</th>
                    <th className="text-left">Erros e avisos</th>
                  </tr>
                </thead>
                <tbody>
                  {analise.linhas.map((linha) => {
                    const situacao = SITUACAO[linha.situacao] || { rotulo: linha.situacao, classe: '' };
                    const erro = linha.situacao === 'ERRO';
                    return (
                      <tr key={linha.linha} className={erro ? 'row-suspenso' : ''}>
                        <td>{linha.linha}</td>
                        <td className="text-left">
                          <span className={`badge ${situacao.classe}`}>
                            {importado && linha.situacao === 'NOVA' ? 'Importado' : situacao.rotulo}
                          </span>
                        </td>
                        <td>{linha.numero_jogo ?? '—'}</td>
                        <td>
                          {linha.numero_tabela ?? '—'}
                          {linha.preencher_numero && <span className="badge badge-accent">{importado ? 'preenchido' : 'preencher'}</span>}
                        </td>
                        <td className="text-left">
                          {linha.competicao
                            || `${linha.valores.modalidade} ${linha.valores.categoria} ${linha.valores.genero}`}
                        </td>
                        <td>{linha.grupo || linha.valores.grupo || '—'}</td>
                        <td className="text-left">
                          {linha.equipe_1 || linha.valores.equipe_1} x {linha.equipe_2 || linha.valores.equipe_2}
                        </td>
                        <td>
                          {linha.data_hora
                            ? dataEHora(linha.data_hora)
                            : [linha.valores.data, linha.valores.hora].filter(Boolean).join(' ') || 'Sem data'}
                        </td>
                        <td className="text-left">{linha.local || linha.valores.local || '—'}</td>
                        <td className="text-left">
                          {linha.erros.map((texto) => (
                            <div key={texto} className="text-danger">{texto}</div>
                          ))}
                          {linha.avisos.map((texto) => (
                            <div key={texto} className="text-soft">⚠️ {texto}</div>
                          ))}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

export default ImportarJogos;
