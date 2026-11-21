import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/useAuth';

const ROTULO_PERFIL = { ADMIN: 'administrador', PLACAR: 'mesa (placar)' };

// Envolve as telas restritas. Sem token, o visitante vai para /login; com
// token de um perfil que não pode abrir a tela, a resposta é explicar em vez
// de mandar para o login de novo, que daria um vaivém sem fim.
function RotaPrivada({ children, perfis }) {
  const { autenticado, perfil } = useAuth();
  const location = useLocation();

  if (!autenticado) {
    // "de" leva o visitante de volta para a tela que ele tentou abrir após o login
    return <Navigate to="/login" replace state={{ de: location.pathname }} />;
  }

  if (perfis && !perfis.includes(perfil)) {
    const permitidos = perfis.map((p) => ROTULO_PERFIL[p] || p).join(' ou ');

    return (
      <div className="page">
        <div className="container-sm">
          <div className="card">
            <div className="state">
              <div className="state-icon">🔒</div>
              <p className="state-title">Tela restrita</p>
              <p className="state-text">
                Esta tela é de {permitidos}. Seu acesso é de {ROTULO_PERFIL[perfil] || 'perfil desconhecido'}.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return children;
}

export default RotaPrivada;
