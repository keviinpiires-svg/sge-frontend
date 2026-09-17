import { Link, NavLink } from 'react-router-dom';

const links = [
  { to: '/', label: 'Início', end: true },
  { to: '/cadastro', label: 'Cadastrar Time' },
  { to: '/grupos', label: 'Fase de Grupos' },
  { to: '/classificacao', label: 'Classificação' },
  { to: '/artilharia', label: 'Artilharia' },
  { to: '/matamata', label: 'Mata-Mata' },
  { to: '/sumulas', label: 'Súmulas' },
  { to: '/cadastro-atleta', label: 'Cadastrar Atleta' },
  { to: '/lista-atletas', label: 'Listar Atletas' },
  { to: '/agendar-jogo', label: 'Agendar Jogo' },
  { to: '/lista-jogos', label: 'Listar Jogos' },
];

function Navbar() {
  return (
    <nav className="navbar">
      <Link to="/" className="navbar-brand">🏆 Jogos Estudantis</Link>

      {/* NavLink aplica a classe "active" automaticamente na rota atual */}
      <div className="navbar-links">
        {links.map(({ to, label, end }) => (
          <NavLink key={to} to={to} end={end} className="nav-link">
            {label}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}

export default Navbar;
