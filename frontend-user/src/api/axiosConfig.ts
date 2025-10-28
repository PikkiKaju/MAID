import axios from 'axios';

// TODO 
// In production we should hide that url
const API_BASE_URL = import.meta.env.VITE_ASP_NET_API_BASE || 'http://localhost:5000/api';

const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export default axiosInstance;