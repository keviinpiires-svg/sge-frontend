# web-jogos — frontend do SGE Jogos Estudantis 2026

Frontend do **Sistema de Gestão Esportiva** dos Jogos Estudantis 2026 (Barra do Choça/BA,
**23 a 28 de novembro de 2026**). API no repositório separado **`F:\System_jogos`**
(Node + Express 5 + MySQL, no Render).

**Leia o contexto antes de qualquer tarefa de funcionalidade.** Regras do regulamento, modelo de
dados, fatias, pendências e decisões provisórias estão lá (idêntico nos dois repositórios):
@docs/CONTEXTO_NOVO_ESCOPO.md

Fontes originais: `docs/referencias/` (regulamento, tabela de grupos, `sumulas_modelos.md` e os PDFs
das súmulas). Roteiro da virada (já executada, com desvios): `F:\System_jogos\docs\MIGRACAO_PRODUCAO.md`.

---

## Estado atual (atualizado em 12/10/2026)

- **A produção JÁ RODA O SISTEMA NOVO desde 01/10/2026.** A Vercel publica a branch
  **`feat/novo-escopo`** (Branch Tracking de produção trocado de `main`, que segue com o frontend
  antigo) e o backend no Render também publica essa branch, com o banco `jogos_2026` na Railway.
  Tag do estado anterior: `v1-antes-do-novo-escopo`.
- ⚠️ **Push na `feat/novo-escopo` = deploy em produção.** Não dê push sem o usuário pedir e sem
  testar antes com o backend local no banco de dev.
- Fatias 1–7, 9 e 10 ✅; **8** 🔄 (falta técnicos/dirigentes, se entrarem); **11 — atletismo, xadrez,
  dama e dominó** ✅ (pontos lançados pela mesa). A fatia 10 foi executada com pendências de
  produção (backup, senha, contas de mesa): veja `F:\System_jogos\CLAUDE.md`.
- **Publicado em 20/10/2026** (até `5368f07`): súmula do "melhor de dois jogos", textos do jogo único e a **Agenda de
  Jogos**.
- **Commits locais ainda NÃO publicados (21/10/2026):** menu "Tabuleiro"/"Atletismo" e o lote dos pontos lançados —
  atletismo **por prova** (botões Salto/50 m/100 m, total da escola somando as provas), atletismo sem Aberto, aviso
  na revisão ao **substituir** valor gravado ("já tinha X, digitado por Y às HH:MM — substituir?"), grade **só com
  as escolas da folha** (busca por nome ou apelido), **histórico de correções** para o ADMIN e toque (categoria numa
  lista, gênero e prova com 44 px ou mais, Enter vai aos pontos da escola seguinte). ⚠️ Depende do backend do mesmo
  lote (com `db/16` e `db/17`): **backend primeiro, frontend logo em seguida.**
  A tela de agenda de jogos (`FormAgendaJogo`) já foi publicada em 05/10/2026.
- **Regras respondidas pelo chefe em 06/10/2026** (seção 12.1 do contexto): a tabela geral mostra
  **só a soma geral** (os três blocos saíram) e escolas com a mesma soma **dividem a posição**
  (1, 1, 3); o aviso do "melhor segundo" agora só aparece quando as equipes comparadas têm números
  de jogos diferentes. No mesmo dia: a semifinal com 3 grupos ficou 1ºA × melhor 2º e 1ºB × 1ºC,
  e o card do mata-mata mostra o aviso de revanche (vem em `observacao`) quando o melhor 2º é do
  grupo A; o 3º lugar sem semifinal vale 6 pontos e perdeu a marca de "regra provisória". O 4º e
  o 5º lugar pontuam (4 e 2) por regra provisória: a tabela geral mostra o aviso e marca esses
  pontos. Na súmula não há mais pênalti genérico: modalidade com regra de empate pendente (hoje o
  baleado) mostra o aviso e o jogo não é finalizado empatado. Seguem pendentes: a revanche na
  semifinal, o empate do baleado, atletismo (fatia 11, planejada), xadrez/dama/dominó, número de
  contas de mesa e a súmula do baleado.
- **Respostas do chefe de 07/10/2026:** 4º e 5º lugar e a revanche na semifinal viraram definitivos
  (os avisos saíram da tabela geral e do card do mata-mata); a tabela geral mostra o critério de
  desempate (mais 1ºs, depois 2ºs e 3ºs); a súmula do baleado tem o quadro "Acréscimo de 4 minutos"
  na final empatada; handebol e baleado com folhas de 12 linhas sempre; grade do vôlei de 1 a 30.
- **Respostas do chefe de 12/10/2026 (commits locais, sem push):** o quadro "Acréscimo de 4 minutos"
  aparece também na **semifinal** do baleado empatada (as fases vêm do backend, em
  `desempate.acrescimo.fases`); o **contador de baleados** de cada equipe conta as **adversárias que
  ela eliminou**, e o placar é o próprio contador (tela de preencher e folha impressa; o rótulo
  BALEADOS do papel fica); vôlei com 3 sets de 21, o 3º inclusive (só o texto da tela mudou).
  ⚠️ A tela nova lê `desempate.acrescimo`, que só o backend de 12/10 manda: publicar o backend antes.
  Pendente: empate do baleado no ida e volta.
- **Mais de 12/10/2026 (commits locais, sem push):** tela do ADMIN `/importar-jogos` (jogos da fase de
  grupos por CSV, com prévia) e a tela de pontos lançados (ADMIN e mesa; no menu, desde 21/10/2026, "Tabuleiro" em `/tabuleiro` e "Atletismo" em
  `/atletismo`; `/pontos-lancados` leva ao Tabuleiro): atletismo, xadrez, dama e dominó
  funcionam fora do sistema e a mesa digita os pontos de cada escola por categoria e gênero, com resumo
  antes de salvar, destaque de valor acima do esperado e rastro de quem digitou e alterou (fatia 11). A
  Tabela Geral mostra esses pontos na abertura de cada escola, fora do desempate. O menu lateral não mostra
  mais modalidade sem competição. ⚠️ Depende do backend com o `db/11`.
- **28/10/2026:** publicados o lote dos pontos lançados (`0d877c5`) e "Cadastrar Time" fora do menu
  (`2cc0925`; a página e a rota `/cadastro` continuam, e o botão "Cadastrar Escola" da Início também).
  **Commits locais, sem push:** tela do ADMIN **`/importar-atletas`** ("Importar Atletas" no menu):
  escolha do CSV, seletor de escola quando a planilha não tem a coluna Escola, prévia com filtro
  Todos/OK/Aviso/Erro, "importar só as linhas OK" explícito quando há erro, confirmar e botão do
  modelo CSV vazio. A tabela não mostra RG nem nascimento. ⚠️ Depende do backend com
  `/api/importar-atletas` (detalhes em `System_jogos/docs/IMPORTACAO_ATLETAS.md`): publicar o backend antes.
  **Trava de mesa por local (`db/18`, commits locais):** a tela `/usuarios` escolhe o local da conta de
  mesa, mostra o local na lista e avisa "sem local definido"; a sessão traz `local_id`/`local_nome` e é
  relida em `GET /api/eu` ao abrir o app (`localDaMesa` no `useAuth`); a Agenda mostra à mesa o local
  dela primeiro, marcado "sua mesa", com o botão "Só o meu local". O botão "Reiniciar Campeonato" só
  aparece se `/saude` disser `reiniciar_permitido` (além da constante desligada de 07/10). ⚠️ Depende
  do backend com o `db/18` e `/api/eu`: publicar o backend antes.

## Infraestrutura

| Peça | Onde |
|---|---|
| Frontend | **Vercel** — https://sge-frontend-seven.vercel.app (`vercel.json` com rewrite de SPA; produção = `feat/novo-escopo`) |
| Backend | **Render** — https://system-jogos-estudantis.onrender.com (plano free: 1ª requisição ~50s) |
| Banco | **Railway**, MySQL 9.7.2, banco `jogos_2026` (sem backup automático neste plano; crédito gratuito acaba ~18/10) |

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
| `/agenda`, `/agenda/:id` | Agenda de Jogos: lista por dia e local, "Tabela nº" do chefe ao lado do "Jogo" (busca aceita o número), filtros na URL, e o detalhe com os atletas (só nome e camisa) | público |
| `/modalidades/:slug` | competições da modalidade | público |
| `/competicoes/:id` | jogos, classificação, mata-mata, suspensões, artilharia | público (ações por perfil) |
| `/preencher-sumula/:id` | lançar súmula | ADMIN ou PLACAR |
| `/detalhes-sumula/:id` | ver/imprimir súmula | público |
| `/artilharia`, `/tabela-geral`, `/lista-atletas` | consultas | público (RG nunca aparece; sexo e nascimento só para o ADMIN — a API não os manda ao público, pendência 19) |
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
  `src/config/regrasProvisorias.js`, `chavesMataMata.js`, `folhasSumula.js`)
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
