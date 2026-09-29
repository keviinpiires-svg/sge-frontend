# web-jogos — frontend do SGE Jogos Estudantis 2026

React 19 + Vite 8 + react-router-dom 7 + axios + react-to-print. Deploy na Vercel. API em `F:\System_jogos` (repositório separado).

**Antes de qualquer tarefa de funcionalidade, leia o contexto do novo escopo:**
@docs/CONTEXTO_NOVO_ESCOPO.md

Fontes originais em texto: `docs/referencias/` (regulamento, tabela de grupos e `sumulas_modelos.md`, com as folhas oficiais de futsal/society, handebol, basquete e vôlei — a súmula impressa deve seguir o modelo da modalidade).

## Comandos
- `npm run dev` — desenvolvimento. `npm run build` — build. `npm run lint` — ESLint.
- `VITE_API_URL` define o endereço do backend (veja `.env.example`); é resolvida no build.

## Estrutura
- `src/App.jsx` — rotas. `src/components/` — `Navbar`, `RotaPrivada`.
- `src/pages/` — telas. `src/services/` — **um arquivo por recurso da API** (usam `services/api.js`, axios com interceptors).
- `src/context/` — `AuthContext`/`useAuth` (sessão JWT no `localStorage` via `services/token.js`).
- `src/index.css` — CSS único (classes como `card`, `table-sge`, `btn`, `page`, `container`).

## Convenções (mantenha)
- Nomes e textos em **português**. Erros de API: use `error.mensagem` (o interceptor já traduz).
- Telas de administração dentro de `<RotaPrivada>`; itens de menu admin usam `admin: true` na Navbar.
- Após o novo escopo haverá perfil `PLACAR` além de admin — não assuma que "logado = admin".
- Impressão de súmula com `react-to-print` (A4). Estilos de impressão no CSS (`print-only`, `print-area`).

## Regras de trabalho
- Não leia nem exiba `.env*` reais. Nunca comite segredos.
- Não faça commit/push sem o usuário pedir. Trabalhe na branch de desenvolvimento.
- Itens **[PENDENTE]** do contexto exigem perguntar ao usuário antes de implementar. Não invente regra.
- **Fatias:** a numeração válida é a da tabela da seção 9 do contexto. Cite número e nome ("fatia 5 — futsal completo") e atualize o estado ao concluir.
