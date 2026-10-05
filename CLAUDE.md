# web-jogos — frontend do SGE Jogos Estudantis 2026

Frontend do **Sistema de Gestão Esportiva** dos Jogos Estudantis 2026 (Barra do Choça/BA,
**23 a 28 de novembro de 2026**). API no repositório separado **`F:\System_jogos`**
(Node + Express 5 + MySQL, no Render).

**Leia o contexto antes de qualquer tarefa de funcionalidade.** Regras do regulamento, modelo de
dados, fatias, pendências e decisões provisórias estão lá (idêntico nos dois repositórios):
@docs/CONTEXTO_NOVO_ESCOPO.md

Fontes originais: `docs/referencias/` (regulamento, tabela de grupos, `sumulas_modelos.md` e os PDFs
das súmulas). Roteiro da virada para produção: `F:\System_jogos\docs\MIGRACAO_PRODUCAO.md`.

---

## Estado atual (atualizado em 05/10/2026)

- **Código novo** na branch **`feat/novo-escopo`** (nos dois repositórios); tag do estado anterior:
  `v1-antes-do-novo-escopo`.
- Fatias 1–7 e 9 ✅; **8** 🔄 (falta atletismo); **10 — migração da produção** 🔄 (falta executar).
- **O que está no ar na Vercel é o frontend ANTIGO** (menu com "Fase de Grupos", "Mata-Mata",
  "Agendar Jogo"…), falando com o backend e o banco antigos. O código deste repositório só vai ao ar
  junto com a virada do backend e do banco (os três voltam juntos ou nenhum volta).

## Infraestrutura

| Peça | Onde |
|---|---|
| Frontend | **Vercel** — https://sge-frontend-seven.vercel.app (`vercel.json` com rewrite de SPA) |
| Backend | **Render** — https://system-jogos-estudantis.onrender.com (plano free: 1ª requisição ~50s) |
| Banco | **Railway**, MySQL 9.4.0 |

- **`VITE_API_URL`** define a API, **sem barra final**, e é resolvida **no build** (mudou → rebuild).
  Está versionada em `.env.development` (`http://localhost:3000`) e `.env.production` (URL do Render).
  **Não crie a mesma variável no painel da Vercel**: viraria uma segunda fonte, invisível no código.
- Variáveis `VITE_` ficam públicas no bundle: nunca coloque segredo nelas.

## Stack

React 19 · Vite 8 · react-router-dom 7 · axios · react-to-print · ESLint. JavaScript (JSX), sem TypeScript.
CSS único em `src/index.css` (classes `page`, `container`, `card`, `table-sge`, `btn`, `form-control`;
impressão com `print-only` / `print-area`).

## Estrutura

```
src/App.jsx               rotas
src/components/           Navbar, MenuLateral, RotaPrivada, TabelaJogos, ClassificacaoGrupos,
                          MataMataCompeticao, Suspensoes, ElencoEquipe, ArtilhariaCompeticao…
src/components/folhas/    folhas de súmula por modalidade (impressão A4)
src/pages/                telas
src/services/api.js       axios: baseURL `${API_URL}/api`, timeout 60s, Bearer token, error.mensagem
src/services/<recurso>.js um arquivo por recurso da API
src/services/config.js    API_URL a partir de VITE_API_URL (fallback localhost só em dev)
src/services/token.js     sessão JWT no localStorage (decisão de 01/10/2026: fica assim)
src/services/datas.js     ÚNICO lugar que lê/formata data (datas de jogo são hora de parede)
src/context/              AuthContext, useAuth (isAdmin, isPlacar, podeLancar, perfil, usuario)
```

## Rotas da aplicação

| Rota | Tela | Acesso |
|---|---|---|
| `/` | Início | público |
| `/modalidades/:slug` | competições da modalidade | público |
| `/competicoes/:id` | jogos, classificação, mata-mata, suspensões, artilharia | público (ações por perfil) |
| `/preencher-sumula/:id` | lançar súmula | ADMIN ou PLACAR |
| `/detalhes-sumula/:id` | ver/imprimir súmula | público |
| `/artilharia`, `/tabela-geral`, `/lista-atletas` | consultas | público (RG não aparece) |
| `/cadastro`, `/editar-escola/:id`, `/cadastro-atleta` | cadastros | ADMIN |
| `/usuarios` | contas (cria, edita, desativa, troca senha) | ADMIN |
| `/login` | login | — |

## Comandos

- `npm run dev` — desenvolvimento (precisa do backend em `http://localhost:3000`).
- `npm run build` — build de produção. `npm run preview` — serve o build. `npm run lint` — ESLint.

## Regras de trabalho

- **Não leia nem exiba `.env*` reais com segredo.** Nunca comite segredos.
- Não faça commit/push sem o usuário pedir. Trabalhe na branch `feat/novo-escopo`.
- **Não mexa na produção** (Vercel/Render/Railway) sem ordem explícita: nada de deploy, script ou
  comando apontado para lá.
- Dúvida de regra do campeonato: **pare e pergunte**. Itens **[PENDENTE]** (seção 12 do contexto) não
  se implementam por conta própria. Decisão provisória mora em config (no backend:
  `src/config/regrasProvisorias.js`, `chavesMataMata.js`, `folhasSumula.js`, `blocosTabelaGeral.js`)
  e na seção 12.1, nunca copiada dentro de um componente. Quando a API marca algo como provisório,
  a tela **mostra o aviso**.
- **Fatias:** só a tabela da seção 9 do contexto numera. Cite número e nome e atualize o estado dela
  no mesmo commit que conclui a fatia.
- Textos, nomes e mensagens em **português**. Erro de API chega pronto em **`error.mensagem`**
  (o interceptor já traduz `{ erro }`, timeout e falta de conexão): não repita tratamento.
- **Não assuma "logado = admin"**: existe o perfil `PLACAR` (mesa). Use `isAdmin`/`podeLancar` do
  `useAuth`, `<RotaPrivada perfis={[...]}>` nas rotas e `admin: true` nos links da Navbar.
- Datas: sempre por `services/datas.js`; nunca `new Date(string)` direto em data de jogo (o jogo das
  10:30 é 10:30 em Barra do Choça, em qualquer fuso).
- Placar, classificação, suspensões e tabela geral **vêm calculados do backend**: a tela não recalcula.
- Súmula: toda folha impressa tem **14 linhas por equipe**; o desenho de cada modalidade vem de
  `folhasSumula.js` no backend; há versão **em branco** e **preenchida**.

## Como depurar

1. DevTools → **Console** (o `config.js` avisa se `VITE_API_URL` faltar) e **Rede** → requisição com
   erro → abas **Requisição** e **Resposta**.
2. Status 500 é do backend: veja os **Logs** do serviço no Render (ver `F:\System_jogos\CLAUDE.md`).
3. Erro de CORS em produção: a URL da Vercel precisa estar, caractere por caractere, no `CORS_ORIGIN`
   do Render.
