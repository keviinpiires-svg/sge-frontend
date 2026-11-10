// Rascunho da súmula no navegador, até ser salva. Serve para a mesa não perder o que digitou se a
// sessão expirar, a aba for recarregada ou o celular descartar a página. Só guarda o que a mesa
// edita (gols, cartões, faltas, capitão, presença, pênaltis, sets...), sem o nome do atleta.
// O localStorage pode falhar (janela anônima, armazenamento cheio): tudo é protegido por try/catch
// e a tela funciona igual sem o rascunho.
const chave = (jogoId) => `sge_rascunho_sumula_${jogoId}`;

// Só o que a mesa edita: fora o nome do atleta, que a tela já tem pela carga da súmula
export const fotografarSumula = ({ equipes, penaltis, sets, prorrogacao, baleouPrimeiro }) => ({
  equipes: equipes.map((equipe) => ({
    ...equipe,
    atletas: equipe.atletas.map(({ nome, ...resto }) => resto) // eslint-disable-line no-unused-vars
  })),
  penaltis,
  sets,
  prorrogacao,
  baleouPrimeiro
});

export function lerRascunho(jogoId) {
  try {
    const bruto = localStorage.getItem(chave(jogoId));
    return bruto ? JSON.parse(bruto) : null;
  } catch {
    return null;
  }
}

export function gravarRascunho(jogoId, dados) {
  try {
    localStorage.setItem(chave(jogoId), JSON.stringify({ salvoEm: new Date().toISOString(), dados }));
  } catch {
    // Sem armazenamento, a tela segue sem rascunho
  }
}

export function apagarRascunho(jogoId) {
  try {
    localStorage.removeItem(chave(jogoId));
  } catch {
    // Nada a apagar
  }
}
