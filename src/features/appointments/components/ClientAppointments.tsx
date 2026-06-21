import React, { useState, useEffect } from 'react';
import { 
  Calendar, Clock, User, CheckCircle, AlertCircle, XCircle,
  MapPin, Phone, Scissors, ChevronLeft, ChevronRight, Filter,
  Plus, Eye, Edit, MessageCircle, Loader2, X, ShoppingBag, TrendingUp, CheckCircle2, Info, Sparkles
} from 'lucide-react';
import { agendaService, empleadoAgendaService, AgendaItem, servicioAgendaService, ServicioAPI, metodoPagoService, MetodoPago } from '../services/agendaService';
import { toast } from 'sonner';

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

interface ClientAppointmentsProps {
  currentUser: any;
  onBookNewAppointment?: () => void;
  onRescheduleAppointment?: (appointment: AgendaItem) => void;
}

export function ClientAppointments({ currentUser, onBookNewAppointment, onRescheduleAppointment }: ClientAppointmentsProps) {
  const [appointments, setAppointments] = useState<AgendaItem[]>([]);
  const [services, setServices] = useState<ServicioAPI[]>([]);
  const [metodosPago, setMetodosPago] = useState<MetodoPago[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAppointment, setSelectedAppointment] = useState<AgendaItem | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [appointmentToCancel, setAppointmentToCancel] = useState<AgendaItem | null>(null);
  const [showCancelConfirmModal, setShowCancelConfirmModal] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        let [appointmentsData, servicesData, metodosData, empleadosResult] = await Promise.all([
          agendaService.getMisCitas(),
          servicioAgendaService.getAll(),
          metodoPagoService.getAll(),
          empleadoAgendaService.getAll({ pageSize: 100 }) // fetch employees to map names
        ]);

        const normalizeEstado = (status: string) =>
          (status || '').toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        const toDateTime = (fecha: string, hora: string) => {
          const safeDate = (fecha || '').split('T')[0];
          const safeHour = (hora || '').length === 5 ? `${hora}:00` : hora;
          return new Date(`${safeDate}T${safeHour}`);
        };
        const serviceDurationMap = new Map<string, number>();
        servicesData.forEach((s) => serviceDurationMap.set(s.nombre, s.duracion));

        const now = new Date();
        const toCancel = appointmentsData.filter((apt) => {
          const estado = normalizeEstado(apt.estado);
          if (estado === 'cancelado' || estado === 'cancelled' || estado === 'completado' || estado === 'completed') {
            return false;
          }

          const startAt = toDateTime(apt.fechaCita, apt.horaInicio);
          const duration = apt.servicios.reduce((acc, svc) => acc + (serviceDurationMap.get(svc) ?? 30), 0) || 30;
          const endAt = new Date(startAt.getTime() + duration * 60_000);
          const completeLimit = new Date(endAt.getTime() + 24 * 60 * 60 * 1000);
          const isConfirmed = estado === 'confirmado' || estado === 'confirmed';

          if (!isConfirmed && now >= startAt) return true;
          if (now > completeLimit) return true;
          return false;
        });

        if (toCancel.length > 0) {
          for (const apt of toCancel) {
            const serviceIds = apt.servicios.map(name => {
              const normalizedName = name.trim().toLowerCase();
              const svc = servicesData.find(s => s.nombre.trim().toLowerCase() === normalizedName);
              return svc ? svc.servicioId : 0;
            }).filter(id => id > 0);

            const mp = metodosData.find(m => m.nombre.trim().toLowerCase() === (apt.metodoPago || '').trim().toLowerCase());
            const metodoPagoId = mp ? (mp.metodopagoId || (mp as any).metodoPagoId) : (metodosData.length > 0 ? (metodosData[0].metodopagoId || (metodosData[0] as any).metodoPagoId) : 1);

            await agendaService.update(apt.agendaId, {
              agendaId: apt.agendaId,
              documentoCliente: apt.documentoCliente,
              documentoEmpleado: apt.documentoEmpleado,
              fechaCita: apt.fechaCita.split('T')[0],
              horaInicio: apt.horaInicio.length === 5 ? `${apt.horaInicio}:00` : apt.horaInicio,
              horaFin: apt.horaFin
                ? (apt.horaFin.length === 5 ? `${apt.horaFin}:00` : apt.horaFin)
                : apt.horaInicio.length === 5 ? `${apt.horaInicio}:00` : apt.horaInicio,
              metodoPagoId: Number(metodoPagoId),
              observaciones: apt.observaciones || 'Cancelación automática por reglas de negocio',
              serviciosIds: serviceIds,
              estadoId: 3
            });
          }
          appointmentsData = await agendaService.getMisCitas();
        }
        
        // Extract array of employees
        const empleados = Array.isArray(empleadosResult) 
          ? empleadosResult 
          : (empleadosResult as any)?.data || (empleadosResult as any)?.$values || [];

        // Map employee names — always run mapping regardless of whether empleado is set
        const mappedAppointments = appointmentsData.map(apt => {
          if (!apt.empleado || !apt.empleado.trim()) {
            const empDoc = String(apt.documentoEmpleado || '').trim();
            const emp = empleados.find((e: any) =>
              String(e.documentoEmpleado || '').trim() === empDoc
            );
            if (emp) {
              return { ...apt, empleado: emp.nombre };
            }
          }
          return apt;
        });

        setAppointments(mappedAppointments.sort((a, b) => 
          new Date(b.fechaCita).getTime() - new Date(a.fechaCita).getTime()
        ));
        setServices(servicesData);
        setMetodosPago(metodosData);
      } catch (error) {
        console.error('Error loading data:', error);
        toast.error('No se pudieron cargar tus citas');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [currentUser]);

  const [filterStatus, setFilterStatus] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(5);

  // Normalize status for internal logic
  const normalizeStatusForFilter = (status: string) => {
    const s = status.toLowerCase();
    if (s.includes('pendien')) return 'pending';
    if (s.includes('confirm')) return 'confirmed';
    if (s.includes('complet')) return 'completed';
    if (s.includes('cancel')) return 'cancelled';
    return s;
  };

  // Filter appointments based on status
  const filteredAppointments = appointments.filter(apt => {
    const status = normalizeStatusForFilter(apt.estado);
    if (filterStatus === 'all') return true;
    return status === filterStatus;
  });

  // Sort appointments by date (newest first)
  const sortedAppointments = filteredAppointments.sort((a, b) => {
    const dateA = new Date(`${a.fechaCita}T${a.horaInicio}`).getTime();
    const dateB = new Date(`${b.fechaCita}T${b.horaInicio}`).getTime();
    return dateB - dateA;
  });

  // Pagination
  const totalPages = Math.ceil(sortedAppointments.length / itemsPerPage);
  const paginatedAppointments = sortedAppointments.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const getStatusColor = (status: string) => {
    const normalized = normalizeStatusForFilter(status);
    switch (normalized) {
      case 'confirmed': return 'bg-gradient-brand';
      case 'pending': return 'bg-brand-violet';
      case 'completed': return 'bg-brand-periwinkle';
      case 'cancelled': return 'bg-brand-pink';
      default: return 'bg-gray-300';
    }
  };

  const getStatusIcon = (status: string) => {
    const normalized = normalizeStatusForFilter(status);
    switch (normalized) {
      case 'confirmed': return <CheckCircle className="w-3.5 h-3.5" />;
      case 'pending': return <AlertCircle className="w-3.5 h-3.5" />;
      case 'completed': return <CheckCircle2 className="w-3.5 h-3.5" />;
      case 'cancelled': return <XCircle className="w-3.5 h-3.5" />;
      default: return <Clock className="w-3.5 h-3.5" />;
    }
  };

  const getStatusLabel = (status: string) => {
    const normalized = normalizeStatusForFilter(status);
    switch (normalized) {
      case 'confirmed': return 'Confirmada';
      case 'pending': return 'Pendiente';
      case 'completed': return 'Completada';
      case 'cancelled': return 'Cancelada';
      default: return status;
    }
  };

  const isUpcoming = (date: string, time?: string) => {
    // If we only have date, assume midnight local time
    const dateStr = time ? `${date.split('T')[0]}T${time}` : `${date.split('T')[0]}T00:00:00`;
    const appointmentDate = new Date(dateStr);
    return appointmentDate > new Date();
  };

  const handleShowDetails = (appointment: AgendaItem) => {
    setSelectedAppointment(appointment);
    setShowDetailModal(true);
  };

  const handleCancelClick = (appointment: AgendaItem) => {
    setAppointmentToCancel(appointment);
    setShowCancelConfirmModal(true);
  };

  const confirmCancelAppointment = async () => {
    if (!appointmentToCancel) return;
    
    setIsCancelling(true);
    try {
      // Use the appointment already in state — getById returns 405 (not supported by backend)
      // Try to find a richer version in the appointments list
      const fullApt = appointments.find(a => a.agendaId === appointmentToCancel.agendaId) || appointmentToCancel;

      // Find IDs for services — use case-insensitive trimmed comparison
      const serviceIds = fullApt.servicios.map(name => {
        const normalizedName = name.trim().toLowerCase();
        const svc = services.find(s => s.nombre.trim().toLowerCase() === normalizedName);
        return svc ? svc.servicioId : 0;
      }).filter(id => id > 0);

      const mp = metodosPago.find(m => m.nombre === fullApt.metodoPago);
      const metodoPagoId = mp ? (mp.metodopagoId || (mp as any).metodoPagoId) : (metodosPago.length > 0 ? (metodosPago[0].metodopagoId || (metodosPago[0] as any).metodoPagoId) : 1);

      // documentoCliente may be empty from mis-citas endpoint — fall back to currentUser
      const documentoCliente = fullApt.documentoCliente
        || currentUser?.documentId
        || currentUser?.documento
        || '';

      const toHHMMSS = (t: string) => t && t.length === 5 ? `${t}:00` : (t || '');

      // Calculate horaFin from service durations if not available
      let horaFin = toHHMMSS(fullApt.horaFin);
      if (!horaFin || horaFin === toHHMMSS(fullApt.horaInicio)) {
        const totalMinutes = fullApt.servicios.reduce((acc, svcName) => {
          const svc = services.find(s => s.nombre.trim().toLowerCase() === svcName.trim().toLowerCase());
          return acc + (svc?.duracion || 30);
        }, 0);
        const [h, m] = toHHMMSS(fullApt.horaInicio).split(':').map(Number);
        const endMinutes = h * 60 + m + totalMinutes;
        const endH = String(Math.floor(endMinutes / 60) % 24).padStart(2, '0');
        const endM = String(endMinutes % 60).padStart(2, '0');
        horaFin = `${endH}:${endM}:00`;
      }

      const payload = {
        agendaId: fullApt.agendaId,
        documentoCliente,
        documentoEmpleado: fullApt.documentoEmpleado,
        fechaCita: fullApt.fechaCita.split('T')[0],
        horaInicio: toHHMMSS(fullApt.horaInicio),
        horaFin,
        metodoPagoId: Number(metodoPagoId),
        observaciones: fullApt.observaciones || 'Cancelada por el cliente',
        serviciosIds: serviceIds.length > 0 ? serviceIds : [1],
        estadoId: 3 // Cancelado
      };
      await agendaService.update(appointmentToCancel.agendaId, payload);
      toast.success('Cita cancelada con éxito');
      setShowCancelConfirmModal(false);
      setAppointmentToCancel(null);
      
      // Reload appointments
      const appointmentsData = await agendaService.getMisCitas();
      setAppointments(appointmentsData.sort((a, b) => 
        new Date(b.fechaCita).getTime() - new Date(a.fechaCita).getTime()
      ));
    } catch (error: any) {
      console.error('Error cancelling appointment:', error);
      const msg = error?.message?.includes('403') 
        ? 'No tienes permisos para cancelar esta cita. Contacta al administrador.' 
        : 'No se pudo cancelar la cita. Por favor intenta de nuevo.';
      toast.error(msg);
    } finally {
      setIsCancelling(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-50/30 to-purple-50/30">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-brand-pink animate-spin mx-auto mb-4" />
          <p className="text-gray-600 font-medium">Cargando tus citas...</p>
        </div>
      </div>
    );
  }

  return (
    <section className="py-20 bg-gradient-to-br from-pink-50/30 to-purple-50/30 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-gray-800 mb-4">
            Mis Citas Agendadas
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Aquí puedes ver todas tus citas programadas, su estado y detalles importantes
          </p>
        </div>

        {/* Quick Action Button */}
        <div className="text-center mb-8">
          <button
            onClick={onBookNewAppointment}
            className="bg-gradient-brand text-white px-8 py-4 rounded-2xl font-semibold hover:shadow-xl transition-all duration-300 flex items-center space-x-3 mx-auto"
          >
            <Plus className="w-6 h-6" />
            <span>Agendar Nueva Cita</span>
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-800">Filtrar Citas</h3>
              <p className="text-sm text-gray-600">
                {filteredAppointments.length} cita{filteredAppointments.length !== 1 ? 's' : ''} encontrada{filteredAppointments.length !== 1 ? 's' : ''}
              </p>
            </div>
            
            <div className="flex items-center space-x-3">
              <Filter className="w-5 h-5 text-gray-400" />
              <select
                value={filterStatus}
                onChange={(e) => {
                  setFilterStatus(e.target.value);
                  setCurrentPage(1);
                }}
                className="px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-periwinkle/300 focus:border-transparent"
              >
                <option value="all">Todos los estados</option>
                <option value="confirmed">Confirmadas</option>
                <option value="pending">Pendientes</option>
                <option value="completed">Completadas</option>
                <option value="cancelled">Canceladas</option>
              </select>
            </div>
          </div>
        </div>

        {/* Leyenda de Estados */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-8 flex flex-col md:flex-row items-center gap-4 border border-gray-100">
          <div className="flex items-center space-x-2 text-brand-indigo font-bold shrink-0">
            <Info className="w-5 h-5" />
            <span>Estados:</span>
          </div>
          <div className="flex flex-wrap gap-5">
            <div className="flex items-center space-x-2 text-sm text-gray-600 font-medium">
              <div className="w-4 h-4 rounded-full bg-gradient-brand shadow-sm"></div>
              <span>Confirmada (No reprogramable)</span>
            </div>
            <div className="flex items-center space-x-2 text-sm text-gray-600 font-medium">
              <div className="w-4 h-4 rounded-full bg-brand-periwinkle shadow-sm"></div>
              <span>Completada (Servicio realizado)</span>
            </div>
            <div className="flex items-center space-x-2 text-sm text-gray-600 font-medium">
              <div className="w-4 h-4 rounded-full bg-brand-pink shadow-sm"></div>
              <span>Cancelada (No se realizará)</span>
            </div>
            <div className="flex items-center space-x-2 text-sm text-gray-600 font-medium">
              <div className="w-4 h-4 rounded-full bg-brand-violet shadow-sm"></div>
              <span>Pendiente (Se puede reprogramar)</span>
            </div>
          </div>
        </div>

        {/* Appointments Grid */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-6 border-b border-gray-100">
            <h3 className="text-xl font-bold text-gray-800">Mis Citas</h3>
          </div>

          <div className="p-6">
            {paginatedAppointments.length > 0 ? (
              <div className="grid gap-6">
                {paginatedAppointments.map((appointment) => (
                  <div key={appointment.agendaId} className="relative border border-gray-200 rounded-2xl p-6 hover:shadow-lg transition-all duration-200">
                    {/* Status Badge in absolute top-right corner */}
                    <div 
                      className={`absolute top-5 right-5 w-4 h-4 rounded-full shadow-sm z-10 cursor-pointer hover:scale-110 transition-transform ${getStatusColor(appointment.estado)}`}
                      title={getStatusLabel(appointment.estado)}
                    />
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                      {/* Appointment Info */}
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-4 w-full">
                          <div className="w-full">
                            <div className="mb-3">
                              <h4 className="text-xl font-bold text-gray-800 pr-8">
                                {appointment.servicios.join(', ')}
                              </h4>
                            </div>
                            <div className="flex items-center space-x-4 text-sm text-gray-600 mb-3">
                              <span className="flex items-center space-x-1">
                                <Calendar className="w-4 h-4" />
                                <span>{new Date(appointment.fechaCita.split('T')[0] + 'T00:00:00').toLocaleDateString('es-ES', {
                                  weekday: 'long',
                                  year: 'numeric',
                                  month: 'long',
                                  day: 'numeric'
                                })}</span>
                              </span>
                              <span className="flex items-center space-x-1">
                                <Clock className="w-4 h-4" />
                                <span>{appointment.horaInicio ? formatTo12Hour(appointment.horaInicio.substring(0, 5)) : '--:--'}</span>
                              </span>
                            </div>
                            <div className="flex items-center space-x-4 text-sm text-gray-600 mb-3">
                              <span className="flex items-center space-x-1">
                                <User className="w-4 h-4" />
                                <span>Con <span className="text-gradient-brand font-bold inline-block">{appointment.empleado}</span></span>
                              </span>
                            </div>
                            {appointment.observaciones && (
                              <div className="flex items-start space-x-1 text-sm text-gray-600">
                                <MessageCircle className="w-4 h-4 mt-0.5" />
                                <span>{appointment.observaciones}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex flex-col sm:flex-row gap-3 items-end lg:items-center">
                        {(normalizeStatusForFilter(appointment.estado) === 'confirmed' || normalizeStatusForFilter(appointment.estado) === 'pending') && (
                          <button 
                            onClick={() => handleCancelClick(appointment)}
                            className="bg-gray-50 text-brand-pink px-4 py-2 rounded-xl font-bold hover:bg-gray-100 transition-all flex items-center justify-center space-x-2 border border-pink-100"
                          >
                            <XCircle className="w-4 h-4" />
                            <span>Cancelar Cita</span>
                          </button>
                        )}
                        
                        {normalizeStatusForFilter(appointment.estado) === 'pending' && (
                          <button 
                            onClick={() => onRescheduleAppointment?.(appointment)}
                            className="bg-brand-lavender text-brand-indigo px-4 py-2 rounded-xl font-bold hover:bg-brand-periwinkle hover:text-white transition-all flex items-center justify-center space-x-2 border border-transparent"
                          >
                            <Edit className="w-4 h-4" />
                            <span>Reprogramar</span>
                          </button>
                        )}
                        
                        <button 
                          onClick={() => handleShowDetails(appointment)}
                          className="bg-brand-lavender text-brand-indigo px-4 py-2 rounded-xl font-bold hover:brightness-105 transition-all flex items-center justify-center space-x-2 border border-transparent"
                        >
                          <Eye className="w-4 h-4" />
                          <span>Ver Detalles</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-600 mb-2">No tienes citas agendadas</h3>
                <p className="text-gray-500 mb-6">¡Agenda tu primera cita y disfruta de nuestros servicios!</p>
                <button
                  onClick={onBookNewAppointment}
                  className="bg-gradient-brand text-white px-6 py-3 rounded-xl font-semibold hover:shadow-lg transition-all"
                >
                  Agendar Servicio
                </button>
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-8 flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  Mostrando {(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, sortedAppointments.length)} de {sortedAppointments.length} citas
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  
                  {[...Array(totalPages)].map((_, index) => (
                    <button
                      key={index + 1}
                      onClick={() => setCurrentPage(index + 1)}
                      className={`px-3 py-2 text-sm rounded-lg ${
                        currentPage === index + 1
                          ? 'bg-gradient-brand text-white'
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      {index + 1}
                    </button>
                  ))}
                  
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      {showDetailModal && selectedAppointment && (
        <AppointmentDetailModal 
          appointment={selectedAppointment} 
          allServices={services}
          getStatusColor={getStatusColor}
          getStatusIcon={getStatusIcon}
          getStatusLabel={getStatusLabel}
          onClose={() => setShowDetailModal(false)} 
        />
      )}

      {/* Cancellation Confirmation Modal */}
      {showCancelConfirmModal && appointmentToCancel && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8 text-center">
              <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <AlertCircle className="w-10 h-10 text-brand-pink" />
              </div>
              <h3 className="text-2xl font-black text-gray-800 mb-2">¿Cancelar Cita?</h3>
              <p className="text-gray-500 font-medium mb-8">
                Esta acción no se puede deshacer. ¿Estás seguro de que deseas cancelar tu cita para el <span className="text-gray-800 font-bold">{new Date(appointmentToCancel.fechaCita + 'T00:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })}</span> a las <span className="text-gray-800 font-bold">{appointmentToCancel.horaInicio?.substring(0, 5) || '--:--'}</span>?
              </p>
              
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => setShowCancelConfirmModal(false)}
                  disabled={isCancelling}
                  className="flex-1 px-6 py-4 bg-gray-100 text-gray-600 rounded-2xl font-bold hover:bg-gray-200 transition-all disabled:opacity-50"
                >
                  No, mantener
                </button>
                <button
                  onClick={confirmCancelAppointment}
                  disabled={isCancelling}
                  className="flex-1 px-6 py-4 bg-gray-500 text-white rounded-2xl font-bold shadow-lg shadow-red-200 hover:bg-red-600 hover:-translate-y-0.5 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center"
                >
                  {isCancelling ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin mr-2" />
                      Cancelando...
                    </>
                  ) : (
                    'Sí, cancelar'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

// ── Detail Modal Component ──
function AppointmentDetailModal({ 
  appointment, 
  allServices,
  getStatusColor,
  getStatusIcon,
  getStatusLabel,
  onClose 
}: { 
  appointment: AgendaItem; 
  allServices: ServicioAPI[];
  getStatusColor: (status: string) => string;
  getStatusIcon: (status: string) => React.ReactNode;
  getStatusLabel: (status: string) => string;
  onClose: () => void;
}) {
  // Safe extraction of services array
  const servicesArray = Array.isArray(allServices) 
    ? allServices 
    : (allServices as any)?.data || (allServices as any)?.$values || [];

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
        {/* Header */}
        <div className="bg-gradient-brand p-5 text-white shrink-0 shadow-md z-20">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <ShoppingBag className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold leading-tight">Detalle de la Cita</h3>
                <p className="text-pink-100 text-sm">#{appointment.agendaId}</p>
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
            <div className="grid md:grid-cols-2 gap-4">
              {/* Client/Professional Card */}
              <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                <div className="flex items-center space-x-2 text-brand-pink mb-3">
                  <User className="w-4 h-4" />
                  <h4 className="font-bold text-[10px] tracking-widest">Profesional</h4>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gray-50 rounded-full flex items-center justify-center">
                    <User className="w-5 h-5 text-brand-indigo" />
                  </div>
                  <div>
                    <p className="font-bold text-gradient-brand inline-block">{appointment.empleado}</p>
                    <p className="text-[10px] text-gray-400 font-bold tracking-widest">Especialista</p>
                  </div>
                </div>
              </div>

              {/* Date & Time Card */}
              <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                <div className="flex items-center space-x-2 text-brand-violet mb-3">
                  <Calendar className="w-4 h-4" />
                  <h4 className="font-bold text-[10px] tracking-widest">Fecha y Hora</h4>
                </div>
                <div className="space-y-1">
                  <p className="font-bold text-gray-800">
                    {new Date(appointment.fechaCita.split('T')[0] + 'T00:00:00').toLocaleDateString('es-ES', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                  <p className="text-brand-indigo font-bold flex items-center">
                    <Clock className="w-4 h-4 mr-1" />
                    {appointment.horaInicio ? formatTo12Hour(appointment.horaInicio.substring(0, 5)) : '--:--'}
                  </p>
                </div>
              </div>
            </div>

            {/* Services Table */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-gray-50 flex items-center justify-between bg-gray-50/50">
                <div className="flex items-center space-x-2 text-gray-800">
                  <Scissors className="w-5 h-5 text-brand-pink" />
                  <h4 className="font-bold text-xs tracking-widest">Servicios Contratados</h4>
                </div>
                <span className="bg-gray-50 text-brand-indigo px-3 py-1 rounded-full text-[10px] font-black tracking-widest">
                  {appointmentServices.length} Item{appointmentServices.length !== 1 ? 's' : ''}
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50/30 text-left">
                      <th className="px-6 py-4 text-[10px] font-black text-gray-400 tracking-widest">Servicio</th>
                      <th className="px-6 py-4 text-[10px] font-black text-gray-400 tracking-widest text-center">Duración</th>
                      <th className="px-6 py-4 text-[10px] font-black text-gray-400 tracking-widest text-right">Precio</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {appointmentServices.map((svc, idx) => (
                      <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-gray-50 rounded-lg flex items-center justify-center">
                              <Sparkles className="w-4 h-4 text-purple-400" />
                            </div>
                            <span className="font-bold text-gray-800 text-sm">{svc?.nombre || appointment.servicios[idx]}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="text-gray-500 font-medium text-sm">{svc?.duracion || 30} min</span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className="font-bold text-gray-800 text-sm">${(svc?.precio || 0).toLocaleString()}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Bottom Section: Observations + Summary */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* Observations */}
              <div className="flex flex-col h-full">
                <div className="flex items-center space-x-2 text-gray-400 mb-3 ml-2">
                  <MessageCircle className="w-4 h-4" />
                  <h4 className="font-bold text-[10px] tracking-widest">Observaciones</h4>
                </div>
                <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex-1 min-h-[120px]">
                  <p className="text-gray-600 text-sm italic leading-relaxed">
                    {appointment.observaciones || 'Sin observaciones adicionales.'}
                  </p>
                </div>
              </div>

              {/* Summary */}
              <div className="bg-gray-50 rounded-3xl p-8 border border-gray-200 shadow-sm flex flex-col justify-center min-h-[160px]">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold tracking-widest text-pink-700/70">Duración Total</span>
                    <span className="font-bold text-lg text-brand-indigo">{totalDuration} min</span>
                  </div>
                  <div className="h-px bg-gray-50/50 w-full" />
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-black tracking-widest text-pink-800">Total Estimado</span>
                    <span className="font-black text-2xl text-brand-indigo">${totalAmount.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-6 bg-white border-t border-gray-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-8 py-3 bg-gradient-brand text-white rounded-2xl font-bold text-sm shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:scale-95 transition-all"
          >
            Cerrar Detalles
          </button>
        </div>
      </div>
    </div>
  );
}
