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
import { ASP_NET_API_URL, httpClient } from './httpClient';

const apiUrl = `${ASP_NET_API_URL}/Admin`;

export const dataProvider: DataProvider = {
    getList: async (resource, params) => {
        const {
            pagination = { page: 1, perPage: 10 },
            sort = { field: 'id', order: 'ASC' },
            filter = {},
        } = params;

        const { page, perPage } = pagination;
        const { field, order } = sort;

        const { json } = await httpClient(`${apiUrl}/admin-data`);
        let allData = json[resource];

        // 1. Data filter
        if (Object.keys(filter).length > 0) {
            allData = allData.filter((item: any) => {
                let matches = true;
                for (const key in filter) {
                    if (filter.hasOwnProperty(key)) {
                        const filterValue = String(filter[key]).toLowerCase();
                        const itemValue = item[key] ? String(item[key]).toLowerCase() : '';

                        if (!itemValue.includes(filterValue)) {
                            matches = false;
                            break;
                        }
                    }
                }
                return matches;
            });
        }

        // 2. Data Sorting
        if (field && order) {
            allData.sort((a: any, b: any) => {
                const aValue = a[field];
                const bValue = b[field];

                if (aValue === undefined || bValue === undefined) {
                    return 0;
                }

                if (aValue > bValue) return order === 'ASC' ? 1 : -1;
                if (aValue < bValue) return order === 'ASC' ? -1 : 1;
                return 0;
            });
        }

        // 3. Data Pagnitation
        const total = allData.length; 
        const start = (page - 1) * perPage;
        const end = page * perPage;
        const data = allData.slice(start, end);

        return { data, total };
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
    // Others dont work but I have to simulate them
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
