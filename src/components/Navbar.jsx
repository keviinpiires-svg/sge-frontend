import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/useAuth';

// admin: true → link só aparece para quem está logado como administrador
const links = [
  { to: '/', label: 'Início', end: true },
  { to: '/modalidades/futsal', label: 'Modalidades' },
  { to: '/cadastro', label: 'Cadastrar Time', admin: true },
  { to: '/grupos', label: 'Fase de Grupos' },
  { to: '/classificacao', label: 'Classificação' },
  { to: '/artilharia', label: 'Artilharia' },
  { to: '/matamata', label: 'Mata-Mata' },
  { to: '/cadastro-atleta', label: 'Cadastrar Atleta', admin: true },
  { to: '/lista-atletas', label: 'Listar Atletas' },
];

function Navbar() {
  const navigate = useNavigate();
  const { isAdmin, usuario, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <nav className="navbar">
      <Link to="/" className="navbar-brand">🏆 Jogos Estudantis</Link>

      {/* NavLink aplica a classe "active" automaticamente na rota atual */}
      <div className="navbar-links">
        {links
          .filter(({ admin }) => !admin || isAdmin)
          .map(({ to, label, end }) => (
            <NavLink key={to} to={to} end={end} className="nav-link">
              {label}
            </NavLink>
          ))}
      </div>

      <div className="navbar-session">
        {isAdmin ? (
          <>
            <span className="navbar-user" title={usuario?.email || ''}>
              👤 {usuario?.nome || usuario?.email || 'Administrador'}
            </span>
            <button className="btn btn-secondary btn-sm" onClick={handleLogout}>Sair</button>
          </>
        ) : (
          <button className="btn btn-primary btn-sm" onClick={() => navigate('/login')}>Login</button>
        )}
      </div>
    </nav>
  );
}

export default Navbar;
