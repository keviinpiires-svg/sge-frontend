import { useState, useEffect } from 'react';
import { useAuth } from '../context/useAuth';
import { listarInscritos, inscreverAtleta, removerInscricao } from '../services/inscricoes';
import { listarElegiveis } from '../services/equipes';

const LIMITE_COLETIVAS = 2;

// Elenco de uma equipe dentro da competição: abre a lista de inscritos e, para
// o administrador, permite inscrever e remover. Só busca do servidor quando é
// aberto, porque uma competição pode ter dez equipes na tela.
function ElencoEquipe({ equipe, competicao }) {
  const { isAdmin } = useAuth();

  const [aberto, setAberto] = useState(false);
  const [recarga, setRecarga] = useState(0);
  const [elenco, setElenco] = useState(null);

  const [painelAberto, setPainelAberto] = useState(false);
  const [elegiveis, setElegiveis] = useState(null);
  const [atletaId, setAtletaId] = useState('');
  const [camisa, setCamisa] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [erroForm, setErroForm] = useState('');
  const [aviso, setAviso] = useState('');

  const chave = `${equipe.id}:${recarga}`;
  const pronto = elenco?.chave === chave;
  const inscritos = pronto ? elenco.dados.atletas : [];
  const erro = pronto ? elenco.erro : '';
  const total = pronto ? elenco.dados.total_inscritos : equipe.total_inscritos;

  useEffect(() => {
    if (!aberto) return;

    let ativo = true;

    listarInscritos(equipe.id)
      .then((dados) => {
        if (ativo) setElenco({ chave, dados, erro: '' });
      })
      .catch((falha) => {
        if (ativo) setElenco({ chave, dados: { atletas: [], total_inscritos: 0 }, erro: falha.mensagem });
      });

    return () => {
      ativo = false;
    };
  }, [aberto, chave, equipe.id]);

  useEffect(() => {
    if (!painelAberto) return;

    let ativo = true;

    listarElegiveis(equipe.id)
      .then((dados) => {
        if (ativo) setElegiveis({ chave, lista: dados.elegiveis });
      })
      .catch((falha) => {
        if (ativo) setErroForm(falha.mensagem);
      });

    return () => {
      ativo = false;
    };
  }, [painelAberto, chave, equipe.id]);

  const lotada = competicao.max_atletas !== null && total >= competicao.max_atletas;

  const inscrever = async (e) => {
    e.preventDefault();
    setErroForm('');
    setAviso('');
    setSalvando(true);

    try {
      const resposta = await inscreverAtleta({
        equipe_id: equipe.id,
        atleta_id: Number(atletaId),
        numero_camisa: camisa || null
      });

      setAviso(resposta.aviso || `Inscrito. A equipe tem ${resposta.total_inscritos} atleta(s).`);
      setAtletaId('');
      setCamisa('');
      setRecarga((n) => n + 1);
    } catch (falha) {
      setErroForm(falha.mensagem);
    } finally {
      setSalvando(false);
    }
  };

  const remover = async (inscrito) => {
    const confirmado = window.confirm(`Remover ${inscrito.nome} do elenco de ${equipe.escola_nome}?`);
    if (!confirmado) return;

    setErroForm('');
    setAviso('');

    try {
      await removerInscricao(inscrito.inscricao_id);
      setAviso(`${inscrito.nome} saiu do elenco.`);
      setRecarga((n) => n + 1);
    } catch (falha) {
      setErroForm(falha.mensagem);
    }
  };

  const listaElegiveis = elegiveis?.chave === chave ? elegiveis.lista : null;

  return (
    <div className="elenco">
      <button
        type="button"
        className="elenco-cabecalho"
        onClick={() => setAberto((v) => !v)}
        aria-expanded={aberto}
      >
        <span className="elenco-escola">{equipe.escola_nome}</span>
        <span className="elenco-contador">
          {competicao.max_atletas ? `${total}/${competicao.max_atletas}` : total} atletas
        </span>
        <span aria-hidden="true">{aberto ? '▾' : '▸'}</span>
      </button>

      {aberto && (
        <div className="elenco-corpo">
          {!pronto && <p className="form-hint">Carregando elenco...</p>}
          {pronto && erro && <p className="alert alert-error" style={{ margin: 0 }}>{erro}</p>}
          {erroForm && <p className="alert alert-error" style={{ margin: 0 }}>{erroForm}</p>}
          {aviso && <p className="alert alert-success" style={{ margin: 0 }}>{aviso}</p>}

          {pronto && !erro && inscritos.length === 0 && (
            <p className="form-hint">Nenhum atleta inscrito nesta equipe.</p>
          )}

          {pronto && inscritos.length > 0 && (
            <ul className="elenco-lista">
              {inscritos.map((inscrito) => (
                <li key={inscrito.inscricao_id}>
                  <span className="elenco-camisa">{inscrito.numero_camisa ?? '—'}</span>
                  <span className="elenco-nome">{inscrito.nome}</span>
                  <span className="elenco-meta">{inscrito.ano_nascimento}</span>
                  {isAdmin && (
                    <button
                      type="button"
                      className="btn btn-danger btn-sm"
                      onClick={() => remover(inscrito)}
                    >
                      Remover
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}

          {isAdmin && !painelAberto && (
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => setPainelAberto(true)}
              disabled={lotada}
            >
              {lotada ? `Elenco completo (${competicao.max_atletas})` : '+ Inscrever atleta'}
            </button>
          )}

          {isAdmin && painelAberto && (
            <form onSubmit={inscrever} className="form elenco-form">
              <div className="form-linha">
                <div className="form-group">
                  <label className="form-label" htmlFor={`atleta-${equipe.id}`}>Atleta</label>
                  <select
                    id={`atleta-${equipe.id}`}
                    className="form-control"
                    value={atletaId}
                    onChange={(e) => setAtletaId(e.target.value)}
                    required
                  >
                    <option value="">
                      {listaElegiveis === null ? 'Carregando...' : 'Selecione o atleta'}
                    </option>
                    {(listaElegiveis || []).map((atleta) => (
                      <option key={atleta.id} value={atleta.id}>
                        {atleta.nome} ({atleta.ano_nascimento})
                        {atleta.competicoes_coletivas >= LIMITE_COLETIVAS
                          ? ' — já em 2 coletivas'
                          : ''}
                      </option>
                    ))}
                  </select>

                  {listaElegiveis !== null && listaElegiveis.length === 0 && (
                    <span className="form-hint">
                      Nenhum atleta de {equipe.escola_nome} atende à idade e ao sexo desta competição.
                      Cadastre o atleta primeiro.
                    </span>
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor={`camisa-${equipe.id}`}>
                    Camisa <span className="form-hint">(opcional)</span>
                  </label>
                  <input
                    id={`camisa-${equipe.id}`}
                    className="form-control"
                    type="number"
                    min="1"
                    max="99"
                    value={camisa}
                    onChange={(e) => setCamisa(e.target.value)}
                  />
                </div>
              </div>

              <div className="acoes" style={{ justifyContent: 'flex-start' }}>
                <button type="submit" className="btn btn-primary btn-sm" disabled={salvando || !atletaId}>
                  {salvando ? 'Inscrevendo...' : 'Inscrever'}
                </button>
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={() => { setPainelAberto(false); setErroForm(''); }}
                >
                  Fechar
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}

export default ElencoEquipe;
