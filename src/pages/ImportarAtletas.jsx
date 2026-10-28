import { useEffect, useMemo, useState } from 'react';
import { previaAtletas, confirmarAtletas } from '../services/importacaoAtletas';
import { listarEscolas } from '../services/escolas';

// Importação de atletas por CSV (só ADMIN), no molde da de jogos: primeiro a
// prévia, que não grava nada; depois o confirmar, que o servidor refaz numa
// transação única e grava só as linhas OK. RG já cadastrado é pulado e o
// atleta existente nunca muda. Com linha em erro, gravar as OK é escolha
// explícita. A tabela não mostra RG nem nascimento: não fazem falta aqui.

const COLUNAS = ['Escola', 'Nome', 'RG', 'Nascimento', 'Gênero', 'Modalidade', 'Categoria'];

const SITUACAO = {
  OK: { rotulo: 'OK', classe: 'badge-success' },
  AVISO: { rotulo: 'Aviso: pulada', classe: 'badge-accent' },
  ERRO: { rotulo: 'Erro: não entra', classe: 'badge-suspenso' }
};

const FILTROS = [['TODOS', 'Todos'], ['OK', 'OK'], ['AVISO', 'Aviso'], ['ERRO', 'Erro']];

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

const semAcento = (texto) => texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().trim();

// A primeira linha tem a coluna Escola? Sem ela, a escola vem do seletor.
const temColunaEscola = (texto) => {
  const cabecalho = texto.replace(/^\uFEFF/, '').split(/\r?\n/, 1)[0] || '';
  return cabecalho.split(/[;,\t]/).map((c) => semAcento(c.replace(/"/g, ''))).includes('ESCOLA');
};

// Modelo vazio, só com o cabeçalho; o BOM faz o Excel abrir os acentos certos
const baixarModelo = () => {
  const blob = new Blob([`\uFEFF${COLUNAS.join(';')}\r\n`], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'modelo_importacao_atletas.csv';
  link.click();
  URL.revokeObjectURL(url);
};

const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;

function ImportarAtletas() {
  const [arquivo, setArquivo] = useState(null);   // { nome, texto, comEscola }
  const [escolas, setEscolas] = useState([]);
  const [escolaId, setEscolaId] = useState('');
  const [analise, setAnalise] = useState(null);   // resposta da prévia ou do confirmar
  const [importado, setImportado] = useState(false);
  const [apenasOk, setApenasOk] = useState(false);
  const [filtro, setFiltro] = useState('TODOS');
  const [carregando, setCarregando] = useState(false);
  const [aviso, setAviso] = useState(null);

  useEffect(() => {
    listarEscolas()
      .then((lista) => setEscolas([...lista].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))))
      .catch(() => setAviso({ tipo: 'error', texto: 'Não foi possível carregar a lista de escolas.' }));
  }, []);

  const gerarPrevia = async (texto, escola) => {
    setCarregando(true);
    setAviso(null);
    setAnalise(null);
    setImportado(false);
    setApenasOk(false);
    setFiltro('TODOS');
    try {
      setAnalise(await previaAtletas(texto, { escolaId: escola }));
    } catch (falha) {
      setAviso({ tipo: 'error', texto: falha.mensagem || 'Não foi possível analisar o arquivo.' });
    } finally {
      setCarregando(false);
    }
  };

  const escolher = async (evento) => {
    const escolhido = evento.target.files?.[0];
    evento.target.value = '';
    if (!escolhido) return;

    setAviso(null);
    setAnalise(null);
    setImportado(false);

    try {
      const texto = await lerArquivo(escolhido);
      const comEscola = temColunaEscola(texto);
      setArquivo({ nome: escolhido.name, texto, comEscola });
      // Planilha de uma escola só: a prévia espera a escola ser escolhida
      if (comEscola) await gerarPrevia(texto);
      else if (escolaId) await gerarPrevia(texto, escolaId);
    } catch (falha) {
      setArquivo(null);
      setAviso({ tipo: 'error', texto: falha.mensagem || 'Não foi possível ler o arquivo.' });
    }
  };

  const trocarEscola = async (evento) => {
    const id = evento.target.value;
    setEscolaId(id);
    setAnalise(null);
    if (arquivo && !arquivo.comEscola && id) await gerarPrevia(arquivo.texto, id);
  };

  const confirmar = async () => {
    setCarregando(true);
    setAviso(null);
    try {
      const resultado = await confirmarAtletas(arquivo.texto, {
        escolaId: arquivo.comEscola ? undefined : escolaId,
        apenasOk
      });
      setAnalise(resultado);
      setImportado(true);
      setFiltro('TODOS');
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
    setApenasOk(false);
    setAviso(null);
  };

  const resumo = analise?.resumo;
  const linhas = useMemo(
    () => (analise?.linhas || []).filter((l) => filtro === 'TODOS' || l.situacao === filtro),
    [analise, filtro]
  );
  const contagem = (situacao) => (analise?.linhas || []).filter((l) => situacao === 'TODOS' || l.situacao === situacao).length;
  const podeConfirmar = resumo && resumo.ok > 0 && (resumo.erros === 0 || apenasOk) && !carregando;

  return (
    <div className="page">
      <div className="container-lg">
        <header className="page-header">
          <p className="eyebrow">Cadastro</p>
          <h1 className="page-title">Importar atletas</h1>
          <p className="page-subtitle">
            Carregue a planilha de atletas em CSV. Primeiro aparece a prévia, linha a linha, e nada
            é gravado até você confirmar. Cada linha é um aluno numa modalidade: o mesmo aluno pode
            aparecer em várias linhas. RG já cadastrado é pulado, sem alterar o atleta existente.
          </p>
        </header>

        {aviso && <p className={`alert alert-${aviso.tipo} mb-lg`}>{aviso.texto}</p>}

        <section className="card mb-lg">
          <div className="card-body">
            <h2 className="card-title">Arquivo</h2>
            <p className="form-hint">
              Colunas, com o cabeçalho na primeira linha: <strong>{COLUNAS.join('; ')}</strong>.
              Separador ponto e vírgula, UTF-8 ou o CSV do Excel. <strong>Escola</strong> é opcional:
              sem ela, escolha a escola abaixo (planilha de uma escola só). <strong>Categoria</strong> é
              opcional: em branco, vale a categoria do atleta pela idade. Nascimento em DD/MM/AAAA e
              gênero M ou F. Escola pelo nome ou por um apelido cadastrado, sem diferença de acento ou
              maiúscula.
            </p>
            <div className="btn-row">
              <label className={`btn btn-primary ${carregando ? 'disabled' : ''}`}>
                {arquivo ? 'Escolher outro arquivo' : 'Escolher arquivo CSV'}
                <input type="file" accept=".csv,text/csv,text/plain" onChange={escolher} disabled={carregando} hidden />
              </label>
              <button type="button" className="btn btn-outline" onClick={baixarModelo}>
                Baixar modelo CSV vazio
              </button>
              {arquivo && <span className="text-soft">{arquivo.nome}</span>}
            </div>

            {arquivo && !arquivo.comEscola && (
              <div className="form-group mt-lg">
                <label className="form-label" htmlFor="escola-importacao">
                  A planilha não tem a coluna Escola: de qual escola são estes atletas?
                </label>
                <select id="escola-importacao" className="form-control" value={escolaId}
                  onChange={trocarEscola} disabled={carregando}>
                  <option value="">Escolha a escola</option>
                  {escolas.map((e) => <option key={e.id} value={e.id}>{e.nome}</option>)}
                </select>
              </div>
            )}

            {carregando && <p className="form-hint">Analisando...</p>}
          </div>
        </section>

        {resumo && (
          <section className="card mb-lg">
            <div className="card-body">
              <h2 className="card-title">{importado ? 'Resultado da importação' : 'Prévia'}</h2>

              {importado && analise.final ? (
                <p>
                  <strong>{plural(analise.final.criados, 'atleta criado', 'atletas criados')}</strong>
                  {' '}({plural(analise.final.inscricoes, 'inscrição', 'inscrições')}),{' '}
                  {plural(analise.final.pulados, 'linha pulada', 'linhas puladas')} e{' '}
                  <span className={analise.final.com_erro ? 'text-danger' : ''}>
                    {plural(analise.final.com_erro, 'linha com erro', 'linhas com erro')}
                  </span>.
                </p>
              ) : (
                <p>
                  {plural(resumo.linhas, 'linha', 'linhas')}:{' '}
                  <strong>{resumo.ok} OK</strong> ({plural(resumo.atletas_novos, 'atleta novo', 'atletas novos')},{' '}
                  {plural(resumo.inscricoes, 'inscrição', 'inscrições')}),{' '}
                  {plural(resumo.avisos, 'aviso (pulada)', 'avisos (puladas)')} e{' '}
                  <span className={resumo.erros ? 'text-danger' : ''}>{plural(resumo.erros, 'erro', 'erros')}</span>.
                </p>
              )}

              {!importado && (
                <>
                  {resumo.erros > 0 && resumo.ok > 0 && (
                    <label className="linha-checks">
                      <input type="checkbox" checked={apenasOk} onChange={(e) => setApenasOk(e.target.checked)} />
                      {' '}Importar só as linhas OK ({plural(resumo.erros, 'linha com erro fica', 'linhas com erro ficam')} de fora)
                    </label>
                  )}
                  <div className="btn-row">
                    <button type="button" className="btn btn-primary" onClick={confirmar} disabled={!podeConfirmar}>
                      {resumo.ok === 0
                        ? 'Nada para importar'
                        : `Confirmar: ${plural(resumo.atletas_novos, 'atleta', 'atletas')}, ${plural(resumo.inscricoes, 'inscrição', 'inscrições')}`}
                    </button>
                    <button type="button" className="btn btn-secondary" onClick={recomecar} disabled={carregando}>
                      Cancelar
                    </button>
                  </div>
                  {resumo.erros > 0 && resumo.ok > 0 && !apenasOk && (
                    <p className="form-hint">
                      Há linhas com erro: corrija o arquivo e carregue de novo, ou marque
                      &quot;importar só as linhas OK&quot;.
                    </p>
                  )}
                </>
              )}
              {importado && (
                <div className="btn-row">
                  <button type="button" className="btn btn-secondary" onClick={recomecar}>Importar outro arquivo</button>
                </div>
              )}

              <div className="btn-row mt-lg" role="group" aria-label="Filtrar linhas">
                {FILTROS.map(([valor, rotulo]) => (
                  <button key={valor} type="button" aria-pressed={filtro === valor}
                    className={`btn btn-sm ${filtro === valor ? 'btn-primary' : 'btn-outline'}`}
                    onClick={() => setFiltro(valor)}>
                    {rotulo} ({contagem(valor)})
                  </button>
                ))}
              </div>
            </div>

            <div className="table-wrap">
              <table className="table-sge compact">
                <thead>
                  <tr>
                    <th>Linha</th>
                    <th className="text-left">Situação</th>
                    <th className="text-left">Atleta</th>
                    <th className="text-left">Escola</th>
                    <th className="text-left">Competição</th>
                    <th className="text-left">Motivo</th>
                  </tr>
                </thead>
                <tbody>
                  {linhas.length === 0 && (
                    <tr><td colSpan={6} className="text-soft">Nenhuma linha neste filtro.</td></tr>
                  )}
                  {linhas.map((linha) => {
                    const situacao = SITUACAO[linha.situacao] || { rotulo: linha.situacao, classe: '' };
                    return (
                      <tr key={linha.linha} className={linha.situacao === 'ERRO' ? 'row-suspenso' : ''}>
                        <td>{linha.linha}</td>
                        <td className="text-left">
                          <span className={`badge ${situacao.classe}`}>
                            {importado && linha.situacao === 'OK' ? 'Importado' : situacao.rotulo}
                          </span>
                        </td>
                        <td className="text-left">{linha.valores.nome || '—'}</td>
                        <td className="text-left">{linha.escola || linha.valores.escola || '—'}</td>
                        <td className="text-left">
                          {linha.competicao
                            ? <>{linha.competicao}{linha.categoria_pela_idade && <span className="text-soft"> (pela idade)</span>}</>
                            : [linha.valores.modalidade, linha.valores.categoria].filter(Boolean).join(' ') || '—'}
                        </td>
                        <td className="text-left">
                          {linha.erros.map((texto) => <div key={texto} className="text-danger">{texto}</div>)}
                          {linha.avisos.map((texto) => <div key={texto} className="text-soft">⚠️ {texto}</div>)}
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

export default ImportarAtletas;
