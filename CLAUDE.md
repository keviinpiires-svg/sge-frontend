# web-jogos — frontend do SGE Jogos Estudantis 2026

React 19 + Vite 8 + react-router-dom 7 + axios + react-to-print. Deploy na Vercel.
API no repositório separado `F:\System_jogos`.

**Leia o contexto antes de qualquer tarefa de funcionalidade.** Estrutura de pastas, convenções,
regras do regulamento, decisões provisórias e o estado das fatias estão lá — não os repita aqui:
@docs/CONTEXTO_NOVO_ESCOPO.md

Fontes originais: `docs/referencias/` (regulamento, tabela de grupos, `sumulas_modelos.md`).

## Comandos
- `npm run dev` — desenvolvimento. `npm run build` — build. `npm run lint` — ESLint.
- `VITE_API_URL` aponta o backend (veja `.env.example`); é resolvida **no build**, não em runtime.

## Regras de trabalho
- Não leia nem exiba `.env*` reais. Nunca comite segredos.
- Não faça commit/push sem o usuário pedir. Trabalhe na branch de desenvolvimento.
- **Não mexa na produção** (Railway/Render/Vercel) sem ordem explícita: nada de script, deploy ou
  comando apontado para lá.
- Dúvida de regra do campeonato: **pare e pergunte**. Itens **[PENDENTE]** (seção 12 do contexto)
  não se implementam por conta própria. Decisão provisória mora em arquivo de config e na seção
  12.1 — nunca copiada dentro de um componente.
- **Fatias:** só a tabela da seção 9 do contexto numera. Cite número e nome ("fatia 5 — futsal
  completo") e atualize o estado dela no mesmo commit que conclui a fatia.
- Textos e nomes em **português**; erro de API chega ao usuário em `error.mensagem`.
- Não assuma "logado = admin": existe o perfil `PLACAR` (mesa) além de `ADMIN`.
