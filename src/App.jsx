import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Inicio from './pages/Inicio';
import Cadastro from './pages/Cadastro';
import FaseGrupos from './pages/FaseGrupos';
import MataMata from './pages/MataMata'; 
import Sumulas from './pages/Sumulas';
import CadastroAtleta from './pages/CadastroAtleta';
import ListaAtletas from './pages/ListaAtletas';
import AgendarJogo from './pages/AgendarJogo';
import ListaJogos from './pages/ListaJogos';  
import PreencherSumula from './pages/PreencherSumula';
import DetalhesSumula from './pages/DetalhesSumula';
import Classificacao from './pages/Classificacao';
import Artilharia from './pages/Artilharia';

function App() {
  return (
    <BrowserRouter>
      <Navbar />
      <Routes>
        <Route path="/" element={<Inicio />} />
        <Route path="/cadastro" element={<Cadastro />} />
        <Route path="/grupos" element={<FaseGrupos />} />
        <Route path="/matamata" element={<MataMata />} />
        <Route path="/sumulas" element={<Sumulas />} />
        <Route path="/cadastro-atleta" element={<CadastroAtleta />} />
        <Route path="/lista-atletas" element={<ListaAtletas />} />
        <Route path="/agendar-jogo" element={<AgendarJogo />} />
        <Route path="/lista-jogos" element={<ListaJogos />} />
        <Route path="/preencher-sumula/:id" element={<PreencherSumula />} />
        <Route path="/detalhes-sumula/:id" element={<DetalhesSumula />} />
        <Route path="/classificacao" element={<Classificacao />} />
        <Route path="/artilharia" element={<Artilharia />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;