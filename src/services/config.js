// Endereço da API, definido por ambiente em .env.development / .env.production.
// O valor é resolvido no build: mudou a variável, precisa reconstruir.
const bruto = import.meta.env.VITE_API_URL;

if (!bruto) {
  // Falhar em silêncio esconderia a causa real do erro.
  console.error(
    '[SGE] VITE_API_URL não está definida. Configure-a no .env do ambiente ' +
    '(ou nas variáveis do projeto na Vercel) e refaça o build.'
  );
}

// O fallback para o backend local só existe em desenvolvimento. Em produção
// apontar para localhost seria pior que falhar: o site tentaria falar com a
// máquina de quem acessa. Como o Vite substitui import.meta.env.DEV por false
// no build, a string do localhost nem chega ao bundle publicado.
const fallback = import.meta.env.DEV ? 'http://localhost:3000' : '';

// A barra final é removida para as rotas serem montadas sempre igual
export const API_URL = (bruto || fallback).replace(/\/$/, '');
