import { useState, useEffect } from 'react';
import { atualizarJogo } from '../services/jogos';
import { listarLocais } from '../services/locais';
import { paraCampoDataHora } from '../services/datas';

// Marca ou muda a data, a hora e o local de um jogo AGENDADO — usado na tabela
// de jogos e no card do mata-mata, cujos jogos nascem sem agenda.
//
// O backend recusa (409) dois jogos no mesmo local com pouca diferença de
// horário e jogo que já começou. Nesses casos o formulário continua aberto,
// com a mensagem da API, para a pessoa escolher outro horário ali mesmo.
// Deixar os campos vazios volta o jogo para "A definir".
function FormAgendaJogo({ jogo, confronto, aoSalvar, aoCancelar }) {
  const [quando, setQuando] = useState(() => paraCampoDataHora(jogo.data_hora));
  const [localId, setLocalId] = useState(() => (jogo.local_id ? String(jogo.local_id) : ''));
  const [locais, setLocais] = useState([]);
  const [falhaLocais, setFalhaLocais] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  useEffect(() => {
    let ativo = true;

    listarLocais()
      .then((dados) => {
        if (ativo) setLocais(dados);
      })
      .catch(() => {
        if (ativo) setFalhaLocais(true);
      });

    return () => {
      ativo = false;
    };
  }, []);

  const salvar = async (e) => {
    e.preventDefault();
    setErro('');
    setSalvando(true);

    try {
      await atualizarJogo(jogo.id, {
        data_hora: quando,
        local_id: localId || null
      });
      aoSalvar(`Agenda do jogo nº ${jogo.numero_jogo} salva.`);
    } catch (falha) {
      setErro(falha.mensagem);
      setSalvando(false);
    }
  };

  const idQuando = `agenda-quando-${jogo.id}`;
  const idLocal = `agenda-local-${jogo.id}`;

  return (
    <form className="painel-wo" onSubmit={salvar}>
      <h3 className="secao-titulo" style={{ marginTop: 0 }}>
        Horário e local do jogo nº {jogo.numero_jogo}{confronto ? `: ${confronto}` : ''}
      </h3>

      {erro && <p className="alert alert-error">{erro}</p>}

      <div className="form-linha">
        <div className="form-group">
          <label className="form-label" htmlFor={idQuando}>Data e hora</label>
          <input
            id={idQuando}
            className="form-control"
            type="datetime-local"
            value={quando}
            onChange={(e) => setQuando(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor={idLocal}>Local</label>
          <select
            id={idLocal}
            className="form-control"
            value={localId}
            onChange={(e) => setLocalId(e.target.value)}
          >
            <option value="">A definir</option>
            {locais.map((local) => (
              <option key={local.id} value={local.id}>{local.nome}</option>
            ))}
          </select>
        </div>
      </div>

      {falhaLocais && (
        <p className="form-hint">Não foi possível carregar os locais. Tente reabrir o formulário.</p>
      )}

      <div className="acoes" style={{ justifyContent: 'flex-start' }}>
        <button type="submit" className="btn btn-primary btn-sm" disabled={salvando}>
          {salvando ? 'Salvando...' : 'Salvar'}
        </button>
        <button type="button" className="btn btn-outline btn-sm" onClick={aoCancelar} disabled={salvando}>
          Cancelar
        </button>
      </div>

      <p className="form-hint">
        Deixe a data ou o local em branco para voltar o jogo para &quot;A definir&quot;. Dois jogos
        no mesmo local precisam de um intervalo mínimo entre os horários.
      </p>
    </form>
  );
}

export default FormAgendaJogo;
