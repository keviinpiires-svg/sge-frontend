import { useContext } from 'react';
import { AuthContext } from './auth-context';

// Atalho para ler a sessão: const { autenticado, isAdmin, login, logout } = useAuth();
export function useAuth() {
  const contexto = useContext(AuthContext);
  if (!contexto) {
    throw new Error('useAuth precisa estar dentro de <AuthProvider>.');
  }
  return contexto;
}
