import { apiClient } from "./apiClient";

export interface Motivo {
  motivoId: number;
  fecha: string;
  horaInicio: string;
  horaFin: string;
  descripcion: string;
  documentoEmpleado: string;
  nombreEmpleado?: string;
  estado: "pendiente" | "aprobado" | "rechazado";
}

export interface CreateMotivoData {
  fecha: string;
  horaInicio: string;
  horaFin: string;
  descripcion: string;
}

export interface UpdateMotivoData {
  fecha?: string;
  horaInicio?: string;
  horaFin?: string;
  descripcion?: string;
  estado?: "pendiente" | "aprobado" | "rechazado";
}

export const motivoService = {
  async getAll(): Promise<Motivo[]> {
    return apiClient.get("/api/Motivo");
  },

  async getById(id: number): Promise<Motivo> {
    return apiClient.get(`/api/Motivo/${id}`);
  },

  async create(data: CreateMotivoData): Promise<Motivo> {
    return apiClient.post("/api/Motivo", data);
  },

  async update(id: number, data: UpdateMotivoData): Promise<Motivo | null> {
    return apiClient.put(`/api/Motivo/${id}`, data);
  },

  async delete(id: number): Promise<void> {
    return apiClient.delete(`/api/Motivo/${id}`);
  },
};
