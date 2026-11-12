import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/useAuth';
import { listarEscolas } from '../services/escolas';
import {
  listarAtletasPorEquipe, buscarAtletasPorNome, buscarAtletaPorId, atualizarAtleta, excluirAtleta
} from '../services/atletas';
import { normalizar } from '../components/agendaTextos';
import { soAData, paraCampoData } from '../services/datas';
import PainelAtleta from '../components/PainelAtleta';

// Busca por nome: sem maiúscula, sem acento, com os espaços repetidos juntos ("joao" acha "JOÃO")
const paraBusca = (texto) => normalizar(texto).replace(/\s+/g, ' ');
const MINIMO_EM_TODAS_AS_ESCOLAS = 3; // letras, quando não há escola escolhida
const ESPERA_DA_BUSCA = 300; // ms depois da última tecla

function IconeLupa() {
  return (
    <svg className="busca-nome-icone" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <line x1="16.5" y1="16.5" x2="21" y2="21" />
    </svg>
  );
}

function ListaAtletas() {
  const [escolaId, setEscolaId] = useState('');
  const [atletas, setAtletas] = useState([]);
  // Busca por nome: o que está digitado e o que vale (300 ms depois da última tecla)
  const [nome, setNome] = useState('');
  const [nomeValido, setNomeValido] = useState('');
  // Resultado da busca em todas as escolas (sem escola escolhida), com o termo a que pertence
  const [resultadoGlobal, setResultadoGlobal] = useState({ termo: '', atletas: [], mais: false, erro: '' });
  // De que escola é a lista carregada em "atletas" (a seleção pode mudar sem clicar em Buscar)
  const [escolaDaLista, setEscolaDaLista] = useState('');
  const [versaoGlobal, setVersaoGlobal] = useState(0); // sobe para buscar de novo (depois de editar ou excluir)
  const [buscou, setBuscou] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [atletaEmEdicao, setAtletaEmEdicao] = useState(null);
  // Atleta cujas competições estão abertas no painel (clique no nome ou na linha)
  const [atletaAberto, setAtletaAberto] = useState(null);
  const fecharPainel = useCallback(() => setAtletaAberto(null), []);
  const { isAdmin } = useAuth();
  const [escolas, setEscolas] = useState([]);
  const [carregandoEscolas, setCarregandoEscolas] = useState(true);

  useEffect(() => {
    let ativo = true;

    listarEscolas()
      .then((data) => {
        if (ativo) setEscolas(data);
      })
      .catch((error) => {
        console.error('Erro ao buscar escolas:', error);
      })
      .finally(() => {
        if (ativo) setCarregandoEscolas(false);
      });

    return () => {
      ativo = false;
    };
  }, []);

  // Filtra enquanto digita: o texto só vale 300 ms depois da última tecla
  useEffect(() => {
    const espera = setTimeout(() => setNomeValido(nome), ESPERA_DA_BUSCA);
    return () => clearTimeout(espera);
  }, [nome]);

  const termo = paraBusca(nomeValido);
  const termoBruto = nomeValido.replace(/\s+/g, ' ').trim();
  // Sem escola escolhida, a busca vai ao servidor (a partir de 3 letras)
  const buscaEmTodas = !escolaId && termo.length >= MINIMO_EM_TODAS_AS_ESCOLAS;

  useEffect(() => {
    if (!buscaEmTodas) return undefined;
    let ativo = true;

    buscarAtletasPorNome(termoBruto)
      .then((dados) => {
        if (ativo) setResultadoGlobal({ termo: termoBruto, atletas: dados.atletas, mais: dados.mais_resultados, erro: '' });
      })
      .catch((falha) => {
        if (ativo) {
          setResultadoGlobal({ termo: termoBruto, atletas: [], mais: false, erro: falha.mensagem || 'Não foi possível buscar os atletas.' });
        }
      });

    return () => { ativo = false; };
  }, [buscaEmTodas, termoBruto, versaoGlobal]);

  // Escola escolhida e nome digitado sem a lista dela carregada: carrega sozinha (sem clicar em Buscar)
  useEffect(() => {
    if (!escolaId || !termo || escolaDaLista === escolaId) return undefined;
    let ativo = true;

    listarAtletasPorEquipe(escolaId)
      .then((dados) => { if (ativo) setAtletas(dados); })
      .catch((error) => {
        console.error('Erro ao buscar atletas:', error);
        if (ativo) setAtletas([]);
      })
      .finally(() => {
        if (ativo) {
          setEscolaDaLista(escolaId);
          setBuscou(true);
        }
      });

    return () => { ativo = false; };
  }, [escolaId, termo, escolaDaLista]);

  const limparBusca = () => {
    setNome('');
    setNomeValido('');
  };

  const buscarAtletas = async () => {
    if (!escolaId) {
      alert('Por favor, selecione a escola.');
      return;
    }

    setCarregando(true);
    try {
      setAtletas(await listarAtletasPorEquipe(escolaId));
    } catch (error) {
      console.error('Erro ao buscar atletas:', error);
      setAtletas([]);
    } finally {
      setEscolaDaLista(escolaId);
      setBuscou(true);
      setCarregando(false);
    }
  };

  const formatarData = (dataStr) => soAData(dataStr);

  const formatarDataParaInput = (dataStr) => paraCampoData(dataStr);

  // A lista pública não traz o RG de propósito; para editar é preciso buscar o
  // atleta inteiro na rota de ADMIN, senão o RG volta vazio e o backend recusa.
  const handleEditar = async (atleta) => {
    try {
      const completo = await buscarAtletaPorId(atleta.id);
      setAtletaEmEdicao({
        ...completo,
        data_nascimento: formatarDataParaInput(completo.data_nascimento)
      });
    } catch (error) {
      console.error('Erro ao buscar o atleta:', error);
      alert(error.mensagem);
    }
  };

  const handleSalvarEdicao = async (e) => {
    e.preventDefault();
    try {
      await atualizarAtleta(atletaEmEdicao.id, atletaEmEdicao);
      alert('Atleta atualizado com sucesso!');
      setAtletaEmEdicao(null);
      if (escolaId) buscarAtletas(); // Atualiza a tabela chamando a API de novo
      setVersaoGlobal((v) => v + 1); // e a busca por nome, se for ela que está na tela
    } catch (error) {
      console.error('Erro ao salvar edicao:', error);
      alert(error.mensagem);
    }
  };

  const handleExcluir = async (id) => {
    if (window.confirm('Tem certeza que deseja excluir este atleta?')) {
      try {
        await excluirAtleta(id);
        alert('Atleta excluído com sucesso!');
        setAtletas(atletas.filter((atleta) => atleta.id !== id));
        setResultadoGlobal((atual) => ({ ...atual, atletas: atual.atletas.filter((atleta) => atleta.id !== id) }));
      } catch (error) {
        console.error('Erro ao excluir atleta:', error);
        alert(error.mensagem);
      }
    }
  };

  // ---- O que aparece na tabela ----
  // Com escola: a lista dela, filtrada pelo nome digitado. Sem escola e com 3 letras ou mais: o que
  // o servidor achou em todas as escolas (com a coluna Escola).
  const globalPronto = buscaEmTodas && resultadoGlobal.termo === termoBruto;
  const carregandoDaEscola = Boolean(escolaId) && Boolean(termo) && escolaDaLista !== escolaId;
  const buscandoEmTodas = (buscaEmTodas && !globalPronto) || carregandoDaEscola;
  const poucasLetras = !escolaId && termo.length > 0 && termo.length < MINIMO_EM_TODAS_AS_ESCOLAS;
  let atletasDaTabela = atletas;
  if (buscaEmTodas) {
    atletasDaTabela = globalPronto ? resultadoGlobal.atletas : [];
  } else if (escolaId && termo && !carregandoDaEscola) {
    atletasDaTabela = atletas.filter((atleta) => paraBusca(atleta.nome).includes(termo));
  }
  const mostrarTabela = !atletaEmEdicao && !poucasLetras && (buscaEmTodas || buscou || carregandoDaEscola);
  const comColunaEscola = buscaEmTodas;
  const rotuloQuantidade = (n) => `${n} ${n === 1 ? 'atleta encontrado' : 'atletas encontrados'}`;

  return (
    <div className="page">
      <div className="container">
        <header className="page-header">
          <p className="eyebrow">Atletas</p>
          <h1 className="page-title">Buscar Atletas por Equipe</h1>
          <p className="page-subtitle">Selecione a escola para listar os atletas cadastrados ou busque pelo nome do atleta.</p>
        </header>

        <div className="card" style={{ marginBottom: '24px' }}>
          <div className="card-body" style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <select
              className="form-control"
              value={escolaId}
              onChange={(e) => setEscolaId(e.target.value)}
              disabled={carregandoEscolas || escolas.length === 0}
              aria-label="Escola"
              style={{ flex: '1 1 200px', width: 'auto' }}
            >
              <option value="">
                {carregandoEscolas
                  ? 'Carregando escolas...'
                  : escolas.length === 0
                    ? 'Nenhuma escola cadastrada'
                    : 'Selecione a escola'}
              </option>
              {escolas.map((escola) => (
                <option key={escola.id} value={escola.id}>{escola.nome}</option>
              ))}
            </select>
            <button className="btn btn-primary busca-botao" onClick={buscarAtletas} disabled={carregando || !escolaId}>
              {carregando ? 'Buscando...' : '🔍 Buscar Atletas'}
            </button>

            <div className="busca-nome">
              <IconeLupa />
              <input
                type="text"
                inputMode="search"
                className="form-control busca-nome-campo"
                placeholder={escolaId ? 'Buscar por nome nesta escola' : 'Buscar por nome em todas as escolas'}
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                aria-label="Buscar por nome"
                autoComplete="off"
                maxLength={80}
              />
              {nome && (
                <button type="button" className="busca-nome-limpar" onClick={limparBusca} aria-label="Limpar a busca">
                  ✕
                </button>
              )}
            </div>
          </div>
        </div>

        {poucasLetras && !atletaEmEdicao && (
          <p className="text-soft" role="status">
            Digite pelo menos {MINIMO_EM_TODAS_AS_ESCOLAS} letras para buscar em todas as escolas, ou escolha uma escola.
          </p>
        )}

        {mostrarTabela && (
          <div className="card">
            {buscandoEmTodas ? (
              <div className="state state-compact" aria-busy="true">
                <div className="spinner" />
                <p className="state-text">Buscando...</p>
              </div>
            ) : buscaEmTodas && resultadoGlobal.erro ? (
              <div className="state state-error">
                <p className="state-title">Não foi possível buscar</p>
                <p className="state-text">{resultadoGlobal.erro}</p>
              </div>
            ) : atletasDaTabela.length > 0 ? (
              <>
              <p className="busca-resumo card-body" role="status" style={{ paddingBottom: 0 }}>
                {rotuloQuantidade(atletasDaTabela.length)}
                {buscaEmTodas && resultadoGlobal.mais && (
                  <span className="text-soft"> — mostrando só os primeiros {atletasDaTabela.length}: digite mais letras para refinar.</span>
                )}
              </p>
              <div className="table-wrap">
                <table className="table-sge" style={{ minWidth: comColunaEscola ? '720px' : '600px' }}>
                  <thead>
                    <tr>
                      <th className="text-left">Nome</th>
                      {comColunaEscola && <th className="text-left">Escola</th>}
                      {/* Sexo e nascimento só chegam para o ADMIN (pendência 19): o
                          público vê só o nome — são menores de idade */}
                      {isAdmin && <th>Sexo</th>}
                      {isAdmin && <th>Data de Nascimento</th>}
                      <th>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {atletasDaTabela.map((atleta) => (
                      <tr key={atleta.id} className="linha-atleta" onClick={() => setAtletaAberto(atleta)}>
                        <td className="text-left strong">
                          <button
                            type="button"
                            style={{ background: 'none', border: 0, padding: 0, font: 'inherit', color: 'inherit', textAlign: 'left', cursor: 'pointer' }}
                            onClick={(e) => { e.stopPropagation(); setAtletaAberto(atleta); }}
                            aria-label={`Ver competições de ${atleta.nome}`}
                          >
                            {atleta.nome}
                          </button>
                        </td>
                        {comColunaEscola && <td className="text-left text-soft">{atleta.escola_nome}</td>}
                        {/* O RG não aparece aqui: a lista é pública */}
                        {isAdmin && <td className="text-soft">{atleta.sexo === 'F' ? 'Feminino' : 'Masculino'}</td>}
                        {isAdmin && <td className="text-soft">{formatarData(atleta.data_nascimento)}</td>}
                        <td onClick={(e) => e.stopPropagation()}>
                          {isAdmin ? (
                            <div className="btn-group">
                              <button className="btn btn-outline btn-sm" onClick={() => handleEditar(atleta)}>Editar</button>
                              <button className="btn btn-danger btn-sm" onClick={() => handleExcluir(atleta.id)}>Excluir</button>
                            </div>
                          ) : (
                            <span className="text-muted">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              </>
            ) : (
              <div className="state">
                <div className="state-icon">🏃</div>
                <p className="state-title">Nenhum atleta encontrado</p>
                <p className="state-text">
                  {termo
                    ? `Nenhum atleta com "${termoBruto}" no nome${escolaId ? ' nesta escola' : ''}.`
                    : 'Não há atletas cadastrados para esta equipe.'}
                </p>
              </div>
            )}
          </div>
        )}

        {atletaAberto && (
          <PainelAtleta
            atleta={atletaAberto}
            escolaNome={atletaAberto.escola_nome || escolas.find((e) => String(e.id) === String(escolaId))?.nome}
            isAdmin={isAdmin}
            aoFechar={fecharPainel}
          />
        )}

        {atletaEmEdicao && (
          <div className="card card-highlight">
            <form onSubmit={handleSalvarEdicao} className="card-body form">
              <h3 className="card-title" style={{ margin: 0 }}>Editar Atleta</h3>

              <div className="form-group">
                <label className="form-label" htmlFor="edit-nome">Nome</label>
                <input
                  id="edit-nome"
                  className="form-control"
                  type="text"
                  value={atletaEmEdicao.nome || ''}
                  onChange={(e) => setAtletaEmEdicao({...atletaEmEdicao, nome: e.target.value})}
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label" htmlFor="edit-rg">RG</label>
                  <input
                    id="edit-rg"
                    className="form-control"
                    type="text"
                    maxLength={20}
                    value={atletaEmEdicao.rg || ''}
                    onChange={(e) => setAtletaEmEdicao({ ...atletaEmEdicao, rg: e.target.value })}
                    required
                  />
                  <span className="form-hint">Obrigatório e único: é o que identifica o atleta.</span>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="edit-sexo">Sexo</label>
                  <select
                    id="edit-sexo"
                    className="form-control"
                    value={atletaEmEdicao.sexo || ''}
                    onChange={(e) => setAtletaEmEdicao({ ...atletaEmEdicao, sexo: e.target.value })}
                    required
                  >
                    <option value="">Selecione</option>
                    <option value="M">Masculino</option>
                    <option value="F">Feminino</option>
                  </select>
                  <span className="form-hint">Define em quais competições o atleta pode entrar.</span>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label" htmlFor="edit-nascimento">Data de Nascimento</label>
                  <input
                    id="edit-nascimento"
                    className="form-control"
                    type="date"
                    value={atletaEmEdicao.data_nascimento || ''}
                    onChange={(e) => setAtletaEmEdicao({...atletaEmEdicao, data_nascimento: e.target.value})}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="edit-escola">Escola</label>
                  <select
                    id="edit-escola"
                    className="form-control"
                    value={atletaEmEdicao.escola_id || ''}
                    onChange={(e) => setAtletaEmEdicao({...atletaEmEdicao, escola_id: Number(e.target.value)})}
                    disabled={carregandoEscolas || escolas.length === 0}
                    required
                  >
                    <option value="">Selecione a escola</option>
                    {escolas.map((escola) => (
                      <option key={escola.id} value={escola.id}>{escola.nome}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="btn-row">
                <button type="button" className="btn btn-secondary" onClick={() => setAtletaEmEdicao(null)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">Salvar Alterações</button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

export default ListaAtletas;
