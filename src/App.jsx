import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
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
import TabelaGeral from './pages/TabelaGeral';
import Usuarios from './pages/Usuarios';
import ImportarJogos from './pages/ImportarJogos';
import ImportarAtletas from './pages/ImportarAtletas';
import PontosLancados from './pages/PontosLancados';
import Login from './pages/Login';
import Competicoes from './pages/Competicoes';
import CompeticaoDetalhe from './pages/CompeticaoDetalhe';
import Agenda from './pages/Agenda';
import AgendaJogo from './pages/AgendaJogo';

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
          <Route path="/tabela-geral" element={<TabelaGeral />} />
          <Route path="/usuarios" element={<RotaPrivada perfis={['ADMIN']}><Usuarios /></RotaPrivada>} />
          <Route path="/importar-jogos" element={<RotaPrivada perfis={['ADMIN']}><ImportarJogos /></RotaPrivada>} />
          <Route path="/importar-atletas" element={<RotaPrivada perfis={['ADMIN']}><ImportarAtletas /></RotaPrivada>} />
          {/* Pontos lançados: duas entradas no menu, a mesma tela (key força
              uma tela nova ao trocar de uma para a outra) */}
          <Route path="/tabuleiro" element={<RotaPrivada perfis={['ADMIN', 'PLACAR']}><PontosLancados key="tabuleiro" grupo="tabuleiro" /></RotaPrivada>} />
          <Route path="/atletismo" element={<RotaPrivada perfis={['ADMIN', 'PLACAR']}><PontosLancados key="atletismo" grupo="atletismo" /></RotaPrivada>} />
          {/* Endereço antigo: continua funcionando */}
          <Route path="/pontos-lancados" element={<Navigate to="/tabuleiro" replace />} />
          <Route path="/modalidades/:slug" element={<Competicoes />} />
          <Route path="/competicoes/:id" element={<CompeticaoDetalhe />} />
          <Route path="/agenda" element={<Agenda />} />
          <Route path="/agenda/:id" element={<AgendaJogo />} />
          <Route path="/login" element={<Login />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;