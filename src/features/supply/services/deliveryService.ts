import { apiClient, type PaginatedResponse } from '@/shared/services/apiClient';

export interface DeliveryDetail {
    insumoId: number;
    cantidad: number;
    insumoNombre?: string;
    sku?: string;
}

export interface Delivery {
    id: number;
    entregaInsumoId?: number; // Added for API consistency
    usuarioId: number;
    documentoEmpleado: string;
    fechaCreado: string;
    fechaEntrega: string;
    fechaCompletado?: string | null;
    estado: string;
    estadoId?: number; // Added for API consistency
    cantidadItems: number;
    detalles?: DeliveryDetail[];
}

export interface CreateDeliveryData {
    usuarioId: number;
    fechaEntrega: string;
    documentoEmpleado: string;
    detalles: {
        insumoId: number;
        cantidad: number;
    }[];
}

export interface UpdateDeliveryData {
    entregainsumoId?: number;
    usuarioId?: number;
    documentoEmpleado?: string;
    estadoId?: number;
    fechaEntrega?: string;
    detalles?: {
        insumoId: number;
        cantidad: number;
    }[];
}

// Map Backend DTO to Frontend Model
const mapBackendToDelivery = (data: any): Delivery => {
    if (!data) return {} as Delivery;
    
    // DEBUG: Ver la estructura real que llega del backend
    console.log("Raw delivery from API:", data);

    // Unwrap $values if present
    const rawDetalles = data.detalles?.$values || data.detalles || 
                        data.Detalles?.$values || data.Detalles || 
                        data.detallesEntregas?.$values || data.detallesEntregas || 
                        data.DetallesEntregas?.$values || data.DetallesEntregas || 
                        data.detalleEntrega?.$values || data.detalleEntrega || 
                        data.DetalleEntrega?.$values || data.DetalleEntrega || [];
    
    // More resilient property access for status
    let estadoRaw = data.estado || data.Estado || data.status || data.Status || '';
    let estado = estadoRaw.toString();
    const s = estado.toLowerCase();

    // Map backend technical terms to user-facing terms
    // The user states: 1 -> Pendiente, 2 -> Completado, 3 -> Cancelado
    const estadoId = data.estadoId || data.EstadoId;
    if (estadoId === 1) {
        estado = 'Pendiente';
    } else if (estadoId === 2) {
        estado = 'Completado';
    } else if (estadoId === 3) {
        estado = 'Cancelado';
    } else {
        // Fallback to string if no estadoId or if it's something else
        if (s.includes('entregado') || s.includes('completed') || s.includes('completado')) {
            estado = 'Completado';
        } else if (s.includes('cancelado') || s.includes('cancelled')) {
            estado = 'Cancelado';
        } else if (s.includes('pendiente') || s.includes('pending')) {
            estado = 'Pendiente';
        } else {
            estado = s ? (s.charAt(0).toUpperCase() + s.slice(1)) : 'Pendiente';
        }
    }

    const mappedDetalles = Array.isArray(rawDetalles) ? rawDetalles.map((d: any) => ({
        insumoId: d.insumoId ?? d.InsumoId ?? 0,
        cantidad: d.cantidad ?? d.Cantidad ?? 0,
        insumoNombre: d.insumoNombre ?? d.InsumoNombre,
        sku: d.sku ?? d.Sku ?? d.SKU
    })) : [];

    // Calculate total units (sum of quantities)
    const totalUnits = mappedDetalles.reduce((acc, item) => acc + (item.cantidad || 0), 0);

    return {
        id: data.entregainsumoId || data.entregaInsumoId || data.id,
        entregaInsumoId: data.entregainsumoId || data.entregaInsumoId || data.id,
        usuarioId: data.usuarioId || data.UsuarioId,
        documentoEmpleado: data.documentoEmpleado || data.DocumentoEmpleado,
        fechaCreado: data.fechaCreado || data.FechaCreado,
        fechaEntrega: data.fechaEntrega || data.FechaEntrega,
        fechaCompletado: data.fechaCompletado || data.FechaCompletado,
        estado: estado,
        estadoId: estadoId,
        cantidadItems: mappedDetalles.length > 0
            ? mappedDetalles.length
            : (data.cantidadItems ?? data.CantidadItems ?? data.totalItems ?? data.totalInsumos ?? 0),
        detalles: mappedDetalles
    };
};

export const deliveryService = {
    // GET ALL
    async getDeliveries(params?: { page?: number; pageSize?: number; search?: string }): Promise<PaginatedResponse<Delivery>> {
        const response: any = await apiClient.get('/api/Entregas', params);
        
        // Use normalized response from apiClient if available
        if (response && response.data && Array.isArray(response.data)) {
            return {
                ...response,
                data: response.data.map(mapBackendToDelivery)
            };
        }

        // Fallback for direct array response
        const data = response?.$values || response;
        if (Array.isArray(data)) {
            return {
                data: data.map(mapBackendToDelivery),
                totalCount: data.length,
                page: params?.page || 1,
                pageSize: params?.pageSize || data.length,
                totalPages: 1
            };
        }
        
        return { data: [], totalCount: 0, page: 1, pageSize: 10, totalPages: 0 };
    },

    // GET ONE
    async getDeliveryById(id: number): Promise<Delivery> {
        const response = await apiClient.get(`/api/Entregas/${id}`);
        return mapBackendToDelivery(response);
    },

    // CREATE
    async createDelivery(data: CreateDeliveryData): Promise<Delivery> {
        // The API Expects CrearEntregaDto: { documentoEmpleado, detalles: [ { insumoId, cantidad } ] }
        const response = await apiClient.post('/api/Entregas', data);
        return mapBackendToDelivery(response);
    },

    // UPDATE STATUS (via PUT /api/Entregas/{id})
    async updateDelivery(id: number, data: UpdateDeliveryData | any): Promise<Delivery> {
        // Ensure the ID is consistent between URL and Body if required by the .NET API
        const payload = {
            ...data,
            entregainsumoId: data.entregainsumoId || id
        };

        const response = await apiClient.put(`/api/Entregas/${id}`, payload);

        // Handle 204 No Content or null response by fetching the latest data from server
        if (!response) {
            return await this.getDeliveryById(id);
        }

        return mapBackendToDelivery(response);
    }
};
