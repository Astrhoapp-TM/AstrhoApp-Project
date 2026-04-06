import { apiClient, type PaginatedResponse } from '@/shared/services/apiClient';

export interface SupplierAPI {
    proveedorId?: number;
    tipoProveedor: string;
    nombre: string;
    tipoDocumento: string;
    documento: string;
    personaContacto?: string; // GET uses personaContacto
    persona_Contacto?: string; // POST/PUT uses persona_Contacto
    correo: string;
    telefono: string;
    direccion: string;
    departamento: string;
    ciudad: string;
    estado: boolean;
}

export const supplierService = {
    getAll: async (params?: { page?: number; pageSize?: number; search?: string }): Promise<PaginatedResponse<SupplierAPI>> => {
        return apiClient.get<PaginatedResponse<SupplierAPI>>('/api/Proveedores', params);
    },

    getById: async (id: number): Promise<SupplierAPI> => {
        return apiClient.get(`/api/Proveedores/${id}`);
    },

    create: async (supplier: any): Promise<SupplierAPI> => {
        return apiClient.post('/api/Proveedores', supplier);
    },

    update: async (id: number, supplier: any): Promise<SupplierAPI> => {
        return apiClient.put(`/api/Proveedores/${id}`, supplier);
    },

    delete: async (id: number): Promise<any> => {
        return apiClient.delete(`/api/Proveedores/${id}`);
    }
};
