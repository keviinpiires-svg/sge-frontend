import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/useAuth';

// admin: true → link só aparece para quem está logado como administrador
const links = [
  { to: '/', label: 'Início', end: true },
  { to: '/modalidades/futsal', label: 'Modalidades' },
  { to: '/cadastro', label: 'Cadastrar Time', admin: true },
  { to: '/artilharia', label: 'Artilharia' },
  { to: '/tabela-geral', label: 'Tabela Geral' },
  { to: '/cadastro-atleta', label: 'Cadastrar Atleta', admin: true },
  { to: '/lista-atletas', label: 'Listar Atletas' },
  { to: '/usuarios', label: 'Usuários', admin: true },
];

// Até 768 px os links ficam atrás do botão de menu (o CSS esconde o botão
// acima disso, e o menu volta a ser a faixa horizontal de sempre)
function Navbar() {
  const navigate = useNavigate();
  const { isAdmin, podeLancar, perfil, usuario, logout } = useAuth();
  const [aberto, setAberto] = useState(false);
  const barraRef = useRef(null);

  // Menu aberto: tocar fora da barra ou apertar Esc fecha
  useEffect(() => {
    if (!aberto) return undefined;
    const tocouFora = (evento) => {
      if (barraRef.current && !barraRef.current.contains(evento.target)) setAberto(false);
    };
    const apertouEsc = (evento) => { if (evento.key === 'Escape') setAberto(false); };
    document.addEventListener('pointerdown', tocouFora);
    document.addEventListener('keydown', apertouEsc);
    return () => {
      document.removeEventListener('pointerdown', tocouFora);
      document.removeEventListener('keydown', apertouEsc);
    };
  }, [aberto]);

  const fechar = () => setAberto(false);

  const handleLogout = () => {
    fechar();
    logout();
    navigate('/');
  };

  return (
    <nav className="navbar" ref={barraRef}>
      <Link to="/" className="navbar-brand" onClick={fechar}>🏆 Jogos Estudantis</Link>

      <button
        type="button"
        className="navbar-toggle"
        aria-label={aberto ? 'Fechar menu' : 'Abrir menu'}
        aria-expanded={aberto}
        aria-controls="navbar-menu"
        onClick={() => setAberto((valor) => !valor)}
      >
        <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
          {aberto ? (
            <path d="M6 6l12 12M18 6L6 18" />
          ) : (
            <path d="M4 7h16M4 12h16M4 17h16" />
          )}
        </svg>
      </button>

      <div id="navbar-menu" className={`navbar-menu${aberto ? ' aberto' : ''}`}>
        {/* NavLink aplica a classe "active" automaticamente na rota atual */}
        <div className="navbar-links">
          {links
            .filter(({ admin }) => !admin || isAdmin)
            .map(({ to, label, end }) => (
              <NavLink key={to} to={to} end={end} className="nav-link" onClick={fechar}>
                {label}
              </NavLink>
            ))}
        </div>

        <div className="navbar-session">
          {podeLancar ? (
            <>
              <span className="navbar-user" title={usuario?.email || ''}>
                👤 {usuario?.nome || usuario?.email || 'Usuário'}
                <span className="navbar-perfil">{perfil === 'PLACAR' ? 'mesa' : 'admin'}</span>
              </span>
              <button className="btn btn-secondary btn-sm" onClick={handleLogout}>Sair</button>
            </>
          ) : (
            <button
              className="btn btn-primary btn-sm"
              onClick={() => { fechar(); navigate('/login'); }}
            >
              Login
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
