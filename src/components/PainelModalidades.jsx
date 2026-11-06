import MenuLateral from './MenuLateral';

// Layout de duas colunas das telas de competição: o menu lateral fica fixo à
// esquerda e o conteúdo da rota entra à direita. Em telas estreitas o menu
// vira uma faixa acima do conteúdo (ver .layout-competicoes no index.css).
function PainelModalidades({ children }) {
  return (
    <div className="page">
      <div className="container-lg">
        <div className="layout-competicoes">
          <MenuLateral />
          <div className="layout-competicoes-conteudo">{children}</div>
        </div>
      </div>
    </div>
  );
}

export default PainelModalidades;
