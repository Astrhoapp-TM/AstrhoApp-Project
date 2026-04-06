import React, { useState } from 'react';
import { Calendar, Clock, User, Phone, Mail, CheckCircle, ArrowLeft, ArrowRight } from 'lucide-react';

const services = [
  { id: 1, name: 'Corte y Peinado', duration: 45, price: 35000 },
  { id: 2, name: 'Tratamiento Capilar', duration: 60, price: 55000 },
  { id: 3, name: 'Coloración', duration: 120, price: 85000 },
  { id: 4, name: 'Peinado Especial', duration: 90, price: 65000 },
  { id: 5, name: 'Alisado Brasileño', duration: 180, price: 120000 },
  { id: 6, name: 'Manicure & Pedicure', duration: 75, price: 45000 }
];

const timeSlots = [
  '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '12:00', '12:30', '14:00', '14:30', '15:00', '15:30',
  '16:00', '16:30', '17:00', '17:30', '18:00'
];

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

interface AppointmentsProps {
  currentUser: any;
}

export function AppointmentList({ currentUser }: AppointmentsProps) {
  const [step, setStep] = useState(1);
  const [selectedService, setSelectedService] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [customerInfo, setCustomerInfo] = useState({
    name: currentUser?.name || '',
    email: currentUser?.email || '',
    phone: ''
  });
  const [appointments, setAppointments] = useState([
    {
      id: 1,
      service: 'Corte y Peinado',
      date: '2024-01-15',
      time: '10:00',
      customer: 'María García',
      status: 'confirmed'
    },
    {
      id: 2,
      service: 'Tratamiento Capilar',
      date: '2024-01-15',
      time: '14:30',
      customer: 'Ana López',
      status: 'pending'
    }
  ]);

  const generateCalendarDays = () => {
    const today = new Date();
    const days = [];
    
    for (let i = 0; i < 30; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      days.push(date);
    }
    
    return days;
  };

  const calendarDays = generateCalendarDays();

  const handleBookAppointment = () => {
    const newAppointment = {
      id: appointments.length + 1,
      service: selectedService.name,
      date: selectedDate,
      time: selectedTime,
      customer: customerInfo.name,
      status: 'confirmed'
    };
    
    setAppointments([...appointments, newAppointment]);
    setStep(4); // Success step
  };

  const isTimeSlotAvailable = (time: string) => {
    return !appointments.some(apt => 
      apt.date === selectedDate && apt.time === time
    );
  };

  if (currentUser?.role === 'admin') {
    return (
      <section className="py-20 bg-gradient-to-br from-pink-50/30 to-purple-50/30 min-h-screen">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-800 mb-4">
              Panel de Citas - Administrador
            </h2>
            <p className="text-xl text-gray-600">
              Gestiona todas las citas programadas
            </p>
          </div>

          <div className="bg-white rounded-3xl shadow-xl p-8">
            <div className="mb-6">
              <h3 className="text-2xl font-bold text-gray-800 mb-4">Citas de Hoy</h3>
            </div>

            <div className="space-y-4">
              {appointments.map((appointment) => (
                <div
                  key={appointment.id}
                  className="bg-gradient-to-r from-pink-50 to-purple-50 rounded-2xl p-6 border border-pink-200"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-gradient-to-r from-pink-400 to-purple-500 rounded-full flex items-center justify-center">
                        <User className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h4 className="font-bold text-gray-800">{appointment.customer}</h4>
                        <p className="text-gray-600">{appointment.service}</p>
                        <div className="flex items-center space-x-4 text-sm text-gray-500 mt-1">
                          <span className="flex items-center space-x-1">
                            <Calendar className="w-4 h-4" />
                            <span>{appointment.date}</span>
                          </span>
                          <span className="flex items-center space-x-1">
                            <Clock className="w-4 h-4" />
                            <span>{appointment.time}</span>
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        appointment.status === 'confirmed' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {appointment.status === 'confirmed' ? 'Confirmada' : 'Pendiente'}
                      </span>
                      <button className="bg-gradient-to-r from-pink-400 to-purple-500 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:shadow-lg transition-all">
                        Ver Detalles
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-20 bg-gradient-to-br from-pink-50/30 to-purple-50/30 min-h-screen">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-gray-800 mb-4">
            Agendar Cita
          </h2>
          <p className="text-xl text-gray-600">
            Reserva tu cita en simples pasos
          </p>
        </div>

        <div className="bg-white rounded-3xl shadow-xl overflow-hidden">
          {/* Progress Steps */}
          <div className="bg-gradient-to-r from-pink-400 to-purple-500 p-6">
            <div className="flex items-center justify-between">
              {[1, 2, 3, 4].map((stepNumber) => (
                <div key={stepNumber} className="flex items-center">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                    step >= stepNumber 
                      ? 'bg-white text-pink-500' 
                      : 'bg-pink-300 text-white'
                  }`}>
                    {step > stepNumber ? (
                      <CheckCircle className="w-6 h-6" />
                    ) : (
                      stepNumber
                    )}
                  </div>
                  {stepNumber < 4 && (
                    <div className={`w-20 h-1 mx-2 ${
                      step > stepNumber ? 'bg-white' : 'bg-pink-300'
                    }`}></div>
                  )}
                </div>
              ))}
            </div>
            <div className="flex justify-between mt-4 text-white text-sm">
              <span>Servicio</span>
              <span>Fecha</span>
              <span>Datos</span>
              <span>Confirmación</span>
            </div>
          </div>

          <div className="p-8">
            {/* Step 1: Select Service */}
            {step === 1 && (
              <div>
                <h3 className="text-2xl font-bold text-gray-800 mb-6">
                  Selecciona un Servicio
                </h3>
                <div className="grid md:grid-cols-2 gap-4">
                  {services.map((service) => (
                    <div
                      key={service.id}
                      onClick={() => setSelectedService(service)}
                      className={`p-6 rounded-2xl border-2 cursor-pointer transition-all duration-300 ${
                        selectedService?.id === service.id
                          ? 'border-pink-400 bg-gradient-to-r from-pink-50 to-purple-50'
                          : 'border-gray-200 hover:border-pink-300'
                      }`}
                    >
                      <h4 className="font-bold text-gray-800 mb-2">{service.name}</h4>
                      <div className="flex items-center justify-between text-sm text-gray-600">
                        <span className="flex items-center space-x-1">
                          <Clock className="w-4 h-4" />
                          <span>{service.duration} min</span>
                        </span>
                        <span className="font-bold text-pink-600">
                          ${service.price.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex justify-end mt-8">
                  <button
                    onClick={() => setStep(2)}
                    disabled={!selectedService}
                    className="bg-gradient-to-r from-pink-400 to-purple-500 text-white px-8 py-3 rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg transition-all"
                  >
                    Continuar
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Select Date and Time */}
            {step === 2 && (
              <div>
                <h3 className="text-2xl font-bold text-gray-800 mb-6">
                  Selecciona Fecha y Hora
                </h3>
                
                {/* Calendar */}
                <div className="mb-8">
                  <h4 className="font-semibold text-gray-700 mb-4">Fecha</h4>
                  <div className="grid grid-cols-7 gap-2">
                    {calendarDays.slice(0, 21).map((date) => {
                      const dateString = formatDateToYYYYMMDD(date);
                      const isSelected = selectedDate === dateString;
                      const isToday = date.toDateString() === new Date().toDateString();
                      
                      return (
                        <button
                          key={dateString}
                          onClick={() => setSelectedDate(dateString)}
                          className={`p-3 rounded-xl text-center text-sm font-medium transition-all ${
                            isSelected
                              ? 'bg-gradient-to-r from-pink-400 to-purple-500 text-white'
                              : isToday
                              ? 'bg-pink-100 text-pink-700 hover:bg-pink-200'
                              : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                          }`}
                        >
                          <div>{date.getDate()}</div>
                          <div className="text-xs">
                            {date.toLocaleDateString('es', { weekday: 'short' })}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Time Slots */}
                {selectedDate && (
                  <div>
                    <h4 className="font-semibold text-gray-700 mb-4">Hora</h4>
                    <div className="grid grid-cols-4 md:grid-cols-6 gap-3">
                      {timeSlots.map((time) => {
                        const isAvailable = isTimeSlotAvailable(time);
                        const isSelected = selectedTime === time;
                        
                        return (
                          <button
                            key={time}
                            onClick={() => setSelectedTime(time)}
                            disabled={!isAvailable}
                            className={`p-3 rounded-xl text-sm font-medium transition-all ${
                              isSelected
                                ? 'bg-gradient-to-r from-pink-400 to-purple-500 text-white'
                                : isAvailable
                                ? 'bg-gray-50 text-gray-700 hover:bg-pink-50 hover:text-pink-600'
                                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                            }`}
                          >
                            {formatTo12Hour(time)}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="flex justify-between mt-8">
                  <button
                    onClick={() => setStep(1)}
                    className="flex items-center space-x-2 text-gray-600 hover:text-gray-800"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Volver</span>
                  </button>
                  <button
                    onClick={() => setStep(3)}
                    disabled={!selectedDate || !selectedTime}
                    className="bg-gradient-to-r from-pink-400 to-purple-500 text-white px-8 py-3 rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg transition-all"
                  >
                    Continuar
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Customer Information */}
            {step === 3 && (
              <div>
                <h3 className="text-2xl font-bold text-gray-800 mb-6">
                  Información de Contacto
                </h3>
                
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Nombre Completo
                    </label>
                    <input
                      type="text"
                      value={customerInfo.name}
                      onChange={(e) => setCustomerInfo({...customerInfo, name: e.target.value})}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-pink-300 focus:border-transparent"
                      placeholder="Tu nombre completo"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Email
                    </label>
                    <input
                      type="email"
                      value={customerInfo.email}
                      onChange={(e) => setCustomerInfo({...customerInfo, email: e.target.value})}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-pink-300 focus:border-transparent"
                      placeholder="tu@email.com"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Teléfono
                    </label>
                    <input
                      type="tel"
                      value={customerInfo.phone}
                      onChange={(e) => setCustomerInfo({...customerInfo, phone: e.target.value})}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-pink-300 focus:border-transparent"
                      placeholder="300 123 4567"
                    />
                  </div>
                </div>

                {/* Appointment Summary */}
                <div className="mt-8 p-6 bg-gradient-to-r from-pink-50 to-purple-50 rounded-2xl">
                  <h4 className="font-bold text-gray-800 mb-4">Resumen de tu Cita</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Servicio:</span>
                      <span className="font-semibold">{selectedService?.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Fecha:</span>
                      <span className="font-semibold">{selectedDate}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Hora:</span>
                      <span className="font-semibold">{formatTo12Hour(selectedTime)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Duración:</span>
                      <span className="font-semibold">{selectedService?.duration} min</span>
                    </div>
                    <div className="flex justify-between text-lg font-bold text-pink-600 pt-2 border-t border-pink-200">
                      <span>Total:</span>
                      <span>${selectedService?.price.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between mt-8">
                  <button
                    onClick={() => setStep(2)}
                    className="flex items-center space-x-2 text-gray-600 hover:text-gray-800"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Volver</span>
                  </button>
                  <button
                    onClick={handleBookAppointment}
                    disabled={!customerInfo.name || !customerInfo.email || !customerInfo.phone}
                    className="bg-gradient-to-r from-pink-400 to-purple-500 text-white px-8 py-3 rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg transition-all"
                  >
                    Confirmar Cita
                  </button>
                </div>
              </div>
            )}

            {/* Step 4: Confirmation */}
            {step === 4 && (
              <div className="text-center">
                <div className="w-20 h-20 bg-gradient-to-r from-green-400 to-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
                  <CheckCircle className="w-12 h-12 text-white" />
                </div>
                
                <h3 className="text-3xl font-bold text-gray-800 mb-4">
                  ¡Cita Confirmada!
                </h3>
                
                <p className="text-xl text-gray-600 mb-8">
                  Tu cita ha sido agendada exitosamente. Te enviaremos un recordatorio por email.
                </p>
                
                <div className="bg-gradient-to-r from-pink-50 to-purple-50 rounded-2xl p-6 mb-8">
                  <h4 className="font-bold text-gray-800 mb-4">Detalles de tu Cita</h4>
                  <div className="grid md:grid-cols-2 gap-4 text-left">
                    <div>
                      <div className="flex items-center space-x-2 mb-2">
                        <User className="w-5 h-5 text-pink-500" />
                        <span className="font-semibold">Servicio:</span>
                      </div>
                      <p className="text-gray-700 ml-7">{selectedService?.name}</p>
                    </div>
                    <div>
                      <div className="flex items-center space-x-2 mb-2">
                        <Calendar className="w-5 h-5 text-purple-500" />
                        <span className="font-semibold">Fecha y Hora:</span>
                      </div>
                      <p className="text-gray-700 ml-7">{selectedDate} a las {selectedTime}</p>
                    </div>
                  </div>
                </div>
                
                <button
                  onClick={() => {
                    setStep(1);
                    setSelectedService(null);
                    setSelectedDate('');
                    setSelectedTime('');
                  }}
                  className="bg-gradient-to-r from-pink-400 to-purple-500 text-white px-8 py-3 rounded-xl font-semibold hover:shadow-lg transition-all"
                >
                  Agendar Otra Cita
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}