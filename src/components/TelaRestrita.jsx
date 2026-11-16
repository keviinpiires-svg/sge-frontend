// Cartão "Tela restrita": o mesmo visual do RotaPrivada, para quando a tela
// existe mas esta conta não pode usá-la (ex.: súmula de jogo de outro local).
function TelaRestrita({ texto }) {
  return (
    <div className="page">
      <div className="container-sm">
        <div className="card">
          <div className="state">
            <div className="state-icon">🔒</div>
            <p className="state-title">Tela restrita</p>
            <p className="state-text">{texto}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default TelaRestrita;
