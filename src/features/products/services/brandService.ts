import { apiClient } from '@/shared/services/apiClient';

export interface Brand {
    marcaId: number;
    nombre: string;
    descripcion: string;
    estado: boolean;
}

export const brandService = {
    async getBrands(): Promise<Brand[]> {
        return apiClient.get('/api/Marca');
    },

    async createBrand(brand: Omit<Brand, 'marcaId'>): Promise<Brand> {
        return apiClient.post('/api/Marca', brand);
    },

    async updateBrand(id: number, brand: Partial<Brand>): Promise<Brand> {
        return apiClient.put(`/api/Marca/${id}`, brand);
    },

    async deleteBrand(id: number): Promise<void> {
        return apiClient.delete(`/api/Marca/${id}`);
    }
};
