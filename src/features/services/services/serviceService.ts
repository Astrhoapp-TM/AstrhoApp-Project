import { apiClient, type PaginatedResponse } from '@/shared/services/apiClient';

export interface Service {
    servicioId: number;
    nombre: string;
    descripcion: string;
    precio: number;
    duracion: number;
    estado: boolean;
    imagen?: string; // Columna directa en la tabla Servicios
    categoriaId?: number;
    fechaCreacion?: string;
    fechaActualizacion?: string;
}

export const serviceService = {
    async getServices(params?: { page?: number; pageSize?: number; search?: string }): Promise<PaginatedResponse<Service>> {
        return apiClient.get('/api/Servicios', params);
    },

    async getServiceById(id: number): Promise<Service> {
        return apiClient.get(`/api/Servicios/${id}`);
    },

    async createService(service: Omit<Service, 'servicioId'> | FormData): Promise<Service> {
        return apiClient.post('/api/Servicios', service);
    },

    async updateService(id: number, service: Partial<Service> | FormData): Promise<Service> {
        return apiClient.put(`/api/Servicios/${id}`, service);
    },

    async deleteService(id: number): Promise<void> {
        return apiClient.delete(`/api/Servicios/${id}`);
    }
};
