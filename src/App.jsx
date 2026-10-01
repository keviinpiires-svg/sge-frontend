import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import RotaPrivada from './components/RotaPrivada';
import { AuthProvider } from './context/AuthContext';
import Inicio from './pages/Inicio';
import Cadastro from './pages/Cadastro';
import CadastroAtleta from './pages/CadastroAtleta';
import ListaAtletas from './pages/ListaAtletas';
import PreencherSumula from './pages/PreencherSumula';
import DetalhesSumula from './pages/DetalhesSumula';
import Artilharia from './pages/Artilharia';
import Login from './pages/Login';
import Competicoes from './pages/Competicoes';
import CompeticaoDetalhe from './pages/CompeticaoDetalhe';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Navbar />
        <Routes>
          <Route path="/" element={<Inicio />} />
          <Route path="/cadastro" element={<RotaPrivada perfis={['ADMIN']}><Cadastro /></RotaPrivada>} />
          <Route path="/editar-escola/:id" element={<RotaPrivada perfis={['ADMIN']}><Cadastro /></RotaPrivada>} />
          <Route path="/cadastro-atleta" element={<RotaPrivada perfis={['ADMIN']}><CadastroAtleta /></RotaPrivada>} />
          <Route path="/lista-atletas" element={<ListaAtletas />} />
          <Route path="/preencher-sumula/:id" element={<RotaPrivada perfis={['ADMIN', 'PLACAR']}><PreencherSumula /></RotaPrivada>} />
          <Route path="/detalhes-sumula/:id" element={<DetalhesSumula />} />
          <Route path="/artilharia" element={<Artilharia />} />
          <Route path="/modalidades/:slug" element={<Competicoes />} />
          <Route path="/competicoes/:id" element={<CompeticaoDetalhe />} />
          <Route path="/login" element={<Login />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;