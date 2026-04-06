import { apiClient, type PaginatedResponse } from '@/shared/services/apiClient';

export interface SupplyDeliveryItem {
    id?: number;
    supplyDeliveryId?: number;
    supplyId: number;
    quantity: number;
}

export interface SupplyDelivery {
    id: number;
    supplyId: number; // for single item backwards compatibility if needed. usually it's items array
    deliveryDate: string;
    quantity: number;
    destination: string;
    responsiblePerson: string;
    responsibleId: number;
    status: 'pending' | 'completed' | 'cancelled';
    notes?: string;
    createdBy: number;
    createdAt: string;
    completedAt?: string;
    items?: SupplyDeliveryItem[];
}

export const supplyDeliveryService = {
    async getDeliveries(params?: { page?: number; pageSize?: number; search?: string }): Promise<PaginatedResponse<SupplyDelivery>> {
        return apiClient.get<PaginatedResponse<SupplyDelivery>>('/api/SupplyDelivery', params);
    },

    async getDeliveryById(id: number): Promise<SupplyDelivery> {
        return apiClient.get(`/api/SupplyDelivery/${id}`);
    },

    async createDelivery(delivery: Omit<SupplyDelivery, 'id'>): Promise<SupplyDelivery> {
        return apiClient.post('/api/SupplyDelivery', delivery);
    },

    async updateDelivery(id: number, delivery: Partial<SupplyDelivery>): Promise<SupplyDelivery> {
        return apiClient.put(`/api/SupplyDelivery/${id}`, delivery);
    },

    async deleteDelivery(id: number): Promise<void> {
        return apiClient.delete(`/api/SupplyDelivery/${id}`);
    }
};
