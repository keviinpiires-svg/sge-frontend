import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/useAuth';

// Envolve as telas de administração: sem token, o visitante vai para /login
function RotaPrivada({ children }) {
  const { autenticado } = useAuth();
  const location = useLocation();

  if (!autenticado) {
    // "de" leva o visitante de volta para a tela que ele tentou abrir após o login
    return <Navigate to="/login" replace state={{ de: location.pathname }} />;
  }

  return children;
}

export default RotaPrivada;
