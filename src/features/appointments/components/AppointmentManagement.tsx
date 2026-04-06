import {
  Calendar, Clock, Users, Plus,
  CheckCircle, AlertCircle, XCircle, Edit, Eye, Trash2,
  Save, X, User, Phone, DollarSign, Search, Loader2, RefreshCw, Scissors, TrendingUp,
  Check, ChevronsUpDown, Briefcase, CreditCard, FileText
} from 'lucide-react';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { SimplePagination } from '@/shared/components/ui/simple-pagination';
import { Button } from '@/shared/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/shared/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/shared/components/ui/command';
import { cn } from '@/shared/components/ui/utils';
import {
  agendaService, metodoPagoService, empleadoAgendaService,
  clienteService, servicioAgendaService, estadoAgendaService, isEmployeeOccupied,
  AgendaItem, MetodoPago, EmpleadoAPI, ClienteAPI, ServicioAPI, EstadoAgenda
} from '../services/agendaService';
import { horarioEmpleadoService, horarioService, HorarioEmpleado } from '@/features/schedule/services/scheduleService';
import { motivoService, Motivo } from '@/shared/services/motivoService';
import { personService } from '@/features/persons/services/personService';
import { serviceService } from '@/features/services/services/serviceService';
// processImageSource and handleImageError removed as they are no longer needed here

interface AppointmentManagementProps {
  hasPermission: (permission: string) => boolean;
  currentUser: any;
}

// getEstadoId now resolved dynamically inside the component using loaded estados

export function AppointmentManagement({ hasPermission }: AppointmentManagementProps) {
  const [showSuccessAlert, setShowSuccessAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');

  // Auto-hide success alert after 4 seconds
  useEffect(() => {
    if (showSuccessAlert) {
      const timer = setTimeout(() => {
        setShowSuccessAlert(false);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [showSuccessAlert]);

  // ── Data from API ──
  const [appointments, setAppointments] = useState<AgendaItem[]>([]);
  const [empleados, setEmpleados] = useState<EmpleadoAPI[]>([]);
  const [servicios, setServicios] = useState<ServicioAPI[]>([]);
  const [metodosPago, setMetodosPago] = useState<MetodoPago[]>([]);
  const [horariosEmpleado, setHorariosEmpleado] = useState<HorarioEmpleado[]>([]);
  const [baseHorarios, setBaseHorarios] = useState<any[]>([]);
  const [motivos, setMotivos] = useState<Motivo[]>([]);
  const [estadosAgenda, setEstadosAgenda] = useState<EstadoAgenda[]>([
    { estadoId: 1, nombre: 'Pendiente' },
    { estadoId: 2, nombre: 'Confirmado' },
    { estadoId: 3, nombre: 'Cancelado' },
    { estadoId: 4, nombre: 'Completado' },
    { estadoId: 5, nombre: 'Sin Agendar' },
  ]);

  // ── UI state ──
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<AgendaItem | null>(null);
  const [appointmentToChangeStatus, setAppointmentToChangeStatus] = useState<{ apt: AgendaItem, newStatusId: number } | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(5);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  // ── Auto-Cancellation Logic ──
  const autoCancelOverdue = useCallback(async (allAppointments: AgendaItem[], allServicios: ServicioAPI[], allMetodos: MetodoPago[]) => {
    const now = new Date();
    const overduePending = allAppointments.filter(a => {
      if (a.estado.toLowerCase() !== 'pendiente') return false;
      const aptDate = new Date(a.fechaCita + 'T' + a.horaInicio);
      return aptDate < now;
    });

    if (overduePending.length === 0) return;

    for (const apt of overduePending) {
      try {
        const serviciosIds = apt.servicios.map(name => {
          const s = allServicios.find(sv => sv.nombre === name);
          return s ? s.servicioId : 0;
        }).filter(id => id > 0);

        const metodo = allMetodos.find(m => m.nombre === apt.metodoPago);
        const metodoPagoId = metodo ? metodo.metodopagoId : (allMetodos[0]?.metodopagoId || 1);

        await agendaService.update(apt.agendaId, {
          documentoCliente: apt.documentoCliente,
          documentoEmpleado: apt.documentoEmpleado,
          fechaCita: apt.fechaCita,
          horaInicio: apt.horaInicio,
          metodoPagoId,
          observaciones: 'Cancelación automática por fecha vencida',
          serviciosIds,
          estadoId: 3 // Cancelado
        });
      } catch (err) {
        console.error(`Error en cancelación automática de cita ${apt.agendaId}:`, err);
      }
    }
    toast.info(`${overduePending.length} cita(s) vencida(s) cancelada(s) automáticamente.`);
  }, []);

  // ── Load all data ──
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const results = await Promise.allSettled([
        agendaService.getAll({
          page: currentPage,
          pageSize: itemsPerPage,
          search: searchTerm
        }),
        empleadoAgendaService.getAll(),
        servicioAgendaService.getAll(),
        metodoPagoService.getAll(),
        horarioEmpleadoService.getAll(),
        horarioService.getAll(), // fetch base Horario records for the join
        estadoAgendaService.getAll(), // fetch real estados from API
        motivoService.getAll(), // fetch absence reasons
      ]);

      const extract = (r: PromiseSettledResult<any>) => {
        if (r.status === 'fulfilled' && r.value) {
          if (Array.isArray(r.value)) return r.value;
          if (Array.isArray(r.value.data)) return r.value.data;
          if (Array.isArray(r.value.$values)) return r.value.$values;
        }
        return [];
      };

      const rawHorariosEmpleado: any[] = extract(results[4]);
      const rawHorarios: any[] = extract(results[5]);
      const rawMotivos: any[]          = extract(results[7]);

      // HorarioEmpleado now comes with diaSemana, horaInicio, and horaFin from the API
      const enrichedHorariosEmpleado: HorarioEmpleado[] = rawHorariosEmpleado.map((he: any) => ({
        horarioEmpleadoId: he.horarioEmpleadoId,
        horarioId: he.horarioId,
        documentoEmpleado: he.documentoEmpleado,
        empleadoNombre: he.empleadoNombre || '',
        diaSemana: he.diaSemana || '',
        horaInicio: he.horaInicio || '',
        horaFin: he.horaFin || '',
      }));

      const agendaResponse = results[0].status === 'fulfilled' ? results[0].value : { data: [], totalCount: 0, totalPages: 0 };
      setAppointments(agendaResponse.data || []);
      setTotalCount(agendaResponse.totalCount || 0);
      setTotalPages(agendaResponse.totalPages || 0);

      setEmpleados(extract(results[1]).filter((e: any) => e.estado));
      setServicios(extract(results[2]).filter((s: any) => s.estado));
      setMetodosPago(extract(results[3]));
      setHorariosEmpleado(enrichedHorariosEmpleado);
      setBaseHorarios(rawHorarios.filter((h: any) => h.estado));
      setMotivos(rawMotivos);
      // Load real estados from API (results[6]), fall back to defaults if failed
      const rawEstados = extract(results[6]).filter((e: any) => e.estadoId > 0 && e.nombre);
      if (rawEstados.length > 0) setEstadosAgenda(rawEstados);

      // Trigger auto-cancellation for overdue appointments
      const currentAppointments = agendaResponse.data || [];
      const currentServicios = extract(results[2]).filter((s: any) => s.estado);
      const currentMetodos = extract(results[3]);
      autoCancelOverdue(currentAppointments, currentServicios, currentMetodos);

      const anyFailed = results.some((r) => r.status === 'rejected');
      if (anyFailed) {
        console.warn('Some agenda endpoints failed:', results);
        toast.error('Algunos datos no se pudieron cargar. Verifica la conexión.');
      }
    } catch (err) {
      console.error('Error loading agenda data:', err);
      toast.error('Error al cargar los datos del agendamiento');
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchTerm, autoCancelOverdue]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Reset page when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  // ── Helpers ──
  const getStatusColor = (status: string) => {
    const s = (status || '').toLowerCase();
    if (s === 'confirmado' || s === 'confirmed') return 'bg-green-100 text-green-800 border-green-200';
    if (s === 'pendiente' || s === 'pending') return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    if (s === 'sin agendar') return 'bg-gray-100 text-gray-600 border-gray-200';
    if (s === 'completado' || s === 'completed') return 'bg-purple-100 text-purple-800 border-purple-200';
    if (s === 'cancelado' || s === 'cancelled') return 'bg-red-100 text-red-800 border-red-200';
    return 'bg-gray-100 text-gray-800 border-gray-200';
  };

  // Helper: get estadoId from label using loaded estados
  const getEstadoId = (estadoLabel: string): number => {
    const found = estadosAgenda.find(
      (e) => e.nombre.toLowerCase() === estadoLabel.toLowerCase()
    );
    return found ? found.estadoId : 1;
  };

  // ID for 'Completado' (used to trigger sale creation)
  const completadoId = estadosAgenda.find((e) => e.nombre.toLowerCase() === 'completado')?.estadoId ?? 4;

  // Build servicios name → duration map
  const serviciosMap = new Map<string, number>();
  servicios.forEach((s) => serviciosMap.set(s.nombre, s.duracion));

  // Build servicios name → price map
  const preciosMap = new Map<string, number>();
  servicios.forEach((s) => preciosMap.set(s.nombre, s.precio));

  // Calculate total duration for an appointment
  const getAppointmentDuration = (apt: AgendaItem) => {
    let total = 0;
    for (const svcName of apt.servicios) {
      total += serviciosMap.get(svcName) ?? 30;
    }
    return total || 30;
  };

  // Format time for display
  const formatTime = (time: string) => {
    return time ? formatTo12Hour(time.substring(0, 5)) : '';
  };

  // ── Ya no filtramos en el cliente, usamos lo que viene de la API ──
  const paginatedAppointments = appointments;

  const handleCreateAppointment = () => {
    setSelectedAppointment(null);
    setShowCreateModal(true);
  };

  const handleEditAppointment = (apt: AgendaItem) => {
    setSelectedAppointment(apt);
    setShowCreateModal(true);
  };

  const handleViewDetail = async (apt: AgendaItem) => {
    try {
      setLoading(true);
      // Fetch full details from the specific GET endpoint /api/Agenda/{id}
      const fullApt = await agendaService.getById(apt.agendaId);
      setSelectedAppointment(fullApt);
      setShowDetailModal(true);
    } catch (error) {
      console.error('Error fetching appointment detail:', error);
      // Fallback: show the item from the list if the specific fetch fails
      setSelectedAppointment(apt);
      setShowDetailModal(true);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAppointment = (apt: AgendaItem) => {
    const estadoLower = apt.estado.toLowerCase();
    if (estadoLower === 'completado' || estadoLower === 'completed') {
      toast.error('No se puede eliminar una cita que ya ha sido completada');
      return;
    }
    setSelectedAppointment(apt);
    setShowDeleteModal(true);
  };

  const confirmDeleteAppointment = async () => {
    if (!selectedAppointment) return;
    try {
      await agendaService.delete(selectedAppointment.agendaId);
      toast.success(`Cita de ${selectedAppointment.cliente} eliminada correctamente`);
      setShowDeleteModal(false);
      setSelectedAppointment(null);
      await loadData();
    } catch (err) {
      console.error('Error deleting appointment:', err);
      toast.error('Error al eliminar la cita');
    }
  };

  const handleSaveAppointment = async (data: any, isEdit: boolean, agendaId?: number) => {
    try {
      if (isEdit && agendaId != null) {
        await agendaService.update(agendaId, data);
        toast.success('Cita actualizada correctamente');
        if (data?.estadoId === completadoId) {
          setAlertMessage('Venta creada automáticamente a partir de la cita completada');
          setShowSuccessAlert(true);
        }
      } else {
        await agendaService.create(data);
        toast.success('Cita registrada correctamente');
      }
      setShowCreateModal(false);
      await loadData();
    } catch (err) {
      console.error('Error saving appointment:', err);
      toast.error('Error al guardar la cita');
    }
  };

  const handleStatusChangeClick = (apt: AgendaItem, newStatusId: number) => {
    setAppointmentToChangeStatus({ apt, newStatusId });
    setShowStatusModal(true);
  };

  const confirmStatusChange = async () => {
    if (!appointmentToChangeStatus) return;
    const { apt, newStatusId } = appointmentToChangeStatus;

    try {
      const servicioIds = apt.servicios.map((name) => {
        const svc = servicios.find((s) => s.nombre.trim().toLowerCase() === name.trim().toLowerCase());
        return svc ? svc.servicioId : 0;
      }).filter(id => id > 0);

      const mp = metodosPago.find(m => m.nombre.trim().toLowerCase() === apt.metodoPago.trim().toLowerCase());
      const metodoPagoId = mp ? mp.metodopagoId : (metodosPago.length > 0 ? metodosPago[0].metodopagoId : 0);

      const observaciones = (apt as any).observaciones || 'Cambio de estado manual';
      const hora = apt.horaInicio.length === 5 ? apt.horaInicio + ':00' : apt.horaInicio;
      const fecha = apt.fechaCita.split('T')[0];

      const payload = {
        documentoCliente: apt.documentoCliente,
        documentoEmpleado: apt.documentoEmpleado,
        fechaCita: fecha,
        horaInicio: hora,
        metodoPagoId: metodoPagoId,
        observaciones: observaciones,
        serviciosIds: servicioIds,
        estadoId: newStatusId,
      };

      await handleSaveAppointment(payload, true, apt.agendaId);
      setShowStatusModal(false);
      setAppointmentToChangeStatus(null);
    } catch (error) {
      console.error("Error changing status", error);
      toast.error('Error al cambiar el estado');
    }
  };

  // ── Loading state ──
  if (loading && appointments.length === 0) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-purple-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-600 text-lg">Cargando agendamiento...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Success Alert */}
      {showSuccessAlert && (
        <div className="fixed bottom-4 right-4 z-[9999] animate-in slide-in-from-bottom-5 duration-300">
          <div className="bg-gradient-to-r from-pink-400 to-purple-500 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center space-x-4 min-w-[320px]">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-white" />
              </div>
            </div>
            <div className="flex-1">
              <p className="font-semibold">{alertMessage}</p>
            </div>
            <button
              onClick={() => setShowSuccessAlert(false)}
              className="flex-shrink-0 w-8 h-8 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
      
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-bold text-gray-800">Gestión de Citas</h2>
          <p className="text-gray-600">
            Administra las citas del salón, agenda nuevas citas y gestiona disponibilidad
          </p>
        </div>
      </div>

      {/* Search and Register */}
      <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="w-full md:max-w-md relative">
            <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar cliente o servicio..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-pink-300 focus:border-transparent"
            />
          </div>

          <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
            <button
              onClick={loadData}
              className="p-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors flex items-center justify-center"
              title="Recargar datos"
            >
              <RefreshCw className="w-5 h-5" />
            </button>

            {hasPermission('manage_appointments') && (
              <button
                onClick={handleCreateAppointment}
                className="w-full md:w-auto bg-gradient-to-r from-pink-400 to-purple-500 text-white px-6 py-3 rounded-xl font-semibold hover:shadow-lg transition-all flex items-center justify-center space-x-2 whitespace-nowrap"
              >
                <Plus className="w-5 h-5" />
                <span>Registrar Cita</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Appointments List */}
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden relative min-h-[400px]">
        {loading && appointments.length > 0 && (
          <div className="absolute inset-0 bg-white/60 backdrop-blur-sm z-10 flex flex-col items-center justify-center">
            <Loader2 className="w-8 h-8 text-pink-500 animate-spin mb-2" />
            <span className="text-sm font-medium text-gray-500">Buscando...</span>
          </div>
        )}
        <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-6 border-b border-gray-100">
          <h3 className="text-xl font-bold text-gray-800">Lista de Citas</h3>
          <p className="text-gray-600">
            {totalCount} cita{totalCount !== 1 ? 's' : ''} encontrada{totalCount !== 1 ? 's' : ''}
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left p-4 font-semibold text-gray-600">Cliente</th>
                <th className="text-left p-4 font-semibold text-gray-600">Fecha & Hora</th>
                <th className="text-left p-4 font-semibold text-gray-600">Servicios</th>
                <th className="text-left p-4 font-semibold text-gray-600">Profesional</th>
                <th className="text-left p-4 font-semibold text-gray-600">Estado</th>
                <th className="text-left p-4 font-semibold text-gray-600">Método Pago</th>
                <th className="text-left p-4 font-semibold text-gray-600">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {paginatedAppointments.map((apt) => {
                const estadoLower = apt.estado.toLowerCase();
                const isLocked = estadoLower === 'completado' || estadoLower === 'completed' || estadoLower === 'cancelado' || estadoLower === 'cancelled';

                return (
                  <tr key={apt.agendaId} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="p-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gradient-to-r from-pink-400 to-purple-500 rounded-full flex items-center justify-center">
                          <User className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <div className="font-semibold text-gray-800">{apt.cliente}</div>
                          <div className="text-xs text-gray-500">{apt.documentoCliente}</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <div>
                        <div className="font-semibold text-gray-800">
                          {new Date(apt.fechaCita + 'T00:00:00').toLocaleDateString('es-ES')}
                        </div>
                        <div className="text-sm text-gray-600 flex items-center">
                          <Clock className="w-4 h-4 mr-1" />
                          {formatTime(apt.horaInicio)} ({getAppointmentDuration(apt)} min)
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="space-y-1">
                        {apt.servicios.map((svc, i) => (
                          <span
                            key={i}
                            className="inline-block bg-purple-50 text-purple-700 text-xs px-2 py-1 rounded-full mr-1"
                          >
                            {svc}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="font-semibold text-gray-800">{apt.empleado}</div>
                    </td>
                    <td className="p-4">
                      {isLocked || !hasPermission('manage_appointments') ? (
                        <span className={`px-3 py-1 rounded-full text-sm font-semibold border inline-block ${getStatusColor(apt.estado)}`}>
                          {apt.estado}
                        </span>
                      ) : (
                        <select
                          value={getEstadoId(apt.estado)}
                          onChange={(e) => handleStatusChangeClick(apt, Number(e.target.value))}
                          className={`px-3 py-1 rounded-full text-sm font-bold border-2 cursor-pointer transition-all duration-200 focus:outline-none ${getStatusColor(apt.estado)}`}
                        >
                          {estadosAgenda.map((est) => (
                            <option key={est.estadoId} value={est.estadoId}>
                              {est.nombre}
                            </option>
                          ))}
                        </select>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="text-gray-700">{apt.metodoPago}</div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleViewDetail(apt)}
                          className="p-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                          title="Ver detalle"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleEditAppointment(apt)}
                          disabled={isLocked}
                          className={`p-2 rounded-lg transition-colors ${isLocked ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-green-100 text-green-700 hover:bg-green-200'}`}
                          title="Editar cita"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteAppointment(apt)}
                          disabled={estadoLower === 'completado' || estadoLower === 'completed'}
                          className={`p-2 rounded-lg transition-colors ${(estadoLower === 'completado' || estadoLower === 'completed') ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-red-100 text-red-700 hover:bg-red-200'}`}
                          title="Eliminar cita"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          {paginatedAppointments.length === 0 && (
            <div className="text-center py-12">
              <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-600 mb-2">No se encontraron citas</h3>
              <p className="text-gray-500">Ajusta los filtros o crea una nueva cita</p>
            </div>
          )}
        </div>

        {/* Pagination */}
        <div className="p-6 border-t border-gray-100 bg-gray-50/50">
          <SimplePagination
            currentPage={currentPage}
            totalPages={Math.max(1, totalPages)}
            onPageChange={setCurrentPage}
            totalRecords={totalCount}
            recordsPerPage={itemsPerPage}
          />
        </div>
      </div>

      {/* Create/Edit Modal */}
      {showCreateModal && (
        <AppointmentModal
          appointment={selectedAppointment}
          serviciosAPI={servicios}
          metodosPago={metodosPago}
          horariosEmpleado={horariosEmpleado}
          allAppointments={appointments}
          serviciosMap={serviciosMap}
          motivos={motivos}
          estadosAgenda={estadosAgenda}
          baseHorarios={baseHorarios}
          initialEmployee="all"
          onClose={() => setShowCreateModal(false)}
          onSave={handleSaveAppointment}
        />
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedAppointment && (
        <AppointmentDetailModal
          appointment={selectedAppointment}
          servicios={servicios}
          getStatusColor={getStatusColor}
          onClose={() => setShowDetailModal(false)}
        />
      )}

      {/* Delete Modal */}
      {showDeleteModal && selectedAppointment && (
        <DeleteAppointmentModal
          appointment={selectedAppointment}
          serviciosMap={serviciosMap}
          onClose={() => setShowDeleteModal(false)}
          onConfirm={confirmDeleteAppointment}
        />
      )}

      {/* Status Change Modal */}
      {showStatusModal && appointmentToChangeStatus && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center space-x-4 mb-6">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-800">Confirmar Cambio de Estado</h3>
                <p className="text-gray-600">¿Estás seguro de cambiar el estado?</p>
              </div>
            </div>

            <p className="text-gray-700 mb-6">
              Se cambiará el estado de la cita de <strong>{appointmentToChangeStatus.apt.cliente}</strong> a{' '}
              <strong>{estadosAgenda.find(e => e.estadoId === appointmentToChangeStatus.newStatusId)?.nombre}</strong>.
            </p>

            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setShowStatusModal(false);
                  setAppointmentToChangeStatus(null);
                }}
                className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={confirmStatusChange}
                className="flex-1 bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-6 py-3 rounded-xl font-semibold hover:shadow-lg transition-all"
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
// AppointmentModal — Create / Edit
// ══════════════════════════════════════════

interface AppointmentModalProps {
  appointment: AgendaItem | null;
  serviciosAPI: ServicioAPI[];
  metodosPago: MetodoPago[];
  horariosEmpleado: HorarioEmpleado[];
  allAppointments: AgendaItem[];
  serviciosMap: Map<string, number>;
  motivos: Motivo[];
  estadosAgenda: EstadoAgenda[];
  baseHorarios: any[];
  initialEmployee: string;
  onClose: () => void;
  onSave: (data: any, isEdit: boolean, agendaId?: number) => Promise<void>;
}

function timeStrToMinutes(time: string): number {
  if (!time) return 0;
  const parts = time.split(':');
  return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
}

/**
 * Formats a Date object to "YYYY-MM-DD" in local time.
 */
const formatDateToYYYYMMDD = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
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

function AppointmentModal({
  appointment,
  serviciosAPI,
  metodosPago,
  horariosEmpleado,
  allAppointments,
  serviciosMap,
  motivos,
  estadosAgenda,
  baseHorarios,
  initialEmployee,
  onClose,
  onSave,
}: AppointmentModalProps) {
  const isEdit = !!appointment;

  // Resolve estadoId from label using the loaded estados
  const resolveEstadoId = (label: string): number => {
    const found = estadosAgenda.find(
      (e) => e.nombre.toLowerCase() === label.toLowerCase()
    );
    return found ? found.estadoId : 1;
  };

  // Find initial IDs from the appointment for editing
  const getInitialServiceIds = (): number[] => {
    if (!appointment) return [];
    return appointment.servicios
      .map((name) => {
        const svc = serviciosAPI.find((s) => s.nombre === name);
        return svc ? svc.servicioId : null;
      })
      .filter((id): id is number => id !== null);
  };

  const getInitialMetodoPagoId = (): number => {
    if (!appointment) return metodosPago.length > 0 ? metodosPago[0].metodopagoId : 0;
    const mp = metodosPago.find((m) => m.nombre === appointment.metodoPago);
    return mp ? mp.metodopagoId : (metodosPago.length > 0 ? metodosPago[0].metodopagoId : 0);
  };

  const [formData, setFormData] = useState({
    documentoCliente: appointment?.documentoCliente || '',
    documentoEmpleado: appointment?.documentoEmpleado || (initialEmployee !== 'all' ? initialEmployee : ''),
    fechaCita: appointment?.fechaCita || formatDateToYYYYMMDD(new Date()),
    horaInicio: appointment?.horaInicio ? appointment.horaInicio.substring(0, 5) : '09:00',
    metodoPagoId: getInitialMetodoPagoId(),
    observaciones: '',
    serviciosIds: getInitialServiceIds(),
    estadoId: appointment ? resolveEstadoId(appointment.estado) : 1,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [openClientSelect, setOpenClientSelect] = useState(false);
  const [saving, setSaving] = useState(false);

  const isCompleted = appointment?.estado.toLowerCase() === 'completado';

  // ── Computed values ──
  const selectedServiceObjects = formData.serviciosIds
    .map((id) => serviciosAPI.find((s) => s.servicioId === id))
    .filter((s): s is ServicioAPI => s !== undefined);

  const totalDuration = selectedServiceObjects.reduce((sum, s) => sum + s.duracion, 0);
  const totalCost = selectedServiceObjects.reduce((sum, s) => sum + s.precio, 0);

  // ── Service management ──
  const addServiceSlot = () => {
    setFormData({ ...formData, serviciosIds: [...formData.serviciosIds, 0] });
  };

  const removeServiceSlot = (index: number) => {
    const newIds = formData.serviciosIds.filter((_, i) => i !== index);
    setFormData({ ...formData, serviciosIds: newIds });
  };

  const updateServiceSlot = (index: number, servicioId: number) => {
    // Check if this ID is already selected in ANOTHER slot
    if (servicioId > 0 && formData.serviciosIds.some((id, i) => id === servicioId && i !== index)) {
      toast.error('Este servicio ya ha sido seleccionado');
      return;
    }
    const newIds = [...formData.serviciosIds];
    newIds[index] = servicioId;
    setFormData({ ...formData, serviciosIds: newIds });
  };

  // ── Employee availability ──
  const checkEmployeeOccupied = (empDoc: string): boolean => {
    if (!formData.fechaCita || !formData.horaInicio || totalDuration <= 0) return false;
    return isEmployeeOccupied(
      empDoc,
      formData.fechaCita,
      formData.horaInicio,
      totalDuration,
      allAppointments,
      serviciosMap,
      motivos,
      isEdit ? appointment!.agendaId : undefined
    );
  };

  // Normalize a string for comparison: lower case + remove common accented chars
  const normDay = (s: string) =>
    s.toLowerCase()
      .replace(/\u00e9/g, 'e').replace(/\u00e1/g, 'a')
      .replace(/\u00ed/g, 'i').replace(/\u00f3/g, 'o')
      .replace(/\u00fa/g, 'u').replace(/\u00e0/g, 'a')
      .replace(/\u00e8/g, 'e').replace(/\u00ec/g, 'i')
      .replace(/\u00f2/g, 'o').replace(/\u00f9/g, 'u');

  // Check if an employee has a schedule covering the selected day & time window
  const checkEmployeeHasSchedule = (empDoc: string): boolean => {
    // If no date selected yet, show all as available
    if (!formData.fechaCita) return true;
    // If horariosEmpleado hasn't loaded yet, don't block
    if (horariosEmpleado.length === 0) return true;

    const dateObj = new Date(formData.fechaCita + 'T00:00:00');
    const dayNames = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
    const dayName = dayNames[dateObj.getDay()];

    // Filter schedules for this employee on this weekday (accent-insensitive)
    const schedules = horariosEmpleado.filter(
      (h) => String(h.documentoEmpleado) === String(empDoc) && normDay(h.diaSemana || '') === dayName
    );

    // If no specific schedule records found for this employee on this day, 
    // they are considered unavailable (no fallback to salon hours).
    if (schedules.length === 0) return false;

    // If no time/services yet, just confirm the employee works that day
    if (!formData.horaInicio || totalDuration <= 0) return true;

    const proposedStart = timeStrToMinutes(formData.horaInicio);
    const proposedEnd = proposedStart + totalDuration;

    return schedules.some((sched) => {
      const schedStart = timeStrToMinutes(sched.horaInicio);
      const schedEnd = timeStrToMinutes(sched.horaFin);
      return proposedStart >= schedStart && proposedEnd <= schedEnd;
    });
  };


  const generateAvailableSlots = useCallback(() => {
    if (!formData.fechaCita || !formData.documentoEmpleado || totalDuration <= 0) {
      setAvailableSlots([]);
      return;
    }

    const dateObj = new Date(formData.fechaCita + 'T00:00:00');
    const dayNames = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
    const dayName = dayNames[dateObj.getDay()];

    const empSchedules = horariosEmpleado.filter(
      (h) => String(h.documentoEmpleado) === String(formData.documentoEmpleado) && normDay(h.diaSemana || '') === dayName
    );

    let effectiveSchedules = empSchedules;
    if (effectiveSchedules.length === 0) {
      setAvailableSlots([]);
      return;
    }

    const slots: string[] = [];
    const interval = 30; // 30-minute granularity for slots

    // Block past hours if the selected date is today
    const now = new Date();
    const selectedDateStr = formData.fechaCita;
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const isToday = selectedDateStr === todayStr;
    const nowMinutes = isToday ? now.getHours() * 60 + now.getMinutes() : 0;

    effectiveSchedules.forEach((sched) => {
      const startMin = timeStrToMinutes(sched.horaInicio);
      const endMin = timeStrToMinutes(sched.horaFin);

      // Generate possible start times within this schedule
      for (let current = startMin; current + totalDuration <= endMin; current += interval) {
        // Skip past time slots if scheduling for today
        if (isToday && current <= nowMinutes) continue;

        const hh = Math.floor(current / 60);
        const mm = current % 60;
        const timeStr = `${hh.toString().padStart(2, '0')}:${mm.toString().padStart(2, '0')}`;

        const occupied = isEmployeeOccupied(
          formData.documentoEmpleado,
          formData.fechaCita,
          timeStr,
          totalDuration,
          allAppointments,
          serviciosMap,
          motivos,
          isEdit ? appointment!.agendaId : undefined
        );

        if (!occupied) {
          slots.push(timeStr);
        }
      }
    });

    setAvailableSlots(slots);
  }, [
    formData.fechaCita,
    formData.documentoEmpleado,
    totalDuration,
    horariosEmpleado,
    baseHorarios,
    allAppointments,
    serviciosMap,
    motivos,
    isEdit,
    appointment
  ]);

  useEffect(() => {
    generateAvailableSlots();
  }, [generateAvailableSlots]);

  // Ensure current selected time is valid reset if not in available slots (unless editing and no changes yet)
  useEffect(() => {
    if (availableSlots.length > 0 && formData.horaInicio) {
      if (!availableSlots.includes(formData.horaInicio)) {
        // If editing, only reset if something affecting availability changed
        // For simplicity, we'll keep the value if it's the original one
        const isOriginalTime = isEdit && appointment?.horaInicio?.substring(0, 5) === formData.horaInicio;
        if (!isOriginalTime) {
          // Do not auto-reset to index 0 immediately to avoid UX jump, but maybe show error
        }
      }
    }
  }, [availableSlots, formData.horaInicio, isEdit, appointment]);

  // ── Submit ──
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isCompleted) return;

    const newErrors: Record<string, string> = {};
    if (!formData.documentoCliente) newErrors.documentoCliente = 'Selecciona un cliente';
    if (!formData.documentoEmpleado) newErrors.documentoEmpleado = 'Selecciona un profesional';
    if (formData.serviciosIds.length === 0) newErrors.services = 'Agrega al menos un servicio';
    if (!formData.fechaCita) newErrors.fechaCita = 'Selecciona una fecha';
    if (!formData.horaInicio) newErrors.horaInicio = 'Selecciona una hora';
    if (!formData.metodoPagoId) newErrors.metodoPagoId = 'Selecciona un método de pago';

    // Validate all services are selected
    formData.serviciosIds.forEach((id, index) => {
      if (!id || id === 0) {
        newErrors[`service_${index}`] = 'Selecciona un servicio';
      }
    });

    // Check availability
    if (formData.documentoEmpleado && formData.fechaCita && formData.horaInicio && totalDuration > 0) {
      if (checkEmployeeOccupied(formData.documentoEmpleado)) {
        newErrors.horaInicio = 'El profesional ya tiene una cita en este horario. Los horarios se solapan.';
      }
    }

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    setSaving(true);
    try {
      const hora = formData.horaInicio.length === 5 ? formData.horaInicio + ':00' : formData.horaInicio;
      const obs = formData.observaciones || 'Sin observaciones';

      const payload: any = {
        documentoCliente: formData.documentoCliente,
        documentoEmpleado: formData.documentoEmpleado,
        fechaCita: formData.fechaCita,
        horaInicio: hora,
        metodoPagoId: formData.metodoPagoId,
        observaciones: obs,
        serviciosIds: formData.serviciosIds.filter((id) => id > 0),
        estadoId: formData.estadoId,
      };

      if (isEdit) {
        await onSave(payload, true, appointment!.agendaId);
      } else {
        await onSave(payload, false);
      }
    } catch (err) {
      // Error handled by parent
    } finally {
      setSaving(false);
    }
  };

  // ── Calculate end time display ──
  const getEndTimeDisplay = () => {
    if (!formData.horaInicio || totalDuration <= 0) return '';
    const [h, m] = formData.horaInicio.split(':').map(Number);
    const totalMin = h * 60 + m + totalDuration;
    const endH = Math.floor(totalMin / 60) % 24;
    const endM = totalMin % 60;
    const time24 = `${endH.toString().padStart(2, '0')}:${endM.toString().padStart(2, '0')}`;
    return formatTo12Hour(time24);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header - Fixed at top */}
        <div className="bg-gradient-to-r from-pink-500 to-purple-600 p-5 text-white shrink-0 shadow-md z-20">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm shadow-inner">
                <Calendar className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold leading-tight">
                  {isEdit ? 'Editar Cita' : 'Registrar Nueva Cita'}
                </h3>
                <p className="text-pink-100 text-sm">
                  {isEdit ? 'Actualiza los detalles de la programación' : 'Define los servicios y el horario para el cliente'}
                </p>
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

          <form onSubmit={handleSubmit} className="max-w-4xl mx-auto space-y-6">
            {/* Form Alert */}
            {Object.keys(errors).length > 0 && (
              <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-xl flex items-center space-x-3 animate-in slide-in-from-left-2 duration-200">
                <AlertCircle className="w-5 h-5 text-red-500" />
                <p className="text-sm text-red-700">Por favor, completa los campos obligatorios y corrige los errores.</p>
              </div>
            )}

            <div className="grid md:grid-cols-2 gap-6">
              {/* Client Info Card */}
              <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-5">
                <div className="flex items-center space-x-2 text-pink-500">
                  <Users className="w-4 h-4" />
                  <h4 className="font-bold uppercase text-[10px] tracking-widest">Información del Cliente</h4>
                </div>

                <div className="space-y-4">
                  <div className="bg-pink-50/30 p-4 rounded-2xl border border-pink-100">
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Buscar Cliente *</label>
                    <ClientSearchSelect
                      selectedDocument={formData.documentoCliente}
                      onSelect={(cli: ClienteAPI) => setFormData({ ...formData, documentoCliente: cli.documentoCliente })}
                      error={errors.documentoCliente}
                      disabled={isCompleted}
                    />
                    {errors.documentoCliente && (
                      <p className="text-[10px] text-red-500 mt-1 ml-1">{errors.documentoCliente}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">Método de Pago *</label>
                    <select
                      value={formData.metodoPagoId}
                      onChange={(e) => setFormData({ ...formData, metodoPagoId: parseInt(e.target.value) })}
                      disabled={isCompleted}
                      className={`w-full px-4 py-3 bg-gray-50/50 border rounded-xl focus:ring-2 focus:ring-pink-300 focus:border-transparent transition-all font-medium text-gray-700 ${errors.metodoPagoId ? 'border-red-300' : 'border-gray-200'}`}
                    >
                      <option value={0}>Seleccionar método...</option>
                      {metodosPago.map((mp) => (
                        <option key={mp.metodopagoId} value={mp.metodopagoId}>{mp.nombre}</option>
                      ))}
                    </select>
                    {errors.metodoPagoId && <p className="text-[10px] text-red-500 mt-1 ml-1">{errors.metodoPagoId}</p>}
                  </div>
                </div>
              </div>

              {/* Schedule Card */}
              <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-5">
                <div className="flex items-center space-x-2 text-purple-500">
                  <Clock className="w-4 h-4" />
                  <h4 className="font-bold uppercase text-[10px] tracking-widest">Profesional y Horario</h4>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">Fecha de la Cita *</label>
                      <input
                        type="date"
                        value={formData.fechaCita}
                        onChange={(e) => setFormData({ ...formData, fechaCita: e.target.value })}
                        min={formatDateToYYYYMMDD(new Date())}
                        disabled={isCompleted}
                        className={`w-full px-4 py-3 bg-gray-50/50 border rounded-xl focus:ring-2 focus:ring-pink-300 focus:border-transparent transition-all font-medium text-gray-700 ${errors.fechaCita ? 'border-red-300' : 'border-gray-200'}`}
                      />
                      {errors.fechaCita && <p className="text-[10px] text-red-500 mt-1 ml-1">{errors.fechaCita}</p>}
                    </div>

                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">Hora de Inicio *</label>
                      <select
                        value={formData.horaInicio}
                        onChange={(e) => setFormData({ ...formData, horaInicio: e.target.value })}
                        disabled={isCompleted || availableSlots.length === 0}
                        className={`w-full px-4 py-3 bg-gray-50/50 border rounded-xl focus:ring-2 focus:ring-pink-300 focus:border-transparent transition-all font-medium text-gray-700 ${errors.horaInicio ? 'border-red-300' : 'border-gray-200'} ${isCompleted || availableSlots.length === 0 ? 'bg-gray-100' : ''}`}
                      >
                        {availableSlots.length === 0 ? (
                          <option value="">No hay disponibilidad</option>
                        ) : (
                          <>
                            {formData.horaInicio && !availableSlots.includes(formData.horaInicio) && (
                              <option value={formData.horaInicio}>
                                {formatTo12Hour(formData.horaInicio)} {isEdit ? '(Actual)' : 'Seleccionada'}
                              </option>
                            )}
                            {!formData.horaInicio && <option value="">Seleccionar hora...</option>}
                            {availableSlots.map((slot) => (
                              <option key={slot} value={slot}>{formatTo12Hour(slot)}</option>
                            ))}
                          </>
                        )}
                      </select>
                      {errors.horaInicio && <p className="text-[10px] text-red-500 mt-1 ml-1">{errors.horaInicio}</p>}
                    </div>
                  </div>

                  <div className="relative">
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">Profesional Asignado *</label>
                    <ProfessionalSearchSelect
                      selectedDocument={formData.documentoEmpleado}
                      onSelect={(emp) => setFormData({ ...formData, documentoEmpleado: emp.documentoEmpleado })}
                      checkEmployeeOccupied={checkEmployeeOccupied}
                      checkEmployeeHasSchedule={checkEmployeeHasSchedule}
                      disabled={isCompleted}
                      error={!!errors.documentoEmpleado}
                    />
                    {errors.documentoEmpleado && <p className="text-[10px] text-red-500 mt-1 ml-1">{errors.documentoEmpleado}</p>}
                  </div>

                  {totalDuration > 0 && formData.horaInicio && (
                    <div className="flex items-center justify-between p-3 bg-purple-50 rounded-xl border border-purple-100 animate-in fade-in duration-300">
                      <div className="flex items-center space-x-2">
                        <Clock className="w-4 h-4 text-purple-600" />
                        <span className="text-xs font-bold text-purple-700">Resumen de tiempo</span>
                      </div>
                      <span className="text-xs font-black text-purple-800">
                        {formatTo12Hour(formData.horaInicio)} → {getEndTimeDisplay()} ({totalDuration} min)
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Services Selection Section */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-6 py-4 bg-gray-50/50 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Scissors className="w-4 h-4 text-pink-400" />
                  <h4 className="font-bold text-gray-700 text-sm">Servicios de la Cita</h4>
                </div>
                <button
                  type="button"
                  onClick={addServiceSlot}
                  disabled={isCompleted || formData.serviciosIds.length >= serviciosAPI.length}
                  className="bg-gradient-to-r from-pink-500 to-purple-600 text-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest hover:shadow-lg transition-all disabled:opacity-50 flex items-center space-x-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>Añadir</span>
                </button>
              </div>

              <div className="p-6">
                {formData.serviciosIds.length > 0 ? (
                  <div className="grid gap-4">
                    {formData.serviciosIds.map((svcId, index) => {
                      const svcObj = serviciosAPI.find((s) => s.servicioId === svcId);
                      return (
                        <div key={index} className="flex items-center gap-4 bg-gray-50/50 p-4 rounded-2xl border border-gray-100 group hover:border-pink-200 transition-all">
                          <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center border border-gray-100 group-hover:bg-pink-50 group-hover:text-pink-500 transition-colors">
                            <Scissors className="w-4 h-4 text-gray-400" />
                          </div>
                          <div className="flex-1">
                            <ServiceSearchSelect
                              selectedServiceId={svcId}
                              onSelect={(s: ServicioAPI) => updateServiceSlot(index, s.servicioId)}
                              disabled={isCompleted}
                              allSelectedIds={formData.serviciosIds}
                            />
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-lg">
                              {svcObj ? `${svcObj.duracion}m` : '-'}
                            </span>
                            <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-lg">
                              ${svcObj ? svcObj.precio.toLocaleString() : '0'}
                            </span>
                            <button
                              type="button"
                              onClick={() => removeServiceSlot(index)}
                              disabled={isCompleted}
                              className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-10 border-2 border-dashed border-gray-100 rounded-3xl">
                    <Plus className="w-10 h-10 text-gray-200 mx-auto mb-2" />
                    <p className="text-sm text-gray-400 font-medium">No has seleccionado ningún servicio aún</p>
                  </div>
                )}
                {errors.services && <p className="text-red-500 text-[10px] mt-2 text-center font-black uppercase tracking-widest">{errors.services}</p>}
              </div>

              {/* Totals Summary */}
              {formData.serviciosIds.length > 0 && (
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex flex-wrap justify-between items-center gap-4">
                  <div className="flex items-center space-x-6">
                    <div>
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Duración Total</span>
                      <span className="text-lg font-black text-pink-600">{totalDuration} min</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Servicios</span>
                      <span className="text-lg font-black text-purple-600">{formData.serviciosIds.length}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Monto Estimado</span>
                    <span className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-purple-600">
                      ${totalCost.toLocaleString()}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Observations Card */}
            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-4">
              <div className="flex items-center space-x-2 text-gray-500">
                <FileText className="w-4 h-4" />
                <h4 className="font-bold uppercase text-[10px] tracking-widest">Observaciones y Estado</h4>
              </div>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">Notas Internas</label>
                  <textarea
                    value={formData.observaciones}
                    onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
                    disabled={isCompleted}
                    className="w-full px-4 py-3 bg-gray-50/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-300 focus:border-transparent transition-all font-medium text-gray-700 resize-none"
                    rows={4}
                    placeholder="Agrega instrucciones especiales..."
                  />
                </div>
                {isEdit && (
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">Estado de la Cita</label>
                    <select
                      value={formData.estadoId}
                      onChange={(e) => setFormData({ ...formData, estadoId: parseInt(e.target.value) })}
                      disabled={isCompleted}
                      className="w-full px-4 py-3 bg-gray-50/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-300 focus:border-transparent transition-all font-medium text-gray-700"
                    >
                      {estadosAgenda.map((est) => (
                        <option key={est.estadoId} value={est.estadoId}>{est.nombre}</option>
                      ))}
                    </select>
                    {isCompleted && (
                      <div className="mt-4 p-4 bg-green-50 rounded-xl border border-green-100 flex items-center space-x-3">
                        <CheckCircle className="w-5 h-5 text-green-500" />
                        <p className="text-xs text-green-700 font-bold uppercase tracking-tight">Esta cita ya está finalizada</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </form>
        </div>

        {/* Footer - Fixed at bottom */}
        <div className="p-5 bg-white border-t border-gray-100 flex flex-wrap gap-3 justify-end shrink-0 z-20">
          <button
            type="button"
            onClick={onClose}
            className="px-8 py-2.5 rounded-xl font-black text-gray-500 hover:bg-gray-200 hover:text-gray-800 active:scale-95 transition-all text-sm uppercase tracking-widest shadow-sm"
          >
            {isCompleted ? 'Cerrar' : 'Cancelar'}
          </button>
          {!isCompleted && (
            <button
              onClick={handleSubmit}
              disabled={saving}
              className="px-8 py-2.5 bg-gradient-to-r from-pink-400 to-purple-500 text-white rounded-xl font-black hover:shadow-lg active:scale-95 transition-all text-sm uppercase tracking-widest shadow-md flex items-center space-x-2"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>{isEdit ? 'Actualizar Cita' : 'Crear Cita'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════
// AppointmentDetailModal
// ══════════════════════════════════════════

interface DetailModalProps {
  appointment: AgendaItem;
  servicios: ServicioAPI[];
  getStatusColor: (status: string) => string;
  onClose: () => void;
}

function AppointmentDetailModal({ appointment, servicios, getStatusColor, onClose }: DetailModalProps) {
  // Safe extraction of services array
  const servicesArray = Array.isArray(servicios) 
    ? servicios 
    : (servicios as any)?.data || (servicios as any)?.$values || [];

  // Find full service objects for the selected names
  const appointmentServices = appointment.servicios.map(name => {
    return servicesArray.find((s: any) => s.nombre.toLowerCase().trim() === name.toLowerCase().trim());
  });

  const totalDuration = appointmentServices.reduce(
    (sum, svc) => sum + (svc?.duracion ?? 30),
    0
  );

  const totalAmount = appointmentServices.reduce(
    (sum, svc) => sum + (svc?.precio ?? 0),
    0
  );

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header - Fixed at top */}
        <div className="bg-gradient-to-r from-pink-500 to-purple-600 p-5 text-white shrink-0 shadow-md z-20">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <Calendar className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold leading-tight">Detalle de la Cita</h3>
                <p className="text-pink-100 text-sm">Información detallada del servicio programado</p>
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

          <div className="max-w-5xl mx-auto space-y-6">
            {/* Info Cards Row */}
            <div className="grid md:grid-cols-3 gap-4">
              {/* Client Card */}
              <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                <div className="flex items-center space-x-2 text-purple-500 mb-3">
                  <Users className="w-4 h-4" />
                  <h4 className="font-bold uppercase text-[10px] tracking-widest">Cliente</h4>
                </div>
                <div className="mb-1">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">Documento:</span>
                  <p className="font-mono text-gray-600 text-sm">{appointment.documentoCliente}</p>
                </div>
                <p className="font-bold text-gray-800 text-lg mb-1 truncate">
                  {appointment.cliente}
                </p>
              </div>

              {/* Appointment Card */}
              <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                <div className="flex items-center space-x-2 text-pink-500 mb-3">
                  <Clock className="w-4 h-4" />
                  <h4 className="font-bold uppercase text-[10px] tracking-widest">Programación</h4>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Fecha:</span>
                    <span className="font-bold text-gray-700">
                      {new Date(appointment.fechaCita.split('T')[0] + 'T00:00:00').toLocaleDateString('es-ES', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Hora:</span>
                    <span className="font-bold text-gray-700">{appointment.horaInicio ? formatTo12Hour(appointment.horaInicio.substring(0, 5)) : '--:--'}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Duración:</span>
                    <span className="font-bold text-gray-700">{totalDuration} min</span>
                  </div>
                </div>
              </div>

              {/* Status Card */}
              <div className={`rounded-2xl p-5 border shadow-sm flex flex-col items-center justify-center ${getStatusColor(appointment.estado).includes('bg-green')
                  ? 'bg-green-50/50 border-green-100 text-green-600'
                  : getStatusColor(appointment.estado).includes('bg-red')
                    ? 'bg-red-50/50 border-red-100 text-red-600'
                    : 'bg-blue-50/50 border-blue-100 text-blue-600'
                }`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center mb-2 ${getStatusColor(appointment.estado).includes('bg-green') ? 'bg-green-100' :
                    getStatusColor(appointment.estado).includes('bg-red') ? 'bg-red-100' : 'bg-blue-100'
                  }`}>
                  <CheckCircle className="w-5 h-5" />
                </div>
                <span className="font-black uppercase text-[10px] tracking-[0.2em]">
                  {appointment.estado}
                </span>
              </div>
            </div>

            {/* Services Section */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-6 py-4 bg-gray-50/50 border-b border-gray-100 flex items-center justify-between">
                <h4 className="font-bold text-gray-700 text-sm flex items-center space-x-2">
                  <Scissors className="w-4 h-4 text-pink-400" />
                  <span>Servicios Solicitados</span>
                </h4>
                <span className="text-[10px] font-black bg-pink-100 text-pink-600 px-2 py-0.5 rounded-full uppercase">
                  {appointmentServices.length} servicios
                </span>
              </div>

              <div className="max-h-[250px] overflow-y-auto no-scrollbar">
                <table className="w-full">
                  <thead className="bg-gray-50/80 sticky top-0 backdrop-blur-sm z-10">
                    <tr>
                      <th className="px-6 py-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">Nombre del Servicio</th>
                      <th className="px-6 py-3 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">Duración</th>
                      <th className="px-6 py-3 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">Precio</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {appointmentServices.map((svc, i) => (
                      <tr key={i} className="hover:bg-gray-50/30 transition-colors">
                        <td className="px-6 py-4 text-sm font-semibold text-gray-700">{svc?.nombre || String(appointment.servicios[i])}</td>
                        <td className="px-6 py-4 text-center">
                          <span className="text-xs font-bold text-gray-500 bg-gray-100 px-2 py-1 rounded-lg">
                            {svc?.duracion ?? '?'} min
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right text-sm font-bold text-gray-900">
                          ${(svc?.precio ?? 0).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Bottom Section: Employee and Summary */}
            <div className="grid md:grid-cols-2 gap-6 pb-4">
              {/* Employee Info */}
              <div className="space-y-3">
                <div className="flex items-center space-x-2 text-blue-500">
                  <Briefcase className="w-4 h-4" />
                  <h4 className="font-bold text-[10px] uppercase tracking-widest">Profesional Asignado</h4>
                </div>
                <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-500 font-bold text-xl">
                      {(appointment.empleado || 'E').charAt(0)}
                    </div>
                    <div>
                      <p className="font-bold text-gray-800">{appointment.empleado || 'Empleado'}</p>
                      <p className="text-xs text-gray-500 font-mono">Doc: {appointment.documentoEmpleado || 'N/A'}</p>
                    </div>
                  </div>
                </div>
                <div className="mt-4">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Método de Pago Preferido</span>
                  <div className="inline-flex items-center gap-2 bg-purple-50 text-purple-700 px-4 py-2 rounded-xl font-bold text-sm">
                    <CreditCard className="w-4 h-4" />
                    {appointment.metodoPago}
                  </div>
                </div>
              </div>

              {/* Total Summary */}
              <div className="bg-green-50 rounded-3xl p-8 border border-green-100 shadow-sm flex flex-col justify-center min-h-[160px]">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold uppercase tracking-widest text-green-700/70">Subtotal</span>
                    <span className="font-bold text-lg text-green-600">${totalAmount.toLocaleString()}</span>
                  </div>
                  <div className="pt-6 mt-2 border-t border-green-200 flex justify-between items-center px-2">
                    <span className="text-sm font-black uppercase tracking-[0.2em] text-green-800">Total Estimado</span>
                    <span className="font-bold text-2xl text-green-600">
                      ${totalAmount.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer - Fixed at bottom */}
        <div className="p-5 bg-white border-t border-gray-100 flex flex-wrap gap-3 justify-end shrink-0 z-20">
          <button
            onClick={onClose}
            className="px-8 py-2.5 rounded-xl font-black text-gray-500 hover:bg-gray-200 hover:text-gray-800 active:scale-95 transition-all text-sm uppercase tracking-widest shadow-sm"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════
// DeleteAppointmentModal
// ══════════════════════════════════════════

interface DeleteModalProps {
  appointment: AgendaItem;
  serviciosMap: Map<string, number>;
  onClose: () => void;
  onConfirm: () => void;
}

function DeleteAppointmentModal({ appointment, serviciosMap, onClose, onConfirm }: DeleteModalProps) {
  const totalDuration = appointment.servicios.reduce(
    (sum, svc) => sum + (serviciosMap.get(svc) ?? 30),
    0
  );

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
            <div className="w-20 h-20 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-red-100 rotate-3">
              <AlertCircle className="w-10 h-10 text-red-500 -rotate-3" />
            </div>
            <h4 className="text-lg font-bold text-gray-800 mb-2">
              ¿Eliminar cita de "{appointment.cliente}"?
            </h4>
            <p className="text-sm text-gray-500 leading-relaxed mb-6">
              Estás a punto de eliminar permanentemente esta cita. 
              Esta acción liberará el espacio en la agenda del profesional.
            </p>
            
            <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 flex items-center space-x-4 text-left">
              <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center shrink-0">
                <Calendar className="w-6 h-6 text-pink-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Información de la Cita</p>
                <p className="font-bold text-gray-700 truncate">{new Date(appointment.fechaCita.split('T')[0] + 'T00:00:00').toLocaleDateString('es-ES')} - {appointment.horaInicio ? formatTo12Hour(appointment.horaInicio.substring(0, 5)) : '--:--'}</p>
                <p className="text-[10px] font-mono text-gray-400 uppercase mt-0.5">Duración: {totalDuration} min</p>
              </div>
            </div>
          </div>

          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="flex-1 px-6 py-3 rounded-xl font-black text-gray-400 hover:bg-gray-100 transition-all text-[10px] uppercase tracking-widest"
            >
              Cancelar
            </button>
            <button
              onClick={onConfirm}
              className="flex-1 bg-gradient-to-r from-red-500 to-red-600 text-white px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:shadow-lg hover:scale-105 active:scale-95 transition-all flex items-center justify-center space-x-2"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Eliminar</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Custom Client Search and Select Component (matches ProductSearchSelect style)
function ClientSearchSelect({ onSelect, selectedDocument, error, disabled }: any) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedClient, setSelectedClient] = useState<any>(null);

  // Load the currently selected client if available
  useEffect(() => {
    const fetchSelected = async () => {
      if (selectedDocument && !selectedClient) {
        try {
          const client = await personService.getPersonByDocument(selectedDocument, 'client');
          // map Backend Person to ClienteAPI structure (expected by onSelect/AppointmentModal)
          const mapped = {
            documentoCliente: client.documentId,
            tipoDocumento: client.documentType,
            nombre: client.name,
            telefono: client.phone,
            estado: client.status === 'active'
          };
          setSelectedClient(mapped);
        } catch (e) {
          console.warn('Error fetching selected client:', e);
        }
      }
    };
    fetchSelected();
  }, [selectedDocument, selectedClient]);

  // Handle Search with Debounce
  useEffect(() => {
    const fetchClients = async () => {
      if (!searchTerm.trim()) {
        setSearchResults([]);
        return;
      }
      setLoading(true);
      try {
        const res = await personService.getPersons('client', { search: searchTerm, pageSize: 20 });
        const mapped = res.data.map(p => ({
          documentoCliente: p.documentId,
          tipoDocumento: p.documentType,
          nombre: p.name,
          telefono: p.phone,
          estado: p.status === 'active'
        }));
        setSearchResults(mapped);
      } catch (err) {
        console.error('Error searching clients:', err);
      } finally {
        setLoading(false);
      }
    };

    const timer = setTimeout(fetchClients, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={`relative ${isOpen ? 'z-50' : ''}`} ref={dropdownRef}>
      <div
        className={cn(
          "w-full px-4 py-3 min-h-[48px] border rounded-xl flex items-center justify-between cursor-pointer bg-white transition-all",
          error ? 'border-red-300' : 'border-gray-300',
          disabled && 'bg-gray-100 cursor-not-allowed opacity-100'
        )}
        onClick={() => !disabled && setIsOpen(true)}
      >
        {!isOpen && !selectedClient ? (
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-pink-400" />
            <span className="text-gray-500">Seleccionar cliente...</span>
          </div>
        ) : !isOpen && selectedClient ? (
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-pink-400" />
            <span className="text-gray-800 font-medium">{selectedClient.nombre}</span>
          </div>
        ) : (
          <div className="flex-1 flex items-center">
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin text-pink-400" /> : <Search className="text-gray-400 w-4 h-4 mr-2" />}
            <input
              type="text"
              className="w-full bg-transparent text-sm focus:outline-none"
              placeholder="Buscar por nombre o documento..."
              value={searchTerm}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
              autoFocus
              onClick={(e: React.MouseEvent) => e.stopPropagation()}
            />
          </div>
        )}
        <ChevronsUpDown className={cn(
          "w-4 h-4 text-gray-500 transition-transform",
          isOpen && 'rotate-180'
        )} />
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-xl shadow-2xl overflow-hidden z-[100] animate-in fade-in zoom-in-95 duration-200">
          <div className="max-h-60 overflow-y-auto py-1">
            {loading && searchResults.length === 0 ? (
              <div className="p-4 text-sm text-gray-500 text-center">Buscando...</div>
            ) : searchResults.length === 0 ? (
              <div className="p-4 text-sm text-gray-500 text-center">
                {searchTerm ? 'No se encontraron clientes' : 'Escribe para buscar...'}
              </div>
            ) : (
              searchResults.map((client: any) => (
                <div
                  key={client.documentoCliente}
                  className={cn(
                    "px-4 py-3 hover:bg-pink-50 cursor-pointer text-sm flex justify-between items-center transition-colors",
                    client.documentoCliente === selectedDocument ? 'bg-pink-100 text-pink-700 font-semibold' : 'text-gray-800'
                  )}
                  onClick={(e: React.MouseEvent) => {
                    e.stopPropagation();
                    onSelect(client);
                    setSelectedClient(client);
                    setIsOpen(false);
                    setSearchTerm('');
                  }}
                >
                  <div className="flex items-center gap-3">
                    <Check
                      className={cn(
                        "h-4 w-4 text-pink-500",
                        client.documentoCliente === selectedDocument ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <div className="flex flex-col">
                      <span className="font-medium">{client.nombre}</span>
                      <span className="text-xs text-gray-500">{client.documentoCliente}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

interface ProfessionalSearchSelectProps {
  selectedDocument: string;
  onSelect: (emp: any) => void;
  checkEmployeeOccupied: (doc: string) => boolean;
  checkEmployeeHasSchedule: (doc: string) => boolean;
  disabled?: boolean;
  error?: boolean;
}

function ProfessionalSearchSelect({
  selectedDocument,
  onSelect,
  checkEmployeeOccupied,
  checkEmployeeHasSchedule,
  disabled,
  error
}: ProfessionalSearchSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Load selected employee
  useEffect(() => {
    const fetchSelected = async () => {
      if (selectedDocument && !selectedEmployee) {
        try {
          const emp = await personService.getPersonByDocument(selectedDocument, 'employee');
          const mapped = {
            documentoEmpleado: emp.documentId,
            tipoDocumento: emp.documentType,
            nombre: emp.name,
            telefono: emp.phone,
            estado: emp.status === 'active'
          };
          setSelectedEmployee(mapped);
        } catch (e) {
          console.warn('Error fetching selected employee:', e);
        }
      }
    };
    fetchSelected();
  }, [selectedDocument, selectedEmployee]);

  // Search with Debounce
  useEffect(() => {
    const fetchEmployees = async () => {
      if (!searchTerm.trim()) {
        setSearchResults([]);
        return;
      }
      setLoading(true);
      try {
        const res = await personService.getPersons('employee', { search: searchTerm, pageSize: 20 });
        const mapped = res.data.map(p => ({
          documentoEmpleado: p.documentId,
          tipoDocumento: p.documentType,
          nombre: p.name,
          telefono: p.phone,
          estado: p.status === 'active'
        }));
        setSearchResults(mapped);
      } catch (err) {
        console.error('Error searching employees:', err);
      } finally {
        setLoading(false);
      }
    };

    const timer = setTimeout(fetchEmployees, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  return (
    <div className="relative w-full" ref={containerRef}>
      <div
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={cn(
          "flex items-center justify-between w-full px-4 py-3 border rounded-xl transition-all cursor-pointer bg-white",
          error ? "border-red-300 ring-red-100" : "border-gray-300 ring-pink-100",
          !disabled && "hover:border-pink-300 focus-within:ring-2",
          disabled && "bg-gray-100 cursor-not-allowed opacity-75"
        )}
      >
        {!isOpen && !selectedEmployee ? (
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-pink-400" />
            <span className="text-gray-500">Seleccionar profesional...</span>
          </div>
        ) : !isOpen && selectedEmployee ? (
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-pink-400" />
            <span className="text-gray-800 font-medium">{selectedEmployee.nombre}</span>
          </div>
        ) : (
          <div className="flex-1 flex items-center">
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin text-pink-400" /> : <Search className="text-gray-400 w-4 h-4 mr-2" />}
            <input
              type="text"
              className="w-full bg-transparent text-sm focus:outline-none"
              placeholder="Buscar profesional..."
              value={searchTerm}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
              autoFocus
              onClick={(e: React.MouseEvent) => e.stopPropagation()}
            />
          </div>
        )}
        <ChevronsUpDown className={cn(
          "w-4 h-4 text-gray-500 transition-transform",
          isOpen && 'rotate-180'
        )} />
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-xl shadow-2xl overflow-hidden z-[100] animate-in fade-in zoom-in-95 duration-200">
          <div className="max-h-[280px] overflow-y-auto py-1">
            {loading && searchResults.length === 0 ? (
              <div className="p-4 text-sm text-gray-500 text-center">Buscando...</div>
            ) : searchResults.length === 0 ? (
              <div className="p-4 text-sm text-gray-500 text-center">
                {searchTerm ? 'No se encontraron profesionales' : 'Escribe para buscar...'}
              </div>
            ) : (
              searchResults.map((emp: any) => {
                const occupied = checkEmployeeOccupied(emp.documentoEmpleado);
                const isWithinSchedule = checkEmployeeHasSchedule(emp.documentoEmpleado);
                const isDisabled = occupied || !isWithinSchedule;
                const statusText = occupied
                  ? 'Ocupado'
                  : !isWithinSchedule
                    ? 'Fuera de horario'
                    : '';

                return (
                  <div
                    key={emp.documentoEmpleado}
                    className={cn(
                      "px-4 py-3 text-sm flex justify-between items-center transition-colors",
                      emp.documentoEmpleado === selectedDocument ? 'bg-pink-100 text-pink-700 font-semibold' : 'text-gray-800',
                      isDisabled ? "opacity-50 cursor-not-allowed bg-gray-50" : "hover:bg-pink-50 cursor-pointer"
                    )}
                    onClick={(e: React.MouseEvent) => {
                      e.stopPropagation();
                      if (isDisabled) return;
                      onSelect(emp);
                      setSelectedEmployee(emp);
                      setIsOpen(false);
                      setSearchTerm('');
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <Check
                        className={cn(
                          "h-4 w-4 text-pink-500",
                          emp.documentoEmpleado === selectedDocument ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <div className="flex flex-col">
                        <span className="font-medium">{emp.nombre}</span>
                        {statusText && (
                          <span className="text-[10px] uppercase tracking-wider font-bold text-gray-400">
                            {statusText}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

interface ServiceSearchSelectProps {
  selectedServiceId: number;
  onSelect: (service: ServicioAPI) => void;
  disabled?: boolean;
  allSelectedIds: number[];
}

function ServiceSearchSelect({
  selectedServiceId,
  onSelect,
  disabled,
  allSelectedIds
}: ServiceSearchSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<ServicioAPI[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedService, setSelectedService] = useState<ServicioAPI | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Load selected service
  useEffect(() => {
    const fetchSelected = async () => {
      if (selectedServiceId > 0 && (!selectedService || selectedService.servicioId !== selectedServiceId)) {
        try {
          const svc = await serviceService.getServiceById(selectedServiceId);
          setSelectedService(svc);
        } catch (e) {
          console.warn('Error fetching selected service:', e);
        }
      } else if (selectedServiceId === 0) {
        setSelectedService(null);
      }
    };
    fetchSelected();
  }, [selectedServiceId, selectedService]);

  // Search with Debounce
  useEffect(() => {
    const fetchServices = async () => {
      if (!searchTerm.trim()) {
        setSearchResults([]);
        return;
      }
      setLoading(true);
      try {
        const res = await serviceService.getServices({ search: searchTerm, pageSize: 20 });
        setSearchResults(res.data);
      } catch (err) {
        console.error('Error searching services:', err);
      } finally {
        setLoading(false);
      }
    };

    const timer = setTimeout(fetchServices, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  return (
    <div className="relative w-full" ref={containerRef}>
      <div
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={cn(
          "flex items-center justify-between w-full transition-all cursor-pointer bg-transparent",
          disabled && "cursor-not-allowed opacity-75"
        )}
      >
        {!isOpen && !selectedService ? (
          <div className="flex items-center gap-2">
            <span className="text-gray-500 text-sm font-medium">Seleccionar servicio...</span>
          </div>
        ) : !isOpen && selectedService ? (
          <div className="flex items-center gap-2">
            <span className="text-gray-800 font-bold text-sm">{selectedService.nombre}</span>
          </div>
        ) : (
          <div className="flex-1 flex items-center">
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin text-pink-400" /> : <Search className="text-gray-400 w-4 h-4 mr-2" />}
            <input
              type="text"
              className="w-full bg-transparent text-sm focus:outline-none font-medium"
              placeholder="Buscar servicio..."
              value={searchTerm}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
              autoFocus
              onClick={(e: React.MouseEvent) => e.stopPropagation()}
            />
          </div>
        )}
        <ChevronsUpDown className={cn(
          "w-4 h-4 text-gray-500 transition-transform",
          isOpen && 'rotate-180'
        )} />
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-xl shadow-2xl overflow-hidden z-[100] animate-in fade-in zoom-in-95 duration-200">
          <div className="max-h-[250px] overflow-y-auto py-1">
            {loading && searchResults.length === 0 ? (
              <div className="p-4 text-sm text-gray-500 text-center">Buscando...</div>
            ) : searchResults.length === 0 ? (
              <div className="p-4 text-sm text-gray-500 text-center">
                {searchTerm ? 'No se encontraron servicios' : 'Escribe para buscar...'}
              </div>
            ) : (
              searchResults.map((svc) => {
                const isSelected = svc.servicioId === selectedServiceId;
                const isAlreadyAdded = allSelectedIds.includes(svc.servicioId) && !isSelected;

                return (
                  <div
                    key={svc.servicioId}
                    className={cn(
                      "px-4 py-3 text-sm flex justify-between items-center transition-colors",
                      isSelected ? 'bg-pink-100 text-pink-700 font-semibold' : 'text-gray-800',
                      isAlreadyAdded ? "opacity-50 cursor-not-allowed bg-gray-50" : "hover:bg-pink-50 cursor-pointer"
                    )}
                    onClick={(e: React.MouseEvent) => {
                      e.stopPropagation();
                      if (isAlreadyAdded) return;
                      onSelect(svc);
                      setSelectedService(svc);
                      setIsOpen(false);
                      setSearchTerm('');
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <Check
                        className={cn(
                          "h-4 w-4 text-pink-500",
                          isSelected ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <div className="flex flex-col">
                        <span className="font-medium">{svc.nombre}</span>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] text-gray-400">{svc.duracion} min</span>
                          <span className="text-[10px] text-gray-400">•</span>
                          <span className="text-[10px] text-gray-400">${svc.precio.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
