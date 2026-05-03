import type { AgendaItem } from '@/features/appointments/services/agendaService';
import type { Supply } from '@/features/supply/services/supplyService';

export type NotificationCategory = 'citas' | 'inventario' | 'sistema';
export type NotificationPriority = 'alta' | 'media' | 'baja';

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  category: NotificationCategory;
  priority: NotificationPriority;
  createdAt: string;
  read: boolean;
  targetTab?: string;
}

interface AppointmentSnapshot {
  agendaId: number;
  estado: string;
  observaciones: string;
}

interface NotificationSnapshot {
  appointments: Record<string, AppointmentSnapshot>;
}

interface NotificationState {
  notifications: AppNotification[];
  snapshot: NotificationSnapshot;
}

interface BuildParams {
  appointments: AgendaItem[];
  supplies: Supply[];
  previousSnapshot: NotificationSnapshot;
  now: Date;
}

const STORAGE_PREFIX = 'notifications_state_v2';
const MAX_NOTIFICATIONS = 120;
const LOW_STOCK_LIMIT = 5;

function normalize(value: string | undefined | null): string {
  return (value || '')
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function toDateTime(fechaCita: string, horaInicio: string): Date {
  const fecha = (fechaCita || '').split('T')[0];
  const hora = (horaInicio || '').length === 5 ? `${horaInicio}:00` : (horaInicio || '00:00:00');
  return new Date(`${fecha}T${hora}`);
}

function getStorageKey(user: any): string {
  const userKey = user?.usuarioId || user?.id || user?.email || 'anon';
  return `${STORAGE_PREFIX}:${String(userKey)}`;
}

function buildId(kind: string, ref: string): string {
  return `${kind}:${ref}`;
}

function isCancelled(estado: string): boolean {
  const s = normalize(estado);
  return s === 'cancelado' || s === 'cancelled' || s === 'canceled';
}

function isCompleted(estado: string): boolean {
  const s = normalize(estado);
  return s === 'completado' || s === 'completed';
}

function isPendingOrConfirmed(estado: string): boolean {
  const s = normalize(estado);
  return s === 'pendiente' || s === 'pending' || s === 'confirmado' || s === 'confirmed';
}

function overlaps(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
  return aStart < bEnd && bStart < aEnd;
}

function getDurationFromServices(services: string[]): number {
  // La API de agenda no siempre trae duración por servicio en este contexto.
  // Usamos 30 min como valor base por servicio para alertas operativas.
  const duration = services.length * 30;
  return duration > 0 ? duration : 30;
}

function mergeNotifications(previous: AppNotification[], additions: AppNotification[]): AppNotification[] {
  const byId = new Map<string, AppNotification>();
  [...previous, ...additions].forEach((item) => {
    const current = byId.get(item.id);
    if (!current) {
      byId.set(item.id, item);
      return;
    }
    // Mantener "read=false" si alguno de los dos está pendiente.
    byId.set(item.id, { ...item, read: current.read && item.read });
  });

  return [...byId.values()]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, MAX_NOTIFICATIONS);
}

function buildSnapshot(appointments: AgendaItem[]): NotificationSnapshot {
  const state: Record<string, AppointmentSnapshot> = {};
  appointments.forEach((apt) => {
    state[String(apt.agendaId)] = {
      agendaId: apt.agendaId,
      estado: apt.estado,
      observaciones: apt.observaciones || '',
    };
  });
  return { appointments: state };
}

function buildConflictCount(appointments: AgendaItem[]): number {
  const active = appointments.filter((apt) => !isCancelled(apt.estado));
  const byEmployeeAndDate = new Map<string, AgendaItem[]>();

  active.forEach((apt) => {
    const dateOnly = (apt.fechaCita || '').split('T')[0];
    const key = `${apt.documentoEmpleado}:${dateOnly}`;
    const list = byEmployeeAndDate.get(key) || [];
    list.push(apt);
    byEmployeeAndDate.set(key, list);
  });

  let conflicts = 0;
  byEmployeeAndDate.forEach((list) => {
    const sorted = [...list].sort(
      (a, b) => toDateTime(a.fechaCita, a.horaInicio).getTime() - toDateTime(b.fechaCita, b.horaInicio).getTime()
    );
    for (let i = 0; i < sorted.length - 1; i += 1) {
      const a = sorted[i];
      const b = sorted[i + 1];
      const aStart = toDateTime(a.fechaCita, a.horaInicio);
      const bStart = toDateTime(b.fechaCita, b.horaInicio);
      const aEnd = new Date(aStart.getTime() + getDurationFromServices(a.servicios) * 60_000);
      const bEnd = new Date(bStart.getTime() + getDurationFromServices(b.servicios) * 60_000);
      if (overlaps(aStart, aEnd, bStart, bEnd)) {
        conflicts += 1;
      }
    }
  });
  return conflicts;
}

export function buildNotificationsFromData({
  appointments,
  supplies,
  previousSnapshot,
  now,
}: BuildParams): { additions: AppNotification[]; nextSnapshot: NotificationSnapshot } {
  const additions: AppNotification[] = [];

  // 1) Citas agendadas recientemente (detectadas como nuevas en el snapshot)
  appointments.forEach((apt) => {
    const key = String(apt.agendaId);
    const previous = previousSnapshot.appointments[key];
    if (!previous) {
      additions.push({
        id: buildId('appointment_created', key),
        title: 'Nueva cita agendada',
        message: `${apt.cliente || 'Cliente'} con ${apt.empleado || 'profesional'} el ${(apt.fechaCita || '').split('T')[0]} a las ${apt.horaInicio?.substring(0, 5) || ''}.`,
        category: 'citas',
        priority: 'media',
        createdAt: now.toISOString(),
        read: false,
        targetTab: 'appointments',
      });
    }
  });

  // 2) Cambios de estado (notificación adicional)
  appointments.forEach((apt) => {
    const key = String(apt.agendaId);
    const previous = previousSnapshot.appointments[key];
    if (previous && normalize(previous.estado) !== normalize(apt.estado)) {
      additions.push({
        id: buildId('appointment_status_change', `${key}:${normalize(previous.estado)}->${normalize(apt.estado)}`),
        title: 'Cambio de estado de cita',
        message: `La cita #${apt.agendaId} cambió de "${previous.estado}" a "${apt.estado}".`,
        category: 'citas',
        priority: 'media',
        createdAt: now.toISOString(),
        read: false,
        targetTab: 'appointments',
      });
    }
  });

  // 3) Cancelaciones automáticas por expiración (obligatoria)
  appointments.forEach((apt) => {
    const key = String(apt.agendaId);
    const previous = previousSnapshot.appointments[key];
    const obs = normalize(apt.observaciones);
    const isAutoCancel = isCancelled(apt.estado) && (obs.includes('automatica') || obs.includes('expir'));
    const becameAutoCancel =
      isAutoCancel &&
      (!previous || normalize(previous.estado) !== normalize(apt.estado) || !normalize(previous.observaciones).includes('automatica'));

    if (becameAutoCancel) {
      additions.push({
        id: buildId('appointment_auto_cancel', key),
        title: 'Cita cancelada automáticamente',
        message: `La cita #${apt.agendaId} fue cancelada por expiración de ventana de gestión.`,
        category: 'citas',
        priority: 'alta',
        createdAt: now.toISOString(),
        read: false,
        targetTab: 'appointments',
      });
    }
  });

  // 4) Recordatorios de citas próximas (notificación adicional)
  appointments.forEach((apt) => {
    if (!isPendingOrConfirmed(apt.estado)) return;
    const startAt = toDateTime(apt.fechaCita, apt.horaInicio);
    const diffMs = startAt.getTime() - now.getTime();
    if (diffMs <= 0) return;
    const diffMinutes = Math.round(diffMs / 60_000);
    if (diffMinutes <= 180) {
      additions.push({
        id: buildId('appointment_reminder', `${apt.agendaId}:${startAt.toISOString().slice(0, 16)}`),
        title: 'Recordatorio de cita próxima',
        message: `La cita #${apt.agendaId} inicia en ${diffMinutes} min.`,
        category: 'citas',
        priority: diffMinutes <= 60 ? 'alta' : 'media',
        createdAt: now.toISOString(),
        read: false,
        targetTab: 'appointments',
      });
    }
  });

  // 5) Insumos con stock bajo (obligatoria)
  const lowStock = supplies.filter((s) => s.estado && Number(s.stock) <= LOW_STOCK_LIMIT);
  if (lowStock.length > 0) {
    const topNames = lowStock
      .slice(0, 3)
      .map((s) => `${s.nombre} (${s.stock})`)
      .join(', ');

    additions.push({
      id: buildId('inventory_low_stock', lowStock.map((s) => s.insumoId).sort((a, b) => a - b).join('-')),
      title: 'Stock bajo en inventario',
      message: `${lowStock.length} insumo(s) bajo mínimo. ${topNames}${lowStock.length > 3 ? '...' : ''}`,
      category: 'inventario',
      priority: 'alta',
      createdAt: now.toISOString(),
      read: false,
      targetTab: 'products',
    });
  }

  // 6) Conflictos de agenda (notificación adicional)
  const conflicts = buildConflictCount(appointments);
  if (conflicts > 0) {
    additions.push({
      id: buildId('schedule_conflicts', String(conflicts)),
      title: 'Conflictos de agenda detectados',
      message: `Se detectaron ${conflicts} posible(s) solapamiento(s) entre citas activas.`,
      category: 'sistema',
      priority: 'alta',
      createdAt: now.toISOString(),
      read: false,
      targetTab: 'appointments',
    });
  }

  return {
    additions,
    nextSnapshot: buildSnapshot(appointments),
  };
}

export function loadNotificationState(user: any): NotificationState {
  const storageKey = getStorageKey(user);
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return { notifications: [], snapshot: { appointments: {} } };
    const parsed = JSON.parse(raw);
    return {
      notifications: Array.isArray(parsed?.notifications) ? parsed.notifications : [],
      snapshot: parsed?.snapshot?.appointments ? parsed.snapshot : { appointments: {} },
    };
  } catch {
    return { notifications: [], snapshot: { appointments: {} } };
  }
}

export function saveNotificationState(user: any, state: NotificationState): void {
  const storageKey = getStorageKey(user);
  localStorage.setItem(storageKey, JSON.stringify(state));
}

export function mergeAndPersistNotifications(
  user: any,
  previous: NotificationState,
  additions: AppNotification[],
  nextSnapshot: NotificationSnapshot
): NotificationState {
  const nextState: NotificationState = {
    notifications: mergeNotifications(previous.notifications, additions),
    snapshot: nextSnapshot,
  };
  saveNotificationState(user, nextState);
  return nextState;
}
