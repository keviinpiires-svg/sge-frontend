// Campo numérico com − e +, do jeito que a mesa lança na quadra: sem teclado,
// sem digitar. O valor continua editável por teclado para quem preferir.
function Contador({ valor, aoMudar, max, rotulo, desabilitado }) {
  const limite = max ?? Infinity;

  const mudar = (novo) => {
    const ajustado = Math.min(limite, Math.max(0, novo));
    if (ajustado !== valor) aoMudar(ajustado);
  };

  return (
    <div className="contador">
      <button
        type="button"
        className="contador-btn"
        onClick={() => mudar(valor - 1)}
        disabled={desabilitado || valor <= 0}
        aria-label={`Menos ${rotulo}`}
      >
        −
      </button>

      <input
        type="number"
        className="contador-valor"
        value={valor}
        min="0"
        max={max ?? undefined}
        disabled={desabilitado}
        onChange={(e) => mudar(Number(e.target.value))}
        aria-label={rotulo}
      />

      <button
        type="button"
        className="contador-btn"
        onClick={() => mudar(valor + 1)}
        disabled={desabilitado || valor >= limite}
        aria-label={`Mais ${rotulo}`}
      >
        +
      </button>
    </div>
  );
}

export default Contador;
