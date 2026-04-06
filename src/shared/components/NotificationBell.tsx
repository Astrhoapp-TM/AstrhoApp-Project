import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Bell, AlertTriangle, ShoppingBag, CheckCircle, X, Calendar, Clock } from 'lucide-react';
import { supplyService } from '@/features/supply/services/supplyService';
import { agendaService } from '@/features/appointments/services/agendaService';

interface Alert {
  id: number | string;
  type: 'warning' | 'info' | 'success';
  message: string;
  action: string;
  time: string;
  icon: any;
  color: string;
  view?: string;
}

interface NotificationBellProps {
  currentUser: any;
}

export function NotificationBell({ currentUser }: NotificationBellProps) {
  const [showNotifications, setShowNotifications] = useState(false);
  const [alerts, setAlerts] = useState<Alert[]>([
    {
      id: 1,
      type: 'warning',
      message: 'Sistema de alertas activo',
      action: 'Configurar',
      time: 'Ahora',
      icon: AlertTriangle,
      color: 'text-yellow-600 bg-yellow-100'
    }
  ]);

  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const loadNotifications = useCallback(async () => {
    if (!currentUser) return;
    
    try {
      const newAlerts: Alert[] = [];

      // 1. Check Low Stock
      const suppliesRes = await supplyService.getSupplies();
      const supplies = suppliesRes.data || [];
      const lowStockItems = supplies.filter((s: any) => s.estado && s.stock <= 5);
      
      if (lowStockItems.length > 0) {
        newAlerts.push({
          id: 'low-stock-' + Date.now(),
          type: 'warning',
          message: `${lowStockItems.length} insumos con stock bajo`,
          action: 'Ver inventario',
          time: 'Ahora',
          icon: AlertTriangle,
          color: 'text-yellow-600 bg-yellow-100',
          view: 'inventario'
        });
      }

      // 2. Check Completed Appointments Today
      const today = new Date().toISOString().split('T')[0];
      const agendaRes = await agendaService.getAll();
      const agenda = agendaRes.data || [];
      const completedToday = agenda.filter(a => 
        a.fechaCita === today && 
        a.estado.toLowerCase() === 'completado'
      );

      if (completedToday.length > 0) {
        newAlerts.push({
          id: 'completed-apt-' + Date.now(),
          type: 'success',
          message: `${completedToday.length} citas completadas hoy`,
          action: 'Ver agenda',
          time: 'Hoy',
          icon: CheckCircle,
          color: 'text-green-600 bg-green-100',
          view: 'agenda'
        });
      }

      // 3. Check Upcoming & Overdue Appointments
      const now = new Date();
      const todayStr = now.toISOString().split('T')[0];
      
      const timeToMinutes = (time: string) => {
        const [h, m] = time.split(':').map(Number);
        return h * 60 + m;
      };

      const currentMinutes = now.getHours() * 60 + now.getMinutes();

      const upcomingApts = agenda.filter(a => {
        const isToday = a.fechaCita === todayStr;
        if (!isToday) return false;
        
        const startMin = timeToMinutes(a.horaInicio);
        const diff = startMin - currentMinutes;
        const status = a.estado.toLowerCase();
        
        // "No pendientes" within 2 hours
        return (
          status !== 'pendiente' && 
          status !== 'cancelado' &&
          status !== 'sin agendar' &&
          status !== 'completado' &&
          diff > 0 && diff <= 120
        );
      });

      const overdueApts = agenda.filter(a => {
        const aptDate = new Date(a.fechaCita + 'T' + a.horaInicio);
        const status = a.estado.toLowerCase();
        const nonCompletedStates = ['pendiente', 'confirmado'];
        
        return (
          nonCompletedStates.includes(status) &&
          aptDate < now
        );
      });

      if (upcomingApts.length > 0) {
        newAlerts.push({
          id: 'upcoming-apt-' + Date.now(),
          type: 'warning',
          message: `${upcomingApts.length} cita${upcomingApts.length > 1 ? 's' : ''} próxima${upcomingApts.length > 1 ? 's' : ''} a iniciar`,
          action: 'Ver agenda',
          time: 'En 2h',
          icon: Clock,
          color: 'text-red-600 bg-red-50',
          view: 'agenda'
        });
      }

      if (overdueApts.length > 0) {
        newAlerts.push({
          id: 'overdue-apt-' + Date.now(),
          type: 'warning',
          message: `${overdueApts.length} cita${overdueApts.length > 1 ? 's' : ''} vencida${overdueApts.length > 1 ? 's' : ''} sin completar`,
          action: 'Revisar agenda',
          time: 'Vencido',
          icon: AlertTriangle,
          color: 'text-red-700 bg-red-100',
          view: 'agenda'
        });
      }

      // 4. Check Auto-cancelled Appointments
      const autoCancelled = agenda.filter(a => 
        a.estado.toLowerCase() === 'cancelado' &&
        a.observaciones?.includes('Cancelación automática')
      );

      if (autoCancelled.length > 0) {
        newAlerts.push({
          id: 'auto-cancelled-' + Date.now(),
          type: 'info',
          message: `${autoCancelled.length} cita${autoCancelled.length > 1 ? 's' : ''} cancelada${autoCancelled.length > 1 ? 's' : ''} automáticamente`,
          action: 'Ver agenda',
          time: 'Reciente',
          icon: X,
          color: 'text-gray-600 bg-gray-100',
          view: 'agenda'
        });
      }
      
      if (newAlerts.length > 0) {
        setAlerts((prev: Alert[]) => {
          // Keep unique notifications based on message content to avoid spam
          const existingMessages = new Set(prev.map(a => a.message));
          const additions = newAlerts.filter(a => !existingMessages.has(a.message));
          return [...additions, ...prev].slice(0, 10);
        });
      }
    } catch (err) {
      console.error("Failed to fetch notifications:", err);
    }
  }, [currentUser]);

  // Load notifications on mount and periodically
  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 60000); // Every minute
    return () => clearInterval(interval);
  }, [loadNotifications]);

  const handleDismiss = (id: number | string, e: React.MouseEvent) => {
    e.stopPropagation();
    setAlerts((prev: Alert[]) => prev.filter((alert: Alert) => alert.id !== id));
  };

  const unreadCount = alerts.length;

  // Only show for admin and asistente users
  if (!currentUser || currentUser.role === 'customer') {
    return null;
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setShowNotifications(!showNotifications)}
        className="relative p-2 rounded-lg hover:bg-pink-50 transition-colors"
      >
        <Bell className="w-5 h-5 text-gray-700" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-r from-pink-500 to-purple-600 text-white text-xs rounded-full flex items-center justify-center font-bold animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notifications Dropdown */}
      {showNotifications && (
        <div className="absolute right-0 mt-2 w-96 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-50 max-h-[600px] flex flex-col">
          {/* Header */}
          <div className="bg-gradient-to-r from-pink-400 to-purple-500 p-4 text-white">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-lg">Alertas en Tiempo Real</h3>
                <p className="text-xs text-pink-100">Notificaciones del sistema</p>
              </div>
              {alerts.length > 0 && (
                <span className="bg-white/20 text-white px-3 py-1 rounded-full text-sm font-medium">
                  {alerts.length}
                </span>
              )}
            </div>
          </div>

          {/* Notifications List */}
          <div className="overflow-y-auto flex-1">
            {alerts.length > 0 ? (
              <div className="p-2">
                {alerts.map((alert) => {
                  const Icon = alert.icon;
                  return (
                    <div 
                      key={alert.id} 
                      className="flex items-start space-x-3 p-3 hover:bg-gray-50 rounded-xl transition-colors mb-2 group relative"
                    >
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${alert.color}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800">{alert.message}</p>
                        <p className="text-xs text-gray-500 mt-0.5">Hace {alert.time}</p>
                      </div>
                      <button
                        onClick={(e) => handleDismiss(alert.id, e)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-full hover:bg-gray-200"
                        title="Descartar"
                      >
                        <X className="w-4 h-4 text-gray-500" />
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-8 text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Bell className="w-8 h-8 text-gray-400" />
                </div>
                <p className="text-gray-500 text-sm">No hay notificaciones</p>
                <p className="text-gray-400 text-xs mt-1">Te mantendremos informado</p>
              </div>
            )}
          </div>

          {/* Footer */}
          {alerts.length > 0 && (
            <div className="p-3 border-t border-gray-100">
              <button
                onClick={() => setAlerts([])}
                className="w-full text-sm text-gray-600 hover:text-gray-800 font-medium transition-colors"
              >
                Descartar todas las notificaciones
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
