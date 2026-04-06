import React, { useState, useEffect } from 'react';
import {
  Calendar, Clock, User, ChevronLeft, ChevronRight, Plus,
  ArrowLeft, ArrowRight, CheckCircle, X, Save, Scissors,
  Loader2, Star, ShieldCheck, Search, Info, ShoppingBag
} from 'lucide-react';
import { serviceService } from '@/features/services/services/serviceService';
import { agendaService, empleadoAgendaService, metodoPagoService, type AgendaItem } from '../services/agendaService';
import { userService } from '@/features/users/services/userService';
import { horarioEmpleadoService, type HorarioEmpleado } from '@/features/schedule/services/scheduleService';
import { motivoService, type Motivo } from '@/shared/services/motivoService';
import { useServicios, useEmpleados } from '../hooks/useBookingData';

const defaultTimeSlots = [
  '08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30',
  '16:00', '16:30', '17:00', '17:30', '18:00', '18:30', '19:00'
];

/**
 * Formats a Date object to "YYYY-MM-DD" in local time.
 * This avoids timezone shifts that occur with toISOString().
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

interface AppointmentBookingProps {
  currentUser?: any;
  onBookingComplete?: (appointment: any) => void;
  onBack?: () => void;
  initialService?: any;
  appointmentToReschedule?: AgendaItem | null;
}

export function AppointmentBooking({ currentUser, onBookingComplete, onBack, initialService, appointmentToReschedule }: AppointmentBookingProps) {
  const [step, setStep] = useState(1);
  const [selectedServices, setSelectedServices] = useState<any[]>([]);
  const [selectedProfessional, setSelectedProfessional] = useState<any>(null);
  const [selectedMetodoPago, setSelectedMetodoPago] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState<string>(formatDateToYYYYMMDD(new Date()));
  const [selectedTime, setSelectedTime] = useState<string>('');
  
  const { 
    data: services, 
    loading: isLoadingServices, 
    page: servicePage, 
    setPage: setServicePage, 
    search: serviceSearchTerm, 
    setSearch: setServiceSearchTerm,
    totalPages: totalServicePages
  } = useServicios(6);

  const { 
    data: professionals, 
    loading: isLoadingProfessionals, 
    page: professionalPage, 
    setPage: setProfessionalPage, 
    search: professionalSearchTerm, 
    setSearch: setProfessionalSearchTerm,
    totalPages: totalProfessionalPages,
    error: professionalError
  } = useEmpleados(6);

  const [existingAppointments, setExistingAppointments] = useState<AgendaItem[]>([]);
  const [metodosPago, setMetodosPago] = useState<any[]>([]);
  const [horariosEmpleados, setHorariosEmpleados] = useState<HorarioEmpleado[]>([]);
  const [motivos, setMotivos] = useState<Motivo[]>([]);
  const [isBooking, setIsBooking] = useState(false);
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [clientDocument, setClientDocument] = useState<string>('');

  const hasProfessionalPermissionError = professionalError?.includes('403');

  // Service Map for duration lookup
  const [serviciosMap, setServiciosMap] = useState<Map<string, number>>(new Map());

  // Update serviciosMap whenever services change
  useEffect(() => {
    if (services.length > 0) {
      const sMap = new Map<string, number>();
      services.forEach(s => sMap.set(s.name, s.duration));
      setServiciosMap(sMap);
    }
  }, [services]);

  // Initialize data for new booking or reschedule
  useEffect(() => {
    if (appointmentToReschedule && services.length > 0 && professionals.length > 0) {
      // Find full service objects
      const fullServices = appointmentToReschedule.servicios.map(name => 
        services.find(s => s.name.toLowerCase().trim() === name.toLowerCase().trim())
      ).filter(Boolean);
      
      setSelectedServices(fullServices);
      
      // Find professional
      const prof = professionals.find(p => String(p.id) === String(appointmentToReschedule.documentoEmpleado));
      if (prof) setSelectedProfessional(prof);
      
      // Set date and time
      setSelectedDate(appointmentToReschedule.fechaCita.split('T')[0]);
      setSelectedTime(appointmentToReschedule.horaInicio?.substring(0, 5) || '');
      
      // Payment method is handled after metodosPago load
    } else if (initialService && services.length > 0) {
      setSelectedServices([initialService]);
    }
  }, [appointmentToReschedule, initialService, services, professionals]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Individual catch for each promise to avoid Promise.all failing completely
        const [appointmentsData, metodosData, horariosData, motivosData] = await Promise.all([
          agendaService.getAll().catch(err => {
            console.error('Error fetching appointments:', err);
            return [];
          }),
          metodoPagoService.getAll().catch(err => {
            console.error('Error fetching payment methods:', err);
            return [];
          }),
          horarioEmpleadoService.getAll().catch(err => {
            console.error('Error fetching employee schedules:', err);
            return [];
          }),
          motivoService.getAll().catch(err => {
            console.error('Error fetching motives:', err);
            return [];
          })
        ]);

        // Process Motivos
        let motivosArray = [];
        if (Array.isArray(motivosData)) {
          motivosArray = motivosData;
        } else if (motivosData && typeof motivosData === 'object') {
          motivosArray = (motivosData as any).data || (motivosData as any).$values || [];
        }
        setMotivos(motivosArray);

        // Process Schedules
        let horariosArray = [];
        if (Array.isArray(horariosData)) {
          horariosArray = horariosData;
        } else if (horariosData && typeof horariosData === 'object') {
          horariosArray = (horariosData as any).data || (horariosData as any).$values || [];
        }
        setHorariosEmpleados(horariosArray);

        // Process Payment Methods
        let metodosArray = [];
        if (Array.isArray(metodosData)) {
          metodosArray = metodosData;
        } else if (metodosData && typeof metodosData === 'object') {
          metodosArray = (metodosData as any).data || (metodosData as any).$values || [];
        }
        setMetodosPago(metodosArray);
        
        // Initial selected payment method (prefer Cash/Efectivo)
        if (metodosArray.length > 0) {
          let defaultMetodo = null;
          
          if (appointmentToReschedule) {
            defaultMetodo = metodosArray.find((m: any) => 
              (m.nombre || '').toLowerCase().trim() === (appointmentToReschedule.metodoPago || '').toLowerCase().trim()
            );
          }
          
          if (!defaultMetodo) {
            defaultMetodo = metodosArray.find((m: any) => 
              (m.nombre || '').toLowerCase().includes('efectivo') || 
              (m.nombre || '').toLowerCase().includes('cash')
            ) || metodosArray[0];
          }
          
          setSelectedMetodoPago(defaultMetodo);
        }

        setExistingAppointments(Array.isArray(appointmentsData) ? appointmentsData : (appointmentsData as any)?.$values || (appointmentsData as any)?.data || []);
        
        // Fetch client document
        if (currentUser) {
          const person = await userService.getPersonForUser(currentUser);
          if (person) {
            setClientDocument(person.documentId);
          }
        }
      } catch (error) {
        console.error('Error fetching data for booking:', error);
      }
    };
    fetchData();
  }, [currentUser]);

  // Get current week dates
  const getWeekDates = (date: Date) => {
    const week = [];
    const startOfWeek = new Date(date);
    const dayOfWeek = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // Adjust for Monday start
    startOfWeek.setDate(diff);

    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      week.push(day);
    }
    return week;
  };

  const weekDates = getWeekDates(currentWeek);

  const goToPreviousWeek = () => {
    const newWeek = new Date(currentWeek);
    newWeek.setDate(currentWeek.getDate() - 7);
    setCurrentWeek(newWeek);
  };

  const goToNextWeek = () => {
    const newWeek = new Date(currentWeek);
    newWeek.setDate(currentWeek.getDate() + 7);
    setCurrentWeek(newWeek);
  };

  const goToToday = () => {
    setCurrentWeek(new Date());
    setSelectedDate(formatDateToYYYYMMDD(new Date()));
  };

  // Helper to normalize day names (lowercase and remove accents)
  const normalizeDayName = (day: string) => {
    if (!day) return '';
    return day.toLowerCase()
      .trim()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  };

  // Helper to get day name in Spanish (normalized)
  const getDayName = (date: Date) => {
    const days = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
    return days[date.getDay()];
  };

  // Check if professional works on a specific date
  const professionalWorksOn = (professionalId: string, date: Date) => {
    const targetDay = getDayName(date);
    return horariosEmpleados.some(h => 
      String(h.documentoEmpleado) === String(professionalId) && 
      normalizeDayName(h.diaSemana) === targetDay
    );
  };

  // Get time slots for professional on a specific date
  const getTimeSlotsForDate = (professionalId: string, date: Date) => {
    const targetDay = getDayName(date);
    const schedules = horariosEmpleados.filter(h => 
      String(h.documentoEmpleado) === String(professionalId) && 
      normalizeDayName(h.diaSemana) === targetDay
    );

    if (schedules.length === 0) return [];

    // Combine slots from all schedules for that day (in case there are multiple shifts)
    const allSlots: string[] = [];
    
    schedules.forEach(schedule => {
      const [startH, startM] = schedule.horaInicio.split(':').map(Number);
      const [endH, endM] = schedule.horaFin.split(':').map(Number);
      
      let currentTotalMinutes = startH * 60 + startM;
      const endTotalMinutes = endH * 60 + endM;

      while (currentTotalMinutes < endTotalMinutes) {
        const h = Math.floor(currentTotalMinutes / 60);
        const m = currentTotalMinutes % 60;
        const timeStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
        if (!allSlots.includes(timeStr)) {
          allSlots.push(timeStr);
        }
        currentTotalMinutes += 30; // 30 min steps
      }
    });

    return allSlots.sort();
  };

  // Calculate total duration and price
  const getTotalDuration = () => {
    return selectedServices.reduce((total, service) => total + service.duration, 0);
  };

  const getTotalPrice = () => {
    return selectedServices.reduce((total, service) => total + service.price, 0);
  };

  // Toggle service selection
  const toggleServiceSelection = (service: any) => {
    setSelectedServices(prev => {
      const isSelected = prev.some(s => s.id === service.id);
      if (isSelected) {
        return prev.filter(s => s.id !== service.id);
      } else {
        return [...prev, service];
      }
    });
  };

  // Check if time slot is available
  const isTimeSlotAvailable = (date: string, time: string, professionalId: string, duration: number) => {
    const appointments = existingAppointments.filter(apt =>
      apt.fechaCita === date && String(apt.documentoEmpleado) === String(professionalId)
    );

    const [hours, minutes] = time.split(':').map(Number);
    const slotStart = hours * 60 + minutes;
    const slotEnd = slotStart + duration;

    // Check salon closing time (example: 20:00)
    if (slotEnd > 20 * 60) return false;

    // States that do NOT block the schedule (freed slots)
    const NON_BLOCKING_STATES = ["cancelado", "cancelled", "sin agendar", "sin_agendar"];

    const hasAppointmentOverlap = appointments.some(apt => {
      // Skip cancelled / unscheduled appointments
      const estadoLower = (apt.estado || "").toLowerCase().trim();
      if (NON_BLOCKING_STATES.includes(estadoLower)) return false;

      const [aptHours, aptMinutes] = apt.horaInicio.split(':').map(Number);
      const aptStart = aptHours * 60 + aptMinutes;
      
      // Compute existing appointment's duration from its services
      let aptDuration = 0;
      for (const svcName of apt.servicios) {
        aptDuration += serviciosMap.get(svcName) ?? 30; // fallback 30 min
      }
      if (aptDuration <= 0) aptDuration = 30;

      const aptEnd = aptStart + aptDuration;

      // Overlap: two intervals [a, b) and [c, d) overlap iff a < d && c < b
      return (slotStart < aptEnd && aptStart < slotEnd);
    });

    if (hasAppointmentOverlap) return false;

    // Check absence motives (ALL motives block the schedule, regardless of state)
    const activeMotivos = motivos.filter(m => 
      m.fecha.split('T')[0] === date && 
      String(m.documentoEmpleado) === String(professionalId)
    );

    const hasAbsenceOverlap = activeMotivos.some(m => {
      const [mStartH, mStartM] = m.horaInicio.split(':').map(Number);
      const [mEndH, mEndM] = m.horaFin.split(':').map(Number);
      
      const mStart = mStartH * 60 + mStartM;
      const mEnd = mEndH * 60 + mEndM;

      // Rule: unavailable if slot overlaps with [mStart, mEnd)
      return (slotStart < mEnd && mStart < slotEnd);
    });

    return !hasAbsenceOverlap;
  };

  // Get absence motive for specific slot
  const getAbsenceForSlot = (date: string, time: string, professionalId: string) => {
    return motivos.find(m => {
      if (m.fecha.split('T')[0] !== date || String(m.documentoEmpleado) !== String(professionalId)) return false;

      const [hours, minutes] = time.split(':').map(Number);
      const slotTime = hours * 60 + minutes;

      const [mStartH, mStartM] = m.horaInicio.split(':').map(Number);
      const [mEndH, mEndM] = m.horaFin.split(':').map(Number);
      
      const mStart = mStartH * 60 + mStartM;
      const mEnd = mEndH * 60 + mEndM;

      // Rule: unavailable if: hora >= motivo.horaInicio AND hora < motivo.horaFin
      return slotTime >= mStart && slotTime < mEnd;
    });
  };

  // Get appointment for specific slot
  const getAppointmentForSlot = (date: string, time: string, professionalId: string) => {
    return existingAppointments.find(apt => {
      if (apt.fechaCita !== date || String(apt.documentoEmpleado) !== String(professionalId)) return false;

      // Skip cancelled / unscheduled appointments
      const NON_BLOCKING_STATES = ["cancelado", "cancelled", "sin agendar", "sin_agendar"];
      const estadoLower = (apt.estado || "").toLowerCase().trim();
      if (NON_BLOCKING_STATES.includes(estadoLower)) return false;

      const [hours, minutes] = time.split(':').map(Number);
      const slotTime = hours * 60 + minutes;

      const [aptHours, aptMinutes] = apt.horaInicio.split(':').map(Number);
      const aptStart = aptHours * 60 + aptMinutes;
      
      let aptDuration = 0;
      for (const svcName of apt.servicios) {
        aptDuration += serviciosMap.get(svcName) ?? 30;
      }
      if (aptDuration <= 0) aptDuration = 30;
      
      const aptEnd = aptStart + aptDuration;

      return slotTime >= aptStart && slotTime < aptEnd;
    });
  };

  const handleTimeSlotClick = (date: string, time: string) => {
    if (!selectedProfessional || selectedServices.length === 0) return;

    const totalDuration = getTotalDuration();
    if (isTimeSlotAvailable(date, time, selectedProfessional.id, totalDuration)) {
      setSelectedDate(date);
      setSelectedTime(time);
      setShowBookingModal(true);
    }
  };

  const handleBookingConfirm = async () => {
    if (!selectedProfessional || !selectedDate || !selectedTime) {
      alert('Información incompleta para agendar la cita.');
      return;
    }

    if (!clientDocument) {
      alert('No se pudo encontrar tu información de cliente. Por favor, asegúrate de estar registrado correctamente.');
      return;
    }

    setIsBooking(true);
    try {
      // Use selected payment method ID
      const finalMetodoPagoId = selectedMetodoPago?.metodopagoId || selectedMetodoPago?.metodoPagoId || 1;

      // Ensure all IDs are numbers and match the API's expectation (HH:mm:ss)
      const bookingData = {
        agendaId: appointmentToReschedule?.agendaId || 0,
        documentoCliente: String(clientDocument),
        documentoEmpleado: String(selectedProfessional.id),
        fechaCita: selectedDate,
        horaInicio: selectedTime.length === 5 ? `${selectedTime}:00` : selectedTime,
        metodoPagoId: Number(finalMetodoPagoId),
        observaciones: appointmentToReschedule 
          ? `Reprogramada: ${appointmentToReschedule.observaciones || ''}`
          : 'Cita agendada desde la web por el cliente.',
        serviciosIds: selectedServices.map(s => Number(s.id))
      };

      console.log('Attempting to process appointment with data:', bookingData);

      if (appointmentToReschedule) {
        await agendaService.update(appointmentToReschedule.agendaId, bookingData);
      } else {
        await agendaService.create(bookingData);
      }
      
      if (onBookingComplete) {
        onBookingComplete({
          services: selectedServices,
          professional: selectedProfessional.name,
          date: selectedDate,
          time: selectedTime,
          price: getTotalPrice()
        });
      }

      setShowBookingModal(false);
      setStep(4); // Success step is now 4
    } catch (error: any) {
      console.error('Error creating appointment details:', error);
      
      // Attempt to extract a more user-friendly message if possible
      let friendlyMessage = 'Error desconocido al procesar la solicitud.';
      if (error.message) {
        if (error.message.includes('400')) friendlyMessage = 'Los datos de la cita no son válidos (400).';
        else if (error.message.includes('401')) friendlyMessage = 'Sesión expirada. Por favor, vuelve a iniciar sesión.';
        else if (error.message.includes('403')) friendlyMessage = 'No tienes permisos para realizar esta acción.';
        else if (error.message.includes('404')) friendlyMessage = 'Recurso no encontrado en el servidor.';
        else if (error.message.includes('500')) friendlyMessage = 'Error interno del servidor (500).';
        else friendlyMessage = error.message;
      }
      
      alert(`Hubo un error al agendar tu cita: ${friendlyMessage}`);
    } finally {
      setIsBooking(false);
    }
  };

  const resetBooking = () => {
    setSelectedServices([]);
    setSelectedProfessional(null);
    setSelectedDate('');
    setSelectedTime('');
    setStep(1);
    
    // Reset to default payment method (Efectivo if available)
    if (metodosPago.length > 0) {
      const defaultMetodo = metodosPago.find((m: any) => 
        (m.nombre || '').toLowerCase().includes('efectivo') || 
        (m.nombre || '').toLowerCase().includes('cash')
      ) || metodosPago[0];
      setSelectedMetodoPago(defaultMetodo);
    }
  };

  // Step 1: Select Services
  if (step === 1) {
    return (
      <section className="py-20 bg-gradient-to-br from-pink-50/30 to-purple-50/30 min-h-screen">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Progress Header */}
          <div className="mb-12">
            <div className="flex items-center justify-between max-w-2xl mx-auto">
              {[1, 2, 3].map((num) => (
                <div key={num} className="flex items-center flex-1 last:flex-none">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all ${
                    step >= num ? 'bg-pink-500 text-white shadow-lg scale-110' : 'bg-gray-200 text-gray-500'
                  }`}>
                    {step > num ? <CheckCircle className="w-6 h-6" /> : num}
                  </div>
                  {num < 3 && (
                    <div className={`h-1 flex-1 mx-4 rounded ${
                      step > num ? 'bg-pink-500' : 'bg-gray-200'
                    }`} />
                  )}
                </div>
              ))}
            </div>
            <div className="flex justify-between max-w-2xl mx-auto mt-2 text-xs font-semibold text-gray-500">
              <span className="text-pink-600">SERVICIOS</span>
              <span>PROFESIONAL</span>
              <span>FECHA Y HORA</span>
            </div>
          </div>

          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-800 mb-4">
              Selecciona tus Servicios
            </h2>
            <p className="text-xl text-gray-600">
              Puedes elegir uno o varios servicios para tu cita
            </p>
          </div>

          <div className="bg-white rounded-3xl shadow-xl p-8">
            {isLoadingServices ? (
              <div className="flex flex-col items-center justify-center py-20">
                <Loader2 className="w-12 h-12 text-pink-500 animate-spin mb-4" />
                <p className="text-gray-600 font-medium">Cargando servicios disponibles...</p>
              </div>
            ) : services.length > 0 ? (
              <>
                {/* Search Bar for Services */}
                <div className="mb-8 relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Search className="h-5 w-5 text-gray-400 group-focus-within:text-pink-500 transition-colors" />
                  </div>
                  <input
                    type="text"
                    placeholder="Buscar servicios por nombre, descripción o categoría..."
                    value={serviceSearchTerm}
                    onChange={(e) => setServiceSearchTerm(e.target.value)}
                    className="block w-full pl-11 pr-4 py-4 bg-gray-50 border-2 border-gray-100 rounded-2xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-300 focus:border-pink-300 focus:bg-white transition-all text-lg"
                  />
                  {serviceSearchTerm && (
                    <button 
                      onClick={() => setServiceSearchTerm('')}
                      className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-pink-500"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  )}
                </div>

                {services.length > 0 ? (
                  <div className="grid md:grid-cols-2 gap-6 mb-8">
                    {services.map((service) => {
                      const isSelected = selectedServices.some(s => s.id === service.id);
                      return (
                        <div
                          key={service.id}
                          onClick={() => toggleServiceSelection(service)}
                          className={`p-6 rounded-2xl border-2 cursor-pointer transition-all duration-300 hover:shadow-lg ${isSelected
                            ? 'border-pink-500 bg-pink-50 shadow-lg scale-105'
                            : 'border-gray-200 hover:border-pink-300'
                            }`}
                        >
                          <div className="flex items-start space-x-4">
                            <div className="mt-1">
                              <div className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-all ${isSelected
                                ? 'bg-pink-500 border-pink-500'
                                : 'border-gray-300'
                                }`}>
                                {isSelected && <CheckCircle className="w-5 h-5 text-white" />}
                              </div>
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center space-x-3 mb-3">
                                <div className={`w-10 h-10 ${service.color} rounded-full flex items-center justify-center`}>
                                  <Clock className="w-5 h-5 text-white" />
                                </div>
                                <h4 className="font-bold text-gray-800 text-lg">{service.name}</h4>
                              </div>
                              <div className="flex items-center justify-between text-sm text-gray-600">
                                <span className="flex items-center space-x-1">
                                  <Clock className="w-4 h-4" />
                                  <span>{service.duration} min</span>
                                </span>
                                <span className="font-bold text-pink-600 text-lg">
                                  ${service.price.toLocaleString()}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-12 bg-gray-50 rounded-2xl mb-8">
                    <Search className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500 font-medium">No se encontraron servicios que coincidan con tu búsqueda</p>
                  </div>
                )}

                {/* Pagination for Services */}
                {totalServicePages > 1 && (
                  <div className="flex items-center justify-center space-x-4 mb-8">
                    <button
                      onClick={() => {
                        setServicePage(p => Math.max(1, p - 1));
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      disabled={servicePage === 1}
                      className={`p-2 rounded-xl transition-all ${
                        servicePage === 1 
                          ? 'text-gray-300 cursor-not-allowed' 
                          : 'text-pink-500 hover:bg-pink-50'
                      }`}
                    >
                      <ChevronLeft className="w-8 h-8" />
                    </button>
                    
                    <div className="flex items-center space-x-2">
                      {[...Array(totalServicePages)].map((_, i) => (
                        <button
                          key={i}
                          onClick={() => {
                            setServicePage(i + 1);
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
                          className={`w-10 h-10 rounded-xl font-bold transition-all ${
                            servicePage === i + 1
                              ? 'bg-pink-500 text-white shadow-md'
                              : 'text-gray-500 hover:bg-gray-100'
                          }`}
                        >
                          {i + 1}
                        </button>
                      ))}
                    </div>

                    <button
                      onClick={() => {
                        setServicePage(p => Math.min(totalServicePages, p + 1));
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      disabled={servicePage === totalServicePages}
                      className={`p-2 rounded-xl transition-all ${
                        servicePage === totalServicePages 
                          ? 'text-gray-300 cursor-not-allowed' 
                          : 'text-pink-500 hover:bg-pink-50'
                      }`}
                    >
                      <ChevronRight className="w-8 h-8" />
                    </button>
                  </div>
                )}

                {/* Payment Method Selection */}
                <div className="mb-10 border-t border-gray-100 pt-10">
                  <div className="flex items-center space-x-3 mb-6">
                    <div className="w-10 h-10 bg-blue-500 rounded-2xl flex items-center justify-center text-white shadow-lg">
                      <Info className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-black text-gray-800 leading-none mb-1">Método de Pago</h3>
                      <p className="text-gray-500 font-bold uppercase tracking-widest text-xs">¿Cómo prefieres pagar tu cita?</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {metodosPago.map((metodo) => {
                      const isSelected = selectedMetodoPago?.metodopagoId === (metodo.metodopagoId || metodo.metodoPagoId);
                      return (
                        <div
                          key={metodo.metodopagoId || metodo.metodoPagoId}
                          onClick={() => setSelectedMetodoPago(metodo)}
                          className={`p-4 rounded-2xl border-2 cursor-pointer transition-all duration-300 flex flex-col items-center text-center space-y-2 ${isSelected
                            ? 'border-blue-500 bg-blue-50 shadow-md scale-105'
                            : 'border-gray-100 hover:border-blue-200 bg-gray-50/50'
                            }`}
                        >
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isSelected ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-400'}`}>
                            <ShoppingBag className="w-5 h-5" />
                          </div>
                          <span className={`text-sm font-black ${isSelected ? 'text-blue-700' : 'text-gray-600'}`}>
                            {metodo.nombre}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-20">
                <div className="w-20 h-20 bg-pink-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Scissors className="w-10 h-10 text-pink-500" />
                </div>
                <h3 className="text-2xl font-bold text-gray-800 mb-4">No hay servicios disponibles</h3>
                <p className="text-gray-600">Lo sentimos, no pudimos cargar los servicios en este momento.</p>
              </div>
            )}

            {/* Selected Services Summary */}
            {selectedServices.length > 0 && (
              <div className="bg-gradient-to-r from-pink-50 to-purple-50 rounded-2xl p-6 mb-6">
                <h4 className="font-bold text-gray-800 mb-4">Resumen de Servicios Seleccionados</h4>
                <div className="space-y-2 mb-4">
                  {selectedServices.map((service, index) => (
                    <div key={service.id} className="flex justify-between items-center text-sm">
                      <span className="text-gray-700">{index + 1}. {service.name}</span>
                      <span className="text-gray-600">{service.duration} min • ${service.price.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
                <div className="border-t border-pink-200 pt-3 flex justify-between items-center">
                  <div>
                    <span className="text-gray-600">Duración Total: </span>
                    <span className="font-bold text-gray-800">{getTotalDuration()} min</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Precio Total: </span>
                    <span className="font-bold text-pink-600 text-xl">${getTotalPrice().toLocaleString()}</span>
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-between items-center">
              {onBack && (
                <button
                  onClick={onBack}
                  className="flex items-center space-x-2 text-gray-600 hover:text-gray-800 font-semibold"
                >
                  <ArrowLeft className="w-5 h-5" />
                  <span>Volver a Mis Citas</span>
                </button>
              )}

              {selectedServices.length > 0 && (
                <button
                  onClick={() => setStep(2)}
                  className="ml-auto bg-gradient-to-r from-pink-400 to-purple-500 text-white px-8 py-3 rounded-xl font-semibold hover:shadow-lg transition-all flex items-center space-x-2"
                >
                  <span>Continuar</span>
                  <ArrowRight className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>
        </div>
      </section>
    );
  }

  // Step 2: Select Professional
  if (step === 2) {
    return (
      <section className="py-20 bg-gradient-to-br from-pink-50/30 to-purple-50/30 min-h-screen">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Progress Header */}
          <div className="mb-12">
            <div className="flex items-center justify-between max-w-2xl mx-auto">
              {[1, 2, 3].map((num) => (
                <div key={num} className="flex items-center flex-1 last:flex-none">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all ${
                    step >= num ? 'bg-pink-500 text-white shadow-lg scale-110' : 'bg-gray-200 text-gray-500'
                  }`}>
                    {step > num ? <CheckCircle className="w-6 h-6" /> : num}
                  </div>
                  {num < 3 && (
                    <div className={`h-1 flex-1 mx-4 rounded ${
                      step > num ? 'bg-pink-500' : 'bg-gray-200'
                    }`} />
                  )}
                </div>
              ))}
            </div>
            <div className="flex justify-between max-w-2xl mx-auto mt-2 text-xs font-semibold text-gray-500">
              <span className="text-pink-600">SERVICIOS</span>
              <span className="text-pink-600">PROFESIONAL</span>
              <span>FECHA Y HORA</span>
            </div>
          </div>

          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-800 mb-4">
              Selecciona a tu Profesional
            </h2>
            <p className="text-xl text-gray-600">
              Elige al estilista que te atenderá
            </p>
          </div>

          <div className="bg-white rounded-3xl shadow-xl p-8">
            {isLoadingProfessionals ? (
              <div className="flex flex-col items-center justify-center py-20">
                <Loader2 className="w-12 h-12 text-pink-500 animate-spin mb-4" />
                <p className="text-gray-600 font-medium">Buscando profesionales disponibles...</p>
              </div>
            ) : (
              <>
                {/* Search Bar for Professionals */}
                <div className="mb-8 relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Search className="h-5 w-5 text-gray-400 group-focus-within:text-pink-500 transition-colors" />
                  </div>
                  <input
                    type="text"
                    placeholder="Buscar por nombre o especialidad..."
                    value={professionalSearchTerm}
                    onChange={(e) => setProfessionalSearchTerm(e.target.value)}
                    className="block w-full pl-11 pr-4 py-4 bg-gray-50 border-2 border-gray-100 rounded-2xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-300 focus:border-pink-300 focus:bg-white transition-all text-lg"
                  />
                  {professionalSearchTerm && (
                    <button 
                      onClick={() => setProfessionalSearchTerm('')}
                      className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-pink-500"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  )}
                </div>

                {professionals.length > 0 ? (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                      {professionals.map((professional) => (
                        <div
                          key={professional.id}
                          onClick={() => {
                            setSelectedProfessional(professional);
                            setStep(3);
                          }}
                          className={`p-4 rounded-xl border-2 cursor-pointer transition-all duration-300 hover:shadow-md flex items-center space-x-4 group ${
                            selectedProfessional?.id === professional.id
                              ? 'border-pink-500 bg-pink-50 shadow-md scale-[1.02]'
                              : 'border-gray-100 hover:border-pink-200 bg-white'
                          }`}
                        >
                          <div className="flex-1 min-w-0">
                            <h4 className="font-bold text-gray-800 text-base mb-0.5 truncate group-hover:text-pink-600 transition-colors">
                              {professional.name}
                            </h4>
                            <p className="text-gray-500 text-xs font-medium truncate">
                              {professional.role}
                            </p>
                          </div>
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all ${
                            selectedProfessional?.id === professional.id 
                              ? 'bg-pink-500 text-white rotate-0' 
                              : 'bg-gray-50 text-gray-400 -rotate-45 group-hover:rotate-0 group-hover:bg-pink-100 group-hover:text-pink-500'
                          }`}>
                            <ArrowRight className="w-4 h-4" />
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Pagination for Professionals */}
                    {totalProfessionalPages > 1 && (
                      <div className="flex items-center justify-center space-x-4 mb-8">
                        <button
                          onClick={() => {
                            setProfessionalPage(p => Math.max(1, p - 1));
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
                          disabled={professionalPage === 1}
                          className={`p-2 rounded-xl transition-all ${
                            professionalPage === 1 
                              ? 'text-gray-300 cursor-not-allowed' 
                              : 'text-pink-500 hover:bg-pink-50'
                          }`}
                        >
                          <ChevronLeft className="w-8 h-8" />
                        </button>
                        
                        <div className="flex items-center space-x-2">
                          {[...Array(totalProfessionalPages)].map((_, i) => (
                            <button
                              key={i}
                              onClick={() => {
                                setProfessionalPage(i + 1);
                                window.scrollTo({ top: 0, behavior: 'smooth' });
                              }}
                              className={`w-10 h-10 rounded-xl font-bold transition-all ${
                                professionalPage === i + 1
                                  ? 'bg-pink-500 text-white shadow-md'
                                  : 'text-gray-500 hover:bg-gray-100'
                              }`}
                            >
                              {i + 1}
                            </button>
                          ))}
                        </div>

                        <button
                          onClick={() => {
                            setProfessionalPage(p => Math.min(totalProfessionalPages, p + 1));
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
                          disabled={professionalPage === totalProfessionalPages}
                          className={`p-2 rounded-xl transition-all ${
                            professionalPage === totalProfessionalPages 
                              ? 'text-gray-300 cursor-not-allowed' 
                              : 'text-pink-500 hover:bg-pink-50'
                          }`}
                        >
                          <ChevronRight className="w-8 h-8" />
                        </button>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-20 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
                    <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                      {hasProfessionalPermissionError ? (
                        <ShieldCheck className="w-10 h-10 text-red-500" />
                      ) : (
                        <Search className="w-10 h-10 text-gray-400" />
                      )}
                    </div>
                    {hasProfessionalPermissionError ? (
                      <>
                        <h3 className="text-2xl font-bold text-gray-800 mb-4">Error de Permisos</h3>
                        <p className="text-gray-600 max-w-md mx-auto">No tienes permisos para ver la lista de profesionales. Por favor, contacta con el administrador para habilitar el acceso de clientes a los empleados.</p>
                      </>
                    ) : (
                      <>
                        <h3 className="text-2xl font-bold text-gray-800 mb-4">No se encontraron profesionales</h3>
                        <p className="text-gray-600">Prueba con otro nombre o especialidad.</p>
                        <button 
                          onClick={() => setProfessionalSearchTerm('')}
                          className="mt-6 text-pink-600 font-bold hover:underline"
                        >
                          Ver todos los profesionales
                        </button>
                      </>
                    )}
                  </div>
                )}
              </>
            )}

            <div className="flex justify-between items-center">
              <button
                onClick={() => setStep(1)}
                className="flex items-center space-x-2 text-gray-600 hover:text-gray-800 font-semibold"
              >
                <ArrowLeft className="w-5 h-5" />
                <span>Volver a Servicios</span>
              </button>
            </div>
          </div>
        </div>
      </section>
    );
  }

  // Step 3: Select Date and Time
  if (step === 3) {
    return (
      <section className="py-20 bg-gradient-to-br from-pink-50/30 to-purple-50/30 min-h-screen">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Progress Header */}
          <div className="mb-12">
            <div className="flex items-center justify-between max-w-2xl mx-auto">
              {[1, 2, 3].map((num) => (
                <div key={num} className="flex items-center flex-1 last:flex-none">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all ${
                    step >= num ? 'bg-pink-500 text-white shadow-lg scale-110' : 'bg-gray-200 text-gray-500'
                  }`}>
                    {step > num ? <CheckCircle className="w-6 h-6" /> : num}
                  </div>
                  {num < 3 && (
                    <div className={`h-1 flex-1 mx-4 rounded ${
                      step > num ? 'bg-pink-500' : 'bg-gray-200'
                    }`} />
                  )}
                </div>
              ))}
            </div>
            <div className="flex justify-between max-w-2xl mx-auto mt-2 text-xs font-semibold text-gray-500">
              <span className="text-pink-600">SERVICIOS</span>
              <span className="text-pink-600">PROFESIONAL</span>
              <span className="text-pink-600">FECHA Y HORA</span>
            </div>
          </div>

          <div className="text-center mb-8">
            <h2 className="text-4xl font-bold text-gray-800 mb-4">
              Selecciona Fecha y Hora
            </h2>
            <p className="text-xl text-gray-600">
              Disponibilidad para <span className="font-bold text-pink-600">{selectedProfessional?.name}</span>
            </p>
          </div>

          {/* Change Professional Button - Now at the top */}
          <div className="flex justify-center mb-10">
            <button
              onClick={() => setStep(2)}
              className="flex items-center space-x-3 px-8 py-3 bg-white border-2 border-pink-100 text-pink-600 rounded-2xl font-bold hover:bg-pink-50 hover:border-pink-300 transition-all shadow-sm hover:shadow-md"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Cambiar Profesional ({selectedProfessional?.name})</span>
            </button>
          </div>

          <div className="space-y-10">
            {/* Calendar Section - Redesigned to Day Selector + Time Slots */}
            <div className="w-full bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100">
              {/* Calendar Header */}
              <div className="p-8 border-b border-gray-100 bg-gradient-to-br from-white to-pink-50/20">
                <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-8">
                  <div className="flex items-center space-x-4">
                    <div className="w-14 h-14 bg-pink-500 rounded-2xl flex items-center justify-center text-white shadow-lg">
                      <Calendar className="w-8 h-8" />
                    </div>
                    <div>
                      <h3 className="text-3xl font-black text-gray-800 capitalize leading-none mb-1">
                        {currentWeek.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
                      </h3>
                      <p className="text-gray-500 font-bold uppercase tracking-widest text-xs">Agenda Semanal</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-4">
                    <button
                      onClick={goToToday}
                      className="px-6 py-2 bg-white border-2 border-pink-200 text-pink-600 rounded-xl font-bold hover:bg-pink-50 transition-all shadow-sm"
                    >
                      Hoy
                    </button>
                    <div className="flex items-center space-x-2 bg-gray-100/50 p-1.5 rounded-2xl">
                      <button
                        onClick={goToPreviousWeek}
                        className="p-3 text-gray-600 hover:bg-white hover:shadow-md rounded-xl transition-all"
                      >
                        <ChevronLeft className="w-6 h-6" />
                      </button>
                      <button
                        onClick={goToNextWeek}
                        className="p-3 text-gray-600 hover:bg-white hover:shadow-md rounded-xl transition-all"
                      >
                        <ChevronRight className="w-6 h-6" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Date Selector (Horizontal bubbles) */}
                <div className="grid grid-cols-7 gap-3">
                  {weekDates.map((date, index) => {
                    const dateString = formatDateToYYYYMMDD(date);
                    const isActive = selectedDate === dateString;
                    const isToday = date.toDateString() === new Date().toDateString();
                    const isPast = date < new Date(new Date().setHours(0, 0, 0, 0));
                    const worksToday = selectedProfessional ? professionalWorksOn(selectedProfessional.id, date) : true;
                    const isDisabled = isPast || !worksToday;

                    return (
                      <button
                        key={index}
                        onClick={() => !isDisabled && setSelectedDate(dateString)}
                        disabled={isDisabled}
                        className={`group relative p-4 text-center rounded-2xl transition-all duration-300 ${
                          isDisabled ? 'opacity-30 cursor-not-allowed grayscale' : 'cursor-pointer'
                        } ${
                          isActive 
                            ? 'bg-pink-500 text-white shadow-xl scale-110 z-10' 
                            : 'bg-gray-50 text-gray-700 hover:bg-pink-100 hover:text-pink-600'
                        }`}
                      >
                        <div className={`text-[10px] font-black uppercase tracking-widest mb-1 ${isActive ? 'text-white/90' : 'text-gray-400 group-hover:text-pink-500'}`}>
                          {date.toLocaleDateString('es-ES', { weekday: 'short' })}
                        </div>
                        <div className="text-2xl font-black">
                          {date.getDate()}
                        </div>
                        {isToday && !isActive && (
                          <div className="absolute top-2 right-2 w-2 h-2 bg-pink-500 rounded-full ring-4 ring-pink-100"></div>
                        )}
                        {!worksToday && !isPast && (
                          <div className="absolute -top-1 -right-1 bg-red-100 text-red-600 p-1 rounded-lg text-[8px] font-black uppercase transform rotate-12 shadow-sm border border-red-200">
                            Libre
                          </div>
                        )}
                        {isActive && (
                          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-8 h-1 bg-white rounded-full"></div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Time Slots Area for Selected Day */}
              <div className="p-8 bg-gray-50/30">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h4 className="text-xl font-black text-gray-800 flex items-center">
                      <Clock className="w-6 h-6 text-pink-500 mr-2" />
                      Horarios para el {new Date(selectedDate + 'T00:00:00').toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
                    </h4>
                    <p className="text-gray-500 text-sm font-semibold">Selecciona la hora de inicio de tu cita</p>
                  </div>
                  <div className="hidden sm:flex items-center space-x-6 text-xs font-bold uppercase tracking-widest">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-white border-2 border-pink-100 rounded-sm"></div>
                      <span className="text-gray-400">Disponible</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-gray-200 rounded-sm"></div>
                      <span className="text-gray-400">Ocupado</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {(() => {
                    const currentSlots = selectedProfessional 
                      ? getTimeSlotsForDate(selectedProfessional.id, new Date(selectedDate + 'T00:00:00'))
                      : defaultTimeSlots;

                    if (currentSlots.length === 0) {
                      return (
                        <div className="col-span-full py-10 text-center bg-white rounded-2xl border-2 border-dashed border-gray-100">
                          <p className="text-gray-400 font-bold uppercase tracking-widest text-sm">No hay horarios disponibles para este día</p>
                        </div>
                      );
                    }

                    return currentSlots.map((time) => {
                      const isToday = selectedDate === formatDateToYYYYMMDD(new Date());
                      let isPastTime = false;
                      
                      if (isToday) {
                        const [h, m] = time.split(':').map(Number);
                        const now = new Date();
                        if (h < now.getHours() || (h === now.getHours() && m <= now.getMinutes())) {
                          isPastTime = true;
                        }
                      }

                      const appointment = getAppointmentForSlot(selectedDate, time, selectedProfessional.id);
                      const absence = getAbsenceForSlot(selectedDate, time, selectedProfessional.id);
                      const isAvailable = !isPastTime && !appointment && !absence && isTimeSlotAvailable(selectedDate, time, selectedProfessional.id, getTotalDuration());

                      return (
                        <div key={time} className="relative group">
                          {appointment ? (
                            <div className="w-full h-16 bg-gray-100 rounded-2xl flex items-center justify-center text-gray-400 text-[10px] font-black uppercase cursor-not-allowed border border-dashed border-gray-200 opacity-60">
                              Reservado
                            </div>
                          ) : absence ? (
                            <div className="w-full h-16 bg-red-50 rounded-2xl flex flex-col items-center justify-center text-red-400 border-2 border-red-100 cursor-not-allowed opacity-60">
                              <span className="text-lg font-black">{formatTo12Hour(time)}</span>
                              <span className="text-[9px] font-black uppercase tracking-tighter">Ausente</span>
                            </div>
                          ) : (
                            <button
                              onClick={() => isAvailable && handleTimeSlotClick(selectedDate, time)}
                              disabled={!isAvailable}
                              className={`w-full h-16 rounded-2xl text-lg font-black transition-all flex flex-col items-center justify-center border-2 ${
                                isAvailable
                                  ? 'bg-white border-pink-100 text-pink-600 hover:border-pink-500 hover:bg-pink-50 hover:shadow-lg hover:-translate-y-1'
                                  : 'bg-gray-100/50 text-gray-300 border-transparent cursor-not-allowed opacity-40'
                              }`}
                            >
                              <span>{formatTo12Hour(time)}</span>
                              {isAvailable ? (
                                <span className="text-[9px] font-black opacity-60 uppercase tracking-tighter">Libre</span>
                              ) : (
                                <span className="text-[9px] font-black opacity-60 uppercase tracking-tighter">No disponible</span>
                              )}
                            </button>
                          )}
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>
            </div>

            {/* Selection Summary */}

            {/* Selection Summary - Improved Contrast and Visibility */}
            <div className="bg-white rounded-3xl shadow-2xl border-2 border-pink-100 overflow-hidden relative">
              {/* Top Accent Bar */}
              <div className="h-3 bg-gradient-to-r from-pink-500 via-purple-600 to-pink-600 w-full"></div>
              
              <div className="p-8">
                <div className="flex flex-col lg:flex-row gap-10 items-stretch">
                  {/* Left: Professional Info */}
                  <div className="lg:w-1/4 flex flex-col items-center lg:items-start lg:border-r-2 lg:border-gray-100 lg:pr-8">
                    <h3 className="text-lg font-black text-gray-900 mb-6 flex items-center uppercase tracking-tighter">
                      <ShieldCheck className="w-6 h-6 text-pink-600 mr-2" />
                      Tu Selección
                    </h3>
                    
                    <div className="w-full bg-pink-50 p-4 rounded-2xl border-2 border-pink-100/50 flex flex-col space-y-3">
                      <div className="min-w-0">
                        <p className="text-[10px] font-black text-pink-600 uppercase tracking-widest mb-0.5">Profesional</p>
                        <p className="font-black text-gray-900 text-lg truncate">{selectedProfessional?.name}</p>
                        <p className="text-xs text-gray-500 font-bold truncate">{selectedProfessional?.role}</p>
                      </div>
                      <div className="pt-2 border-t border-pink-100/50">
                        <p className="text-[10px] font-black text-pink-600 uppercase tracking-widest mb-1">Método de Pago</p>
                        <div className="flex items-center space-x-2 bg-white/50 p-2 rounded-xl">
                          <ShoppingBag className="w-4 h-4 text-pink-500" />
                          <span className="text-sm font-bold text-gray-800">{selectedMetodoPago?.nombre || 'No seleccionado'}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Center: Services List */}
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-6">
                      <p className="text-[10px] font-black text-pink-600 uppercase tracking-[0.2em]">Servicios Seleccionados</p>
                      <span className="bg-pink-100/50 text-pink-700 text-[10px] font-black px-2 py-1 rounded-full uppercase border border-pink-200">
                        {selectedServices.length} {selectedServices.length === 1 ? 'Servicio' : 'Servicios'}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[180px] overflow-y-auto pr-2 custom-scrollbar">
                      {selectedServices.map(s => (
                        <div key={s.id} className="flex items-center justify-between bg-gray-50 p-3 rounded-xl border border-gray-200 hover:border-pink-300 transition-all group">
                          <div className="flex items-center space-x-3 min-w-0">
                            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm shrink-0 group-hover:scale-110 transition-transform">
                              <Scissors className="w-4 h-4 text-pink-500" />
                            </div>
                            <span className="text-sm font-black text-gray-800 truncate">{s.name}</span>
                          </div>
                          <span className="text-xs font-black text-pink-600 ml-4 bg-white px-2 py-1 rounded-lg border border-pink-50 shadow-sm shrink-0">
                            ${s.price.toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Right: Totals (High Contrast Light Theme) */}
                  <div className="lg:w-1/4">
                    <div className="h-full bg-gradient-to-br from-gray-50 to-pink-50/30 rounded-2xl p-6 border-2 border-pink-100 shadow-xl flex flex-col justify-center relative overflow-hidden group">
                      {/* Decorative background circle */}
                      <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-pink-500/5 rounded-full blur-2xl group-hover:bg-pink-500/10 transition-colors"></div>
                      
                      <div className="relative z-10 space-y-6">
                        <div className="flex items-center justify-between border-b-2 border-pink-100/50 pb-4">
                          <div className="flex items-center space-x-2">
                            <Clock className="w-5 h-5 text-pink-500" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-pink-600">Duración</span>
                          </div>
                          <span className="text-xl font-black text-gray-900">{getTotalDuration()} min</span>
                        </div>
                        
                        <div className="space-y-1">
                          <p className="text-[10px] font-black text-pink-600 uppercase tracking-[0.3em] mb-1">Total Final</p>
                          <div className="flex items-baseline gap-2">
                            <span className="text-2xl font-black text-pink-500">$</span>
                            <span className="text-5xl font-black text-gray-900 tracking-tighter">
                              {getTotalPrice().toLocaleString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Booking Confirmation Modal */}
        {showBookingModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-300">
              <div className="bg-gradient-to-r from-pink-400 to-purple-500 p-8 text-white">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-2xl font-bold">Confirmar Cita</h3>
                  <button
                    onClick={() => !isBooking && setShowBookingModal(false)}
                    className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <p className="text-pink-100 text-sm">Verifica los detalles antes de confirmar</p>
              </div>

              <div className="p-8">
                <div className="space-y-6">
                  <div className="flex items-start space-x-4">
                    <div className="w-10 h-10 bg-pink-100 rounded-xl flex items-center justify-center shrink-0">
                      <Calendar className="w-5 h-5 text-pink-600" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Fecha y Hora</p>
                      <p className="font-bold text-gray-800 capitalize">
                        {new Date(selectedDate + 'T00:00:00').toLocaleDateString('es-ES', {
                          weekday: 'long',
                          day: 'numeric',
                          month: 'long'
                        })}
                      </p>
                      <p className="text-pink-600 font-black text-lg">a las {selectedTime}</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-4">
                    <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center shrink-0">
                      <User className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Profesional</p>
                      <p className="font-bold text-gray-800">{selectedProfessional?.name}</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-4">
                    <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center shrink-0">
                      <ShoppingBag className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Método de Pago</p>
                      <p className="font-bold text-gray-800">{selectedMetodoPago?.nombre || 'No seleccionado'}</p>
                    </div>
                  </div>

                    <div className="bg-gray-50 rounded-2xl p-6 border-2 border-gray-100">
                      <p className="text-[10px] font-black text-pink-600 uppercase tracking-widest mb-4">Servicios a Realizar</p>
                      <div className="space-y-3">
                        {selectedServices.map((service) => (
                          <div key={service.id} className="flex justify-between items-center bg-white p-3 rounded-xl border border-gray-50 shadow-sm">
                            <span className="text-sm font-bold text-gray-800">{service.name}</span>
                            <span className="text-sm font-black text-pink-600">${service.price.toLocaleString()}</span>
                          </div>
                        ))}
                        <div className="pt-4 border-t-2 border-dashed border-gray-200 flex justify-between items-center mt-4">
                          <span className="font-black text-pink-600 uppercase tracking-tighter">Total</span>
                          <span className="font-black text-pink-600 text-3xl">${getTotalPrice().toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                </div>

                <div className="flex space-x-3 mt-8">
                  <button
                    onClick={() => setShowBookingModal(false)}
                    disabled={isBooking}
                    className="flex-1 px-4 py-4 border-2 border-gray-100 text-gray-500 rounded-2xl font-bold hover:bg-gray-50 transition-colors disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleBookingConfirm}
                    disabled={isBooking}
                    className="flex-1 bg-gradient-to-r from-pink-400 to-purple-500 text-white px-4 py-4 rounded-2xl font-bold hover:shadow-xl transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
                  >
                    {isBooking ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>Agendando...</span>
                      </>
                    ) : (
                      <span>Confirmar Cita</span>
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

  // Step 4: Success
  if (step === 4) {
    return (
      <section className="py-20 bg-gradient-to-br from-pink-50/30 to-purple-50/30 min-h-screen">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-3xl shadow-xl p-8 text-center animate-in zoom-in duration-500">
            <div className="w-24 h-24 bg-gradient-to-r from-green-400 to-emerald-500 rounded-3xl flex items-center justify-center mx-auto mb-8 rotate-3 shadow-lg">
              <CheckCircle className="w-14 h-14 text-white -rotate-3" />
            </div>

            <h2 className="text-4xl font-black text-gray-800 mb-4">
              {appointmentToReschedule ? '¡Cita Reprogramada!' : '¡Todo Listo!'}
            </h2>

            <p className="text-xl text-gray-600 mb-10">
              {appointmentToReschedule 
                ? 'Tu cita ha sido actualizada con éxito. ' 
                : 'Tu cita ha sido agendada con éxito. '}
              <br/>
              <span className="text-pink-500 font-bold">¡Te esperamos pronto!</span>
            </p>

            <div className="bg-gradient-to-br from-pink-50 to-purple-50 rounded-3xl p-8 mb-10 text-left border border-pink-100/50">
              <h4 className="font-black text-gray-800 mb-6 uppercase tracking-widest text-sm">Resumen de la Cita</h4>
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-4 border-b border-pink-100/50">
                  <span className="text-pink-600 font-black uppercase tracking-widest text-[10px]">Profesional</span>
                  <span className="font-black text-gray-800">{selectedProfessional?.name}</span>
                </div>
                <div className="flex items-center justify-between pb-4 border-b border-pink-100/50">
                  <span className="text-pink-600 font-black uppercase tracking-widest text-[10px]">Fecha</span>
                  <span className="font-black text-gray-800 capitalize">
                    {new Date(selectedDate + 'T00:00:00').toLocaleDateString('es-ES', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long'
                    })}
                  </span>
                </div>
                <div className="flex items-center justify-between pb-4 border-b border-pink-100/50">
                  <span className="text-pink-600 font-black uppercase tracking-widest text-[10px]">Hora</span>
                  <span className="font-black text-pink-600 text-xl">{formatTo12Hour(selectedTime)}</span>
                </div>
                <div className="py-2">
                  <span className="text-pink-600 font-black text-[10px] uppercase tracking-widest mb-3 block">Servicios Agendados</span>
                  <div className="space-y-2">
                    {selectedServices.map(s => (
                      <div key={s.id} className="flex justify-between items-center bg-white/50 p-2 rounded-xl border border-pink-100/30">
                        <span className="text-sm font-bold text-gray-800">{s.name}</span>
                        <span className="text-xs font-black text-pink-600">${s.price.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex items-center justify-between pt-4 border-t-2 border-pink-200/30 mt-2">
                  <span className="text-pink-600 font-black uppercase tracking-tighter">Total Pagado</span>
                  <span className="font-black text-gray-900 text-3xl">${getTotalPrice().toLocaleString()}</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
              <button
                onClick={resetBooking}
                className="flex-1 bg-gradient-to-r from-pink-400 to-purple-500 text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest hover:shadow-2xl hover:scale-[1.02] transition-all"
              >
                Nueva Cita
              </button>
              {onBack && (
                <button
                  onClick={onBack}
                  className="flex-1 border-2 border-gray-100 text-gray-500 px-8 py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-gray-50 transition-all"
                >
                  Mis Citas
                </button>
              )}
            </div>
          </div>
        </div>
      </section>
    );
  }

  return null;
}