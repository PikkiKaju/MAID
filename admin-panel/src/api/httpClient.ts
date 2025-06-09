import { fetchUtils } from "react-admin";

export const API_SERVER = 'http://localhost:5000/api'

export const httpClient = (url: string, options: fetchUtils.Options = {}) => { 
    const headers = new Headers(options.headers || { Accept: 'application/json' });
    const token = localStorage.getItem('auth_token');

    headers.set('Authorization', `Bearer ${token}`);
    options.headers = headers;
    return fetchUtils.fetchJson(url, options);
};