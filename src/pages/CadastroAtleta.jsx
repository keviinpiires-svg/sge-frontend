import { useState } from 'react';

function CadastroAtleta() {
  const [nome, setNome] = useState('');
  const [rgMatricula, setRgMatricula] = useState('');
  const [dataNascimento, setDataNascimento] = useState('');
  const [codigoEscola, setCodigoEscola] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();

    const atleta = {
      nome: nome,
      rg_ou_matricula: rgMatricula,
      data_nascimento: dataNascimento,
      escola_id: Number(codigoEscola)
    };

    try {
      const response = await fetch('http://localhost:3000/api/atletas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(atleta)
      });

      if (response.ok) {
        alert('Cadastro realizado com sucesso!');
        setNome('');
        setRgMatricula('');
        setDataNascimento('');
        setCodigoEscola('');
      } else {
        alert('Falha ao realizar o cadastro. Tente novamente.');
      }
    } catch (error) {
      console.error('Erro:', error);
      alert('Falha ao realizar o cadastro. Erro de conexão.');
    }
  };

  return (
    <div className="page">
      <div className="container-sm">
        <header className="page-header">
          <p className="eyebrow">Atletas</p>
          <h1 className="page-title">Cadastro de Atleta</h1>
          <p className="page-subtitle">Preencha os dados abaixo para registrar um novo atleta.</p>
        </header>

        <div className="card">
          <form onSubmit={handleSubmit} className="card-body form">
            <div className="form-group">
              <label className="form-label" htmlFor="nome">Nome</label>
              <input id="nome" className="form-control" type="text" value={nome} onChange={(e) => setNome(e.target.value)} required />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="rg">RG / Matrícula</label>
              <input id="rg" className="form-control" type="text" value={rgMatricula} onChange={(e) => setRgMatricula(e.target.value)} required />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label" htmlFor="nascimento">Data de Nascimento</label>
                <input id="nascimento" className="form-control" type="date" value={dataNascimento} onChange={(e) => setDataNascimento(e.target.value)} required />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="escola">Código da Escola</label>
                <input id="escola" className="form-control" type="number" value={codigoEscola} onChange={(e) => setCodigoEscola(e.target.value)} required />
              </div>
            </div>

            <button type="submit" className="btn btn-primary btn-block">Cadastrar Atleta</button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default CadastroAtleta;
