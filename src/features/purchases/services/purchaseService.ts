import { apiClient, type PaginatedResponse } from '@/shared/services/apiClient';

// ── Response Interfaces ──

export interface PurchaseDetailAPI {
    detalleCompraId: number;
    insumoId: number;
    insumoNombre: string;
    cantidad: number;
    precioUnitario: number;
    subtotal: number;
}

export interface PurchaseAPI {
    compraId: number;
    fechaRegistro: string;
    proveedorId: number;
    proveedorNombre: string;
    iva: number;
    subtotal: number;
    total: number;
    estado: boolean;
    detalles: PurchaseDetailAPI[];
}

// ── Request Interfaces ──

export interface CreatePurchaseItem {
    insumoId: number;
    cantidad: number;
    precioUnitario: number;
}

export interface CreatePurchaseRequest {
    proveedorId: number;
    iva: number;
    purchaseNumber?: string;
    notes?: string;
    fechaRegistro?: string;
    items: CreatePurchaseItem[];
}

export interface UpdatePurchaseRequest {
    proveedorId: number;
    iva: number;
    estado: boolean;
    observacion?: string;
}

// ── Service ──

export const purchaseService = {
    getAll: async (params?: { pagina?: number; registrosPorPagina?: number; buscar?: string }): Promise<PaginatedResponse<PurchaseAPI>> => {
        const response = await apiClient.get<any>('/api/Compras', params);
        
        // Si el resultado ya tiene el formato PaginatedResponse
        if (response && response.data && Array.isArray(response.data)) {
            return response;
        }

        // Fallback para cuando la API devuelve un array directamente
        if (Array.isArray(response)) {
            return {
                data: response,
                totalCount: response.length,
                page: params?.pagina || 1,
                pageSize: params?.registrosPorPagina || response.length,
                totalPages: 1
            };
        }

        return { data: [], totalCount: 0, page: 1, pageSize: 10, totalPages: 0 };
    },

    getById: async (id: number): Promise<PurchaseAPI> => {
        return apiClient.get(`/api/Compras/${id}`);
    },

    create: async (data: CreatePurchaseRequest): Promise<PurchaseAPI> => {
        return apiClient.post('/api/Compras', data);
    },

    update: async (id: number, data: UpdatePurchaseRequest): Promise<PurchaseAPI> => {
        const result = await apiClient.put(`/api/Compras/${id}`, data);
        if (!result) {
            return { compraId: id, ...data } as unknown as PurchaseAPI;
        }
        return result as PurchaseAPI;
    },

    delete: async (id: number): Promise<void> => {
        return apiClient.delete(`/api/Compras/${id}`);
    }
};
