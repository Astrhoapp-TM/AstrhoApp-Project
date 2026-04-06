import { apiClient, type PaginatedResponse } from "@/shared/services/apiClient";
import { type Motivo } from "@/shared/services/motivoService";

// ── Interfaces ──

export interface AgendaItem {
  agendaId: number;
  documentoCliente: string;
  cliente: string;
  documentoEmpleado: string;
  empleado: string;
  fechaCita: string; // ISO "YYYY-MM-DD"
  horaInicio: string; // ISO "HH:mm:ss"
  metodoPago: string;
  observaciones: string;
  estado: string;
  estadoId: number;
  servicios: string[];
}

export interface CreateAgendaData {
  documentoCliente: string;
  documentoEmpleado: string;
  fechaCita: string;
  horaInicio: string;
  metodoPagoId: number;
  observaciones: string;
  serviciosIds: number[];
}

export interface UpdateAgendaData extends CreateAgendaData {
  estadoId: number;
}



export interface MetodoPago {
  metodopagoId: number;
  nombre: string;
}

export interface EmpleadoAPI {
  documentoEmpleado: string;
  tipoDocumento: string;
  nombre: string;
  telefono: string;
  estado: boolean;
}

export interface ClienteAPI {
  documentoCliente: string;
  tipoDocumento: string;
  usuarioId: number;
  nombre: string;
  telefono: string;
  estado: boolean;
}

export interface ServicioAPI {
  servicioId: number;
  nombre: string;
  descripcion: string;
  precio: number;
  duracion: number;
  estado: boolean;
  imagen: string;
}

// ── Helpers ──

/**
 * Parse a "HH:mm" or "HH:mm:ss" string into total minutes since midnight.
 */
function timeToMinutes(time: string): number {
  const parts = time.split(":");
  return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
}

/**
 * Checks if an employee is occupied at a given date/time window.
 * Returns true if there's an overlapping appointment OR an absence reason.
 * 
 * @param employeeDoc - documento del empleado
 * @param date        - fecha propuesta "YYYY-MM-DD"
 * @param startTime   - hora de inicio propuesta "HH:mm"
 * @param totalDurationMinutes - duración total (suma de servicios)
 * @param allAppointments - todas las citas existentes
 * @param serviciosMap - mapa servicioNombre → duración (minutos)
 * @param motivos - lista de motivos de ausencia (opcional)
 * @param excludeAgendaId - id de la cita a excluir (para edición)
 */
export function isEmployeeOccupied(
  employeeDoc: string,
  date: string,
  startTime: string,
  totalDurationMinutes: number,
  allAppointments: AgendaItem[],
  serviciosMap: Map<string, number>,
  motivos: Motivo[] = [],
  excludeAgendaId?: number,
): boolean {
  if (!startTime || !date || totalDurationMinutes <= 0) return false;

  const proposedStart = timeToMinutes(startTime);
  const proposedEnd = proposedStart + totalDurationMinutes;

  // 1. Check absence motives (ALL motives block the schedule)
  for (const m of motivos) {
    if (String(m.documentoEmpleado) !== String(employeeDoc)) continue;
    if (m.fecha.split('T')[0] !== date) continue;

    const mStart = timeToMinutes(m.horaInicio);
    const mEnd = timeToMinutes(m.horaFin);

    // Overlap: [a, b) and [c, d) overlap if a < d && c < b
    if (proposedStart < mEnd && mStart < proposedEnd) {
      return true;
    }
  }

  // 2. Check existing appointments
  const NON_BLOCKING_STATES = ["cancelado", "cancelled", "sin agendar", "sin_agendar"];

  for (const apt of allAppointments) {
    // Skip the appointment being edited
    if (excludeAgendaId != null && apt.agendaId === excludeAgendaId) continue;

    // Skip if different employee or different date
    if (String(apt.documentoEmpleado) !== String(employeeDoc)) continue;
    if (apt.fechaCita !== date) continue;

    // Skip cancelled / unscheduled appointments — they free up the slot
    const estadoLower = (apt.estado || "").toLowerCase().trim();
    if (NON_BLOCKING_STATES.includes(estadoLower)) continue;

    // Compute existing appointment's duration from its services
    let existingDuration = 0;
    for (const svcName of apt.servicios) {
      existingDuration += serviciosMap.get(svcName) ?? 30; // fallback 30 min
    }
    if (existingDuration <= 0) existingDuration = 30;

    const existingStart = timeToMinutes(apt.horaInicio);
    const existingEnd = existingStart + existingDuration;

    // Overlap: two intervals [a, b) and [c, d) overlap iff a < d && c < b
    if (proposedStart < existingEnd && existingStart < proposedEnd) {
      return true;
    }
  }

  return false;
}

// ── Estado normalization ──

// Real API estado IDs (from GET /EstadoAgenda):
//  1 = Pendiente
//  2 = Confirmado
//  3 = Cancelado
//  4 = Completado
//  5 = Sin Agendar
const ESTADO_MAP: Record<string | number, string> = {
  1: 'Pendiente',
  2: 'Confirmado',
  3: 'Cancelado',
  4: 'Completado',
  5: 'Sin Agendar',
  // String aliases → canonical label
  pendiente: 'Pendiente',
  pending: 'Pendiente',
  confirmado: 'Confirmado',
  confirmed: 'Confirmado',
  cancelado: 'Cancelado',
  cancelled: 'Cancelado',
  canceled: 'Cancelado',
  completado: 'Completado',
  completed: 'Completado',
  'sin agendar': 'Sin Agendar',
  sin_agendar: 'Sin Agendar',
  unscheduled: 'Sin Agendar',
};

function normalizeEstado(raw: any): string {
  if (raw === null || raw === undefined) return 'Pendiente';
  // If it's a plain number (estadoId)
  if (typeof raw === 'number') return ESTADO_MAP[raw] ?? String(raw);
  const s = String(raw).trim();
  // Try exact key match first (handles numeric strings like "5")
  if (ESTADO_MAP[s] !== undefined) return ESTADO_MAP[s];
  // Try lower-case key
  const lower = s.toLowerCase();
  if (ESTADO_MAP[lower] !== undefined) return ESTADO_MAP[lower];
  // Return the original string capitalised if nothing matched
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function normalizeAgendaItem(raw: any): AgendaItem {
  return {
    agendaId:           raw.agendaId          ?? raw.AgendaId          ?? 0,
    documentoCliente:   raw.documentoCliente   ?? raw.DocumentoCliente  ?? '',
    cliente:            raw.cliente            ?? raw.Cliente           ?? '',
    documentoEmpleado:  raw.documentoEmpleado  ?? raw.DocumentoEmpleado ?? '',
    empleado:           raw.empleado           ?? raw.Empleado          ?? '',
    fechaCita:          raw.fechaCita          ?? raw.FechaCita         ?? '',
    horaInicio:         raw.horaInicio         ?? raw.HoraInicio        ?? '',
    estado:             normalizeEstado(raw.estado ?? raw.Estado ?? raw.estadoId ?? raw.EstadoId),
    estadoId:           raw.estadoId           ?? raw.EstadoId          ?? 1,
    metodoPago:         raw.metodoPago         ?? raw.MetodoPago        ?? '',
    servicios:          Array.isArray(raw.servicios)
                          ? raw.servicios
                          : Array.isArray(raw.Servicios)
                          ? raw.Servicios
                          : Array.isArray(raw.servicios?.$values)
                          ? raw.servicios.$values
                          : [],
    observaciones:      raw.observaciones      ?? raw.Observaciones     ?? '',
  };
}

// ── Agenda Service ──

export const agendaService = {
  async getAll(params?: { page?: number; pageSize?: number; search?: string }): Promise<PaginatedResponse<AgendaItem>> {
    try {
      const res = await apiClient.get<any>("/api/Agenda", params);
      
      if (res && res.data && Array.isArray(res.data)) {
        return {
          ...res,
          data: res.data.map(normalizeAgendaItem)
        };
      }

      if (Array.isArray(res)) {
        return {
          data: res.map(normalizeAgendaItem),
          totalCount: res.length,
          page: params?.page || 1,
          pageSize: params?.pageSize || res.length,
          totalPages: 1
        };
      }
      
      return { data: [], totalCount: 0, page: 1, pageSize: 10, totalPages: 0 };
    } catch (error) {
      console.error("Error fetching agenda:", error);
      throw error;
    }
  },

  async getMisCitas(): Promise<AgendaItem[]> {
    const data = await apiClient.get("/api/Agenda/mis-citas");
    const raw: any[] = Array.isArray(data)
      ? data
      : Array.isArray(data?.data)
      ? data.data
      : Array.isArray(data?.$values)
      ? data.$values
      : [];
    return raw.map(normalizeAgendaItem);
  },

  async getById(id: number): Promise<AgendaItem> {
    const res = await apiClient.get(`/api/Agenda/${id}`);
    return normalizeAgendaItem(res);
  },

  async create(data: CreateAgendaData): Promise<AgendaItem> {
    const res = await apiClient.post("/api/Agenda", data);
    return normalizeAgendaItem(res);
  },

  async update(id: number, data: UpdateAgendaData): Promise<AgendaItem> {
    const res = await apiClient.put(`/api/Agenda/${id}`, data);
    return normalizeAgendaItem(res);
  },

  async delete(id: number): Promise<void> {
    return apiClient.delete(`/api/Agenda/${id}`);
  },
};

// ── MetodoPago Service ──

export const metodoPagoService = {
  async getAll(): Promise<MetodoPago[]> {
    return apiClient.get("/api/MetodoPago");
  },
};

// ── Empleado Service (for agenda module) ──

export const empleadoAgendaService = {
  async getAll(params?: { page?: number; pageSize?: number; search?: string }): Promise<PaginatedResponse<EmpleadoAPI>> {
    return apiClient.get("/api/Empleados", params);
  },
};

// ── Cliente Service ──

export const clienteService = {
  async getAll(): Promise<ClienteAPI[]> {
    return apiClient.get("/api/Clientes");
  },
};

// ── Servicio Service (for agenda module) ──

export const servicioAgendaService = {
  async getAll(): Promise<ServicioAPI[]> {
    const data = await apiClient.get<any>("/api/Servicios");
    // Extract array from possible paginated or wrapped response
    return Array.isArray(data)
      ? data
      : Array.isArray(data?.data)
      ? data.data
      : Array.isArray(data?.$values)
      ? data.$values
      : [];
  },
};

// ── EstadoAgenda ──

export interface EstadoAgenda {
  estadoId: number;
  nombre: string;
}

export const estadoAgendaService = {
  async getAll(): Promise<EstadoAgenda[]> {
    // El endpoint /EstadoAgenda suele dar 404 en algunas configuraciones,
    // devolvemos la lista estática para garantizar el funcionamiento.
    return [
      { estadoId: 1, nombre: 'Pendiente' },
      { estadoId: 2, nombre: 'Confirmado' },
      { estadoId: 3, nombre: 'Cancelado' },
      { estadoId: 4, nombre: 'Completado' },
    ];
  },
};
