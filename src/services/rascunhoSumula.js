// Rascunho da súmula no navegador, até ser salva. Serve para a mesa não perder o que digitou se a
// sessão expirar, a aba for recarregada ou o celular descartar a página. Só guarda o que a mesa
// edita (gols, cartões, faltas, capitão, presença, pênaltis, sets, camisas ainda não salvas...), sem o nome do atleta
// e sem o técnico (a tela não tem mais o campo; rascunhos antigos que o traziam são lidos sem ele).
// O localStorage pode falhar (janela anônima, armazenamento cheio): tudo é protegido por try/catch
// e a tela funciona igual sem o rascunho.
const chave = (jogoId) => `sge_rascunho_sumula_${jogoId}`;

// Só o que a mesa edita: fora o nome do atleta, que a tela já tem pela carga da súmula, e o número da
// camisa, que tem o seu próprio campo (camisas) e vem da inscrição
// camisas: só as digitadas e ainda não gravadas na inscrição (atleta_id -> texto). Fica por último.
export const fotografarSumula = ({ equipes, penaltis, sets, prorrogacao, baleouPrimeiro, camisas = {} }) => ({
  equipes: equipes.map(({ tecnico_nome, ...equipe }) => ({ // eslint-disable-line no-unused-vars
    ...equipe,
    // vermelho_auto é derivado dos amarelos (2º amarelo): não entra no rascunho, nem no que se compara com o banco
    atletas: equipe.atletas.map(({ nome, numero_camisa, vermelho_auto, ...resto }) => resto) // eslint-disable-line no-unused-vars
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

// 2º tempo (futsal e society): o jogo só tem uma pergunta ("já começou o 2º tempo?"), guardada no navegador
// por jogo, sem coluna nova. Ao abrir a súmula a tela também deduz o 2º tempo quando já há faltas do 2º
// tempo gravadas, então só se perde se o navegador for limpo ANTES de qualquer falta do 2º tempo ser salva.
const chaveTempo = (jogoId) => `sge_segundo_tempo_${jogoId}`;

export function lerSegundoTempo(jogoId) {
  try {
    return localStorage.getItem(chaveTempo(jogoId)) === '1';
  } catch {
    return false;
  }
}

export function gravarSegundoTempo(jogoId) {
  try {
    localStorage.setItem(chaveTempo(jogoId), '1');
  } catch {
    // Sem armazenamento, a tela segue só com a dedução pelas faltas gravadas
  }
}

export function limparSegundoTempo(jogoId) {
  try {
    localStorage.removeItem(chaveTempo(jogoId));
  } catch {
    // Nada a apagar
  }
}

export function apagarRascunho(jogoId) {
  try {
    localStorage.removeItem(chave(jogoId));
  } catch {
    // Nada a apagar
  }
}
