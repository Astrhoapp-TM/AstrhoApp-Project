import React, { useState, useEffect } from 'react';
import {
  CheckCircle,
  Calendar, Clock, Users, Plus,
  AlertCircle, Edit, Eye, Trash2, Info,
  Save, X, Loader2, RefreshCw, Copy, UserPlus, UserMinus, FileText, Search, ChevronLeft, ChevronRight
} from 'lucide-react';
import { SimplePagination } from '@/shared/components/ui/simple-pagination';
import { cn } from '@/shared/components/ui/utils';
import {
  horarioService, horarioEmpleadoService, empleadoService,
  type Horario, type HorarioEmpleado, type Empleado, type CreateHorarioData, type CreateHorarioEmpleadoData,
  type ScheduleGroup, type DaySchedule, scheduleGroupService, type HorarioDia
} from '../services/scheduleService';
import { useLoading } from '@/shared/contexts/LoadingContext';
import { SectionLoader } from '@/shared/components/GlobalLoader';
import { motivoService, type Motivo, type CreateMotivoData, type UpdateMotivoData, type CreateAdminMotivoData } from '@/shared/services/motivoService';
import { agendaService, servicioAgendaService, metodoPagoService, type AgendaItem, type ServicioAPI, type MetodoPago } from '@/features/appointments/services/agendaService';
import { userService } from '@/features/users/services/userService';

interface ScheduleManagementProps {
  hasPermission: (permission: string) => boolean;
  currentUser: any;
}

// ── Helpers ──

const DIAS_SEMANA_OPTIONS = [
  'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'
];

const normalizeDay = (day: string | null | undefined): string => {
  if (!day) return '';
  return day.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
};

const extractArray = (data: any): any[] => {
  if (!data) return [];
  // Si la respuesta del backend está anidada en una propiedad 'data', recursivamente entramos en ella.
  if (data.data) return extractArray(data.data);
  if (Array.isArray(data)) return data;
  if (data.$values && Array.isArray(data.$values)) return data.$values;
  // Si es un objeto con dias/horarioDias, intentamos extraerlos.
  if (data.dias) return extractArray(data.dias);
  if (data.horarioDias) return extractArray(data.horarioDias);
  return [];
};

const DIAS_SHORT: Record<string, string> = {
  'Lunes': 'Lun', 'Martes': 'Mar', 'Miércoles': 'Mié',
  'Jueves': 'Jue', 'Viernes': 'Vie', 'Sábado': 'Sáb', 'Domingo': 'Dom'
};

/**
 * Convierte una hora de 24h (HH:mm) a 12h (h:mm AM/PM).
 */
const formatTo12Hour = (timeStr: string): string => {
  if (!timeStr) return '';
  const [hourStr, minuteStr] = timeStr.split(':');
  let hour = parseInt(hourStr, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  hour = hour % 12;
  hour = hour ? hour : 12; // La hora '0' debe ser '12'
  return `${hour}:${minuteStr} ${ampm}`;
};

export function ScheduleManagement({ hasPermission, currentUser }: ScheduleManagementProps) {
  // Data states
  const [horarios, setHorarios] = useState<Horario[]>([]);
  const [horarioEmpleados, setHorarioEmpleados] = useState<HorarioEmpleado[]>([]);
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [groups, setGroups] = useState<ScheduleGroup[]>([]);
  const [motivos, setMotivos] = useState<Motivo[]>([]);
  const [showMotivos, setShowMotivos] = useState(false);
  const [currentPageMotivos, setCurrentPageMotivos] = useState(1);
  const [itemsPerPageMotivos] = useState(5);
  const [showMotivoDetailModal, setShowMotivoDetailModal] = useState(false);
  const [showAcceptMotivoModal, setShowAcceptMotivoModal] = useState(false);
  const [showRejectMotivoModal, setShowRejectMotivoModal] = useState(false);
  const [selectedMotivo, setSelectedMotivo] = useState<Motivo | null>(null);

  // UI states
  const [loading, setLoading] = useState(true);
  const { showSectionLoading, hideSectionLoading } = useLoading();
  const [saving, setSaving] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showMotivoModal, setShowMotivoModal] = useState(false);
  const [showMotivoConfirmModal, setShowMotivoConfirmModal] = useState(false);
  const [pendingMotivoData, setPendingMotivoData] = useState<CreateMotivoData | CreateAdminMotivoData | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<ScheduleGroup | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(5);

  // Permission helpers
  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'super_admin';
  const isAssistant = currentUser?.role === 'asistente';
  const canManageSchedules = isAdmin; // Only admin can register, edit, delete, toggle
  const canViewSchedules = hasPermission('manage_schedules') || isAdmin || isAssistant;
  const canRegisterMotivo = isAdmin || isAssistant;

  // Alert state
  const [alert, setAlert] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  const showAlert = (type: 'success' | 'error' | 'info', message: string) => {
    setAlert({ type, message });
    setTimeout(() => setAlert(null), 4000);
  };

  // Helper to convert time string to minutes
  const timeToMinutes = (time: string): number => {
    const parts = time.split(":");
    return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
  };

  // Helper to cancel overlapping appointments
  const cancelOverlappingAppointments = async (
    documentoEmpleado: string,
    fecha: string,
    horaInicio: string,
    horaFin: string,
    descripcionMotivo: string
  ) => {
    try {
      // 1. Get all appointments
      const appointmentsResponse = await agendaService.getAll();
      const allAppointments = appointmentsResponse.data;

      // 2. Get all services to calculate appointment durations
      const allServicios = await servicioAgendaService.getAll();
      const serviciosMap = new Map<string, number>();
      allServicios.forEach((s) => serviciosMap.set(s.nombre, s.duracion));

      // 3. Get all payment methods
      const allMetodosPago = await metodoPagoService.getAll();

      // 4. Calculate motivo start and end in minutes
      const motivoStart = timeToMinutes(horaInicio);
      const motivoEnd = timeToMinutes(horaFin);

      // 5. Find overlapping appointments
      const overlappingAppointments = allAppointments.filter((apt) => {
        // Check if same employee and same date
        if (String(apt.documentoEmpleado) !== String(documentoEmpleado)) return false;
        if (apt.fechaCita !== fecha) return false;

        // Skip already cancelled appointments
        const estadoLower = (apt.estado || "").toLowerCase().trim();
        if (["cancelado", "cancelled", "canceled"].includes(estadoLower)) return false;

        // Calculate appointment duration
        let appointmentDuration = 0;
        for (const svcName of apt.servicios) {
          appointmentDuration += serviciosMap.get(svcName) ?? 30;
        }
        if (appointmentDuration <= 0) appointmentDuration = 30;

        const aptStart = timeToMinutes(apt.horaInicio);
        const aptEnd = aptStart + appointmentDuration;

        // Check overlap: [a, b) and [c, d) overlap if a < d && c < b
        return aptStart < motivoEnd && motivoStart < aptEnd;
      });

      // 6. Cancel each overlapping appointment
      let cancelledCount = 0;
      for (const apt of overlappingAppointments) {
        try {
          // Map service names to IDs
          const serviciosIds = apt.servicios.map((svcName) => {
            const normalizedName = svcName.trim().toLowerCase();
            const svc = allServicios.find((s) => s.nombre.trim().toLowerCase() === normalizedName);
            return svc ? svc.servicioId : 0;
          }).filter((id) => id > 0);

          // Find metodoPagoId
          const mpName = (apt.metodoPago || "").trim().toLowerCase();
          const mp = allMetodosPago.find((m) => m.nombre.trim().toLowerCase() === mpName);
          const metodoPagoId = mp ? mp.metodopagoId : (allMetodosPago[0]?.metodopagoId || 1);

          await agendaService.update(apt.agendaId, {
            documentoCliente: apt.documentoCliente,
            documentoEmpleado: apt.documentoEmpleado,
            fechaCita: apt.fechaCita,
            horaInicio: apt.horaInicio,
            metodoPagoId: Number(metodoPagoId),
            observaciones: `Cancelado automáticamente por motivo de ausencia: ${descripcionMotivo}`,
            serviciosIds: serviciosIds.length > 0 ? serviciosIds : [1],
            estadoId: 3
          });
          cancelledCount++;
        } catch (err) {
          console.error(`Error cancelando cita ${apt.agendaId}:`, err);
        }
      }

      if (cancelledCount > 0) {
        console.log(`${cancelledCount} citas canceladas automáticamente`);
      }
    } catch (err) {
      console.error("Error al cancelar citas superpuestas:", err);
    }
  };

  // ── Data Loading ──

  const loadData = async () => {
    setLoading(true);
    showSectionLoading("Cargando horarios...");
    try {
      const [horariosData, asignacionesData, empleadosData, motivosData] = await Promise.all([
        horarioService.getAll(),
        horarioEmpleadoService.getAll(),
        empleadoService.getAll(1, 1000), // Fetch up to 1000 employees to handle frontend search/pagination
        motivoService.getAll()
      ]);

      const hData = extractArray(horariosData);
      setHorarios(hData);
      setHorarioEmpleados(extractArray(asignacionesData));
      setEmpleados(extractArray(empleadosData));

      // Process motivos to map estadoId to estado text and include employee name
      const rawMotivos = extractArray(motivosData);
      const empleadosList = extractArray(empleadosData); // Extract empleados array
      const processedMotivos = rawMotivos.map((motivo: any) => {
        // Find employee by documentoEmpleado
        const matchingEmpleado = empleadosList.find(
          (e: any) => String(e.documentoEmpleado) === String(motivo.documentoEmpleado) ||
                      String(e.documento) === String(motivo.documentoEmpleado)
        );
        
        return {
          ...motivo,
          nombreEmpleado: motivo.nombreEmpleado || matchingEmpleado?.nombre || 'Empleado sin nombre',
          estado: motivo.estadoId === 1 ? 'pendiente' :
                  motivo.estadoId === 6 ? 'aprobado' :
                  motivo.estadoId === 7 ? 'rechazado' :
                  motivo.estado || 'pendiente'
        };
      });
      
      // Order motivos from most recent to oldest
      processedMotivos.sort((a: any, b: any) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
      
      console.log('Processed motivos:', processedMotivos); // Debug log
      setMotivos(processedMotivos);

      // 1. Transform API Horarios into frontend Groups automatically
      // Each Horario object from the new API is essentially a "Group" because it has a name and days.
      const apiGroups: ScheduleGroup[] = hData.map((h: Horario) => ({
        id: `api-${h.horarioId}`,
        nombre: h.nombre || 'Horario sin nombre',
        horarioIds: [h.horarioId],
        estado: h.estado
      }));

      // 2. Load legacy groups from localStorage for backward compatibility
      const savedGroups = scheduleGroupService.getAll();
      const validIds = new Set(hData.map((h: Horario) => h.horarioId));

      const reconciledLegacyGroups = savedGroups.map(g => ({
        ...g,
        horarioIds: g.horarioIds.filter(id => validIds.has(id))
      })).filter(g => g.horarioIds.length > 0);

      // 3. Merge API groups with legacy groups, avoiding duplicates by name
      const finalGroups = [...apiGroups];
      for (const legacy of reconciledLegacyGroups) {
        // If there's already an API group with this name, don't add the legacy one
        // (Assuming the API group is the "new" version of the legacy group)
        if (!finalGroups.some(ag => ag.nombre === legacy.nombre)) {
          finalGroups.push(legacy);
        }
      }

      // Update localStorage with the latest reconciled view
      scheduleGroupService.save(finalGroups);
      setGroups(finalGroups);
    } catch (error) {
      console.error('Error loading schedule data:', error);
      showAlert('error', 'Error al cargar los datos de horarios');
    } finally {
      setLoading(false);
      hideSectionLoading();
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // ── CRUD Handlers ──

  const handleCreateSchedule = () => {
    setSelectedGroup(null);
    setShowScheduleModal(true);
  };

  const handleEditSchedule = (group: ScheduleGroup) => {
    setSelectedGroup(group);
    setShowScheduleModal(true);
  };

  const handleViewDetail = (group: ScheduleGroup) => {
    setSelectedGroup(group);
    setShowDetailModal(true);
  };

  const handleDeleteSchedule = (group: ScheduleGroup) => {
    setSelectedGroup(group);
    setShowDeleteModal(true);
  };

  const handleAssignEmployee = (group: ScheduleGroup) => {
    setSelectedGroup(group);
    setShowAssignModal(true);
  };

  const handleCreateMotivo = () => {
    setShowMotivoModal(true);
  };

  const handleViewMotivoDetail = (motivo: Motivo) => {
    setSelectedMotivo(motivo);
    setShowMotivoDetailModal(true);
  };

  const handleAcceptMotivo = (motivo: Motivo) => {
    setSelectedMotivo(motivo);
    setShowAcceptMotivoModal(true);
  };

  const handleRejectMotivo = (motivo: Motivo) => {
    setSelectedMotivo(motivo);
    setShowRejectMotivoModal(true);
  };

  const confirmAcceptMotivo = async () => {
    if (!selectedMotivo) return;
    try {
      setSaving(true);
      showSectionLoading("Aceptando motivo...");
      await motivoService.update(selectedMotivo.motivoId, {
        estado: "aprobado",
        estadoId: 6
      });

      // Cancel overlapping appointments
      await cancelOverlappingAppointments(
        selectedMotivo.documentoEmpleado,
        selectedMotivo.fecha,
        selectedMotivo.horaInicio,
        selectedMotivo.horaFin,
        selectedMotivo.descripcion
      );

      showAlert("success", "Motivo aceptado correctamente");
      setShowAcceptMotivoModal(false);
      await loadData();
    } catch (err) {
      console.error("Error accepting motivo:", err);
      showAlert("error", "Error al aceptar el motivo");
    } finally {
      setSaving(false);
      hideSectionLoading();
    }
  };

  const confirmRejectMotivo = async () => {
    if (!selectedMotivo) return;
    try {
      setSaving(true);
      showSectionLoading("Rechazando motivo...");
      await motivoService.update(selectedMotivo.motivoId, {
        estado: "rechazado",
        estadoId: 7
      });
      showAlert("success", "Motivo rechazado correctamente");
      setShowRejectMotivoModal(false);
      await loadData();
    } catch (err) {
      console.error("Error rejecting motivo:", err);
      showAlert("error", "Error al rechazar el motivo");
    } finally {
      setSaving(false);
      hideSectionLoading();
    }
  };

  // New function for MotivoModal's onSave: shows confirmation modal
  const handleMotivoModalSave = (data: CreateMotivoData | CreateAdminMotivoData) => {
    setPendingMotivoData(data);
    setShowMotivoConfirmModal(true);
  };

  // Renamed function to actually save the motivo after confirmation
  const confirmSaveMotivo = async () => {
    if (!pendingMotivoData) return;
    setSaving(true);
    showSectionLoading("Registrando motivo...");
    try {
      let documentoEmpleado: string;
      if ('documentoEmpleado' in pendingMotivoData && pendingMotivoData.documentoEmpleado) {
        documentoEmpleado = pendingMotivoData.documentoEmpleado;
        await motivoService.createAdmin(pendingMotivoData);
      } else {
        // For non-admin, use current user's document
        documentoEmpleado = String(currentUser?.documentoEmpleado || currentUser?.documento || currentUser?.documentId || '');
        await motivoService.create(pendingMotivoData);
      }

      // Cancel overlapping appointments
      await cancelOverlappingAppointments(
        documentoEmpleado,
        pendingMotivoData.fecha,
        pendingMotivoData.horaInicio,
        pendingMotivoData.horaFin,
        pendingMotivoData.descripcion
      );

      showAlert('success', 'Motivo registrado. Se han cancelado las citas del periodo y notificado a los empleados.');
      setShowMotivoModal(false);
      setShowMotivoConfirmModal(false);
      setPendingMotivoData(null);
      await loadData();
    } catch (error) {
      console.error('Error saving motivo:', error);
      showAlert('error', 'Error al registrar el motivo de ausencia');
    } finally {
      setSaving(false);
      hideSectionLoading();
    }
  };

  const confirmDeleteSchedule = async () => {
    if (!selectedGroup) return;
    setSaving(true);
    showSectionLoading("Eliminando horario...");
    try {
      // Deactivate each horario via PUT (API may not support DELETE)
      const groupHorarios = horarios.filter(h => selectedGroup.horarioIds.includes(h.horarioId));
      for (const h of groupHorarios) {
        try {
          await horarioService.update(h.horarioId, {
            nombre: h.nombre,
            estado: false,
            dias: extractArray(h.dias).map(d => ({
              horarioDiaId: d.horarioDiaId || 0,
              diaSemana: d.diaSemana,
              horaInicio: d.horaInicio,
              horaFin: d.horaFin
            }))
          });
        } catch (err) {
          console.warn(`Could not deactivate horario ${h.horarioId}:`, err);
        }
      }
      // Also try to delete from API (best effort)
      for (const id of selectedGroup.horarioIds) {
        try {
          await horarioService.delete(id);
        } catch { /* ignore */ }
      }
      scheduleGroupService.delete(selectedGroup.id);
      showAlert('success', `Horario "${selectedGroup.nombre}" eliminado correctamente`);
      setShowDeleteModal(false);
      setSelectedGroup(null);
      await loadData();
    } catch (error) {
      console.error('Error deleting schedule:', error);
      showAlert('error', 'Error al eliminar el horario');
    } finally {
      setSaving(false);
      hideSectionLoading();
    }
  };

  const handleToggleStatus = async (group: ScheduleGroup) => {
    try {
      showSectionLoading("Actualizando estado...");
      const primaryId = group.horarioIds[0];
      if (!primaryId) return;

      await horarioService.toggle(primaryId);

      // Update group in localStorage
      const newEstado = !group.estado;
      scheduleGroupService.upsert({ ...group, estado: newEstado });

      showAlert(
        newEstado ? 'success' : 'info',
        `Horario "${group.nombre}" ${newEstado ? 'activado' : 'inactivado'} correctamente`
      );
      await loadData();
    } catch (error) {
      console.error('Error toggling schedule status:', error);
      showAlert('error', 'Error al cambiar el estado del horario');
    } finally {
      hideSectionLoading();
    }
  };

  const handleSaveSchedule = async (
    nombre: string,
    days: DaySchedule[],
    assignmentsToCreate: CreateHorarioEmpleadoData[],
    assignmentsToDelete: number[],
    groupId?: string
  ) => {
    setSaving(true);
    showSectionLoading("Guardando horario...");
    try {
      const enabledDays = days.filter(d => d.enabled);
      const existingGroup = groupId ? groups.find(g => g.id === groupId) : null;
      const existingHorarios = existingGroup
        ? horarios.filter(h => existingGroup.horarioIds.includes(h.horarioId))
        : [];

      // 1. Prepare the payload with the new structure
      const payload: CreateHorarioData = {
        nombre: nombre,
        estado: existingGroup?.estado ?? true,
        dias: enabledDays.map(day => ({
          horarioDiaId: day.horarioDiaId || 0,
          diaSemana: day.dia,
          horaInicio: day.horaInicio,
          horaFin: day.horaFin
        }))
      };

      let finalIds: number[] = [];

      // 2. Send the single request to create/update the entire schedule
      let savedHorario: Horario | null = null;
      let resolvedId: number | undefined;

      try {
        if (existingGroup && existingGroup.horarioIds.length > 0) {
          // Si es una edición, usamos el primer ID del grupo
          const primaryId = existingGroup.horarioIds[0];
          await horarioService.update(primaryId, payload);
          resolvedId = primaryId;
        } else {
          // Si es un registro nuevo
          const response = await horarioService.create(payload);
          const created = response.data ?? response;
          resolvedId = created?.horarioId;
        }

        // 🔥 Obtener datos completos con días del servidor para asegurar que tenemos los IDs reales (horarioDiaId)
        if (resolvedId) {
          const response = await horarioService.getById(resolvedId);
          savedHorario = response.data ?? response;
        }
      } catch (err) {
        console.error(`Error saving schedule:`, err);
        throw err;
      }

      // 3. Resolve the full object with its day IDs (horarioDiaId) if getById failed or wasn't called
      if (resolvedId && !savedHorario) {
        try {
          console.warn(`Could not fetch horario ${resolvedId} directly, trying fallback by name...`);
          const allHorariosData: any = await horarioService.getAll();
          const hData = extractArray(allHorariosData);
          savedHorario = hData.find((h: Horario) => h.nombre === nombre) || null;
        } catch (fallbackErr) {
          console.error('Final fallback to resolve IDs failed', fallbackErr);
        }
      }

      finalIds = savedHorario ? [savedHorario.horarioId] : (resolvedId ? [resolvedId] : []);

      // 4. Save group to localStorage
      const group: ScheduleGroup = {
        id: groupId || scheduleGroupService.generateId(),
        nombre,
        horarioIds: finalIds,
        estado: existingGroup?.estado ?? true
      };
      scheduleGroupService.upsert(group);

      // 5. Process pending employee assignments and deletions
      // We need to map the pending assignments to the correct horarioDiaId
      const savedDays = savedHorario ? extractArray(savedHorario) : [];
      // 🔥 Validación estricta: si no hay días cargados, no podemos mapear empleados
      if (!savedHorario || !savedDays.length) {
        const errorMsg = 'No se pudo mapear las asignaciones de empleados porque no se obtuvieron los detalles de los días del servidor.';
        console.error(`[ScheduleManagement] ${errorMsg}`, savedHorario);

        if (assignmentsToCreate.length > 0) {
          showAlert('error', 'El horario se guardó, pero no se pudieron asignar los empleados automáticamente. Intenta asignarlos nuevamente editando el horario.');
          setSaving(false);
          return; // Detener el flujo
        }
      }

      // ✅ condición correcta combinada
      if (savedHorario && savedDays.length > 0) {
        // Group assignments by the new IDs from server
        const assignmentsByDay: Record<number, string[]> = {};

        for (const pending of assignmentsToCreate) {
          let dayNameToUse = pending.diaSemana || "";

          if (!dayNameToUse) {
            const allDaysInSystem = horarios.flatMap(h => extractArray(h));
            const oldDayRecord = allDaysInSystem.find(d => d.horarioDiaId === pending.horarioId);
            if (oldDayRecord) {
              dayNameToUse = oldDayRecord.diaSemana || "";
            } else {
              const stateDay = days.find(d => d.horarioDiaId === pending.horarioId);
              if (stateDay) {
                dayNameToUse = stateDay.dia;
              }
            }
          }

          if (dayNameToUse) {
            const normalizedTarget = normalizeDay(dayNameToUse);
            const newDayRecord = savedDays.find(d => normalizeDay(d.diaSemana) === normalizedTarget);

            if (newDayRecord && newDayRecord.horarioDiaId) {
              if (!assignmentsByDay[newDayRecord.horarioDiaId]) {
                assignmentsByDay[newDayRecord.horarioDiaId] = [];
              }
              if (pending.documentoEmpleado) {
                assignmentsByDay[newDayRecord.horarioDiaId].push(pending.documentoEmpleado);
              }
            } else {
              console.warn(`[ScheduleManagement] No se encontró el día ${dayNameToUse} en el objeto guardado para asignar el empleado.`);
            }
          }
        }

        // Send deletions first
        for (const assignmentId of assignmentsToDelete) {
          try {
            await horarioEmpleadoService.delete(assignmentId);
          } catch (err) {
            console.error('[ScheduleManagement] Error deleting assignment:', err);
          }
        }

        // Send assignments in bulk
        const diasParaEnviar = Object.entries(assignmentsByDay)
          .map(([horarioDiaId, empleados]) => {
            const validEmpleados = empleados.filter(doc => doc && doc.trim() !== "");
            return {
              horarioDiaId: parseInt(horarioDiaId),
              empleados: validEmpleados
            };
          })
          .filter(d => d.empleados.length > 0 && d.horarioDiaId > 0);

        if (diasParaEnviar.length > 0) {
          const bulkData = { dias: diasParaEnviar };
          console.log('[ScheduleManagement] Enviando asignaciones bulk:', JSON.stringify(bulkData, null, 2));
          await horarioEmpleadoService.createBulk(bulkData);
        }
      }

      showAlert('success', existingGroup
        ? `Horario "${nombre}" actualizado correctamente`
        : `Horario "${nombre}" registrado correctamente`
      );
      setShowScheduleModal(false);
      setSelectedGroup(null);
      await loadData();
    } catch (error) {
      console.error('Error saving schedule:', error);
      showAlert('error', 'Error al guardar el horario');
    } finally {
      setSaving(false);
      hideSectionLoading();
    }
  };

  const handleSaveAssignment = async (horarioDiaId: number, documentosEmpleado: string[]) => {
    setSaving(true);
    showSectionLoading("Asignando personal...");
    try {
      if (!horarioDiaId || horarioDiaId === 0) {
        throw new Error("ID de día de horario no válido (0 o undefined)");
      }

      const validEmpleados = documentosEmpleado.filter(doc => doc && doc.trim() !== "");

      if (validEmpleados.length === 0) {
        showAlert('error', 'No se ha seleccionado ningún empleado válido para asignar.');
        setSaving(false);
        return;
      }

      const bulkData = {
        dias: [
          {
            horarioDiaId,
            empleados: validEmpleados
          }
        ]
      };

      console.log('[ScheduleManagement] Enviando asignación individual bulk:', JSON.stringify(bulkData, null, 2));
      await horarioEmpleadoService.createBulk(bulkData);
      showAlert('success', `${validEmpleados.length} empleado(s) asignado(s) correctamente`);
      setShowAssignModal(false);
      await loadData();
    } catch (error) {
      console.error('[ScheduleManagement] Error assigning employees:', error);
      showAlert('error', error instanceof Error ? error.message : 'Error al asignar el personal');
    } finally {
      setSaving(false);
      hideSectionLoading();
    }
  };

  const handleRemoveAssignment = async (assignmentId: number) => {
    try {
      showSectionLoading("Eliminando asignación...");
      await horarioEmpleadoService.delete(assignmentId);
      showAlert('info', 'Asignación eliminada correctamente');
      await loadData();
    } catch (error) {
      console.error('Error removing assignment:', error);
      showAlert('error', 'Error al eliminar la asignación');
    } finally {
      hideSectionLoading();
    }
  };

  // ── Helpers ──

  const checkOverlap = (
    doc: string,
    dia: string,
    inicio: string,
    fin: string,
    excludeScheduleId?: number
  ) => {
    const normalizedDia = normalizeDay(dia);
    // Find any assignment for this employee on the same day that overlaps
    return horarioEmpleados.some(he => {
      // Must be same employee and same day
      if (he.documentoEmpleado !== doc || normalizeDay(he.diaSemana) !== normalizedDia) return false;

      // If we're editing/re-assigning, exclude the current assignment
      if (excludeScheduleId && he.horarioId === excludeScheduleId) return false;

      // Overlap condition: (StartA < EndB) and (EndA > StartB)
      return inicio < he.horaFin && fin > he.horaInicio;
    });
  };

  const getHorariosForGroup = (group: ScheduleGroup) => {
    return horarios.filter(h => group.horarioIds.includes(h.horarioId));
  };

  const getAssignmentsForGroup = (group: ScheduleGroup) => {
    return horarioEmpleados.filter(he => group.horarioIds.includes(he.horarioId));
  };

  // Pagination
  const totalCount = groups.length;
  const totalPages = Math.ceil(totalCount / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedGroups = groups.slice(startIndex, startIndex + itemsPerPage);

  // ── Loading State ──


  return (
    <div className="p-8">
      {/* Notification Banner */}
      {alert && (
        <div className="fixed bottom-6 right-6 z-[9999] animate-in slide-in-from-right-5 duration-300">
          <div className={cn(
            "text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center space-x-4 min-w-[320px] bg-gradient-to-r",
            alert.type === 'success' ? "from-pink-400 to-purple-500" :
              alert.type === 'error' ? "from-red-500 to-pink-600" :
                "from-blue-400 to-indigo-500"
          )}>
            <div className="flex-shrink-0">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                {alert.type === 'success' && <CheckCircle className="w-6 h-6 text-white" />}
                {alert.type === 'error' && <AlertCircle className="w-6 h-6 text-white" />}
                {alert.type === 'info' && <Info className="w-6 h-6 text-white" />}
              </div>
            </div>
            <div className="flex-1">
              <p className="font-semibold">{alert.message}</p>
            </div>
            <button
              onClick={() => setAlert(null)}
              className="flex-shrink-0 w-8 h-8 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-bold text-gray-800">Gestión de Horarios</h2>
          <p className="text-gray-600">
            Los horarios son semanales recurrentes — aplican todos los días de la semana a lo largo del año
          </p>
        </div>
      </div>

      {/* Search and Register */}
      <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="w-full md:max-w-md relative invisible">
            {/* Hidden for now as search is not implemented in service yet, but keeping layout consistent */}
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Buscar horarios..."
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl"
              disabled
            />
          </div>

          <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
            <button
              onClick={loadData}
              disabled={loading}
              className="p-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors flex items-center justify-center disabled:opacity-50"
              title="Recargar datos"
            >
              <RefreshCw className={cn("w-5 h-5", loading && "animate-spin")} />
            </button>
            
            {isAdmin && (
              <button
                onClick={() => {
                  setShowMotivos(!showMotivos);
                  if (!showMotivos) setCurrentPageMotivos(1);
                }}
                className="w-full md:w-auto bg-gradient-to-r from-purple-400 to-pink-500 text-white px-6 py-3 rounded-xl font-semibold hover:shadow-lg transition-all flex items-center justify-center space-x-2 whitespace-nowrap"
              >
                <FileText className="w-5 h-5" />
                <span>{showMotivos ? "Ocultar Motivos" : "Ver Motivos"}</span>
              </button>
            )}

            {canRegisterMotivo && (
              <button
                onClick={handleCreateMotivo}
                className="w-full md:w-auto bg-gradient-to-r from-blue-400 to-indigo-500 text-white px-6 py-3 rounded-xl font-semibold hover:shadow-lg transition-all flex items-center justify-center space-x-2 whitespace-nowrap"
              >
                <Clock className="w-5 h-5" />
                <span>Registrar Motivo</span>
              </button>
            )}

            {canManageSchedules && (
              <button
                onClick={handleCreateSchedule}
                className="w-full md:w-auto bg-gradient-brand text-white px-6 py-3 rounded-xl font-semibold hover:shadow-lg transition-all flex items-center justify-center space-x-2 whitespace-nowrap"
              >
                <Plus className="w-5 h-5" />
                <span>Registrar Horario</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {isAssistant ? (
        <AssistantScheduleView 
          currentUser={currentUser} 
          horarioEmpleados={horarioEmpleados}
          horarios={horarios}
        />
      ) : (
      <>
      {/* ── Motivos Section (Admin/Super Admin only) ── */}
      {isAdmin && showMotivos && (
        <div className="mt-8 bg-white rounded-2xl shadow-lg overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-6 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                  <FileText className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-800 leading-tight">Motivos de Ausencia</h3>
                  <p className="text-gray-600 text-sm">
                    {motivos.length} motivo{motivos.length !== 1 ? 's' : ''} registrado{motivos.length !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-purple-50 to-pink-50">
                <tr>
                  <th className="text-left px-6 py-4 text-[10px] font-black text-gray-400 tracking-widest">Empleado</th>
                  <th className="text-left px-6 py-4 text-[10px] font-black text-gray-400 tracking-widest">Fecha</th>
                  <th className="text-left px-6 py-4 text-[10px] font-black text-gray-400 tracking-widest">Hora Inicio</th>
                  <th className="text-left px-6 py-4 text-[10px] font-black text-gray-400 tracking-widest">Hora Fin</th>
                  <th className="text-left px-6 py-4 text-[10px] font-black text-gray-400 tracking-widest">Descripción</th>
                  <th className="text-left px-6 py-4 text-[10px] font-black text-gray-400 tracking-widest">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {motivos.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center">
                        <FileText className="w-16 h-16 text-gray-200 mb-4" />
                        <h3 className="text-lg font-semibold text-gray-500 mb-1">No hay motivos registrados</h3>
                        <p className="text-sm text-gray-400">Los motivos de ausencia registrados aparecerán aquí</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  (() => {
                    const startIndex = (currentPageMotivos - 1) * itemsPerPageMotivos;
                    const paginatedMotivos = motivos.slice(startIndex, startIndex + itemsPerPageMotivos);
                    return paginatedMotivos.map((motivo) => (
                      <tr key={motivo.motivoId} className="hover:bg-gray-50/60 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-3">
                            <div className="w-9 h-9 bg-gradient-to-br from-pink-400 to-purple-500 rounded-xl flex items-center justify-center shrink-0">
                              <span className="text-white font-bold text-sm">
                                {(motivo.nombreEmpleado || motivo.documentoEmpleado || 'E').charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <span className="font-semibold text-gray-800 text-sm">
                              {motivo.nombreEmpleado || motivo.documentoEmpleado}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm font-medium text-gray-700">
                            {new Date(motivo.fecha + 'T00:00:00').toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 font-bold text-xs">
                            {formatTo12Hour(motivo.horaInicio)}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-purple-50 text-purple-700 font-bold text-xs">
                            {formatTo12Hour(motivo.horaFin)}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm text-gray-600 max-w-[200px] truncate" title={motivo.descripcion}>
                            {motivo.descripcion}
                          </p>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleViewMotivoDetail(motivo)}
                              className="p-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                              title="Ver detalle"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ));
                  })()
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {motivos.length > 0 && (
            <div className="p-6 border-t border-gray-100 bg-gray-50/50">
              <SimplePagination
                currentPage={currentPageMotivos}
                totalPages={Math.max(1, Math.ceil(motivos.length / itemsPerPageMotivos))}
                onPageChange={setCurrentPageMotivos}
                totalRecords={motivos.length}
                recordsPerPage={itemsPerPageMotivos}
              />
            </div>
          )}
        </div>
      )}

      {/* ── Schedules List ── */}
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden relative min-h-[400px]">
        <SectionLoader />
        <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-6 border-b border-gray-100">
          <h3 className="text-xl font-bold text-gray-800">Horarios Configurados</h3>
          <p className="text-gray-600">
            {groups.length} horario{groups.length !== 1 ? 's' : ''} configurado{groups.length !== 1 ? 's' : ''}
          </p>
        </div>

        <div className="p-6">
          <div className="space-y-4">
            {paginatedGroups.map((group) => {
              const groupHorarios = getHorariosForGroup(group);
              const assignments = getAssignmentsForGroup(group);

              return (
                <div key={group.id} className="border border-gray-200 rounded-2xl p-6 hover:shadow-lg transition-all">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      {/* Group Name & Status */}
                      <div className="flex items-center space-x-3 mb-3">
                        <div className="w-10 h-10 bg-gradient-brand rounded-xl flex items-center justify-center">
                          <Calendar className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <h4 className="text-xl font-bold text-gray-800">{group.nombre}</h4>
                          <div className="flex items-center flex-wrap gap-2 mt-0.5">
                            
                            <span className="px-3 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700">
                              🔁 Recurrente — aplica todo el año
                            </span>
                            <span className="text-xs text-gray-500">
                              {groupHorarios.reduce((acc, h) => acc + (extractArray(h).length), 0)} día{groupHorarios.reduce((acc, h) => acc + (extractArray(h).length), 0) !== 1 ? 's' : ''} por semana
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 mb-4">
                        {groupHorarios.map(h => (
                          <React.Fragment key={h.horarioId}>
                            {extractArray(h).map((d, idx) => (
                              <div key={`${h.horarioId}-${idx}`} className="flex items-center space-x-1.5 px-3 py-1.5 bg-gray-50 text-brand-indigo rounded-lg text-sm">
                                <Calendar className="w-3.5 h-3.5" />
                                <span className="font-semibold">{DIAS_SHORT[d.diaSemana || ''] || d.diaSemana}</span>
                              </div>
                            ))}
                          </React.Fragment>
                        ))}
                      </div>

                      {/* Assigned employees */}
                      <div>
                        <div className="text-gray-600 text-sm mb-1">Empleados asignados:</div>
                        <div className="flex flex-wrap gap-2">
                          {assignments.length > 0 ? (() => {
                            // Deduplicate by documentoEmpleado — each employee shown only once
                            const seen = new Set<string>();
                            const unique = assignments.filter(a => {
                              const doc = a.documentoEmpleado || '';
                              if (seen.has(doc)) return false;
                              seen.add(doc);
                              return true;
                            });
                            return (
                              <>
                                {unique.slice(0, 3).map(a => (
                                  <span key={a.documentoEmpleado} className="px-2 py-1 bg-blue-100 text-blue-800 rounded-lg text-xs">
                                    {a.empleadoNombre || a.documentoEmpleado}
                                  </span>
                                ))}
                                {unique.length > 3 && (
                                  <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-lg text-xs font-medium">
                                    +{unique.length - 3} más
                                  </span>
                                )}
                              </>
                            );
                          })() : (
                            <span className="text-gray-400 text-xs">Sin empleados asignados</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 ml-6">
                      {/* Estado Toggle */}
                      {canManageSchedules && (
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={group.estado}
                            onChange={() => handleToggleStatus(group)}
                            className="sr-only peer"
                          />
                          <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-brand-periwinkle/300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-pink-400 peer-checked:to-purple-500"></div>
                          
                        </label>
                      )}

                      {/* Ver detalle */}
                      {canViewSchedules && (
                        <button
                          onClick={() => handleViewDetail(group)}
                          className="p-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                          title="Ver detalle"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      )}

                      {/* Editar */}
                      {canManageSchedules && (
                        <button
                          onClick={() => handleEditSchedule(group)}
                          disabled={!group.estado}
                          className={cn(
                            "p-2 rounded-lg transition-colors",
                            !group.estado
                              ? "bg-gray-100 text-gray-400 cursor-not-allowed opacity-50"
                              : "bg-green-100 text-green-700 hover:bg-green-200"
                          )}
                          title={!group.estado ? "No se puede editar un horario inactivo" : "Editar horario"}
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                      )}

                      {/* Eliminar */}
                      {canManageSchedules && (
                        <button
                          onClick={() => handleDeleteSchedule(group)}
                          disabled={!group.estado}
                          className={cn(
                            "p-2 rounded-lg transition-colors",
                            !group.estado
                              ? "bg-gray-100 text-gray-400 cursor-not-allowed opacity-50"
                              : "bg-gray-100 text-brand-pink hover:bg-red-200"
                          )}
                          title={!group.estado ? "No se puede eliminar un horario inactivo" : "Eliminar horario"}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {groups.length === 0 && (
              <div className="text-center py-12">
                <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-600 mb-2">No hay horarios configurados</h3>
                <p className="text-gray-500 mb-6">Crea el primer horario para organizar el trabajo del salón</p>
                {canManageSchedules && (
                  <button
                    onClick={handleCreateSchedule}
                    className="bg-gradient-brand text-white px-6 py-3 rounded-xl font-semibold hover:shadow-lg transition-all"
                  >
                    Crear Primer Horario
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Pagination */}
          {groups.length > 0 && (
            <div className="mt-8 pt-6 border-t border-gray-200 bg-gray-50/50 p-4 rounded-xl">
              <SimplePagination
                currentPage={currentPage}
                totalPages={Math.max(1, totalPages)}
                onPageChange={setCurrentPage}
                totalRecords={totalCount}
                recordsPerPage={itemsPerPage}
              />
            </div>
          )}
        </div>
      </div>
      
      </>
      )}

      {/* ── Modals ── */}

      {showScheduleModal && (
        <ScheduleModal
          group={selectedGroup}
          horarios={selectedGroup ? getHorariosForGroup(selectedGroup) : []}
          empleados={empleados}
          existingAssignments={selectedGroup ? getAssignmentsForGroup(selectedGroup) : []}
          onClose={() => setShowScheduleModal(false)}
          onSave={handleSaveSchedule}
          saving={saving}
          checkOverlap={checkOverlap}
        />
      )}

      {showDetailModal && selectedGroup && (
        <ScheduleDetailModal
          group={selectedGroup}
          horarios={getHorariosForGroup(selectedGroup)}
          assignments={getAssignmentsForGroup(selectedGroup)}
          onClose={() => setShowDetailModal(false)}
        />
      )}

      {showDeleteModal && selectedGroup && (
        <DeleteScheduleModal
          group={selectedGroup}
          horarios={getHorariosForGroup(selectedGroup)}
          onClose={() => setShowDeleteModal(false)}
          onConfirm={confirmDeleteSchedule}
          saving={saving}
        />
      )}

      {showAssignModal && selectedGroup && (
        <AssignEmployeeModal
          group={selectedGroup}
          horarios={getHorariosForGroup(selectedGroup)}
          empleados={empleados}
          existingAssignments={getAssignmentsForGroup(selectedGroup)}
          onClose={() => setShowAssignModal(false)}
          onSave={handleSaveAssignment}
          saving={saving}
          checkOverlap={checkOverlap}
        />
      )}

      {showMotivoModal && (
        <MotivoModal
          onClose={() => setShowMotivoModal(false)}
          onSave={handleMotivoModalSave}
          saving={saving}
          isAdmin={isAdmin}
          empleados={empleados}
        />
      )}

      {/* Motivo Confirmation Modal */}
      {showMotivoConfirmModal && pendingMotivoData && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center space-x-4 mb-6">
              <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-800">Confirmar Registro</h3>
              </div>
            </div>
            
            <div className="space-y-4 mb-6">
              <p className="text-gray-600">
                Al registrar este motivo, <span className="font-semibold text-gray-800">se cancelarán automáticamente todas las citas programadas dentro del horario especificado</span>.
              </p>
              
              <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 space-y-3">
                <div>
                  <span className="text-xs font-bold text-gray-400 tracking-widest">Fecha</span>
                  <p className="text-gray-800 font-semibold">
                    {new Date(pendingMotivoData.fecha + 'T00:00:00').toLocaleDateString('es-ES')}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-xs font-bold text-gray-400 tracking-widest">Hora Inicio</span>
                    <p className="text-gray-800 font-semibold">{formatTo12Hour(pendingMotivoData.horaInicio)}</p>
                  </div>
                  <div>
                    <span className="text-xs font-bold text-gray-400 tracking-widest">Hora Fin</span>
                    <p className="text-gray-800 font-semibold">{formatTo12Hour(pendingMotivoData.horaFin)}</p>
                  </div>
                </div>
                <div>
                  <span className="text-xs font-bold text-gray-400 tracking-widest">Descripción</span>
                  <p className="text-gray-800">{pendingMotivoData.descripcion}</p>
                </div>
              </div>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setShowMotivoConfirmModal(false);
                  setPendingMotivoData(null);
                }}
                className="flex-1 px-6 py-3 border border-gray-200 text-gray-600 rounded-xl font-bold hover:bg-gray-50 transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={confirmSaveMotivo}
                disabled={saving}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl font-bold hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Guardando...</span>
                  </>
                ) : (
                  <span>Confirmar</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Motivo Detail Modal */}
      {showMotivoDetailModal && selectedMotivo && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="bg-gradient-brand p-5 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold">Detalle del Motivo</h3>
                </div>
                <button
                  onClick={() => setShowMotivoDetailModal(false)}
                  className="w-9 h-9 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/30 transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="p-6 overflow-y-auto">
              <div className="space-y-4">
                <div>
                  <span className="text-xs font-bold text-gray-400 tracking-widest">Empleado</span>
                  <p className="text-lg font-semibold text-gray-800">{selectedMotivo.nombreEmpleado || selectedMotivo.documentoEmpleado}</p>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <span className="text-xs font-bold text-gray-400 tracking-widest">Fecha</span>
                    <p className="text-lg font-semibold text-gray-800">{new Date(selectedMotivo.fecha + 'T00:00:00').toLocaleDateString('es-ES')}</p>
                  </div>
                  <div>
                    <span className="text-xs font-bold text-gray-400 tracking-widest">Estado</span>
                    <p className="text-lg font-semibold text-gray-800">{String(selectedMotivo.estado).charAt(0).toUpperCase() + String(selectedMotivo.estado).slice(1).toLowerCase()}</p>
                  </div>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <span className="text-xs font-bold text-gray-400 tracking-widest">Hora Inicio</span>
                    <p className="text-lg font-semibold text-gray-800">{formatTo12Hour(selectedMotivo.horaInicio)}</p>
                  </div>
                  <div>
                    <span className="text-xs font-bold text-gray-400 tracking-widest">Hora Fin</span>
                    <p className="text-lg font-semibold text-gray-800">{formatTo12Hour(selectedMotivo.horaFin)}</p>
                  </div>
                </div>
                <div>
                  <span className="text-xs font-bold text-gray-400 tracking-widest">Descripción</span>
                  <p className="text-gray-800 mt-1">{selectedMotivo.descripcion}</p>
                </div>
              </div>
            </div>
            <div className="p-5 bg-gray-50 border-t border-gray-100 flex justify-end">
              <button
                onClick={() => setShowMotivoDetailModal(false)}
                className="px-6 py-2.5 rounded-xl font-bold text-gray-500 hover:bg-gray-200 transition-all"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Accept Motivo Modal */}
      {showAcceptMotivoModal && selectedMotivo && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center space-x-4 mb-6">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-800">Confirmar Aceptación</h3>
                <p className="text-gray-600">¿Estás seguro de aceptar este motivo?</p>
              </div>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowAcceptMotivoModal(false)}
                className="flex-1 px-6 py-3 border border-gray-200 text-gray-500 rounded-xl font-semibold hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={confirmAcceptMotivo}
                className="flex-1 bg-gradient-brand text-white px-6 py-3 rounded-xl font-semibold hover:shadow-lg transition-all"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Motivo Modal */}
      {showRejectMotivoModal && selectedMotivo && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center space-x-4 mb-6">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-800">Confirmar Rechazo</h3>
                <p className="text-gray-600">¿Estás seguro de rechazar este motivo?</p>
              </div>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowRejectMotivoModal(false)}
                className="flex-1 px-6 py-3 border border-gray-200 text-gray-500 rounded-xl font-semibold hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={confirmRejectMotivo}
                className="flex-1 bg-gradient-brand text-white px-6 py-3 rounded-xl font-semibold hover:shadow-lg transition-all"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════
// Assistant Schedule View
// ══════════════════════════════════════════
function AssistantScheduleView({ currentUser, horarioEmpleados, horarios }: { currentUser: any, horarioEmpleados: HorarioEmpleado[], horarios: Horario[] }) {
  const docId = String(currentUser?.documentId || '');
  const myAssignments = horarioEmpleados.filter(a => String(a.documentoEmpleado) === docId);

  const DIAS_ORDER = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

  // Helper to check if a shift's parent horario is active
  const isHorarioActive = (shift: HorarioEmpleado): boolean => {
    const parent = horarios.find(h => h.horarioId === shift.horarioId);
    // If we can't find the parent horario, treat as active (safe default)
    return parent ? parent.estado : true;
  };
  
  return (
    <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden mt-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Custom Header with improved contrast and reduced spacing */}
      <div className="bg-white p-6 md:p-8 border-b border-gray-100 relative overflow-hidden rounded-t-3xl shadow-sm">
        {/* Subtle Decorations */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50 rounded-full filter blur-[60px] opacity-60 pointer-events-none"></div>
        <div className="absolute bottom-0 left-10 w-48 h-48 bg-gray-50 rounded-full filter blur-[60px] opacity-50 pointer-events-none"></div>
        
        <div className="relative z-10">
          <div className="inline-flex items-center space-x-2 bg-indigo-50 px-3 py-1.5 rounded-full border border-indigo-100 mb-3 shadow-sm">
            <span className="text-[10px] font-bold tracking-widest text-indigo-700">Horario Oficial</span>
          </div>
          
          <h3 className="text-2xl sm:text-3xl font-extrabold mb-2 flex items-center space-x-3 tracking-tight text-gray-900">
            <Calendar className="w-7 h-7 sm:w-8 sm:h-8 text-indigo-600" />
            <span>Mi Semana Laboral</span>
          </h3>
          <p className="text-gray-600 max-w-2xl text-sm sm:text-base leading-relaxed font-medium">
            Revisa tus turnos y tiempos de descanso asignados. Este esquema es tu base recurrente para los días habilitados en la sucursal.
          </p>
        </div>
      </div>

      <div className="p-8 md:p-10 bg-gray-50/50">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {DIAS_ORDER.map((dia, index) => {
            const shift = myAssignments.find(a => normalizeDay(a.diaSemana) === normalizeDay(dia));
            const isWorking = !!shift;
            const isActive = shift ? isHorarioActive(shift) : true;

            return (
              <div 
                key={dia}
                style={{ animationDelay: `${index * 50}ms` }}
                className={`relative group overflow-hidden rounded-2xl transition-all duration-300 ${
                  isWorking && isActive
                    ? 'bg-white border-2 border-indigo-50 shadow-md hover:shadow-xl hover:-translate-y-1 hover:border-indigo-200'
                    : isWorking && !isActive
                    ? 'bg-amber-50/60 border-2 border-dashed border-amber-200 opacity-90'
                    : 'bg-gray-50 border-2 border-dashed border-gray-200 opacity-80'
                }`}
              >
                {/* Accent line for working days */}
                {isWorking && isActive && (
                  <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-indigo-500 to-purple-500" />
                )}
                {isWorking && !isActive && (
                  <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-amber-400 to-orange-400" />
                )}

                <div className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h4 className={`text-lg font-bold tracking-tight ${isWorking ? (isActive ? 'text-gray-900' : 'text-amber-800') : 'text-gray-500'}`}>
                      {dia}
                    </h4>
                    {isWorking && isActive && (
                       <span className="bg-indigo-50 text-indigo-700 text-[10px] font-bold tracking-wider py-1 px-2.5 rounded-full border border-indigo-200">
                         Turno
                       </span>
                    )}
                    {isWorking && !isActive && (
                       <span className="bg-amber-100 text-amber-700 text-[10px] font-bold tracking-wider py-1 px-2.5 rounded-full border border-amber-200">
                         Inactivo
                       </span>
                    )}
                  </div>
                  
                  {isWorking ? (
                    <div className="space-y-5">
                      <div className="flex items-start space-x-4">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
                          isActive
                            ? 'bg-indigo-50 text-indigo-600 group-hover:scale-110 group-hover:bg-indigo-100'
                            : 'bg-amber-100 text-amber-600'
                        }`}>
                          <Clock className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-gray-500 tracking-wider mb-1">Horario</p>
                          <div className={`font-extrabold text-[15px] ${isActive ? 'text-gray-900' : 'text-amber-800'}`}>
                            {shift ? formatTo12Hour(shift.horaInicio || '') : ''} 
                            <span className="text-gray-400 mx-2">-</span> 
                            {shift ? formatTo12Hour(shift.horaFin || '') : ''}
                          </div>
                        </div>
                      </div>
                      
                      <div className="pt-4 border-t border-gray-100">
                        {isActive ? (
                          <div className="flex items-center space-x-2 text-sm font-medium text-emerald-700 bg-emerald-50/50 px-3 py-2 rounded-lg border border-emerald-100/50 w-full justify-center">
                            <CheckCircle className="w-4 h-4" />
                            <span>Jornada Confirmada</span>
                          </div>
                        ) : (
                          <div className="flex items-center space-x-2 text-sm font-medium text-amber-700 bg-amber-50 px-3 py-2 rounded-lg border border-amber-200/60 w-full justify-center">
                            <AlertCircle className="w-4 h-4" />
                            <span>Horario Inactivo</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-6 h-full min-h-[140px] text-gray-500">
                      <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mb-3">
                         <Calendar className="w-6 h-6 text-gray-400 opacity-60" />
                      </div>
                      <span className="text-sm font-semibold tracking-wide">Día sin Horario</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════
// MotivoModal
// ══════════════════════════════════════════

interface MotivoModalProps {
  onClose: () => void;
  onSave: (data: CreateMotivoData | CreateAdminMotivoData) => void;
  saving: boolean;
  isAdmin: boolean;
  empleados: Empleado[];
}

function MotivoModal({ onClose, onSave, saving, isAdmin, empleados }: MotivoModalProps) {
  const today = new Date().toISOString().split('T')[0];

  // Max date = exactly 1 month from today
  const maxDate = (() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    return d.toISOString().split('T')[0];
  })();

  const [fecha, setFecha] = useState(today);
  const [horaInicio, setHoraInicio] = useState('08:00');
  const [horaFin, setHoraFin] = useState('18:00');
  const [descripcion, setDescripcion] = useState('');
  const [selectedEmpleado, setSelectedEmpleado] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!fecha || !horaInicio || !horaFin || !descripcion.trim()) {
      setError('Todos los campos son obligatorios');
      return;
    }

    if (isAdmin && !selectedEmpleado) {
      setError('Debes seleccionar un empleado');
      return;
    }

    if (horaFin <= horaInicio) {
      setError('La hora de fin debe ser posterior a la hora de inicio');
      return;
    }

    const today = new Date().toISOString().split('T')[0];
    if (fecha < today) {
      setError('No puedes registrar motivos en fechas pasadas');
      return;
    }

    if (fecha > maxDate) {
      setError('Solo puedes registrar motivos hasta 1 mes a partir de hoy');
      return;
    }

    // Ensure time format is HH:mm:ss as required by backend TimeOnly
    const formatTimeWithSeconds = (timeStr: string) => {
      if (!timeStr) return "00:00:00";
      const parts = timeStr.split(':');
      if (parts.length === 2) return `${timeStr}:00`;
      if (parts.length === 3) return timeStr;
      return `${timeStr}:00:00`.substring(0, 8);
    };

    if (isAdmin && selectedEmpleado) {
      onSave({
        documentoEmpleado: selectedEmpleado,
        fecha,
        horaInicio: formatTimeWithSeconds(horaInicio),
        horaFin: formatTimeWithSeconds(horaFin),
        descripcion: descripcion.trim()
      });
    } else {
      onSave({
        fecha,
        horaInicio: formatTimeWithSeconds(horaInicio),
        horaFin: formatTimeWithSeconds(horaFin),
        descripcion: descripcion.trim()
      });
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="bg-gradient-to-r from-blue-500 to-indigo-600 p-5 text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Clock className="w-6 h-6" />
            <h3 className="text-xl font-bold">Registrar Motivo de Ausencia</h3>
          </div>
          <button onClick={onClose} className="hover:bg-white/20 p-1 rounded-full transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="bg-amber-50 border border-amber-100 p-4 rounded-xl flex items-start space-x-3 mb-2">
            <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-amber-800">
              <p className="font-bold">Información importante:</p>
              <p>Al registrar este motivo, se <strong>cancelarán automáticamente</strong> todas las citas programadas para el día y horario establecidos. Además, se enviará una <strong>notificación por correo</strong> a todos los empleados.</p>
            </div>
          </div>

          {error && (
            <div className="bg-gray-50 border border-red-100 text-brand-pink px-4 py-2 rounded-xl text-sm font-medium flex items-center space-x-2">
              <AlertCircle className="w-4 h-4" />
              <span>{error}</span>
            </div>
          )}

          {isAdmin && (
            <div>
              <label className="block text-xs font-bold text-gray-400 tracking-widest mb-1">Empleado</label>
              <select
                value={selectedEmpleado}
                onChange={(e) => setSelectedEmpleado(e.target.value)}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-medium"
                required
              >
                <option value="">Selecciona un empleado</option>
                {empleados.filter(e => e.estado === true).map((empleado) => (
                  <option key={empleado.documentoEmpleado} value={empleado.documentoEmpleado}>
                    {empleado.nombre}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-gray-400 tracking-widest mb-1">Fecha</label>
            <input
              type="date"
              value={fecha}
              min={today}
              max={maxDate}
              onChange={(e) => setFecha(e.target.value)}
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-medium"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-400 tracking-widest mb-1">Hora Inicio</label>
              <input
                type="time"
                value={horaInicio}
                onChange={(e) => setHoraInicio(e.target.value)}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-medium"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-400 tracking-widest mb-1">Hora Fin</label>
              <input
                type="time"
                value={horaFin}
                onChange={(e) => setHoraFin(e.target.value)}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-medium"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-400 tracking-widest mb-1">Descripción / Motivo</label>
            <textarea
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              rows={3}
              placeholder="Ej: Cita médica, Trámite personal..."
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-medium resize-none"
              required
            />
          </div>

          <div className="pt-4 flex space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-600 rounded-xl font-bold hover:bg-gray-50 transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl font-bold hover:shadow-lg transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  <span>Guardar</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════
// ScheduleModal — Create / Edit a Schedule Group
// ══════════════════════════════════════════

interface ScheduleModalProps {
  group: ScheduleGroup | null;
  horarios: Horario[];
  empleados: Empleado[];
  existingAssignments: HorarioEmpleado[];
  onClose: () => void;
  onSave: (nombre: string, days: DaySchedule[], assignmentsToCreate: CreateHorarioEmpleadoData[], assignmentsToDelete: number[], groupId?: string) => void;
  saving: boolean;
  checkOverlap: (doc: string, dia: string, inicio: string, fin: string, excludeScheduleId?: number) => boolean;
}

function ScheduleModal({ group, horarios, empleados, existingAssignments, onClose, onSave, saving, checkOverlap }: ScheduleModalProps) {
  const [nombre, setNombre] = useState(group?.nombre || '');

  // Build initial days state
  const buildInitialDays = (): DaySchedule[] => {
    return DIAS_SEMANA_OPTIONS.map(dia => {
      // Encontrar el día dentro de la lista de horarios del grupo
      let foundDay: HorarioDia | undefined;
      const normalizedTarget = normalizeDay(dia);

      for (const h of horarios) {
        const hDays = extractArray(h);
        foundDay = hDays.find(d => normalizeDay(d.diaSemana) === normalizedTarget);
        if (foundDay) break;
      }

      // También verificar si hay asignaciones para este día, incluso si no se encontró en foundDay
      // (aunque técnicamente no debería haber asignaciones sin un día de horario)
      const hasAssignments = existingAssignments.some(a => normalizeDay(a.diaSemana) === normalizedTarget);

      return {
        horarioDiaId: foundDay?.horarioDiaId || 0,
        dia,
        horaInicio: foundDay?.horaInicio || '08:00',
        horaFin: foundDay?.horaFin || '18:00',
        enabled: !!foundDay || hasAssignments
      };
    });
  };

  const [days, setDays] = useState<DaySchedule[]>(buildInitialDays);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Employee assignment state
  // Prioritize the first enabled day for the initial selection
  const [selectedDayForAssign, setSelectedDayForAssign] = useState<string>(
    days.find(d => d.enabled)?.dia || DIAS_SEMANA_OPTIONS[0]
  );

  // Local pending assignments
  // We'll store the day name instead of ID to make mapping easier and safer
  const [pendingCreates, setPendingCreates] = useState<{ documentoEmpleado: string; diaSemana: string }[]>([]);
  const [pendingDeletes, setPendingDeletes] = useState<number[]>([]);

  // Available employees search and pagination
  const [availableEmpleadosFromApi, setAvailableEmpleadosFromApi] = useState<Empleado[]>([]);
  const [totalAvailableRecords, setTotalAvailableRecords] = useState(0);
  const [loadingAvailable, setLoadingAvailable] = useState(false);
  const [searchTermAvailable, setSearchTermAvailable] = useState('');
  const [availablePage, setAvailablePage] = useState(1);
  const itemsPerPageAvailable = 5;

  // Fetch available employees from API when search or page changes
  useEffect(() => {
    const fetchAvailable = async () => {
      setLoadingAvailable(true);
      try {
        const response = await empleadoService.getAll(availablePage, itemsPerPageAvailable, searchTermAvailable);

        setAvailableEmpleadosFromApi(extractArray(response));
        const total = (data: any) => {
          if (data && typeof data.totalCount === 'number') return data.totalCount;
          if (data && typeof data.totalRecords === 'number') return data.totalRecords;
          return Array.isArray(data) ? data.length : 0;
        };
        setTotalAvailableRecords(total(response));
      } catch (error) {
        console.error("Error fetching available employees:", error);
      } finally {
        setLoadingAvailable(false);
      }
    };

    fetchAvailable();
  }, [availablePage, searchTermAvailable]);

  // Reset page when search changes
  useEffect(() => {
    setAvailablePage(1);
  }, [searchTermAvailable]);

  const toggleDay = (dia: string) => {
    setDays(prev => prev.map(d =>
      d.dia === dia ? { ...d, enabled: !d.enabled } : d
    ));
  };

  const updateDayTime = (dia: string, field: 'horaInicio' | 'horaFin', value: string) => {
    setDays(prev => prev.map(d =>
      d.dia === dia ? { ...d, [field]: value } : d
    ));
  };

  const applyToAllEnabled = () => {
    const firstEnabled = days.find(d => d.enabled);
    if (!firstEnabled) return;
    setDays(prev => prev.map(d =>
      d.enabled ? { ...d, horaInicio: firstEnabled.horaInicio, horaFin: firstEnabled.horaFin } : d
    ));
  };

  const handleLocalAssign = (documentoEmpleado: string) => {
    const foundDay = days.find(d => d.dia === selectedDayForAssign);

    if (foundDay && checkOverlap(documentoEmpleado, foundDay.dia, foundDay.horaInicio, foundDay.horaFin)) {
      setValidationError(`El empleado ya tiene un horario asignado que se cruza con este día (${foundDay.dia} ${foundDay.horaInicio}-${foundDay.horaFin})`);
      return;
    }

    setPendingCreates(prev => [...prev, { documentoEmpleado, diaSemana: selectedDayForAssign }]);
    setValidationError(null);
  };

  const handleLocalRemove = (assignmentId: number) => {
    // If it's an existing assignment, mark for deletion
    if (existingAssignments.some(a => a.horarioEmpleadoId === assignmentId)) {
      setPendingDeletes(prev => [...prev, assignmentId]);
    }
  };

  const handleLocalRemovePendingCreate = (doc: string, dia: string) => {
    setPendingCreates(prev => prev.filter(p => !(p.documentoEmpleado === doc && p.diaSemana === dia)));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (!nombre.trim()) {
      setValidationError('El nombre del horario es obligatorio');
      return;
    }

    const enabledDays = days.filter(d => d.enabled);
    if (enabledDays.length === 0) {
      setValidationError('Debes seleccionar al menos un día');
      return;
    }

    for (const day of enabledDays) {
      if (!day.horaInicio || !day.horaFin) {
        setValidationError(`Las horas son obligatorias para ${day.dia}`);
        return;
      }
      if (day.horaInicio >= day.horaFin) {
        setValidationError(`La hora de inicio debe ser menor que la hora de fin en ${day.dia}`);
        return;
      }
    }

    // Convert pendingCreates from {doc, dia} to CreateHorarioEmpleadoData format
    const finalPendingCreates: CreateHorarioEmpleadoData[] = pendingCreates.map(p => {
      // Find the current ID (might be 0, which handleSaveSchedule will fix)
      const currentDayId = days.find(d => d.dia === p.diaSemana)?.horarioDiaId || 0;
      return {
        horarioId: currentDayId,
        documentoEmpleado: p.documentoEmpleado,
        diaSemana: p.diaSemana
      };
    });

    onSave(nombre.trim(), days, finalPendingCreates, pendingDeletes, group?.id);
  };

  const enabledCount = days.filter(d => d.enabled).length;

  // Employee helpers combining existing + pending UI state

  // Existing assignments not locally deleted
  const activeExistingAssignments = existingAssignments.filter(a => !pendingDeletes.includes(a.horarioEmpleadoId));

  // Find the day name for the current selection
  const normalizedSelected = normalizeDay(selectedDayForAssign);
  const selectedDayRecord = horarios.flatMap(h => extractArray(h)).find(d => normalizeDay(d.diaSemana) === normalizedSelected);
  const selectedDayName = normalizeDay(selectedDayRecord?.diaSemana || selectedDayForAssign);

  const existingAssignmentsForDay = activeExistingAssignments.filter(a => normalizeDay(a.diaSemana) === selectedDayName);
  const pendingAssignmentsForDay = pendingCreates.filter(p => p.diaSemana === selectedDayForAssign);

  const assignedDocsForDay = [
    ...existingAssignmentsForDay.map(a => a.documentoEmpleado),
    ...pendingAssignmentsForDay.map(p => p.documentoEmpleado)
  ];

  const availableEmpleados = availableEmpleadosFromApi.filter(
    e => e.estado && !assignedDocsForDay.includes(e.documentoEmpleado)
  );

  const totalAvailablePages = Math.ceil(totalAvailableRecords / itemsPerPageAvailable);
  const paginatedAvailable = availableEmpleados; // Already paginated from API

  useEffect(() => {
    setAvailablePage(1);
  }, [searchTermAvailable, selectedDayForAssign]);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-gradient-brand p-5 text-white shrink-0 shadow-md z-20">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm shadow-inner">
                <Calendar className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold leading-tight">
                  {group ? 'Editar Horario' : 'Registrar Nuevo Horario'}
                </h3>
                <p className="text-pink-100 text-xs font-medium">Configura los días, horas y personal del salón</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-9 h-9 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/30 hover:scale-110 active:scale-95 transition-all shadow-sm"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 lg:p-8 bg-gray-50/30 no-scrollbar">
          <style>{`
            .no-scrollbar::-webkit-scrollbar { display: none; }
            .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
          `}</style>

          <form id="schedule-form" onSubmit={handleSubmit} className="max-w-4xl mx-auto space-y-6">
            {/* Validation error */}
            {validationError && (
              <div className="bg-gray-50 border border-red-100 text-brand-pink px-4 py-3 rounded-2xl flex items-center space-x-3 animate-in fade-in slide-in-from-top-2 duration-300">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <p className="text-xs font-bold tracking-wide">{validationError}</p>
              </div>
            )}

            <div className="grid lg:grid-cols-2 gap-6">
              {/* Left Column: Schedule Identity & Days */}
              <div className="space-y-6">
                {/* Name Card */}
                <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                  <div className="flex items-center space-x-2 text-brand-violet mb-4">
                    <FileText className="w-4 h-4" />
                    <h4 className="font-bold text-[10px] tracking-widest">Identidad del Horario</h4>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 tracking-widest mb-2">Nombre del Horario *</label>
                    <input
                      type="text"
                      value={nombre}
                      onChange={(e) => setNombre(e.target.value)}
                      placeholder="Ej: Turno Matutino"
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-brand-periwinkle/30 focus:border-brand-indigo transition-all text-sm font-medium"
                      required
                    />
                  </div>
                </div>

                {/* Days Config Card */}
                <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-2 text-brand-pink">
                      <Calendar className="w-4 h-4" />
                      <h4 className="font-bold text-[10px] tracking-widest">Configuración de Días</h4>
                    </div>
                    {enabledCount > 1 && (
                      <button
                        type="button"
                        onClick={applyToAllEnabled}
                        className="text-[9px] font-black tracking-widest text-brand-indigo hover:text-brand-indigo transition-colors flex items-center space-x-1"
                      >
                        <Copy className="w-3 h-3" />
                        <span>Copiar a todos</span>
                      </button>
                    )}
                  </div>

                  <div className="mb-4 p-3 bg-blue-50/50 rounded-xl border border-blue-100">
                    <p className="text-[10px] text-blue-700 leading-relaxed">
                      Este horario es <span className="font-bold">recurrente</span>. Los días seleccionados se repiten semanalmente durante todo el año.
                    </p>
                  </div>

                  {/* Day selection grid */}
                  <div className="grid grid-cols-4 gap-2 mb-6">
                    {days.map(day => (
                      <button
                        key={day.dia}
                        type="button"
                        onClick={() => toggleDay(day.dia)}
                        className={`py-2 px-1 rounded-lg text-[10px] font-black tracking-tighter transition-all border ${day.enabled
                          ? 'bg-purple-600 border-purple-600 text-white shadow-sm'
                          : 'bg-white border-gray-100 text-gray-400 hover:border-purple-200'
                          }`}
                      >
                        {day.dia.substring(0, 3)}
                      </button>
                    ))}
                  </div>

                  {/* Hours inputs */}
                  <div className="space-y-3">
                    {days.filter(d => d.enabled).map(day => (
                      <div key={day.dia} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-xl border border-gray-100 group transition-colors hover:bg-white hover:border-purple-100">
                        <div className="w-8 font-black text-[10px] text-gray-400">{day.dia.substring(0, 3)}</div>
                        <div className="flex-1 grid grid-cols-2 gap-2">
                          <input
                            type="time"
                            value={day.horaInicio}
                            onChange={(e) => updateDayTime(day.dia, 'horaInicio', e.target.value)}
                            className="px-2 py-1.5 bg-white border border-gray-100 rounded-lg text-xs font-bold focus:ring-2 focus:ring-brand-periwinkle/30 focus:border-brand-indigo outline-none"
                          />
                          <input
                            type="time"
                            value={day.horaFin}
                            onChange={(e) => updateDayTime(day.dia, 'horaFin', e.target.value)}
                            className="px-2 py-1.5 bg-white border border-gray-100 rounded-lg text-xs font-bold focus:ring-2 focus:ring-brand-periwinkle/30 focus:border-brand-indigo outline-none"
                          />
                        </div>
                      </div>
                    ))}

                    {enabledCount === 0 && (
                      <div className="text-center py-8 border-2 border-dashed border-gray-100 rounded-2xl">
                        <Calendar className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                        <p className="text-[10px] font-bold text-gray-400 tracking-widest">Selecciona días para configurar</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Column: Personnel Assignment */}
              <div className="space-y-6">
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col h-full overflow-hidden">
                  <div className="p-5 border-b border-gray-100 bg-gray-50/50">
                    <div className="flex items-center space-x-2 text-blue-500 mb-4">
                      <Users className="w-4 h-4" />
                      <h4 className="font-bold text-[10px] tracking-widest">Asignación de Personal</h4>
                    </div>

                    {!group ? (
                      <div className="bg-amber-50 border border-amber-100 p-4 rounded-xl">
                        <p className="text-[10px] text-amber-700 font-bold tracking-wider leading-relaxed">
                          La asignación de personal estará disponible una vez registrado el horario.
                        </p>
                      </div>
                    ) : (
                      <>
                        {/* Day selector for assignment */}
                        <div className="mb-4">
                          <label className="block text-[10px] font-black text-gray-400 tracking-widest mb-2">Ver personal por día:</label>
                          <div className="flex flex-wrap gap-1.5">
                            {days.filter(d => d.enabled).map(d => (
                              <button
                                key={d.dia}
                                type="button"
                                onClick={() => setSelectedDayForAssign(d.dia)}
                                className={`px-2.5 py-1.5 rounded-lg text-[9px] font-black tracking-wider transition-all border ${selectedDayForAssign === d.dia
                                  ? 'bg-blue-500 border-blue-500 text-white shadow-sm'
                                  : 'bg-white border-gray-100 text-gray-400 hover:border-blue-200'
                                  }`}
                              >
                                {d.dia.substring(0, 3)}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* List of currently assigned */}
                        <div className="space-y-2 mb-4">
                          <label className="block text-[10px] font-black text-gray-400 tracking-widest">Personal Asignado ({existingAssignmentsForDay.length + pendingAssignmentsForDay.length})</label>
                          <div className="flex flex-wrap gap-2">
                            {existingAssignmentsForDay.map(a => (
                              <div key={a.horarioEmpleadoId} className="flex items-center space-x-2 px-2 py-1 bg-blue-50 text-blue-700 rounded-lg border border-blue-100 group">
                                <span className="text-[10px] font-bold">{a.empleadoNombre || a.documentoEmpleado}</span>
                                <button
                                  type="button"
                                  onClick={() => handleLocalRemove(a.horarioEmpleadoId)}
                                  className="text-blue-300 hover:text-brand-pink transition-colors"
                                >
                                  <UserMinus className="w-3 h-3" />
                                </button>
                              </div>
                            ))}
                            {pendingAssignmentsForDay.map(p => {
                              const empName = empleados.find(e => e.documentoEmpleado === p.documentoEmpleado)?.nombre || p.documentoEmpleado;
                              return (
                                <div key={`pending-${p.documentoEmpleado}-${p.diaSemana}`} className="flex items-center space-x-2 px-2 py-1 bg-green-50 text-green-700 rounded-lg border border-green-100 animate-pulse">
                                  <span className="text-[10px] font-bold">{empName} (NUEVO)</span>
                                  <button
                                    type="button"
                                    onClick={() => handleLocalRemovePendingCreate(p.documentoEmpleado, p.diaSemana)}
                                    className="text-green-300 hover:text-brand-pink transition-colors"
                                  >
                                    <UserMinus className="w-3 h-3" />
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Available personnel list */}
                        <div className="flex-1 overflow-hidden flex flex-col">
                          <div className="flex items-center justify-between mb-2">
                            <label className="block text-[10px] font-black text-gray-400 tracking-widest">Personal Disponible ({totalAvailableRecords})</label>
                            <div className="relative">
                              <Search className="w-3 h-3 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                              <input
                                type="text"
                                value={searchTermAvailable}
                                onChange={(e) => setSearchTermAvailable(e.target.value)}
                                placeholder="Buscar..."
                                className="pl-8 pr-3 py-1.5 bg-white border border-gray-100 rounded-lg text-[9px] font-bold focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none w-40 transition-all"
                              />
                            </div>
                          </div>

                          <div className="space-y-2 overflow-y-auto max-h-[300px] pr-2 no-scrollbar flex-1">
                            {loadingAvailable ? (
                              <div className="flex items-center justify-center py-8">
                                <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                              </div>
                            ) : paginatedAvailable.length > 0 ? (
                              paginatedAvailable.map(emp => {
                                const currentDay = days.find(d => d.dia === selectedDayForAssign);
                                const isOverlapping = currentDay ? checkOverlap(
                                  emp.documentoEmpleado,
                                  currentDay.dia,
                                  currentDay.horaInicio,
                                  currentDay.horaFin
                                ) : false;

                                return (
                                  <div
                                    key={emp.documentoEmpleado}
                                    className={`flex items-center justify-between p-3 rounded-xl border transition-all ${isOverlapping
                                      ? 'bg-gray-50 border-red-100 opacity-60'
                                      : 'bg-white border-gray-100 hover:border-blue-200 hover:shadow-sm'
                                      }`}
                                  >
                                    <div className="flex items-center space-x-3">
                                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-white text-xs ${isOverlapping ? 'bg-red-400' : 'bg-gradient-to-br from-blue-400 to-indigo-500'
                                        }`}>
                                        {(emp.nombre || 'E').charAt(0)}
                                      </div>
                                      <div>
                                        <p className="text-[11px] font-bold text-gray-700 leading-none">{emp.nombre}</p>
                                        <p className="text-[9px] font-medium text-gray-400 mt-1">
                                          {isOverlapping ? '⚠️ Solapamiento de horario' : `Doc: ${emp.documentoEmpleado}`}
                                        </p>
                                      </div>
                                    </div>
                                    {!isOverlapping && (
                                      <button
                                        type="button"
                                        onClick={() => handleLocalAssign(emp.documentoEmpleado)}
                                        className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                                      >
                                        <UserPlus className="w-4 h-4" />
                                      </button>
                                    )}
                                  </div>
                                );
                              })
                            ) : (
                              <div className="text-center py-8">
                                <Users className="w-8 h-8 text-gray-100 mx-auto mb-2" />
                                <p className="text-[10px] font-bold text-gray-300 tracking-widest">
                                  {searchTermAvailable ? 'No se encontraron resultados' : 'Sin personal disponible'}
                                </p>
                              </div>
                            )}
                          </div>

                          {/* Mini Pagination for Available Personnel */}
                          {totalAvailablePages > 1 && (
                            <div className="flex items-center justify-between mt-4 px-1">
                              <p className="text-[9px] font-bold text-gray-400 tracking-widest">
                                Página {availablePage} de {totalAvailablePages}
                              </p>
                              <div className="flex items-center space-x-1">
                                <button
                                  type="button"
                                  onClick={() => setAvailablePage(p => Math.max(1, p - 1))}
                                  disabled={availablePage === 1}
                                  className="p-1.5 bg-white border border-gray-100 rounded-lg text-gray-400 hover:bg-gray-50 disabled:opacity-30 transition-all"
                                >
                                  <ChevronLeft className="w-3 h-3" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setAvailablePage(p => Math.min(totalAvailablePages, p + 1))}
                                  disabled={availablePage === totalAvailablePages}
                                  className="p-1.5 bg-white border border-gray-100 rounded-lg text-gray-400 hover:bg-gray-50 disabled:opacity-30 transition-all"
                                >
                                  <ChevronRight className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="p-5 bg-white border-t border-gray-100 flex items-center justify-between shrink-0 z-20">
          <p className="text-[10px] font-bold text-gray-400 tracking-widest">
            * Campos obligatorios para el registro
          </p>
          <div className="flex space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 rounded-xl font-black text-gray-400 hover:bg-gray-100 transition-all text-[10px] tracking-widest"
            >
              Cancelar
            </button>
            <button
              type="submit"
              form="schedule-form"
              disabled={saving}
              className="px-8 py-2.5 bg-gradient-brand text-white rounded-xl font-black text-[10px] tracking-widest hover:shadow-lg hover:scale-105 active:scale-95 transition-all disabled:opacity-50 flex items-center space-x-2"
            >
              {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>{group ? 'Actualizar' : 'Registrar'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════
// ScheduleDetailModal
// ══════════════════════════════════════════

interface ScheduleDetailModalProps {
  group: ScheduleGroup;
  horarios: Horario[];
  assignments: HorarioEmpleado[];
  onClose: () => void;
}

function ScheduleDetailModal({ group, horarios, assignments, onClose }: ScheduleDetailModalProps) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header - Fixed at top */}
        <div className="bg-gradient-brand p-5 text-white shrink-0 shadow-md z-20">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <Calendar className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold leading-tight">Detalle del Horario</h3>
                <p className="text-pink-100 text-sm">{group.nombre}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-9 h-9 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/30 hover:scale-110 active:scale-95 transition-all shadow-sm"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 lg:p-8 bg-gray-50/30 no-scrollbar">
          <style>{`
            .no-scrollbar::-webkit-scrollbar { display: none; }
            .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
          `}</style>

          <div className="max-w-4xl mx-auto space-y-6">
            {/* General Info Card */}
            <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
              <div className="flex items-center space-x-2 text-brand-violet mb-4">
                <FileText className="w-4 h-4" />
                <h4 className="font-bold text-[10px] tracking-widest">Información General</h4>
              </div>
              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <span className="text-[10px] font-bold text-gray-400 tracking-tight">Nombre del Horario:</span>
                  <p className="font-bold text-gray-800 text-lg">{group.nombre}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-gray-400 tracking-tight">Días Configurados:</span>
                  <p className="font-bold text-gray-800 text-lg">
                    {horarios.reduce((acc, h) => acc + (extractArray(h).length), 0)} días
                  </p>
                </div>
              </div>
            </div>

            {/* Days and Times Section */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-6 py-4 bg-gray-50/50 border-b border-gray-100 flex items-center justify-between">
                <h4 className="font-bold text-gray-700 text-sm flex items-center space-x-2">
                  <Clock className="w-4 h-4 text-brand-pink" />
                  <span>Días y Horas de Atención</span>
                </h4>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-[10px] font-black text-gray-400 tracking-widest">Día de la Semana</th>
                      <th className="px-6 py-3 text-center text-[10px] font-black text-gray-400 tracking-widest">Hora Inicio</th>
                      <th className="px-6 py-3 text-center text-[10px] font-black text-gray-400 tracking-widest">Hora Fin</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {horarios.map((h) => (
                      <React.Fragment key={h.horarioId}>
                        {extractArray(h).map((d, idx) => (
                          <tr key={`${h.horarioId}-${idx}`} className="hover:bg-gray-50/50 transition-colors">
                            <td className="px-6 py-4 font-bold text-gray-700">{d.diaSemana || '---'}</td>
                            <td className="px-6 py-4 text-center">
                              <span className="inline-flex items-center px-3 py-1 rounded-lg bg-blue-50 text-blue-700 font-bold text-sm">
                                {d.horaInicio ? formatTo12Hour(d.horaInicio.substring(0, 5)) : '--:--'}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <span className="inline-flex items-center px-3 py-1 rounded-lg bg-gray-50 text-pink-700 font-bold text-sm">
                                {d.horaFin ? formatTo12Hour(d.horaFin.substring(0, 5)) : '--:--'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Assigned Employees Section */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-6 py-4 bg-gray-50/50 border-b border-gray-100">
                <h4 className="font-bold text-gray-700 text-sm flex items-center space-x-2">
                  <Users className="w-4 h-4 text-blue-400" />
                  <span>Personal Asignado por Día</span>
                </h4>
              </div>
              <div className="p-6">
                {assignments.length > 0 ? (
                  <div className="space-y-6">
                    {horarios.flatMap(h => extractArray(h)).map(d => {
                      const dayAssignments = assignments.filter(a => normalizeDay(a.diaSemana) === normalizeDay(d.diaSemana));
                      if (dayAssignments.length === 0) return null;

                      return (
                        <div key={d.horarioDiaId} className="space-y-3">
                          <div className="flex items-center space-x-2 text-brand-indigo border-b border-purple-50 pb-2">
                            <Calendar className="w-4 h-4" />
                            <h5 className="font-bold text-xs tracking-widest">
                              {d.diaSemana} ({d.horaInicio ? formatTo12Hour(d.horaInicio.substring(0, 5)) : '--:--'} - {d.horaFin ? formatTo12Hour(d.horaFin.substring(0, 5)) : '--:--'})
                            </h5>
                          </div>
                          <div className="grid md:grid-cols-2 gap-4">
                            {dayAssignments.map((a) => (
                              <div key={a.horarioEmpleadoId} className="flex items-center space-x-4 p-4 bg-gray-50 rounded-2xl border border-gray-100 hover:bg-gray-100 transition-colors">
                                <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center text-blue-500 font-bold text-xl">
                                  {(a.empleadoNombre || 'E').charAt(0)}
                                </div>
                                <div>
                                  <p className="font-bold text-gray-800">{a.empleadoNombre || 'Empleado'}</p>
                                  <p className="text-xs text-gray-500 font-mono">Doc: {a.documentoEmpleado}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 font-medium">No hay empleados asignados actualmente</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer - Fixed at bottom */}
        <div className="p-5 bg-white border-t border-gray-100 flex flex-wrap gap-3 justify-end shrink-0 z-20">
          <button
            onClick={onClose}
            className="px-8 py-2.5 rounded-xl font-black text-gray-500 hover:bg-gray-200 hover:text-gray-800 active:scale-95 transition-all text-sm tracking-widest shadow-sm"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════
// DeleteScheduleModal
// ══════════════════════════════════════════

interface DeleteScheduleModalProps {
  group: ScheduleGroup;
  horarios: Horario[];
  onClose: () => void;
  onConfirm: () => void;
  saving: boolean;
}

function DeleteScheduleModal({ group, horarios, onClose, onConfirm, saving }: DeleteScheduleModalProps) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-red-500 to-pink-600 p-5 text-white shrink-0 shadow-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm shadow-inner">
                <Trash2 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold leading-tight">Confirmar Eliminación</h3>
                <p className="text-red-100 text-xs font-medium">Esta acción no se puede deshacer</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-9 h-9 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/30 hover:scale-110 active:scale-95 transition-all shadow-sm"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>

        <div className="p-8">
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-red-100 rotate-3">
              <AlertCircle className="w-10 h-10 text-brand-pink -rotate-3" />
            </div>
            <h4 className="text-lg font-bold text-gray-800 mb-2">
              ¿Eliminar horario "{group.nombre}"?
            </h4>
            <p className="text-sm text-gray-500 leading-relaxed">
              Se eliminarán <span className="font-bold text-gray-700">{horarios.reduce((acc, h) => acc + (extractArray(h).length), 0)} día(s)</span> configurado(s).
              Los empleados asignados no serán eliminados del sistema.
            </p>
          </div>

          <div className="flex space-x-3">
            <button
              onClick={onClose}
              disabled={saving}
              className="flex-1 px-6 py-3 rounded-xl font-black text-gray-400 hover:bg-gray-100 transition-all text-[10px] tracking-widest"
            >
              Cancelar
            </button>
            <button
              onClick={onConfirm}
              disabled={saving}
              className="flex-1 bg-gradient-to-r from-red-500 to-red-600 text-white px-6 py-3 rounded-xl font-black text-[10px] tracking-widest hover:shadow-lg hover:scale-105 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center space-x-2"
            >
              {saving ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Trash2 className="w-3.5 h-3.5" />
              )}
              <span>Eliminar</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════
// AssignEmployeeModal
// ══════════════════════════════════════════

interface AssignEmployeeModalProps {
  group: ScheduleGroup;
  horarios: Horario[];
  empleados: Empleado[];
  existingAssignments: HorarioEmpleado[];
  onClose: () => void;
  onSave: (horarioId: number, documentosEmpleado: string[]) => void;
  saving: boolean;
  checkOverlap: (doc: string, dia: string, inicio: string, fin: string, excludeScheduleId?: number) => boolean;
}

function AssignEmployeeModal({ group, horarios, empleados, existingAssignments, onClose, onSave, saving, checkOverlap }: AssignEmployeeModalProps) {
  const [selectedDayId, setSelectedDayId] = useState<number>(
    horarios.flatMap(h => extractArray(h))[0]?.horarioDiaId || 0
  );
  const [selectedEmpleados, setSelectedEmpleados] = useState<string[]>([]);

  // Available employees search and pagination from API
  const [availableEmpleadosFromApi, setAvailableEmpleadosFromApi] = useState<Empleado[]>([]);
  const [totalAvailableRecords, setTotalAvailableRecords] = useState(0);
  const [loadingAvailable, setLoadingAvailable] = useState(false);
  const [searchTermAvailable, setSearchTermAvailable] = useState('');
  const [availablePage, setAvailablePage] = useState(1);
  const itemsPerPageAvailable = 5;

  // Fetch available employees from API when search or page changes
  useEffect(() => {
    const fetchAvailable = async () => {
      setLoadingAvailable(true);
      try {
        const response = await empleadoService.getAll(availablePage, itemsPerPageAvailable, searchTermAvailable);
        const extract = (data: any) => {
          if (!data) return [];
          if (Array.isArray(data)) return data;
          if (data && Array.isArray(data.data)) return data.data;
          return [];
        };
        const total = (data: any) => {
          if (data && typeof data.totalCount === 'number') return data.totalCount;
          if (data && typeof data.totalRecords === 'number') return data.totalRecords;
          return Array.isArray(data) ? data.length : 0;
        };

        let fetchedEmpleados: Empleado[] = extract(response);

        // Filter out employees whose user has role 'Cliente'
        try {
          const usersRes = await userService.getAll({ pageSize: 1000 });
          const users = usersRes.data || [];
          const clienteUserIds = new Set(
            users
              .filter(u => (u.rolNombre || '').toLowerCase() === 'cliente')
              .map(u => u.usuarioId)
          );
          fetchedEmpleados = fetchedEmpleados.filter(
            e => !clienteUserIds.has(e.usuarioId)
          );
        } catch {
          // If user fetch fails, show all employees (better than showing none)
        }

        setAvailableEmpleadosFromApi(fetchedEmpleados);
        setTotalAvailableRecords(total(response));
      } catch (error) {
        console.error("Error fetching available employees:", error);
      } finally {
        setLoadingAvailable(false);
      }
    };

    fetchAvailable();
  }, [availablePage, searchTermAvailable]);

  // Reset page when search changes
  useEffect(() => {
    setAvailablePage(1);
  }, [searchTermAvailable]);

  const toggleEmpleado = (doc: string) => {
    setSelectedEmpleados(prev =>
      prev.includes(doc) ? prev.filter(d => d !== doc) : [...prev, doc]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedEmpleados.length === 0 || !selectedDayId) return;

    onSave(selectedDayId, selectedEmpleados);
  };

  const selectedDayRecord = horarios.flatMap(h => extractArray(h.dias)).find(d => d.horarioDiaId === selectedDayId);
  const selectedDayName = normalizeDay(selectedDayRecord?.diaSemana);

  const assignedDocsForDay = existingAssignments
    .filter(a => normalizeDay(a.diaSemana) === selectedDayName)
    .map(a => a.documentoEmpleado);

  const availableEmpleados = availableEmpleadosFromApi.filter(
    e => e.estado && !assignedDocsForDay.includes(e.documentoEmpleado)
  );

  const totalAvailablePages = Math.ceil(totalAvailableRecords / itemsPerPageAvailable);
  const paginatedAvailable = availableEmpleados; // Already paginated from API

  useEffect(() => {
    setAvailablePage(1);
  }, [searchTermAvailable, selectedDayId]);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-500 to-indigo-600 p-5 text-white shrink-0 shadow-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm shadow-inner">
                <UserPlus className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold leading-tight">Asignar Personal</h3>
                <p className="text-purple-100 text-xs font-medium">Horario: {group.nombre}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-9 h-9 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/30 hover:scale-110 active:scale-95 transition-all shadow-sm"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          {/* Day selector for assignment */}
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
            <div className="flex items-center space-x-2 text-brand-violet mb-4">
              <Calendar className="w-4 h-4" />
              <h4 className="font-bold text-[10px] tracking-widest">Seleccionar Día</h4>
            </div>
            <div className="flex flex-wrap gap-2">
              {horarios.flatMap(h => extractArray(h).map(d => (
                <button
                  key={d.horarioDiaId}
                  type="button"
                  onClick={() => { setSelectedDayId(d.horarioDiaId!); setSelectedEmpleados([]); }}
                  className={`px-3 py-2 rounded-xl text-[10px] font-black tracking-widest transition-all border ${selectedDayId === d.horarioDiaId
                    ? 'bg-purple-600 border-purple-600 text-white shadow-sm'
                    : 'bg-white border-gray-100 text-gray-400 hover:border-purple-200'
                    }`}
                >
                  {d.diaSemana?.substring(0, 3) || '---'}
                </button>
              )))}
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2 text-blue-500">
                <Users className="w-4 h-4" />
                <h4 className="font-bold text-[10px] tracking-widest">Seleccionar Personal ({totalAvailableRecords})</h4>
              </div>
              <div className="relative">
                <Search className="w-3 h-3 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={searchTermAvailable}
                  onChange={(e) => setSearchTermAvailable(e.target.value)}
                  placeholder="Buscar..."
                  className="pl-8 pr-3 py-1.5 bg-gray-50 border border-gray-100 rounded-lg text-[9px] font-bold focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none w-40 transition-all"
                />
              </div>
            </div>

            {loadingAvailable ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-brand-violet" />
              </div>
            ) : paginatedAvailable.length > 0 ? (
              <div className="space-y-2 max-h-60 overflow-y-auto pr-2 no-scrollbar">
                {paginatedAvailable.map(emp => {
                  // Find the specific day for overlap check
                  let foundDay: HorarioDia | undefined;
                  for (const h of horarios) {
                    const days = extractArray(h);
                    foundDay = days.find(d => d.horarioDiaId === selectedDayId);
                    if (foundDay) break;
                  }

                  const isOverlapping = foundDay ? checkOverlap(emp.documentoEmpleado, foundDay.diaSemana || '', foundDay.horaInicio || '', foundDay.horaFin || '') : false;

                  return (
                    <label
                      key={emp.documentoEmpleado}
                      className={`flex items-center space-x-3 p-3 rounded-xl border transition-all cursor-pointer group ${isOverlapping
                        ? 'opacity-50 cursor-not-allowed bg-gray-50 border-red-100'
                        : selectedEmpleados.includes(emp.documentoEmpleado)
                          ? 'border-purple-500 bg-gray-50 shadow-sm'
                          : 'border-gray-100 hover:border-purple-200 hover:bg-gray-50'
                        }`}
                    >
                      <div className="relative flex items-center justify-center">
                        <input
                          type="checkbox"
                          name="empleado"
                          value={emp.documentoEmpleado}
                          checked={selectedEmpleados.includes(emp.documentoEmpleado)}
                          onChange={() => !isOverlapping && toggleEmpleado(emp.documentoEmpleado)}
                          disabled={isOverlapping}
                          className="sr-only"
                        />
                        <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${selectedEmpleados.includes(emp.documentoEmpleado)
                          ? 'border-purple-600 bg-purple-600'
                          : 'border-gray-300'
                          }`}>
                          {selectedEmpleados.includes(emp.documentoEmpleado) && (
                            <CheckCircle className="w-3.5 h-3.5 text-white" />
                          )}
                        </div>
                      </div>

                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white text-sm ${isOverlapping ? 'bg-red-400' : 'bg-gradient-to-br from-blue-400 to-indigo-500'
                        }`}>
                        {(emp.nombre || 'E').charAt(0)}
                      </div>

                      <div className="flex-1">
                        <div className="text-[11px] font-bold text-gray-700 leading-none">{emp.nombre}</div>
                        <div className="text-[9px] font-medium text-gray-400 mt-1 tracking-wider">
                          {isOverlapping ? (
                            <span className="text-brand-pink flex items-center">
                              <AlertCircle className="w-3 h-3 mr-1" />
                              Ocupado en este horario
                            </span>
                          ) : (
                            `Doc: ${emp.documentoEmpleado}`
                          )}
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8">
                <Users className="w-10 h-10 text-gray-100 mx-auto mb-2" />
                <p className="text-[10px] font-bold text-gray-300 tracking-widest leading-relaxed">
                  {searchTermAvailable ? 'No se encontraron resultados' : 'No hay personal disponible para este horario'}
                </p>
              </div>
            )}

            {/* Mini Pagination for Available Personnel */}
            {totalAvailablePages > 1 && (
              <div className="flex items-center justify-between mt-4 px-1">
                <p className="text-[9px] font-bold text-gray-400 tracking-widest">
                  Página {availablePage} de {totalAvailablePages}
                </p>
                <div className="flex items-center space-x-1">
                  <button
                    type="button"
                    onClick={() => setAvailablePage(p => Math.max(1, p - 1))}
                    disabled={availablePage === 1}
                    className="p-1.5 bg-white border border-gray-100 rounded-lg text-gray-400 hover:bg-gray-50 disabled:opacity-30 transition-all"
                  >
                    <ChevronLeft className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setAvailablePage(p => Math.min(totalAvailablePages, p + 1))}
                    disabled={availablePage === totalAvailablePages}
                    className="p-1.5 bg-white border border-gray-100 rounded-lg text-gray-400 hover:bg-gray-50 disabled:opacity-30 transition-all"
                  >
                    <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="flex space-x-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="flex-1 px-6 py-3 rounded-xl font-black text-gray-400 hover:bg-gray-100 transition-all text-[10px] tracking-widest"
            >
              Cancelar
            </button>
            {availableEmpleados.length > 0 && (
              <button
                type="submit"
                disabled={saving || selectedEmpleados.length === 0}
                className="flex-1 bg-gradient-to-r from-purple-500 to-indigo-600 text-white px-6 py-3 rounded-xl font-black text-[10px] tracking-widest hover:shadow-lg hover:scale-105 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center space-x-2"
              >
                {saving ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <UserPlus className="w-3.5 h-3.5" />
                )}
                <span>Asignar {selectedEmpleados.length > 0 ? `(${selectedEmpleados.length})` : ''}</span>
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
