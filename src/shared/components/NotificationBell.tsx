import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Bell, AlertTriangle, CheckCircle, X, Calendar, Clock, Layers, Filter } from 'lucide-react';
import { supplyService } from '@/features/supply/services/supplyService';
import { agendaService } from '@/features/appointments/services/agendaService';
import {
  buildNotificationsFromData,
  loadNotificationState,
  mergeAndPersistNotifications,
  saveNotificationState,
  type AppNotification,
  type NotificationCategory,
} from '@/shared/services/notificationService';

interface NotificationBellProps {
  currentUser: any;
  onNavigateFromNotification?: (targetTab?: string) => void;
}

export function NotificationBell({ currentUser, onNavigateFromNotification }: NotificationBellProps) {
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [filterCategory, setFilterCategory] = useState<'all' | NotificationCategory>('all');
  const [filterRead, setFilterRead] = useState<'all' | 'unread' | 'read'>('all');
  const [loading, setLoading] = useState(false);

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

  useEffect(() => {
    if (!currentUser) return;
    const persisted = loadNotificationState(currentUser);
    setNotifications(persisted.notifications);
  }, [currentUser]);

  const fetchAllAppointments = useCallback(async () => {
    const pageSize = 200;
    let page = 1;
    let totalPages = 1;
    const all: any[] = [];

    do {
      const params = { page, pageSize };
      const response =
        currentUser?.role === 'asistente'
          ? await agendaService.getMisCitasEmpleado(params)
          : await agendaService.getAll(params);

      const chunk = Array.isArray(response)
        ? response
        : Array.isArray((response as any)?.data)
          ? (response as any).data
          : [];

      all.push(...chunk);
      totalPages = Array.isArray(response) ? 1 : ((response as any)?.totalPages || 1);
      page += 1;
    } while (page <= totalPages);

    const byId = new Map<number, any>();
    all.forEach((apt) => {
      if (apt?.agendaId != null) byId.set(apt.agendaId, apt);
    });
    return [...byId.values()];
  }, [currentUser?.role]);

  const loadNotifications = useCallback(async () => {
    if (!currentUser) return;

    try {
      setLoading(true);
      const [suppliesRes, appointments] = await Promise.all([
        supplyService.getSupplies({ page: 1, pageSize: 400 }),
        fetchAllAppointments(),
      ]);
      const supplies = suppliesRes.data || [];
      const previousState = loadNotificationState(currentUser);

      const { additions, nextSnapshot } = buildNotificationsFromData({
        appointments,
        supplies,
        previousSnapshot: previousState.snapshot,
        now: new Date(),
      });

      const merged = mergeAndPersistNotifications(currentUser, previousState, additions, nextSnapshot);
      setNotifications(merged.notifications);
    } catch (err) {
      console.error("Failed to fetch notifications:", err);
    } finally {
      setLoading(false);
    }
  }, [currentUser, fetchAllAppointments]);

  // Load notifications on mount and periodically
  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 60000);
    return () => clearInterval(interval);
  }, [loadNotifications]);

  const handleDismiss = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const next = notifications.filter((n) => n.id !== id);
    const state = loadNotificationState(currentUser);
    saveNotificationState(currentUser, { ...state, notifications: next });
    setNotifications(next);
  };

  const markAsRead = (id: string) => {
    const next = notifications.map((n) => (n.id === id ? { ...n, read: true } : n));
    const state = loadNotificationState(currentUser);
    saveNotificationState(currentUser, { ...state, notifications: next });
    setNotifications(next);
  };

  const markAllAsRead = () => {
    const next = notifications.map((n) => ({ ...n, read: true }));
    const state = loadNotificationState(currentUser);
    saveNotificationState(currentUser, { ...state, notifications: next });
    setNotifications(next);
  };

  const clearAll = () => {
    const state = loadNotificationState(currentUser);
    saveNotificationState(currentUser, { ...state, notifications: [] });
    setNotifications([]);
  };

  const handleNotificationClick = (item: AppNotification) => {
    markAsRead(item.id);
    if (item.targetTab && onNavigateFromNotification) {
      setShowNotifications(false);
      onNavigateFromNotification(item.targetTab);
    }
  };

  const sortedNotifications = useMemo(() => {
    const priorityRank: Record<string, number> = { alta: 0, media: 1, baja: 2 };
    return [...notifications].sort((a, b) => {
      const aRank = priorityRank[a.priority] ?? 99;
      const bRank = priorityRank[b.priority] ?? 99;
      if (aRank !== bRank) return aRank - bRank;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [notifications]);

  const filteredNotifications = useMemo(() => {
    return sortedNotifications.filter((item) => {
      const categoryMatch = filterCategory === 'all' || item.category === filterCategory;
      const readMatch =
        filterRead === 'all' ||
        (filterRead === 'read' && item.read) ||
        (filterRead === 'unread' && !item.read);
      return categoryMatch && readMatch;
    });
  }, [sortedNotifications, filterCategory, filterRead]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  // Only show for admin and asistente users
  if (!currentUser || currentUser.role === 'customer') {
    return null;
  }

  const categoryLabel: Record<NotificationCategory, string> = {
    citas: 'Citas',
    inventario: 'Inventario',
    sistema: 'Sistema',
  };

  const priorityColor: Record<string, string> = {
    alta: 'text-brand-pink bg-gray-100',
    media: 'text-brand-indigo bg-gray-50',
    baja: 'text-gray-600 bg-gray-100',
  };

  const categoryIcon = (category: NotificationCategory) => {
    if (category === 'inventario') return AlertTriangle;
    if (category === 'citas') return Calendar;
    return Layers;
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setShowNotifications(!showNotifications)}
        className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors"
      >
        <Bell className="w-5 h-5 text-gray-700" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-brand text-white text-xs rounded-full flex items-center justify-center font-bold animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notifications Dropdown */}
      {showNotifications && (
        <div className="absolute right-0 mt-2 w-[28rem] bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden z-50 max-h-[450px] flex flex-col">
          {/* Header */}
          <div className="bg-gradient-brand p-4 text-white">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-lg">Notificaciones</h3>
                <p className="text-xs text-white/80">Sistema proactivo de agenda e inventario</p>
              </div>
              {notifications.length > 0 && (
                <span className="bg-white/20 text-white px-3 py-1 rounded-full text-sm font-medium">
                  {unreadCount} sin leer
                </span>
              )}
            </div>
          </div>

          <div className="p-3 border-b border-gray-100 bg-gray-50/50 space-y-2">
            <div className="flex items-center gap-2 text-[11px] font-bold text-gray-500 tracking-wider">
              <Filter className="w-3.5 h-3.5" />
              <span>Filtros</span>
            </div>
            <div className="flex gap-2 flex-wrap">
              {(['all', 'citas', 'inventario', 'sistema'] as const).map((cat) => (
                <button
                  key={cat}
                  onClick={() => setFilterCategory(cat)}
                  className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-colors ${filterCategory === cat ? 'bg-brand-indigo text-white' : 'bg-white text-gray-600 border border-gray-200'
                    }`}
                >
                  {cat === 'all' ? 'Todo' : categoryLabel[cat]}
                </button>
              ))}
            </div>
            <div className="flex gap-2 flex-wrap">
              {([
                { key: 'all', label: 'Todos' },
                { key: 'unread', label: 'No leídos' },
                { key: 'read', label: 'Leídos' },
              ] as const).map((item) => (
                <button
                  key={item.key}
                  onClick={() => setFilterRead(item.key)}
                  className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-colors ${filterRead === item.key ? 'bg-brand-indigo text-white' : 'bg-white text-gray-600 border border-gray-200'
                    }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Notifications List */}
          <div className="overflow-y-auto flex-1">
            {filteredNotifications.length > 0 ? (
              <div className="p-2">
                {filteredNotifications.map((item) => {
                  const Icon = categoryIcon(item.category);
                  const createdAt = new Date(item.createdAt);
                  const timeLabel = Number.isNaN(createdAt.getTime())
                    ? 'Reciente'
                    : createdAt.toLocaleString('es-ES', {
                      day: '2-digit',
                      month: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                    });
                  return (
                    <div
                      key={item.id}
                      className={`flex items-start space-x-3 p-3 hover:bg-gray-50 rounded-xl transition-colors mb-2 group relative border ${item.read ? 'border-transparent' : 'border-brand-periwinkle/40 bg-brand-periwinkle/10'
                        }`}
                      onClick={() => handleNotificationClick(item)}
                    >
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${priorityColor[item.priority]}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-sm font-semibold text-gray-800">{item.title}</p>
                          {!item.read && <span className="w-2 h-2 rounded-full bg-brand-pink" />}
                        </div>
                        <p className="text-xs text-gray-600">{item.message}</p>
                        <div className="flex items-center gap-2 mt-1.5 text-[11px] text-gray-500">
                          <span className="px-2 py-0.5 rounded-full bg-gray-100">{categoryLabel[item.category]}</span>
                          <span className="px-2 py-0.5 rounded-full bg-gray-100 capitalize">{item.priority}</span>
                          <span className="inline-flex items-center gap-1"><Clock className="w-3 h-3" />{timeLabel}</span>
                        </div>
                      </div>
                      <button
                        onClick={(e) => handleDismiss(item.id, e)}
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
                <p className="text-gray-500 text-sm">{loading ? 'Actualizando notificaciones...' : 'No hay notificaciones'}</p>
                <p className="text-gray-400 text-xs mt-1">Te mantendremos informado en tiempo real</p>
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="p-3 border-t border-gray-100 grid grid-cols-2 gap-2">
              <button
                onClick={markAllAsRead}
                className="text-sm text-gray-600 hover:text-gray-800 font-medium transition-colors border border-gray-200 rounded-lg py-2"
              >
                Marcar todo leído
              </button>
              <button
                onClick={clearAll}
                className="text-sm text-gray-600 hover:text-gray-800 font-medium transition-colors border border-gray-200 rounded-lg py-2"
              >
                Limpiar todo
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
