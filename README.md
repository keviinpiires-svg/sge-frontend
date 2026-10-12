# web-jogos — frontend do SGE

Frontend do **Sistema de Gestão Esportiva** dos Jogos Estudantis 2026 (Barra do Choça, 23 a 28 de novembro).
Gerencia escolas, atletas, grupos, jogos, súmulas, classificação e a tabela geral.

A API fica no repositório separado **`System_jogos`** (Node + Express + MySQL).

## Tecnologias

React 19 · Vite 8 · react-router-dom 7 · axios · react-to-print · deploy na Vercel.

## Como rodar

```bash
npm install
cp .env.example .env    # ajuste VITE_API_URL para o endereço da API
npm run dev             # desenvolvimento
```

Outros comandos: `npm run build` (build de produção), `npm run preview` (serve o build), `npm run lint` (ESLint).

> `VITE_API_URL` é resolvida **no build**: ao mudar o valor, rode o build de novo.
> Nunca versione arquivos `.env` reais.

## Estrutura

| Caminho | O que é |
| --- | --- |
| `src/App.jsx` | Rotas da aplicação |
| `src/components/` | `Navbar`, `RotaPrivada` |
| `src/pages/` | Telas |
| `src/services/` | Um arquivo por recurso da API, sobre `services/api.js` (axios com interceptors) |
| `src/context/` | `AuthContext` / `useAuth` — sessão JWT no `localStorage` (`services/token.js`) |
| `src/index.css` | CSS único: classes `page`, `container`, `card`, `table-sge`, `btn`, `form-control` |
| `docs/` | Contexto do novo escopo e referências (regulamento, tabela de grupos, modelo de súmula) |

## Convenções

- Nomes, textos e mensagens em **português**.
- Erros vindos da API: use `error.mensagem` — o interceptor do axios já traduz a resposta.
- Telas de administração ficam dentro de `<RotaPrivada>`; itens de menu restritos usam `admin: true` na Navbar.
- Impressão de súmula com `react-to-print` (A4), com os estilos de impressão no CSS (`print-only`, `print-area`).

## Antes de mexer

Leia **[docs/CONTEXTO_NOVO_ESCOPO.md](docs/CONTEXTO_NOVO_ESCOPO.md)**: o domínio está migrando para
*competições* (modalidade × categoria × gênero). Itens marcados **[PENDENTE]** ainda não têm regra
definida — pergunte antes de implementar.
