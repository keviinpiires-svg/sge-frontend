import { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { listarModalidades } from '../services/modalidades';

const ICONES = {
  futsal: '⚽',
  'futebol-society': '🥅',
  handebol: '🤾',
  baleado: '🎯',
  volei: '🏐',
  basquete: '🏀',
  atletismo: '🏃'
};

function MenuLateral() {
  const [modalidades, setModalidades] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');

  useEffect(() => {
    let ativo = true;

    listarModalidades()
      .then((dados) => {
        if (ativo) setModalidades(dados);
      })
      .catch((falha) => {
        if (ativo) setErro(falha.mensagem);
      })
      .finally(() => {
        if (ativo) setCarregando(false);
      });

    return () => {
      ativo = false;
    };
  }, []);

  return (
    <nav className="menu-lateral" aria-label="Modalidades">
      <p className="menu-lateral-titulo">Modalidades</p>

      {carregando && <p className="menu-lateral-aviso">Carregando...</p>}
      {!carregando && erro && <p className="menu-lateral-aviso erro">{erro}</p>}

      {!carregando && !erro && modalidades.map((modalidade) => {
        const icone = ICONES[modalidade.slug] || '🏅';

        // Atletismo ainda não tem competição importada: aparece na lista, mas
        // sem link, para não levar a uma tela vazia sem explicação.
        if (modalidade.total_competicoes === 0) {
          return (
            <span key={modalidade.id} className="menu-lateral-item vazio" title="Sem competições cadastradas">
              <span aria-hidden="true">{icone}</span>
              <span className="menu-lateral-nome">{modalidade.nome}</span>
              <span className="menu-lateral-contador">—</span>
            </span>
          );
        }

        return (
          <NavLink
            key={modalidade.id}
            to={`/modalidades/${modalidade.slug}`}
            className={({ isActive }) => `menu-lateral-item${isActive ? ' ativo' : ''}`}
          >
            <span aria-hidden="true">{icone}</span>
            <span className="menu-lateral-nome">{modalidade.nome}</span>
            <span className="menu-lateral-contador">{modalidade.total_competicoes}</span>
          </NavLink>
        );
      })}
    </nav>
  );
}

export default MenuLateral;
