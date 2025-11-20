import { fetchUtils } from "react-admin";

const envUrl = (import.meta as any).env?.VITE_ASP_NET_BASE_URL || (process.env.VITE_ASP_NET_BASE_URL as string);
export const ASP_NET_API_URL = `${envUrl.replace(/\/$/, '')}/api`;

export const httpClient = (url: string, options: fetchUtils.Options = {}) => { 
    const headers = new Headers(options.headers || { Accept: 'application/json' });
    const token = localStorage.getItem('auth_token');

    headers.set('Authorization', `Bearer ${token}`);
    options.headers = headers;
    return fetchUtils.fetchJson(url, options);
};