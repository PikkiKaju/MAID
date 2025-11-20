import axios from 'axios';

const API_BASE_URL = String(import.meta.env.VITE_ASP_NET_BASE_URL).concat("/api");

const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export default axiosInstance;