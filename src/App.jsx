import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import RotaPrivada from './components/RotaPrivada';
import { AuthProvider } from './context/AuthContext';
import Inicio from './pages/Inicio';
import Cadastro from './pages/Cadastro';
import FaseGrupos from './pages/FaseGrupos';
import MataMata from './pages/MataMata';
import CadastroAtleta from './pages/CadastroAtleta';
import ListaAtletas from './pages/ListaAtletas';
import AgendarJogo from './pages/AgendarJogo';
import ListaJogos from './pages/ListaJogos';  
import PreencherSumula from './pages/PreencherSumula';
import DetalhesSumula from './pages/DetalhesSumula';
import Classificacao from './pages/Classificacao';
import Artilharia from './pages/Artilharia';
import Login from './pages/Login';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Navbar />
        <Routes>
          <Route path="/" element={<Inicio />} />
          <Route path="/cadastro" element={<RotaPrivada><Cadastro /></RotaPrivada>} />
          <Route path="/editar-escola/:id" element={<RotaPrivada><Cadastro /></RotaPrivada>} />
          <Route path="/grupos" element={<FaseGrupos />} />
          <Route path="/matamata" element={<MataMata />} />
          <Route path="/cadastro-atleta" element={<RotaPrivada><CadastroAtleta /></RotaPrivada>} />
          <Route path="/lista-atletas" element={<ListaAtletas />} />
          <Route path="/agendar-jogo" element={<RotaPrivada><AgendarJogo /></RotaPrivada>} />
          <Route path="/lista-jogos" element={<ListaJogos />} />
          <Route path="/preencher-sumula/:id" element={<RotaPrivada><PreencherSumula /></RotaPrivada>} />
          <Route path="/detalhes-sumula/:id" element={<DetalhesSumula />} />
          <Route path="/classificacao" element={<Classificacao />} />
          <Route path="/artilharia" element={<Artilharia />} />
          <Route path="/login" element={<Login />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;