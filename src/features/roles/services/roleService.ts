import { apiClient, type PaginatedResponse } from '@/shared/services/apiClient';

export interface RolListDto {
    rolId: number;
    nombre: string;
    descripcion: string;
    estado: boolean;
    permisos: string[];
}

export interface RolResponseDto {
    rolId: number;
    nombre: string;
    descripcion: string;
    estado: boolean;
    permisosIds: number[];
    permisos: string[];
}

export interface CrearRolDto {
    nombre: string;
    descripcion: string;
    permisosIds: number[];
}

export interface ActualizarRolDto {
    nombre: string;
    descripcion: string;
    permisosIds: number[];
    estado: boolean;
}

export const roleService = {
    getRoles: async (params?: { page?: number; pageSize?: number; search?: string }): Promise<PaginatedResponse<RolListDto>> => {
        const response = await apiClient.get<any>('/api/Roles', params);
        
        if (response && response.data && Array.isArray(response.data)) {
            return response;
        }

        // Fallback for simple array response
        if (Array.isArray(response)) {
            return {
                data: response,
                totalCount: response.length,
                page: params?.page || 1,
                pageSize: params?.pageSize || response.length,
                totalPages: 1
            };
        }

        return { data: [], totalCount: 0, page: 1, pageSize: 10, totalPages: 0 };
    },

    getRoleById: async (id: number): Promise<RolResponseDto> => {
        return await apiClient.get<RolResponseDto>(`/api/Roles/${id}`);
    },

    createRole: async (role: CrearRolDto): Promise<RolResponseDto> => {
        return await apiClient.post<RolResponseDto>('/api/Roles', role);
    },

    updateRole: async (id: number, role: ActualizarRolDto): Promise<void> => {
        return await apiClient.put<void>(`/api/Roles/${id}`, role);
    },

    deleteRole: async (id: number): Promise<void> => {
        return await apiClient.delete<void>(`/api/Roles/${id}`);
    },

    // Temporary mapping for permissions until an API endpoint is found
    // The backend seems to use numeric IDs for permissions
    getPermissions: async () => {
        // In a real scenario, this would be an API call like GET /api/Permisos
        // For now, we use the mock permissions but we will need to map them to IDs
        return [
            { id: 1, key: 'module_dashboard', name: 'Dashboard', module: 'dashboard' },
            { id: 2, key: 'module_users', name: 'Usuarios', module: 'users' },
            { id: 3, key: 'module_appointments', name: 'Citas', module: 'appointments' },
            { id: 4, key: 'module_services', name: 'Servicios', module: 'services' },
            { id: 6, key: 'module_sales', name: 'Ventas', module: 'sales' },
            { id: 7, key: 'module_purchases', name: 'Compras', module: 'purchases' },
            { id: 8, key: 'module_suppliers', name: 'Proveedores', module: 'suppliers' },
            { id: 9, key: 'module_products', name: 'Productos', module: 'products' },
            { id: 10, key: 'module_clients', name: 'Clientes', module: 'clients' },
            { id: 11, key: 'module_categories', name: 'Categorías', module: 'categories' },
            { id: 12, key: 'module_schedules', name: 'Horarios', module: 'schedules' },
            { id: 13, key: 'module_supplies', name: 'Insumos', module: 'supplies' },
            { id: 14, key: 'module_deliveries', name: 'Entregas', module: 'deliveries' },
            { id: 16, key: 'module_roles', name: 'Roles', module: 'roles' }
        ];
    }
};
