import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Cadastro from './pages/Cadastro';
import FaseGrupos from './pages/FaseGrupos';
import MataMata from './pages/MataMata'; 
import Sumulas from './pages/Sumulas';

function App() {
  return (
    <BrowserRouter>
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/cadastro" element={<Cadastro />} />
        <Route path="/grupos" element={<FaseGrupos />} />
        <Route path="/matamata" element={<MataMata />} />
        <Route path="/sumulas" element={<Sumulas />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;