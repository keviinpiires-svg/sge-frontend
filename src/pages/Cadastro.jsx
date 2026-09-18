import { useState } from 'react';
import { cadastrarEscola } from '../services/escolas';

function Cadastro() {
  const [nome, setNome] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [etapaId, setEtapaId] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      await cadastrarEscola({
        nome: nome,
        cnpj: cnpj,
        etapa_ensino_id: etapaId
      });

      alert('Cadastro realizado com sucesso!');
      setNome('');
      setCnpj('');
      setEtapaId('');
    } catch (erro) {
      console.error(erro);
      // Mensagem real do backend (ex: CNPJ duplicado), já traduzida pelo interceptor
      alert(erro.mensagem);
    }
  };

  return (
    <div className="page">
      <div className="container-sm">
        <header className="page-header">
          <p className="eyebrow">Equipes</p>
          <h1 className="page-title">Novo Cadastro</h1>
          <p className="page-subtitle">Registre uma nova escola/time no campeonato.</p>
        </header>

        <div className="card">
          <form onSubmit={handleSubmit} className="card-body form">
            <div className="form-group">
              <label className="form-label" htmlFor="nome">Nome da Escola/Time</label>
              <input id="nome" className="form-control" type="text" value={nome} onChange={(e) => setNome(e.target.value)} required />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label" htmlFor="cnpj">CNPJ <span className="form-hint">(opcional)</span></label>
                <input id="cnpj" className="form-control" type="text" value={cnpj} onChange={(e) => setCnpj(e.target.value)} />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="etapa">ID da Etapa de Ensino</label>
                <input id="etapa" className="form-control" type="number" placeholder="ex: 1" value={etapaId} onChange={(e) => setEtapaId(e.target.value)} required />
              </div>
            </div>

            <button type="submit" className="btn btn-primary btn-block">Salvar Cadastro</button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default Cadastro;
