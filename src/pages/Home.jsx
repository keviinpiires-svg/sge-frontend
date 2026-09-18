import { useState, useEffect } from 'react';
import { listarEscolas } from '../services/escolas';

function Home() {
  const [escolas, setEscolas] = useState([]);

  useEffect(() => {
    async function carregarDados() {
      try {
        setEscolas(await listarEscolas());
      } catch (erro) {
        console.error("Erro ao conectar com a API:", erro);
      }
    }
    carregarDados();
  }, []);

  return (
    <div className="page">
      <div className="container-lg">
        <header className="page-header">
          <p className="eyebrow">Sistema de Gestão Esportiva</p>
          <h1 className="page-title">Painel do Campeonato 🏆</h1>
          <p className="page-subtitle">Escolas cadastradas no banco de dados.</p>
        </header>

        {escolas.length > 0 ? (
          <div className="grid-cards">
            {escolas.map((escola) => (
              <div key={escola.id} className="tile">
                <h3 className="tile-title">{escola.nome}</h3>
                <p className="tile-meta">ID: {escola.id}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="card">
            <div className="state">
              <div className="state-icon">🏫</div>
              <p className="state-text">Nenhuma escola encontrada ou aguardando conexão...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Home;
