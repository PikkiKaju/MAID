import {
    type DataProvider,
    type RaRecord,
    type CreateParams,
    type CreateResult,
    type UpdateParams,
    type UpdateResult,
} from 'react-admin';
import { API_SERVER, httpClient } from './httpClient';

const apiUrl = `${API_SERVER}/Admin`;

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
