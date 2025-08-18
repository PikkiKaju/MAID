import { API_SERVER } from "./api/httpClient";

const authProvider = {
    login: async ({ username, password }: { username: string; password: string }) => {
        const request = new Request(`${API_SERVER}/Auth/login`, {
            method: 'POST',
            body: JSON.stringify({ username, password }),
            headers: new Headers({ 'Content-Type': 'application/json' }),
        });

        const response = await fetch(request);
        if (!response.ok) {
            throw new Error('Login failed');
        }

        const { token } = await response.json();
        localStorage.setItem('auth_token', token);
        return Promise.resolve();
    },

    logout: () => {
        localStorage.removeItem('auth_token');
        return Promise.resolve();
    },

    checkAuth: () => {
        return localStorage.getItem('auth_token') ? Promise.resolve() : Promise.reject();
    },

    checkError: (error: any) => {
        const status = error.status;
        if (status === 401 || status === 403) {
            localStorage.removeItem('auth_token');
            return Promise.reject();
        }
        return Promise.resolve();
    },

    getPermissions: () => Promise.resolve(),
};

export default authProvider;
