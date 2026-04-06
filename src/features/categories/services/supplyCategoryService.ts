import { apiClient, type PaginatedResponse } from '@/shared/services/apiClient';

export interface Category {
    categoriaId: number;
    nombre: string;
    descripcion: string;
    estado: boolean;
    cantidadProductos?: number;
    fechaCreacion?: string;
    fechaActualizacion?: string;
}

export const supplyCategoryService = {
    async getCategories(params?: { page?: number; pageSize?: number; search?: string }): Promise<PaginatedResponse<Category>> {
        const response = await apiClient.get<any>('/api/Categorias', params);
        
        if (response && response.data && Array.isArray(response.data)) {
            return response;
        }

        // Fallback
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

    async getCategoryById(id: number): Promise<Category> {
        return apiClient.get(`/api/Categorias/${id}`);
    },

    async createCategory(category: Omit<Category, 'categoriaId' | 'cantidadProductos'>): Promise<Category> {
        return apiClient.post('/api/Categorias', category);
    },

    async updateCategory(id: number, category: Partial<Category>): Promise<Category> {
        // Ensure id is sent in the URL
        return apiClient.put(`/api/Categorias/${id}`, category);
    },

    async deleteCategory(id: number): Promise<void> {
        return apiClient.delete(`/api/Categorias/${id}`);
    }
};
