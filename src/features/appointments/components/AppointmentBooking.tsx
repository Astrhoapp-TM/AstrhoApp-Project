import React, { useState, useEffect } from 'react';
import {
  Calendar, Clock, User, ChevronLeft, ChevronRight, Plus,
  ArrowLeft, ArrowRight, CheckCircle, X, Save, Scissors,
  Loader2, Star, ShieldCheck, Search, Info, ShoppingBag,
  Wallet, Banknote, ArrowRightLeft, Smartphone, CreditCard, Users
} from 'lucide-react';
import { serviceService } from '@/features/services/services/serviceService';
import { agendaService, empleadoAgendaService, metodoPagoService, servicioAgendaService, type AgendaItem } from '../services/agendaService';
import { userService } from '@/features/users/services/userService';
import { personService } from '@/features/persons/services/personService';
import { horarioEmpleadoService, type HorarioEmpleado } from '@/features/schedule/services/scheduleService';
import { motivoService, type Motivo } from '@/shared/services/motivoService';
import { useServicios, useEmpleados, useClientes } from '../hooks/useBookingData';

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

const buildDateTime = (date: string, time: string): Date => {
  const safeDate = (date || '').split('T')[0];
  const [year, month, day] = safeDate.split('-').map(Number);
  const [hour, minute] = time.split(':').map(Number);
  return new Date(year, month - 1, day, hour, minute);
};

const normalizeDateOnly = (dateValue: string): string => (dateValue || '').split('T')[0];

interface AppointmentBookingProps {
  currentUser?: any;
  onBookingComplete?: (appointment: any) => void;
  onBack?: () => void;
  initialService?: any;
  appointmentToReschedule?: AgendaItem | null;
  isAdminBooking?: boolean;
}

const ProgressHeader = ({ currentStep, isAdminBooking }: { currentStep: number; isAdminBooking?: boolean }) => {
  const steps = isAdminBooking ? [
    { num: 1, label: 'Cliente', icon: Users },
    { num: 2, label: 'Servicios', icon: Scissors },
    { num: 3, label: 'Profesional', icon: User },
    { num: 4, label: 'Confirmación', icon: Calendar }
  ] : [
    { num: 1, label: 'Servicios', icon: Scissors },
    { num: 2, label: 'Profesional', icon: User },
    { num: 3, label: 'Confirmación', icon: Calendar }
  ];

  return (
    <div className="mb-8 relative">
      <div className="flex items-center justify-between max-w-3xl mx-auto relative z-10">
        {steps.map((step, index) => {
          const isActive = currentStep === step.num;
          const isCompleted = currentStep > step.num;
          const Icon = step.icon;

          return (
            <div key={step.num} className="flex flex-col items-center flex-1 relative">
              {/* Line connector */}
              {index < steps.length - 1 && (
                <div className={`absolute top-6 left-1/2 w-full h-1 -z-10 transition-all duration-500 ${
                  currentStep > step.num ? 'bg-gradient-brand' : 'bg-gray-100'
                }`} />
              )}
              
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500 mb-3 shadow-sm ${
                isActive 
                  ? 'bg-gradient-brand text-white shadow-brand-pink/30 shadow-lg scale-110' 
                  : isCompleted
                    ? 'bg-brand-indigo text-white shadow-md'
                    : 'bg-white text-gray-400 border-2 border-gray-100'
              }`}>
                {isCompleted ? <CheckCircle className="w-6 h-6" /> : <Icon className="w-5 h-5" />}
              </div>
              
              <div className={`text-center transition-all duration-300 ${
                isActive ? 'scale-105' : 'opacity-70'
              }`}>
                <span className={`text-[10px] font-black uppercase tracking-widest block mb-1 ${
                  isActive ? 'text-brand-pink' : 'text-gray-400'
                }`}>
                  Paso {step.num}
                </span>
                <span className={`text-sm font-bold ${
                  isActive ? 'text-gray-900' : 'text-gray-500'
                }`}>
                  {step.label}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export function AppointmentBooking({ currentUser, onBookingComplete, onBack, initialService, appointmentToReschedule, isAdminBooking }: AppointmentBookingProps) {
  const [step, setStep] = useState(isAdminBooking ? 0 : 1);
  const [selectedServices, setSelectedServices] = useState<any[]>([]);
  const [selectedProfessional, setSelectedProfessional] = useState<any>(null);
  const [selectedMetodoPago, setSelectedMetodoPago] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState<string>(formatDateToYYYYMMDD(new Date()));
  const [selectedTime, setSelectedTime] = useState<string>('');
  
  // Drag and Drop States
  const [draggedService, setDraggedService] = useState<any>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isDragOverLeft, setIsDragOverLeft] = useState(false);
  
  const { 
    data: services, 
    loading: isLoadingServices, 
    page: servicePage, 
    setPage: setServicePage, 
    search: serviceSearchTerm, 
    setSearch: setServiceSearchTerm,
    totalPages: totalServicePages
  } = useServicios(4);

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

  const { 
    data: clients, 
    loading: isLoadingClients, 
    page: clientPage, 
    setPage: setClientPage, 
    search: clientSearchTerm, 
    setSearch: setClientSearchTerm,
    totalPages: totalClientPages,
    error: clientError
  } = useClientes(6);

  const [selectedClient, setSelectedClient] = useState<any>(null);

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
  const [serviciosCatalogMap, setServiciosCatalogMap] = useState<Map<string, number>>(new Map());

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
        const fetchAllAppointmentsForSchedule = async (): Promise<AgendaItem[]> => {
          const pageSize = 200;
          let page = 1;
          let totalPages = 1;
          const all: AgendaItem[] = [];

          do {
            const response = await agendaService.getAll({ page, pageSize });
            const chunk = Array.isArray(response)
              ? response
              : Array.isArray((response as any)?.data)
              ? (response as any).data
              : [];

            all.push(...chunk);
            totalPages = Array.isArray(response) ? 1 : ((response as any)?.totalPages || 1);
            page += 1;
          } while (page <= totalPages);

          const uniqueById = new Map<number, AgendaItem>();
          all.forEach((apt) => {
            if (apt?.agendaId != null) uniqueById.set(apt.agendaId, apt);
          });
          return [...uniqueById.values()];
        };

        // Individual catch for each promise to avoid Promise.all failing completely
        const [appointmentsData, metodosData, horariosData, motivosData, serviciosCatalogData] = await Promise.all([
          fetchAllAppointmentsForSchedule().catch(err => {
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
          }),
          servicioAgendaService.getAll().catch(err => {
            console.error('Error fetching services catalog for schedule:', err);
            return [];
          }),
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

        const catalogMap = new Map<string, number>();
        if (Array.isArray(serviciosCatalogData)) {
          serviciosCatalogData.forEach((s: any) => {
            const name = (s.nombre || s.Nombre || '').toString().trim();
            const dur = Number(s.duracion ?? s.Duracion ?? 0);
            if (name) catalogMap.set(name, dur > 0 ? dur : 30);
          });
        }
        setServiciosCatalogMap(catalogMap);
        
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
        
        // Fetch client document only if it's a client booking
        if (currentUser && !isAdminBooking) {
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
    const dayName = days[date.getDay()];
    console.log('getDayName called with date:', date, 'returning:', dayName);
    return dayName;
  };
  
  // Helper to safely parse YYYY-MM-DD date string as local date
  const parseLocalDate = (dateString: string): Date => {
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(year, month - 1, day); // month is 0-based
  };

  // Check if professional works on a specific date
  const professionalWorksOn = (professionalId: string, date: Date) => {
    const targetDay = normalizeDayName(getDayName(date));
    console.log('professionalWorksOn:', { professionalId, date, targetDay, horariosEmpleados });
    
    // First check if they have a schedule
    const hasSchedule = horariosEmpleados.some(h => {
      const matches = 
        String(h.documentoEmpleado) === String(professionalId) && 
        normalizeDayName(h.diaSemana) === targetDay;
      if (String(h.documentoEmpleado) === String(professionalId)) {
        console.log('  checking schedule:', { h, diaSemana: h.diaSemana, normalized: normalizeDayName(h.diaSemana), targetDay, matches });
      }
      return matches;
    });
    
    if (hasSchedule) {
      console.log('professionalWorksOn result:', true);
      return true;
    }
    
    // Check if this is a super admin (or any professional without a schedule) - they work every day
    const professional = professionals.find(p => String(p.id) === String(professionalId));
    if (professional) {
      console.log('professionalWorksOn: No schedule found for professional, treating as available every day:', professional);
      return true;
    }
    
    console.log('professionalWorksOn result:', false);
    return false;
  };

  // Get time slots for professional on a specific date
  const getTimeSlotsForDate = (professionalId: string, date: Date) => {
    const targetDay = normalizeDayName(getDayName(date));
    console.log('getTimeSlotsForDate called with:', { 
      professionalId, 
      date, 
      targetDay, 
      horariosEmpleadosCount: horariosEmpleados.length 
    });
    
    const schedules = horariosEmpleados.filter(h => {
      const matches = 
        String(h.documentoEmpleado) === String(professionalId) && 
        normalizeDayName(h.diaSemana) === targetDay;
      
      console.log('Checking horarioEmpleado:', {
        documentoEmpleado: h.documentoEmpleado,
        diaSemana: h.diaSemana,
        normalizedDiaSemana: normalizeDayName(h.diaSemana),
        targetDay,
        matches
      });
      
      return matches;
    });

    console.log('Found schedules:', schedules);
    
    // If no schedules found (super admin), use default 8am-10pm schedule
    let finalSchedules = schedules;
    if (schedules.length === 0) {
      console.log('getTimeSlotsForDate: No schedules found, using default schedule (8am-10pm)');
      finalSchedules = [{
        horaInicio: '08:00',
        horaFin: '22:00'
      }];
    }

    if (finalSchedules.length === 0) return [];

    // Calculate total duration of selected services (minimum 30 minutes)
    let totalDuration = getTotalDuration();
    if (totalDuration <= 0) totalDuration = 30;

    // Combine slots from all schedules for that day (in case there are multiple shifts)
    const allSlots: string[] = [];
    
    finalSchedules.forEach(schedule => {
      const [startH, startM] = schedule.horaInicio.split(':').map(Number);
      const [endH, endM] = schedule.horaFin.split(':').map(Number);
      
      let currentTotalMinutes = startH * 60 + startM;
      const endTotalMinutes = endH * 60 + endM;

      // Only include slots where slot + totalDuration <= end time
      while (currentTotalMinutes + totalDuration <= endTotalMinutes) {
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

  // Drag and Drop Handlers
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, service: any) => {
    setDraggedService(service);
    // Firefox requires some data to be set for drag to work
    e.dataTransfer.setData('text/plain', service.id.toString());
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handleDragEnd = () => {
    setDraggedService(null);
    setIsDragOver(false);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault(); // Necessary to allow dropping
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (draggedService) {
      setIsDragOver(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    if (draggedService) {
      setSelectedServices(prev => {
        if (!prev.some(s => s.id === draggedService.id)) {
          return [...prev, draggedService];
        }
        return prev;
      });
    }
  };

  const handleDragOverLeft = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDragEnterLeft = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    // Only highlight if the dragged service is already selected
    if (draggedService && selectedServices.some(s => s.id === draggedService.id)) {
      setIsDragOverLeft(true);
    }
  };

  const handleDragLeaveLeft = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOverLeft(false);
  };

  const handleDropLeft = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOverLeft(false);
    if (draggedService) {
      // If dropped back to the left panel, and it's currently selected, remove it
      if (selectedServices.some(s => s.id === draggedService.id)) {
        toggleServiceSelection(draggedService);
      }
    }
  };

  // Check if time slot is available
  const isTimeSlotAvailable = (date: string, time: string, professionalId: string, duration: number) => {
    console.log('isTimeSlotAvailable called with:', { date, time, professionalId, duration });
    
    const appointments = existingAppointments.filter(apt =>
      normalizeDateOnly(apt.fechaCita) === date && String(apt.documentoEmpleado) === String(professionalId)
    );

    const [hours, minutes] = time.split(':').map(Number);
    const slotStart = hours * 60 + minutes;
    const slotEnd = slotStart + (duration > 0 ? duration : 30);
    const slotStartDate = buildDateTime(date, time);
    const now = new Date();
    const minLead = new Date(now.getTime() + 90 * 60 * 1000);

    // Regla: solo citas futuras y con al menos 1h 30m de anticipación
    if (slotStartDate <= now) {
      console.log('isTimeSlotAvailable false: slotStartDate <= now');
      return false;
    }
    if (slotStartDate < minLead) {
      console.log('isTimeSlotAvailable false: slotStartDate < minLead', { slotStartDate, minLead });
      return false;
    }

    // Check if slot fits within professional's schedule
    const targetDay = normalizeDayName(getDayName(parseLocalDate(date)));
    let schedules = horariosEmpleados.filter(h => 
      String(h.documentoEmpleado) === String(professionalId) && 
      normalizeDayName(h.diaSemana) === targetDay
    );
    
    // If no schedules (super admin), use default 8am-10pm
    if (schedules.length === 0) {
      schedules = [{
        horaFin: '22:00'
      }];
    }
    
    console.log('isTimeSlotAvailable - schedules:', schedules);

    let fitsInSchedule = false;
    for (const schedule of schedules) {
      const [endH, endM] = schedule.horaFin.split(':').map(Number);
      const endTotalMinutes = endH * 60 + endM;
      console.log('isTimeSlotAvailable - checking schedule:', { schedule, slotEnd, endTotalMinutes });
      if (slotEnd <= endTotalMinutes) {
        fitsInSchedule = true;
        break;
      }
    }

    if (!fitsInSchedule) {
      console.log('isTimeSlotAvailable false: !fitsInSchedule');
      return false;
    }

    // Solo citas canceladas liberan espacio.
    const NON_BLOCKING_STATES = ["cancelado", "cancelled", "canceled"];

    const hasAppointmentOverlap = appointments.some(apt => {
      // Skip only cancelled appointments
      const estadoLower = (apt.estado || "").toLowerCase().trim();
      if (NON_BLOCKING_STATES.includes(estadoLower)) return false;

      const [aptHours, aptMinutes] = apt.horaInicio.split(':').map(Number);
      const aptStart = aptHours * 60 + aptMinutes;
      
      // Compute existing appointment's duration from its services
      let aptDuration = 0;
      for (const svcName of apt.servicios) {
        aptDuration += serviciosCatalogMap.get(svcName) ?? serviciosMap.get(svcName) ?? 30; // fallback 30 min
      }
      if (aptDuration <= 0) aptDuration = 30;

      const aptEnd = aptStart + aptDuration;

      // Overlap: two intervals [a, b) and [c, d) overlap iff a < d && c < b
      return (slotStart < aptEnd && aptStart < slotEnd);
    });

    if (hasAppointmentOverlap) {
      console.log('isTimeSlotAvailable false: hasAppointmentOverlap');
      return false;
    }

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
    
    console.log('isTimeSlotAvailable result:', !hasAbsenceOverlap);
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
      if (normalizeDateOnly(apt.fechaCita) !== date || String(apt.documentoEmpleado) !== String(professionalId)) return false;

      // Skip only cancelled appointments
      const NON_BLOCKING_STATES = ["cancelado", "cancelled", "canceled"];
      const estadoLower = (apt.estado || "").toLowerCase().trim();
      if (NON_BLOCKING_STATES.includes(estadoLower)) return false;

      const [hours, minutes] = time.split(':').map(Number);
      const slotTime = hours * 60 + minutes;

      const [aptHours, aptMinutes] = apt.horaInicio.split(':').map(Number);
      const aptStart = aptHours * 60 + aptMinutes;
      
      let aptDuration = 0;
      for (const svcName of apt.servicios) {
        aptDuration += serviciosCatalogMap.get(svcName) ?? serviciosMap.get(svcName) ?? 30;
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
      alert(isAdminBooking ? 'Por favor, selecciona un cliente para agendar la cita.' : 'No se pudo encontrar tu información de cliente. Por favor, asegúrate de estar registrado correctamente.');
      return;
    }

    setIsBooking(true);
    try {
      const appointmentStartAt = buildDateTime(selectedDate, selectedTime);
      const now = new Date();
      const minLead = new Date(now.getTime() + 90 * 60 * 1000);
      if (appointmentStartAt <= now) {
        alert('La cita debe agendarse en una fecha y hora futura.');
        return;
      }
      if (appointmentStartAt < minLead) {
        alert('Debes agendar con al menos 1 hora y 30 minutos de anticipación.');
        return;
      }

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

  // Step 0: Select Client (Admin Only)
  if (step === 0 && isAdminBooking) {
    return (
      <section className="py-12 bg-gradient-to-br from-pink-50/30 to-purple-50/30 min-h-screen">
        <div className="max-w-[1024px] mx-auto px-4 sm:px-6 lg:px-8">
          {/* X button to close */}
          {onBack && (
            <div className="flex justify-end mb-4">
              <button
                onClick={onBack}
                className="w-10 h-10 bg-white rounded-full shadow-md flex items-center justify-center hover:bg-gray-50 transition-colors"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>
          )}
          
          <ProgressHeader currentStep={1} isAdminBooking={isAdminBooking} />

          <div className="text-center mb-8">
            <h2 className="text-4xl font-bold text-gray-800 mb-4">
              Selecciona el Cliente
            </h2>
            <p className="text-xl text-gray-600">
              Elige al cliente para quien vas a registrar la cita
            </p>
          </div>

          <div className="bg-white rounded-3xl shadow-xl p-8">
            {isLoadingClients ? (
              <div className="flex flex-col items-center justify-center py-20">
                <Loader2 className="w-12 h-12 text-brand-pink animate-spin mb-4" />
                <p className="text-gray-600 font-medium">Buscando clientes disponibles...</p>
              </div>
            ) : (
              <>
                {/* Search Bar for Clients */}
                <div className="mb-8 relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Search className="h-5 w-5 text-gray-400 group-focus-within:text-brand-pink transition-colors" />
                  </div>
                  <input
                    type="text"
                    placeholder="Buscar por nombre o teléfono..."
                    value={clientSearchTerm}
                    onChange={(e) => setClientSearchTerm(e.target.value)}
                    className="block w-full pl-11 pr-4 py-4 bg-gray-50 border-2 border-gray-100 rounded-2xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-periwinkle/300 focus:border-brand-periwinkle focus:bg-white transition-all text-lg"
                  />
                  {clientSearchTerm && (
                    <button 
                      onClick={() => setClientSearchTerm('')}
                      className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-brand-pink"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  )}
                </div>

                {clients.length > 0 ? (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                      {clients.map((client) => (
                        <div
                          key={client.id}
                          onClick={() => {
                            setSelectedClient(client);
                            setClientDocument(client.id);
                            setStep(1);
                          }}
                          className={`p-4 rounded-xl border-2 cursor-pointer transition-all duration-300 hover:shadow-md flex items-center space-x-4 group ${
                            selectedClient?.id === client.id
                              ? 'border-pink-500 bg-gray-50 shadow-md scale-[1.02]'
                              : 'border-gray-100 hover:border-brand-periwinkle bg-white'
                          }`}
                        >
                          <div className="flex-1 min-w-0">
                            <h4 className="font-bold text-gray-800 text-base mb-0.5 truncate group-hover:text-brand-indigo transition-colors">
                              {client.name}
                            </h4>
                            <p className="text-gray-500 text-xs font-medium truncate">
                              {client.phone}
                            </p>
                          </div>
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all ${
                            selectedClient?.id === client.id 
                              ? 'bg-pink-500 text-white rotate-0' 
                              : 'bg-gray-50 text-gray-400 -rotate-45 group-hover:rotate-0 group-hover:bg-gray-100 group-hover:text-brand-pink'
                          }`}>
                            <ArrowRight className="w-4 h-4" />
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Pagination for Clients */}
                    {totalClientPages > 1 && (
                      <div className="flex items-center justify-center space-x-4 mb-8">
                        <button
                          onClick={() => {
                            setClientPage(p => Math.max(1, p - 1));
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
                          disabled={clientPage === 1}
                          className={`p-2 rounded-xl transition-all ${
                            clientPage === 1 
                              ? 'text-gray-300 cursor-not-allowed' 
                              : 'text-brand-pink hover:bg-gray-100'
                          }`}
                        >
                          <ChevronLeft className="w-8 h-8" />
                        </button>
                        
                        <div className="flex items-center space-x-2">
                          {[...Array(totalClientPages)].map((_, i) => (
                            <button
                              key={i}
                              onClick={() => {
                                setClientPage(i + 1);
                                window.scrollTo({ top: 0, behavior: 'smooth' });
                              }}
                              className={`w-10 h-10 rounded-xl font-bold transition-all ${
                                clientPage === i + 1
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
                            setClientPage(p => Math.min(totalClientPages, p + 1));
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
                          disabled={clientPage === totalClientPages}
                          className={`p-2 rounded-xl transition-all ${
                            clientPage === totalClientPages 
                              ? 'text-gray-300 cursor-not-allowed' 
                              : 'text-brand-pink hover:bg-gray-100'
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
                      {clientError ? (
                        <ShieldCheck className="w-10 h-10 text-brand-pink" />
                      ) : (
                        <Search className="w-10 h-10 text-gray-400" />
                      )}
                    </div>
                    {clientError ? (
                      <>
                        <h3 className="text-2xl font-bold text-gray-800 mb-4">Error de Permisos</h3>
                        <p className="text-gray-600 max-w-md mx-auto">No tienes permisos para ver la lista de clientes.</p>
                      </>
                    ) : (
                      <>
                        <h3 className="text-2xl font-bold text-gray-800 mb-4">No se encontraron clientes</h3>
                        <p className="text-gray-600">Prueba con otro nombre o teléfono.</p>
                        <button 
                          onClick={() => setClientSearchTerm('')}
                          className="mt-6 text-brand-indigo font-bold hover:underline"
                        >
                          Ver todos los clientes
                        </button>
                      </>
                    )}
                  </div>
                )}
              </>
            )}

            <div className="flex justify-between items-center">
              {onBack && (
                <button
                  onClick={onBack}
                  className="flex items-center space-x-2 text-gray-600 hover:text-gray-800 font-semibold"
                >
                  <ArrowLeft className="w-5 h-5" />
                  <span>Cancelar</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </section>
    );
  }

  // Step 1: Select Services
  if (step === 1) {
    return (
      <section className="py-12 bg-gradient-to-br from-pink-50/30 to-purple-50/30 min-h-screen">
        <div className="max-w-[1024px] mx-auto px-4 sm:px-6">
          {/* X button to close */}
          {onBack && (
            <div className="flex justify-end mb-4">
              <button
                onClick={onBack}
                className="w-10 h-10 bg-white rounded-full shadow-md flex items-center justify-center hover:bg-gray-50 transition-colors"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>
          )}
          
          <ProgressHeader currentStep={step + (isAdminBooking ? 1 : 0)} isAdminBooking={isAdminBooking} />

          <div className="text-center mb-8">
            <h2 className="text-3xl font-black text-gray-900 mb-2 tracking-tight">
              Selecciona tus <span className="text-transparent bg-clip-text bg-gradient-brand">Servicios</span>
            </h2>
            <p className="text-base text-gray-600 font-medium">
              Elige los servicios que deseas para tu próxima cita
            </p>
          </div>

          <div className="bg-white rounded-[2rem] shadow-2xl shadow-pink-100/10 border border-gray-100 p-6 sm:p-10">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
              {/* Left Panel: Services */}
              <div 
                className={`md:border-r border-black/10 md:pr-5 space-y-6 transition-all duration-300 rounded-2xl ${isDragOverLeft ? 'bg-gray-50/50 ring-4 ring-brand-periwinkle/30 scale-[1.01] p-2' : ''}`}
                onDragOver={handleDragOverLeft}
                onDragEnter={handleDragEnterLeft}
                onDragLeave={handleDragLeaveLeft}
                onDrop={handleDropLeft}
              >
                <div className="flex items-center space-x-3 mb-6">
                  <div className="w-9 h-9 bg-gray-50 text-brand-pink rounded-xl flex items-center justify-center">
                    <Scissors className="w-5 h-5" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900">Servicios</h3>
                </div>

                {isLoadingServices ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <div className="relative">
                      <div className="w-16 h-16 border-4 border-gray-200 border-t-pink-500 rounded-full animate-spin" />
                      <Scissors className="w-6 h-6 text-brand-pink absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                    </div>
                    <p className="mt-4 text-gray-500 font-semibold">Buscando servicios...</p>
                  </div>
                ) : services.length > 0 ? (
                  <>
                    <div className="relative group mb-6">
                      <Search className="absolute left-[20px] top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-brand-pink transition-colors" />
                      <input
                        type="text"
                        placeholder="¿Qué servicio buscas?"
                        value={serviceSearchTerm}
                        onChange={(e) => setServiceSearchTerm(e.target.value)}
                        className="w-full pl-11 pr-4 py-2.5 bg-gray-50 border-2 border-transparent focus:border-brand-periwinkle focus:bg-white rounded-xl outline-none transition-all text-gray-700 font-medium text-xs"
                      />
                    </div>

                    <div className="flex flex-col space-y-2 mb-6 pr-2">
                      {services.map((service) => {
                        const isSelected = selectedServices.some(s => s.id === service.id);
                        
                        // Si el servicio ya está seleccionado (arrastrado a la derecha), lo ocultamos de la izquierda
                        if (isSelected) return null;

                        return (
                          <div
                            key={service.id}
                            draggable={!isSelected}
                            onDragStart={(e) => handleDragStart(e, service)}
                            onDragEnd={handleDragEnd}
                            onClick={() => toggleServiceSelection(service)}
                            className={`group p-3 rounded-xl border-2 transition-all duration-300 flex items-center justify-between ${
                              isSelected
                                ? 'border-pink-500 bg-gray-50/50 ring-4 ring-pink-500/10 shadow-md shadow-pink-200/20 cursor-default'
                                : 'border-gray-50 bg-white hover:border-gray-200 hover:shadow-sm cursor-grab active:cursor-grabbing'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                                isSelected ? 'bg-pink-500 text-white' : 'bg-gray-50 text-brand-pink group-hover:bg-gray-100'
                              }`}>
                                <Scissors className="w-3.5 h-3.5" />
                              </div>
                              <div className="min-w-0">
                                <h4 className={`font-bold text-sm leading-tight truncate transition-colors ${
                                  isSelected ? 'text-pink-900' : 'text-gray-800'
                                }`}>
                                  {service.name}
                                </h4>
                                <div className="flex items-center text-[10px] text-gray-500 font-medium mt-0.5">
                                  <Clock className="w-3 h-3 mr-1 opacity-60" />
                                  {service.duration} min
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-3 ml-4">
                              <div className={`font-black text-sm ${
                                isSelected ? 'text-brand-indigo' : 'text-gray-900'
                              }`}>
                                ${service.price.toLocaleString()}
                              </div>
                              <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${
                                isSelected ? 'bg-pink-500 border-pink-500' : 'border-gray-200 group-hover:border-brand-periwinkle'
                              }`}>
                                {isSelected && <CheckCircle className="w-3 h-3 text-white" />}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {totalServicePages > 1 && (
                      <div className="flex items-center justify-center space-x-2">
                        <button
                          onClick={() => setServicePage(p => Math.max(1, p - 1))}
                          disabled={servicePage === 1}
                          className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 transition-all"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                        <div className="flex space-x-1.5">
                          {[...Array(totalServicePages)].map((_, i) => (
                            <button
                              key={i}
                              onClick={() => setServicePage(i + 1)}
                              className={`min-w-[32px] h-8 px-2 rounded-lg font-bold text-xs transition-all ${
                                servicePage === i + 1 ? 'bg-pink-500 text-white shadow-sm' : 'text-gray-400 hover:bg-gray-50'
                              }`}
                            >
                              {i + 1}
                            </button>
                          ))}
                        </div>
                        <button
                          onClick={() => setServicePage(p => Math.min(totalServicePages, p + 1))}
                          disabled={servicePage === totalServicePages}
                          className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 transition-all"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Search className="w-8 h-8 text-gray-300" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-800">No hay servicios</h3>
                    <p className="text-sm text-gray-500">Prueba con otra búsqueda</p>
                  </div>
                )}
              </div>

              {/* Right Panel: Payment + Summary */}
              <div className="md:pl-5 space-y-10">
                {/* Payment Methods */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center space-x-3 shrink-0">
                    <div className="w-8 h-8 bg-blue-50 text-blue-500 rounded-xl flex items-center justify-center">
                      <CreditCard className="w-4 h-4" />
                    </div>
                    <h3 className="text-base font-bold text-gray-900">Método de Pago</h3>
                  </div>

                  <div className="flex bg-gray-100/80 p-1 rounded-xl shadow-inner w-full sm:w-auto">
                    {metodosPago.map((metodo) => {
                      const id = metodo.metodopagoId || metodo.metodoPagoId;
                      const isSelected = (selectedMetodoPago?.metodopagoId || selectedMetodoPago?.metodoPagoId) === id;
                      const isCash = metodo.nombre.toLowerCase().includes('efectivo') || metodo.nombre.toLowerCase().includes('cash');
                      
                      return (
                        <button
                          key={id}
                          onClick={() => setSelectedMetodoPago(metodo)}
                          className={`flex-1 sm:flex-none relative flex items-center justify-center gap-2 py-2 px-4 rounded-lg font-bold text-xs transition-all duration-300 ${
                            isSelected 
                              ? 'text-brand-indigo shadow-md bg-white scale-[1.02] z-10' 
                              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'
                          }`}
                        >
                          {isCash ? <Banknote className="w-4 h-4 shrink-0" /> : <ArrowRightLeft className="w-4 h-4 shrink-0" />}
                          <span className="truncate max-w-[100px] sm:max-w-none">{metodo.nombre}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Summary and Navigation */}
                <div className="border-t border-gray-100 pt-10 space-y-6">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-gray-50 text-brand-violet rounded-xl flex items-center justify-center">
                      <ShoppingBag className="w-4 h-4" />
                    </div>
                    <h3 className="text-base font-bold text-gray-900">Resumen</h3>
                  </div>
                  
                  <div 
                    onDragOver={handleDragOver}
                    onDragEnter={handleDragEnter}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`transition-all duration-300 rounded-2xl ${
                      isDragOver ? 'ring-4 ring-brand-periwinkle/50 bg-brand-periwinkle/10 scale-[1.02]' : ''
                    }`}
                  >
                  {selectedServices.length > 0 ? (
                    <div className="space-y-6">
                      <div className="bg-gray-50/50 rounded-2xl p-4 space-y-3">
                        <div className="space-y-2 pr-1">
                          {selectedServices.map((service) => (
                            <div 
                              key={service.id} 
                              draggable={true}
                              onDragStart={(e) => handleDragStart(e, service)}
                              onDragEnd={handleDragEnd}
                              className="flex justify-between items-center text-xs group p-1 rounded hover:bg-gray-100/50 cursor-grab active:cursor-grabbing transition-colors"
                            >
                              <div className="flex items-center gap-2 pr-2 min-w-0">
                                <div className="w-1.5 h-1.5 rounded-full bg-pink-400 shrink-0" />
                                <span className="font-bold text-gray-800 truncate">{service.name}</span>
                              </div>
                              <div className="flex items-center gap-3 shrink-0">
                                <span className="text-gray-500 font-medium">{service.duration} min</span>
                                <span className="font-bold text-gray-900">${service.price.toLocaleString()}</span>
                                <button
                                  onClick={(e) => { e.stopPropagation(); toggleServiceSelection(service); }}
                                  className="p-1 hover:bg-white rounded-lg transition-colors"
                                >
                                  <X className="w-3 h-3 text-brand-pink" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>

                        <div className="pt-3 border-t border-gray-200/50 space-y-2">
                          <div className="flex justify-between items-center text-[10px] font-medium text-gray-500">
                            <span>Tiempo estimado</span>
                            <span className="text-gray-900 font-bold">{getTotalDuration()} min</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-bold text-gray-900">Total</span>
                            <p className="text-xl font-black text-transparent bg-clip-text bg-gradient-brand">
                              ${getTotalPrice().toLocaleString()}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-row items-center justify-between gap-4 mt-5">
                        {onBack && !isAdminBooking && (
                          <button
                            onClick={onBack}
                            className="flex-1 border-2 border-gray-200 text-gray-500 py-3 rounded-xl font-bold text-sm hover:bg-gray-50 transition-all flex items-center justify-center gap-2"
                          >
                            <ArrowLeft className="w-4 h-4" />
                            <span>Volver</span>
                          </button>
                        )}
                        {isAdminBooking && (
                          <button
                            onClick={() => setStep(0)}
                            className="flex-1 border-2 border-gray-200 text-gray-500 py-3 rounded-xl font-bold text-sm hover:bg-gray-50 transition-all flex items-center justify-center gap-2"
                          >
                            <ArrowLeft className="w-4 h-4" />
                            <span>Cliente</span>
                          </button>
                        )}
                        <button
                          onClick={() => setStep(2)}
                          className="flex-1 bg-gradient-brand text-white py-3 rounded-xl font-bold text-sm shadow-md hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                        >
                          <span>Continuar</span>
                          <ArrowRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className={`py-10 text-center rounded-2xl border-2 border-dashed transition-colors ${
                      isDragOver ? 'border-brand-periwinkle bg-brand-periwinkle/10' : 'bg-gray-50/50 border-gray-200'
                    }`}>
                      <ShoppingBag className={`w-8 h-8 mx-auto mb-3 ${isDragOver ? 'text-brand-periwinkle' : 'text-gray-300'}`} />
                      <p className={`text-sm font-medium ${isDragOver ? 'text-brand-indigo' : 'text-gray-400'}`}>
                        {isDragOver ? 'Suelta el servicio aquí' : 'Arrastra los servicios aquí o haz clic en ellos'}
                      </p>
                    </div>
                  )}
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </section>
    );
  }


  // Step 2: Select Professional
  if (step === 2) {
    return (
      <section className="py-12 bg-gradient-to-br from-pink-50/30 to-purple-50/30 min-h-screen">
        <div className="max-w-[1024px] mx-auto px-4 sm:px-6 lg:px-8">
          {/* X button to close */}
          {onBack && (
            <div className="flex justify-end mb-4">
              <button
                onClick={onBack}
                className="w-10 h-10 bg-white rounded-full shadow-md flex items-center justify-center hover:bg-gray-50 transition-colors"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>
          )}
          
          <ProgressHeader currentStep={step + (isAdminBooking ? 1 : 0)} isAdminBooking={isAdminBooking} />

          <div className="text-center mb-8">
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
                <Loader2 className="w-12 h-12 text-brand-pink animate-spin mb-4" />
                <p className="text-gray-600 font-medium">Buscando profesionales disponibles...</p>
              </div>
            ) : (
              <>
                {/* Search Bar for Professionals */}
                <div className="mb-8 relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Search className="h-5 w-5 text-gray-400 group-focus-within:text-brand-pink transition-colors" />
                  </div>
                  <input
                    type="text"
                    placeholder="Buscar por nombre o especialidad..."
                    value={professionalSearchTerm}
                    onChange={(e) => setProfessionalSearchTerm(e.target.value)}
                    className="block w-full pl-11 pr-4 py-4 bg-gray-50 border-2 border-gray-100 rounded-2xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-periwinkle/300 focus:border-brand-periwinkle focus:bg-white transition-all text-lg"
                  />
                  {professionalSearchTerm && (
                    <button 
                      onClick={() => setProfessionalSearchTerm('')}
                      className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-brand-pink"
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
                              ? 'border-pink-500 bg-gray-50 shadow-md scale-[1.02]'
                              : 'border-gray-100 hover:border-brand-periwinkle bg-white'
                          }`}
                        >
                          <div className="flex-1 min-w-0">
                            <h4 className="font-bold text-gray-800 text-base mb-0.5 truncate group-hover:text-brand-indigo transition-colors">
                              {professional.name}
                            </h4>
                            <p className="text-gray-500 text-xs font-medium truncate">
                              {professional.role}
                            </p>
                          </div>
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all ${
                            selectedProfessional?.id === professional.id 
                              ? 'bg-pink-500 text-white rotate-0' 
                              : 'bg-gray-50 text-gray-400 -rotate-45 group-hover:rotate-0 group-hover:bg-gray-100 group-hover:text-brand-pink'
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
                              : 'text-brand-pink hover:bg-gray-100'
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
                              : 'text-brand-pink hover:bg-gray-100'
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
                        <ShieldCheck className="w-10 h-10 text-brand-pink" />
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
                          className="mt-6 text-brand-indigo font-bold hover:underline"
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
    console.log('Step 3 - selectedProfessional:', selectedProfessional);
    return (
      <section className="py-12 bg-gradient-to-br from-pink-50/30 to-purple-50/30 min-h-screen">
        <div className="max-w-[1024px] mx-auto px-4 sm:px-6 lg:px-8">
          {/* X button to close */}
          {onBack && (
            <div className="flex justify-end mb-4">
              <button
                onClick={onBack}
                className="w-10 h-10 bg-white rounded-full shadow-md flex items-center justify-center hover:bg-gray-50 transition-colors"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>
          )}
          
          <ProgressHeader currentStep={step + (isAdminBooking ? 1 : 0)} isAdminBooking={isAdminBooking} />

          <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-8 bg-white/50 p-6 rounded-3xl border border-white shadow-sm backdrop-blur-sm">
            <div className="text-center md:text-left">
              <h2 className="text-3xl font-black text-gray-800 mb-1 tracking-tight">
                Selecciona Fecha y Hora
              </h2>
              <p className="text-base text-gray-600 font-medium">
                Disponibilidad para <span className="font-bold text-brand-indigo">{selectedProfessional?.name}</span>
              </p>
            </div>

            <button
              onClick={() => setStep(2)}
              className="flex items-center space-x-2 px-5 py-2.5 bg-white border-2 border-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-50 hover:border-brand-periwinkle hover:text-brand-indigo transition-all shadow-sm group shrink-0"
            >
              <ArrowLeft className="w-4 h-4 text-gray-400 group-hover:text-brand-indigo transition-colors" />
              <span>Cambiar Profesional</span>
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
                      className="px-6 py-2 bg-white border-2 border-brand-periwinkle text-brand-indigo rounded-xl font-bold hover:bg-gray-100 transition-all shadow-sm"
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
                    const worksToday = selectedProfessional ? professionalWorksOn(selectedProfessional.id, parseLocalDate(dateString)) : true;
                    const isDisabled = isPast || !worksToday;

                    return (
                      <button
                        key={index}
                        onClick={() => !isDisabled && setSelectedDate(dateString)}
                        disabled={isDisabled}
                        className={`group relative p-4 text-center rounded-2xl transition-all duration-300 ${
                          isDisabled 
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed border-transparent' 
                            : isActive 
                              ? 'bg-pink-500 text-white shadow-xl scale-110 z-10 cursor-pointer' 
                              : 'bg-gray-50 text-gray-700 hover:bg-gray-100 hover:text-brand-indigo cursor-pointer'
                        }`}
                      >
                        <div className={`text-[10px] font-black uppercase tracking-widest mb-1 ${isActive ? 'text-white/90' : 'text-gray-400 group-hover:text-brand-pink'}`}>
                          {date.toLocaleDateString('es-ES', { weekday: 'short' })}
                        </div>
                        <div className="text-2xl font-black">
                          {date.getDate()}
                        </div>
                        {isToday && !isActive && (
                          <div className="absolute top-2 right-2 w-2 h-2 bg-pink-500 rounded-full ring-4 ring-pink-100"></div>
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
                      <Clock className="w-6 h-6 text-brand-pink mr-2" />
                      Horarios para el {new Date(selectedDate + 'T00:00:00').toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
                    </h4>
                    <p className="text-gray-500 text-sm font-semibold">Selecciona la hora de inicio de tu cita</p>
                  </div>
                  <div className="hidden sm:flex items-center space-x-6 text-xs font-bold uppercase tracking-widest">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-white border-2 border-gray-200 rounded-sm"></div>
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
                    console.log('Rendering time slots:', { selectedDate, selectedProfessional, totalDuration: getTotalDuration() });
                    const currentSlots = selectedProfessional 
                      ? getTimeSlotsForDate(selectedProfessional.id, parseLocalDate(selectedDate))
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
                            <div className="w-full h-16 bg-gray-50 rounded-2xl flex flex-col items-center justify-center text-red-400 border-2 border-red-100 cursor-not-allowed opacity-60">
                              <span className="text-lg font-black">{formatTo12Hour(time)}</span>
                              <span className="text-[9px] font-black uppercase tracking-tighter">Ausente</span>
                            </div>
                          ) : (
                            <button
                              onClick={() => isAvailable && handleTimeSlotClick(selectedDate, time)}
                              disabled={!isAvailable}
                              className={`w-full h-16 rounded-2xl text-lg font-black transition-all flex flex-col items-center justify-center border-2 ${
                                isAvailable
                                  ? 'bg-white border-gray-200 text-brand-indigo hover:border-pink-500 hover:bg-gray-100 hover:shadow-lg hover:-translate-y-1'
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
          </div>
        </div>

        {/* Booking Confirmation Modal */}
        {showBookingModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4 transition-all duration-300">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden transform transition-all duration-500 ease-out animate-in fade-in zoom-in-95 slide-in-from-bottom-10">
              <div className="bg-gradient-brand p-8 text-white">
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

              <div className="p-8 flex-1 overflow-y-auto">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-6">
                  <div className="flex items-start space-x-4 bg-gray-50/50 p-4 rounded-2xl border border-gray-100">
                    <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center shrink-0">
                      <Calendar className="w-5 h-5 text-brand-indigo" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Fecha y Hora</p>
                      <p className="font-bold text-gray-800 capitalize leading-tight">
                        {new Date(selectedDate + 'T00:00:00').toLocaleDateString('es-ES', {
                          weekday: 'long',
                          day: 'numeric',
                          month: 'long'
                        })}
                      </p>
                      <p className="text-brand-indigo font-black text-lg mt-0.5">a las {selectedTime}</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-4 bg-gray-50/50 p-4 rounded-2xl border border-gray-100">
                    <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center shrink-0">
                      <User className="w-5 h-5 text-brand-indigo" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Profesional</p>
                      <p className="font-bold text-gray-800 text-base">{selectedProfessional?.name}</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-4 bg-gray-50/50 p-4 rounded-2xl border border-gray-100">
                    <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center shrink-0">
                      <ShoppingBag className="w-5 h-5 text-brand-indigo" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Método de Pago</p>
                      <p className="font-bold text-gray-800 text-base">{selectedMetodoPago?.nombre || 'No seleccionado'}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-2xl p-6 border-2 border-gray-100">
                      <p className="text-[10px] font-black text-brand-indigo uppercase tracking-widest mb-4">Servicios a Realizar</p>
                      <div className="space-y-3">
                        {selectedServices.map((service) => (
                          <div key={service.id} className="flex justify-between items-center bg-white p-3 rounded-xl border border-gray-50 shadow-sm">
                            <span className="text-sm font-bold text-gray-800">{service.name}</span>
                            <span className="text-sm font-black text-brand-indigo">${service.price.toLocaleString()}</span>
                          </div>
                        ))}
                        <div className="pt-4 border-t-2 border-dashed border-gray-200 flex justify-between items-center mt-4">
                          <span className="font-black text-brand-indigo uppercase tracking-tighter">Total</span>
                          <span className="font-black text-brand-indigo text-3xl">${getTotalPrice().toLocaleString()}</span>
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
                    className="flex-1 bg-gradient-brand text-white px-4 py-4 rounded-2xl font-bold hover:shadow-xl transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
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
          {/* X button to close */}
          {onBack && (
            <div className="flex justify-end mb-4">
              <button
                onClick={onBack}
                className="w-10 h-10 bg-white rounded-full shadow-md flex items-center justify-center hover:bg-gray-50 transition-colors"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>
          )}
          
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
              <span className="text-brand-pink font-bold">¡Te esperamos pronto!</span>
            </p>

            <div className="bg-gradient-to-br from-pink-50 to-purple-50 rounded-3xl p-8 mb-10 text-left border border-gray-200/50">
              <h4 className="font-black text-gray-800 mb-6 uppercase tracking-widest text-sm">Resumen de la Cita</h4>
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-4 border-b border-gray-200/50">
                  <span className="text-brand-indigo font-black uppercase tracking-widest text-[10px]">Profesional</span>
                  <span className="font-black text-gray-800">{selectedProfessional?.name}</span>
                </div>
                <div className="flex items-center justify-between pb-4 border-b border-gray-200/50">
                  <span className="text-brand-indigo font-black uppercase tracking-widest text-[10px]">Fecha</span>
                  <span className="font-black text-gray-800 capitalize">
                    {new Date(selectedDate + 'T00:00:00').toLocaleDateString('es-ES', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long'
                    })}
                  </span>
                </div>
                <div className="flex items-center justify-between pb-4 border-b border-gray-200/50">
                  <span className="text-brand-indigo font-black uppercase tracking-widest text-[10px]">Hora</span>
                  <span className="font-black text-brand-indigo text-xl">{formatTo12Hour(selectedTime)}</span>
                </div>
                <div className="py-2">
                  <span className="text-brand-indigo font-black text-[10px] uppercase tracking-widest mb-3 block">Servicios Agendados</span>
                  <div className="space-y-2">
                    {selectedServices.map(s => (
                      <div key={s.id} className="flex justify-between items-center bg-white/50 p-2 rounded-xl border border-gray-200/30">
                        <span className="text-sm font-bold text-gray-800">{s.name}</span>
                        <span className="text-xs font-black text-brand-indigo">${s.price.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex items-center justify-between pt-4 border-t-2 border-gray-200 mt-2">
                  <span className="text-brand-indigo font-black uppercase tracking-tighter">Total Pagado</span>
                  <span className="font-black text-gray-900 text-3xl">${getTotalPrice().toLocaleString()}</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
              <button
                onClick={resetBooking}
                className="flex-1 bg-gradient-brand text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest hover:shadow-2xl hover:scale-[1.02] transition-all"
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

// Custom Client Search and Select Component
function ClientSearchSelect({ onSelect, selectedDocument, error, disabled }: any) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedClient, setSelectedClient] = useState<any>(null);

  // Load the currently selected client if available
  useEffect(() => {
    const fetchSelected = async () => {
      if (selectedDocument && !selectedClient) {
        try {
          const client = await personService.getPersonByDocument(selectedDocument, 'client');
          // map Backend Person to ClienteAPI structure (expected by onSelect)
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

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (client: any) => {
    setSelectedClient(client);
    setSearchTerm('');
    setIsOpen(false);
    onSelect(client);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedClient(null);
    onSelect({ documentoCliente: '' }); // Clear parent
    setTimeout(() => setIsOpen(true), 10);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {selectedClient ? (
        <div 
          onClick={() => !disabled && setIsOpen(true)}
          className={`w-full flex items-center justify-between px-4 py-3 bg-gray-50 border rounded-xl cursor-pointer hover:bg-gray-100 transition-colors ${error ? 'border-red-300' : 'border-gray-200'} ${disabled ? 'opacity-70 pointer-events-none' : ''}`}
        >
          <div className="flex flex-col min-w-0">
            <span className="font-bold text-gray-800 text-sm truncate">{selectedClient.nombre}</span>
            <span className="text-xs text-gray-500 truncate">{selectedClient.documentoCliente} • {selectedClient.telefono}</span>
          </div>
          {!disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1.5 bg-gray-200 hover:bg-red-100 hover:text-red-600 rounded-full transition-colors text-gray-500 shrink-0 ml-2"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      ) : (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            placeholder="Buscar por nombre o cédula..."
            disabled={disabled}
            className={`w-full pl-9 pr-4 py-3 bg-gray-50 border rounded-xl text-sm focus:ring-2 focus:ring-brand-periwinkle/300 focus:border-transparent transition-all outline-none ${error ? 'border-red-300' : 'border-gray-200'} ${disabled ? 'opacity-70 cursor-not-allowed' : ''}`}
          />
          {loading && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
            </div>
          )}
        </div>
      )}

      {isOpen && !disabled && (searchTerm.trim() || searchResults.length > 0) && (
        <div className="absolute z-[60] w-full mt-2 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden animate-in fade-in slide-in-from-top-2">
          <div className="max-h-60 overflow-y-auto">
            {searchResults.length > 0 ? (
              searchResults.map((client) => (
                <div
                  key={client.documentoCliente}
                  onClick={() => handleSelect(client)}
                  className="px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-50 last:border-0 transition-colors"
                >
                  <div className="font-bold text-gray-800 text-sm truncate">{client.nombre}</div>
                  <div className="text-xs text-gray-500 mt-0.5 truncate flex items-center gap-2">
                    <span className="font-medium">{client.documentoCliente}</span>
                    <span>•</span>
                    <span>{client.telefono}</span>
                  </div>
                </div>
              ))
            ) : searchTerm.trim() ? (
              <div className="px-4 py-8 text-center text-gray-500 text-sm">
                <User className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                No se encontraron clientes que coincidan con la búsqueda.
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
