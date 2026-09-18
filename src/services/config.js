// Endereço da API, definido por ambiente em .env.development / .env.production.
// O valor é resolvido no build: mudou a variável, precisa reconstruir.
const bruto = import.meta.env.VITE_API_URL;

if (!bruto) {
  // Sem a variável o site tentaria falar com a máquina de quem acessa.
  // Falhar em silêncio esconderia a causa real do erro em produção.
  console.error(
    '[SGE] VITE_API_URL não está definida. Configure-a no .env do ambiente ' +
    '(ou nas variáveis do projeto na Vercel) e refaça o build. ' +
    'Usando http://localhost:3000 como último recurso.'
  );
}

// A barra final é removida para as rotas serem montadas sempre igual
export const API_URL = (bruto || 'http://localhost:3000').replace(/\/$/, '');
