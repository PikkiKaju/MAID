import {
    type DataProvider,
    fetchUtils,
    type RaRecord,
    type CreateParams,
    type CreateResult,
    type UpdateParams,
    type UpdateResult,
} from 'react-admin';

const apiUrl = 'http://localhost:5000/api/Admin';
const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1bmlxdWVfbmFtZSI6IkFkbWluIiwibmFtZWlkIjoiNjA1ZWVkNzAtNGE2MS00ZmJlLWFmZjctNzE3Yzk4M2IwNjFkIiwicm9sZSI6IkFkbWluIiwibmJmIjoxNzQ5NDYxNzgwLCJleHAiOjE3NDk0Njg5ODAsImlhdCI6MTc0OTQ2MTc4MH0.wVYxenbDiU88_dbFWGlypyd0kJl0XMN24lbvpI9Lo0I'

const httpClient = (url: string, options: fetchUtils.Options = {}) => {
    const headers = new Headers(options.headers || { Accept: 'application/json' });
    headers.set('Authorization', `Bearer ${token}`);
    options.headers = headers;
    return fetchUtils.fetchJson(url, options);
};

export const dataProvider: DataProvider = {
    getList: async (resource, params) => {
        const { json } = await httpClient(`${apiUrl}/admin-data`);
        const data = json[resource];
        return { data, total: data.length };
    },

    //
    // Others dont work but I should simulate them
    // 

    getOne: async (resource, { id }) => {
        const { json } = await httpClient(`${apiUrl}/admin-data`);
        const item = json[resource].find((el: any) => el.id === id);
        return { data: item };
    },

    getMany: async (resource, { ids }) => {
        const { json } = await httpClient(`${apiUrl}/admin-data`);
        const data = json[resource].filter((item: any) => ids.includes(item.id));
        return { data };
    },

    getManyReference: async () => Promise.resolve({ data: [], total: 0 }),

    create: async <RecordType extends Omit<RaRecord, 'id'>, ResultRecordType extends RaRecord>(
        resource: string,
        params: CreateParams<RecordType>
    ): Promise<CreateResult<ResultRecordType>> => {
        const newRecord = {
            ...(params.data as object),
            id: Date.now().toString(),
        } as ResultRecordType;

        return Promise.resolve({ data: newRecord });
    },

    update: async <RecordType extends RaRecord>(
        resource: string,
        params: UpdateParams<RecordType>
    ): Promise<UpdateResult<RecordType>> => {
        const updatedRecord = {
            ...params.data,
        } as RecordType;

        return Promise.resolve({ data: updatedRecord });
    },

    updateMany: async (resource, params) => {
        return Promise.resolve({ data: params.ids });
    },

    delete: async (resource, params) => {
    const { json } = await httpClient(`${apiUrl}/admin-data`);
    const deleted = json[resource].find((item: any) => item.id === params.id);
    return Promise.resolve({ data: deleted });
},

    deleteMany: async (resource, params) => {
        return Promise.resolve({ data: params.ids });
    },
};
