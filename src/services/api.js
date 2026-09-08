import axios from 'axios';

const api = axios.create({
  // Devolvemos o /api para o final do endereço base
  baseURL: 'http://localhost:3000/api', 
});

export default api;