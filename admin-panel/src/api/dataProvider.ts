import {
    type DataProvider,
    type RaRecord,
    type CreateParams,
    type CreateResult,
    type UpdateParams,
    type UpdateResult,
    type DeleteParams,
    type DeleteResult,
} from 'react-admin';
import { API_SERVER, httpClient } from './httpClient';

const apiUrl = `${API_SERVER}/Admin`;

export const dataProvider: DataProvider = {
    getList: async (resource, params) => {
        const { json } = await httpClient(`${apiUrl}/admin-data`);
        const data = json[resource];
        console.log(params)
        return { data, total: data.length };
    },

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

    delete: async <RecordType extends RaRecord = any>(
        resource: string,
        params: DeleteParams<RecordType>
    ): Promise<DeleteResult<RecordType>> => {
        const deleteUrl = `${apiUrl}/user/${params.id}`;
        
        await httpClient(deleteUrl, { method: 'DELETE' });
        
        const deletedRecord = (params.previousData || { id: params.id }) as RecordType;
        
        console.log(`Usunięto ${resource} o ID: ${params.id}`);
        return { data: deletedRecord };
    },

    deleteMany: async (resource, params) => {
        const resourceName = resource.slice(0, resource.length - 1)

        const deletePromises = params.ids.map(id => {
            const deleteUrl = `${apiUrl}/${resourceName}/${id}`;
            return httpClient(deleteUrl, { method: 'DELETE' });
        });

        await Promise.all(deletePromises);

        return Promise.resolve({ data: params.ids });
    },

    //
    // Others dont work but I should simulate them
    // 

    create: async <RecordType extends Omit<RaRecord, 'id'>, ResultRecordType extends RaRecord>(
        resource: string,
        params: CreateParams<RecordType>
    ): Promise<CreateResult<ResultRecordType>> => {
        const newRecord = {
            ...(params.data as object),
            id: Date.now().toString(),
        } as ResultRecordType;
        console.log(resource)
        return Promise.resolve({ data: newRecord });
    },

    update: async <RecordType extends RaRecord>(
        resource: string,
        params: UpdateParams<RecordType>
    ): Promise<UpdateResult<RecordType>> => {
        const updatedRecord = {
            ...params.data,
        } as RecordType;
        console.log(resource)
        return Promise.resolve({ data: updatedRecord });
    },

    updateMany: async (resource, params) => {
        console.log(resource)
        return Promise.resolve({ data: params.ids });
    },
};
