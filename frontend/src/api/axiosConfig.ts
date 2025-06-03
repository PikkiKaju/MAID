import axios from 'axios';

// TODO 
// In production we should use something like .env
const API_BASE_URL = 'http://localhost:5000/api';
// const authToken = localStorage.getItem('authToken'); -> narazie nie działa

const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    // ...(authToken && { Authorization: `Bearer ${authToken}` }),
  },
});

export default axiosInstance;