import { apiClient } from "@/shared/services/apiClient";

// ── Interfaces ──

export interface Horario {
  horarioId: number;
  nombre: string;
  estado: boolean;
  dias?: HorarioDia[];
  horarioDias?: HorarioDia[];
}

export interface HorarioDia {
  horarioDiaId: number;
  diaSemana: string;
  horaInicio: string;
  horaFin: string;
}

export interface CreateHorarioData {
  nombre: string;
  estado: boolean;
  dias: HorarioDia[];
}

export interface UpdateHorarioData {
  nombre: string;
  estado: boolean;
  dias: HorarioDia[];
}

export interface HorarioEmpleado {
  horarioEmpleadoId: number;
  horarioId: number;
  documentoEmpleado: string | null;
  empleadoNombre: string | null;
  diaSemana: string | null;
  horaInicio: string | null;
  horaFin: string | null;
}

export interface CreateHorarioEmpleadoData {
  horarioId: number;
  documentoEmpleado: string | null;
  diaSemana?: string; // Para facilitar el mapeo al crear/editar horarios
}

export interface BulkHorarioEmpleadoData {
  dias: {
    horarioDiaId: number;
    empleados: string[];
  }[];
}

export interface UpdateHorarioEmpleadoData {
  horarioId?: number | null;
  documentoEmpleado?: string | null;
}

export interface Empleado {
  documentoEmpleado: string;
  tipoDocumento: string;
  usuarioId: number;
  nombre: string;
  telefono: string;
  estado: boolean;
}

// ── Schedule Group (frontend-only, persisted in localStorage) ──

export interface DaySchedule {
  horarioDiaId?: number;
  dia: string;
  horaInicio: string;
  horaFin: string;
  enabled: boolean;
}

export interface ScheduleGroup {
  id: string;
  nombre: string;
  horarioIds: number[];
  estado: boolean;
}

const STORAGE_KEY = "astrho_schedule_groups";

export const scheduleGroupService = {
  getAll(): ScheduleGroup[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  save(groups: ScheduleGroup[]): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(groups));
  },

  upsert(group: ScheduleGroup): void {
    const groups = this.getAll();
    const idx = groups.findIndex((g) => g.id === group.id);
    if (idx >= 0) {
      groups[idx] = group;
    } else {
      groups.push(group);
    }
    this.save(groups);
  },

  delete(groupId: string): void {
    const groups = this.getAll().filter((g) => g.id !== groupId);
    this.save(groups);
  },

  generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
  },
};

// ── Horario Service ──

export const horarioService = {
  async getAll(): Promise<Horario[]> {
    return apiClient.get("/api/Horario");
  },

  async getById(id: number): Promise<Horario> {
    return apiClient.get(`/api/Horario/${id}`);
  },

  async create(data: CreateHorarioData): Promise<Horario> {
    return apiClient.post("/api/Horario", data);
  },

  async update(id: number, data: UpdateHorarioData): Promise<Horario | null> {
    return apiClient.put(`/api/Horario/${id}`, data);
  },

  async toggle(id: number): Promise<void> {
    return apiClient.patch(`/api/Horario/${id}/toggle`);
  },

  async delete(id: number): Promise<void> {
    return apiClient.delete(`/api/Horario/${id}`);
  },
};

// ── HorarioEmpleado Service ──

export const horarioEmpleadoService = {
  async getAll(): Promise<HorarioEmpleado[]> {
    return apiClient.get("/api/HorarioEmpleado");
  },

  async create(data: CreateHorarioEmpleadoData): Promise<HorarioEmpleado> {
    return apiClient.post("/api/HorarioEmpleado", data);
  },

  async createBulk(data: BulkHorarioEmpleadoData): Promise<void> {
    const endpoint = "/api/HorarioEmpleado/masivo";
    console.log(`[scheduleService] Llamando a ${endpoint} con payload:`, JSON.stringify(data, null, 2));
    return apiClient.post(endpoint, data);
  },

  async createMasivo(data: { horarioId: number; documentosEmpleado: string[] }): Promise<void> {
    // Mantener por compatibilidad temporal si es necesario, pero redirigir a la nueva estructura si es posible
    const bulkData: BulkHorarioEmpleadoData = {
      dias: [{ horarioDiaId: data.horarioId, empleados: data.documentosEmpleado }]
    };
    return this.createBulk(bulkData);
  },

  async update(
    id: number,
    data: UpdateHorarioEmpleadoData,
  ): Promise<HorarioEmpleado | null> {
    return apiClient.put(`/api/HorarioEmpleado/${id}`, data);
  },

  async getByEmpleado(documentoEmpleado: string): Promise<HorarioEmpleado[]> {
    return apiClient.get(`/api/HorarioEmpleado/empleado/${documentoEmpleado}`);
  },

  async delete(id: number): Promise<void> {
    return apiClient.delete(`/api/HorarioEmpleado/${id}`);
  },
};

export interface PaginatedResponse<T> {
  data: T[];
  totalRecords: number;
  totalPages: number;
  currentPage: number;
}

// ── Empleado Service (read-only for this module) ──

export const empleadoService = {
  async getAll(page: number = 1, pageSize: number = 10, search: string = ""): Promise<PaginatedResponse<Empleado> | Empleado[]> {
    return apiClient.get("/api/Empleados", { page, pageSize, search });
  },
};
