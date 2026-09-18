import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/useAuth';

function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [entrando, setEntrando] = useState(false);

  // Volta para a página de onde o visitante veio, quando houver
  const destino = location.state?.de || '/';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErro('');
    setEntrando(true);

    try {
      await login(email, senha);
      navigate(destino, { replace: true });
    } catch (error) {
      setErro(error.message || 'Não foi possível entrar. Tente novamente.');
    } finally {
      setEntrando(false);
    }
  };

  return (
    <div className="page">
      <div className="container-sm">
        <header className="page-header center">
          <p className="eyebrow">Área Restrita</p>
          <h1 className="page-title">Acesso do Administrador 🔐</h1>
          <p className="page-subtitle">Entre para gerenciar times, atletas, jogos e súmulas.</p>
        </header>

        <div className="card">
          <form onSubmit={handleSubmit} className="card-body form">
            <div className="form-group">
              <label className="form-label" htmlFor="email">E-mail</label>
              <input
                id="email"
                className="form-control"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@sge.com"
                autoComplete="username"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="senha">Senha</label>
              <input
                id="senha"
                className="form-control"
                type="password"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                required
              />
            </div>

            {erro && <p className="alert alert-error" style={{ margin: 0 }}>{erro}</p>}

            <button type="submit" className="btn btn-primary btn-block btn-lg" disabled={entrando}>
              {entrando ? 'Entrando...' : 'Entrar'}
            </button>
          </form>
        </div>

        <p className="page-subtitle text-center" style={{ marginTop: '18px' }}>
          Sem login você continua vendo classificação, artilharia, jogos e súmulas.
        </p>
      </div>
    </div>
  );
}

export default Login;
