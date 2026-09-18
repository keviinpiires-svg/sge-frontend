// Endereço da API. Em produção vem de VITE_API_URL (Vercel/Netlify);
// sem a variável, cai no backend local de desenvolvimento.
// A barra final é removida para as rotas serem montadas sempre igual.
const bruto = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export const API_URL = bruto.replace(/\/$/, '');
