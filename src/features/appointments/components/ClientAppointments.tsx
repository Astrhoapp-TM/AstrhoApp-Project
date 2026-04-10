import React, { useState, useEffect } from 'react';
import { 
  Calendar, Clock, User, CheckCircle, AlertCircle, XCircle,
  MapPin, Phone, Scissors, ChevronLeft, ChevronRight, Filter,
  Plus, Eye, Edit, MessageCircle, Loader2, X, ShoppingBag, TrendingUp, CheckCircle2, Info, Sparkles
} from 'lucide-react';
import { agendaService, AgendaItem, servicioAgendaService, ServicioAPI, metodoPagoService, MetodoPago } from '../services/agendaService';
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
        const [appointmentsData, servicesData, metodosData] = await Promise.all([
          agendaService.getMisCitas(),
          servicioAgendaService.getAll(),
          metodoPagoService.getAll()
        ]);
        setAppointments(appointmentsData.sort((a, b) => 
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
      case 'confirmed': return 'bg-green-100 text-green-800 border-green-200';
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'completed': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    const normalized = normalizeStatusForFilter(status);
    switch (normalized) {
      case 'confirmed': return <CheckCircle className="w-4 h-4" />;
      case 'pending': return <AlertCircle className="w-4 h-4" />;
      case 'completed': return <CheckCircle className="w-4 h-4" />;
      case 'cancelled': return <XCircle className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
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
      // Find IDs for services and payment method to send full update object if needed
      const serviceIds = appointmentToCancel.servicios.map(name => {
        const svc = services.find(s => s.nombre === name);
        return svc ? svc.servicioId : 0;
      }).filter(id => id > 0);

      const mp = metodosPago.find(m => m.nombre === appointmentToCancel.metodoPago);
      const metodoPagoId = mp ? (mp.metodopagoId || mp.metodoPagoId) : (metodosPago.length > 0 ? (metodosPago[0].metodopagoId || metodosPago[0].metodoPagoId) : 1);

      const payload = {
        agendaId: appointmentToCancel.agendaId,
        documentoCliente: appointmentToCancel.documentoCliente,
        documentoEmpleado: appointmentToCancel.documentoEmpleado,
        fechaCita: appointmentToCancel.fechaCita.split('T')[0],
        horaInicio: appointmentToCancel.horaInicio.length === 5 ? `${appointmentToCancel.horaInicio}:00` : appointmentToCancel.horaInicio,
        metodoPagoId: Number(metodoPagoId),
        observaciones: appointmentToCancel.observaciones || 'Cancelada por el cliente',
        serviciosIds: serviceIds,
        estadoId: 3 // 3 is Cancelado
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
    } catch (error) {
      console.error('Error cancelling appointment:', error);
      toast.error('No se pudo cancelar la cita. Por favor intenta de nuevo.');
    } finally {
      setIsCancelling(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-50/30 to-purple-50/30">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-pink-500 animate-spin mx-auto mb-4" />
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
            className="bg-gradient-to-r from-pink-400 to-purple-500 text-white px-8 py-4 rounded-2xl font-semibold hover:shadow-xl transition-all duration-300 flex items-center space-x-3 mx-auto"
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
                className="px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-pink-300 focus:border-transparent"
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

        {/* Appointments Grid */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-6 border-b border-gray-100">
            <h3 className="text-xl font-bold text-gray-800">Mis Citas</h3>
          </div>

          <div className="p-6">
            {paginatedAppointments.length > 0 ? (
              <div className="grid gap-6">
                {paginatedAppointments.map((appointment) => (
                  <div key={appointment.agendaId} className="border border-gray-200 rounded-2xl p-6 hover:shadow-lg transition-all duration-200">
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                      {/* Appointment Info */}
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <h4 className="text-xl font-bold text-gray-800 mb-2">
                              {appointment.servicios.join(', ')}
                            </h4>
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
                                <span>con {appointment.empleado}</span>
                              </span>
                              <span className="flex items-center space-x-1">
                                <MapPin className="w-4 h-4" />
                                <span>Cll 55 #42-16 Medellín</span>
                              </span>
                            </div>
                            {appointment.observaciones && (
                              <div className="flex items-start space-x-1 text-sm text-gray-600">
                                <MessageCircle className="w-4 h-4 mt-0.5" />
                                <span>{appointment.observaciones}</span>
                              </div>
                            )}
                          </div>
                          
                          <div className="text-right">
                            <div className={`inline-flex items-center space-x-2 px-3 py-1 rounded-full text-sm font-semibold border ${getStatusColor(appointment.estado)}`}>
                              {getStatusIcon(appointment.estado)}
                              <span>{getStatusLabel(appointment.estado)}</span>
                            </div>
                            {/* Metodo de pago si aplica */}
                            <div className="text-sm font-medium text-gray-500 mt-2">
                              {appointment.metodoPago}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex flex-col sm:flex-row gap-3">
                        {(normalizeStatusForFilter(appointment.estado) === 'confirmed' || normalizeStatusForFilter(appointment.estado) === 'pending') && (
                          <>
                            <button 
                              onClick={() => handleCancelClick(appointment)}
                              className="bg-red-50 text-red-600 px-4 py-2 rounded-xl font-bold hover:bg-red-100 transition-all flex items-center justify-center space-x-2 border border-red-100"
                            >
                              <XCircle className="w-4 h-4" />
                              <span>Cancelar Cita</span>
                            </button>
                            
                            <button 
                              onClick={() => onRescheduleAppointment?.(appointment)}
                              className="bg-blue-50 text-blue-600 px-4 py-2 rounded-xl font-bold hover:bg-blue-100 transition-all flex items-center justify-center space-x-2 border border-blue-100"
                            >
                              <Edit className="w-4 h-4" />
                              <span>Reprogramar</span>
                            </button>
                          </>
                        )}
                        
                        <button 
                          onClick={() => handleShowDetails(appointment)}
                          className="bg-purple-50 text-purple-700 px-4 py-2 rounded-xl font-bold hover:bg-purple-100 transition-all flex items-center justify-center space-x-2 border border-purple-100"
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
                  className="bg-gradient-to-r from-pink-400 to-purple-500 text-white px-6 py-3 rounded-xl font-semibold hover:shadow-lg transition-all"
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
                          ? 'bg-gradient-to-r from-pink-400 to-purple-500 text-white'
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
              <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <AlertCircle className="w-10 h-10 text-red-500" />
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
                  className="flex-1 px-6 py-4 bg-red-500 text-white rounded-2xl font-bold shadow-lg shadow-red-200 hover:bg-red-600 hover:-translate-y-0.5 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center"
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
        <div className="bg-gradient-to-r from-pink-500 to-purple-600 p-5 text-white shrink-0 shadow-md z-20">
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
            {/* Status Section */}
            <div className="flex justify-center mb-4">
              <div className={`inline-flex items-center space-x-3 px-6 py-2 rounded-full text-lg font-bold border shadow-sm ${getStatusColor(appointment.estado)}`}>
                {getStatusIcon(appointment.estado)}
                <span>{getStatusLabel(appointment.estado)}</span>
              </div>
            </div>

            {/* Info Cards Row */}
            <div className="grid md:grid-cols-3 gap-4">
              {/* Client/Professional Card */}
              <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                <div className="flex items-center space-x-2 text-pink-500 mb-3">
                  <User className="w-4 h-4" />
                  <h4 className="font-bold uppercase text-[10px] tracking-widest">Profesional</h4>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-pink-100 rounded-full flex items-center justify-center">
                    <User className="w-5 h-5 text-pink-600" />
                  </div>
                  <div>
                    <p className="font-bold text-gray-800">{appointment.empleado}</p>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Especialista</p>
                  </div>
                </div>
              </div>

              {/* Date & Time Card */}
              <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                <div className="flex items-center space-x-2 text-purple-500 mb-3">
                  <Calendar className="w-4 h-4" />
                  <h4 className="font-bold uppercase text-[10px] tracking-widest">Fecha y Hora</h4>
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
                  <p className="text-purple-600 font-bold flex items-center">
                    <Clock className="w-4 h-4 mr-1" />
                    {appointment.horaInicio ? formatTo12Hour(appointment.horaInicio.substring(0, 5)) : '--:--'}
                  </p>
                </div>
              </div>

              {/* Payment Card */}
              <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                <div className="flex items-center space-x-2 text-blue-500 mb-3">
                  <Info className="w-4 h-4" />
                  <h4 className="font-bold uppercase text-[10px] tracking-widest">Información</h4>
                </div>
                <div className="space-y-1">
                  <p className="text-gray-600 text-sm">
                    <span className="font-bold text-gray-400 uppercase text-[10px] mr-1">Método:</span>
                    <span className="font-bold text-gray-800">{appointment.metodoPago || 'No especificado'}</span>
                  </p>
                  <p className="text-gray-600 text-sm">
                    <span className="font-bold text-gray-400 uppercase text-[10px] mr-1">Ubicación:</span>
                    <span className="font-bold text-gray-800">Cll 55 #42-16 Medellín</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Services Table */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-gray-50 flex items-center justify-between bg-gray-50/50">
                <div className="flex items-center space-x-2 text-gray-800">
                  <Scissors className="w-5 h-5 text-pink-500" />
                  <h4 className="font-bold uppercase text-xs tracking-widest">Servicios Contratados</h4>
                </div>
                <span className="bg-pink-100 text-pink-600 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
                  {appointmentServices.length} Item{appointmentServices.length !== 1 ? 's' : ''}
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50/30 text-left">
                      <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Servicio</th>
                      <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Duración</th>
                      <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Precio</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {appointmentServices.map((svc, idx) => (
                      <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-purple-50 rounded-lg flex items-center justify-center">
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
                  <h4 className="font-bold text-[10px] uppercase tracking-widest">Observaciones</h4>
                </div>
                <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex-1 min-h-[120px]">
                  <p className="text-gray-600 text-sm italic leading-relaxed">
                    {appointment.observaciones || 'Sin observaciones adicionales.'}
                  </p>
                </div>
              </div>

              {/* Summary */}
              <div className="bg-pink-50 rounded-3xl p-8 border border-pink-100 shadow-sm flex flex-col justify-center min-h-[160px]">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold uppercase tracking-widest text-pink-700/70">Duración Total</span>
                    <span className="font-bold text-lg text-pink-600">{totalDuration} min</span>
                  </div>
                  <div className="h-px bg-pink-200/50 w-full" />
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-black uppercase tracking-widest text-pink-800">Total Estimado</span>
                    <span className="font-black text-2xl text-pink-600">${totalAmount.toLocaleString()}</span>
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
            className="px-8 py-3 bg-gradient-to-r from-pink-400 to-purple-500 text-white rounded-2xl font-bold text-sm shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:scale-95 transition-all"
          >
            Cerrar Detalles
          </button>
        </div>
      </div>
    </div>
  );
}