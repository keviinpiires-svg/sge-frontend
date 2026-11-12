// Rascunho da súmula no navegador, até ser salva. Serve para a mesa não perder o que digitou se a
// sessão expirar, a aba for recarregada ou o celular descartar a página. Só guarda o que a mesa
// edita (gols, cartões, faltas, capitão, presença, pênaltis, sets, camisas ainda não salvas...), sem o nome do atleta.
// O localStorage pode falhar (janela anônima, armazenamento cheio): tudo é protegido por try/catch
// e a tela funciona igual sem o rascunho.
const chave = (jogoId) => `sge_rascunho_sumula_${jogoId}`;

// Só o que a mesa edita: fora o nome do atleta, que a tela já tem pela carga da súmula, e o número da
// camisa, que tem o seu próprio campo (camisas) e vem da inscrição
// camisas: só as digitadas e ainda não gravadas na inscrição (atleta_id -> texto). Fica por último.
export const fotografarSumula = ({ equipes, penaltis, sets, prorrogacao, baleouPrimeiro, camisas = {} }) => ({
  equipes: equipes.map((equipe) => ({
    ...equipe,
    atletas: equipe.atletas.map(({ nome, numero_camisa, ...resto }) => resto) // eslint-disable-line no-unused-vars
  })),
  penaltis,
  sets,
  prorrogacao,
  baleouPrimeiro,
  camisas
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
