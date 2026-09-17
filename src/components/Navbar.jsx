import { Link } from 'react-router-dom';

function Navbar() {
  const navStyle = {
    backgroundColor: '#2c3e50',
    padding: '15px 30px',
    display: 'flex',
    gap: '20px',
    alignItems: 'center',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
  };

  const linkStyle = {
    color: 'white',
    textDecoration: 'none',
    fontWeight: 'bold',
    fontSize: '16px'
  };

  return (
    <nav style={navStyle}>
      <h2 style={{ color: '#f1c40f', margin: '0 30px 0 0' }}>Jogos Estudantis</h2>
      
      {/* Os Links substituem a tag <a> padrão do HTML para não recarregar a página */}
      <Link style={linkStyle} to="/">Início</Link>
      <Link style={linkStyle} to="/cadastro">Cadastrar Time</Link> 
      <Link style={linkStyle} to="/grupos">Fase de Grupos</Link>
      <Link style={linkStyle} to="/classificacao">Classificação</Link>
      <Link style={linkStyle} to="/matamata">Mata-Mata</Link>
      <Link style={linkStyle} to="/sumulas">Súmulas</Link>
      <Link style={linkStyle} to="/cadastro-atleta">Cadastrar Atleta</Link> 
      <Link style={linkStyle} to="/lista-atletas">Listar Atletas</Link> 
      <Link style={linkStyle} to="/agendar-jogo">Agendar Jogo</Link>
      <Link style={linkStyle} to="/lista-jogos">Listar Jogos</Link>
    </nav>
  );
}

export default Navbar;