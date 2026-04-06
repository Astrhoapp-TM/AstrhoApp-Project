import React, { useState, useRef, useEffect } from 'react';
import { User, Calendar, Home, Sparkles, Settings, Shield, Eye, ArrowLeft, ChevronDown, Edit, LogOut } from 'lucide-react';
import { NotificationBell } from './NotificationBell';

interface NavigationProps {
  currentUser: any;
  currentView: string;
  setCurrentView: (view: string) => void;
  setShowAuthModal: (show: boolean) => void;
  setShowUserProfile: (show: boolean) => void;
  hasPermission: (permission: string) => boolean;
  isClientView?: boolean;
  toggleClientView?: () => void;
  onLogout: () => void;
}

export function Navigation({ 
  currentUser, 
  currentView, 
  setCurrentView, 
  setShowAuthModal,
  setShowUserProfile,
  hasPermission,
  isClientView = false,
  toggleClientView,
  onLogout
}: NavigationProps) {
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowUserDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Base menu items available to all users
  const baseMenuItems = [
    { id: 'home', label: 'Inicio', icon: Home },
    { id: 'services', label: 'Servicios', icon: Sparkles }
  ];

  // Menu items for authenticated users
  const authenticatedMenuItems = [
    { id: 'my-appointments', label: 'Mis Citas', icon: Calendar, permission: 'module_appointments' }
  ];

  // Build menu items based on user permissions and view mode
  let menuItems = [];
  
  // For admin/assistant users in admin mode, show standard navigation if needed, or hide if it's pure admin panel
  if ((currentUser?.role === 'admin' || currentUser?.role === 'super_admin' || currentUser?.role === 'asistente') && !isClientView) {
    // Empty menu - staff in pure admin mode doesn't need navigation buttons in the center
    menuItems = [];
  } else {
    // For all other cases (non-admin users, or staff in client view), show standard navigation
    menuItems = [...baseMenuItems];
    
    if (currentUser) {
      authenticatedMenuItems.forEach(item => {
        // Only show 'my-appointments' if user is a customer
        if (item.id === 'my-appointments' && currentUser.role !== 'customer') {
          return;
        }
        
        if (hasPermission(item.permission)) {
          menuItems.push(item);
        }
      });
    }
  }

  const getRoleDisplayName = (role) => {
    switch (role) {
      case 'super_admin': return 'Super Administradora';
      case 'admin': return 'Administradora';
      case 'asistente': return 'Asistente';
      case 'customer': return 'Cliente';
      default: return 'Usuario';
    }
  };

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'super_admin': return 'bg-pink-100 text-pink-700 border border-pink-200';
      case 'admin': return 'bg-red-100 text-red-700';
      case 'asistente': return 'bg-blue-100 text-blue-700';
      case 'customer': return 'bg-green-100 text-green-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md shadow-lg border-b border-pink-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-br from-pink-400 to-purple-500 rounded-full flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="text-2xl font-bold bg-gradient-to-r from-pink-500 to-purple-600 bg-clip-text text-transparent">
                AsthroApp
              </span>
              {(currentUser?.role === 'admin' || currentUser?.role === 'super_admin' || currentUser?.role === 'asistente') && (
                <div className="text-xs text-gray-500">
                  {(currentUser?.role === 'admin' || currentUser?.role === 'super_admin') && !isClientView ? 'Panel de Administración' : 
                   isClientView ? 'Inicio' : 'Sistema de Gestión'}
                </div>
              )}
            </div>
          </div>

          {/* Navigation Menu */}
          <div className="hidden md:flex items-center space-x-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => setCurrentView(item.id)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center space-x-2 ${
                    currentView === item.id
                      ? 'bg-gradient-to-r from-pink-400 to-purple-500 text-white shadow-md'
                      : 'text-gray-700 hover:bg-pink-50 hover:text-pink-600'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>

          {/* Right Side Actions */}
          <div className="flex items-center space-x-4">
            {/* Home/Inicio Toggle for Staff */}
            {(currentUser?.role === 'admin' || currentUser?.role === 'super_admin' || currentUser?.role === 'asistente') && toggleClientView && (
              <button
                onClick={toggleClientView}
                className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center space-x-2 ${
                  isClientView
                    ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                    : 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                }`}
                title={isClientView ? 'Volver a Vista Admin' : 'Ir a Inicio (Vista Cliente)'}
              >
                {isClientView ? (
                  <>
                    <ArrowLeft className="w-4 h-4" />
                    <span className="hidden sm:inline">Volver Admin</span>
                  </>
                ) : (
                  <>
                    <Home className="w-4 h-4" />
                    <span className="hidden sm:inline">Inicio</span>
                  </>
                )}
              </button>
            )}

            {/* Notification Bell */}
            {currentUser && <NotificationBell currentUser={currentUser} />}

            {/* User Menu */}
            {currentUser ? (
              <div className="relative" ref={dropdownRef}>
                {/* User Avatar - Clickable */}
                <button
                  onClick={() => setShowUserDropdown(!showUserDropdown)}
                  className="flex items-center space-x-2 p-2 rounded-lg hover:bg-pink-50 transition-colors"
                >
                  <div className="w-8 h-8 bg-gradient-to-br from-pink-400 to-purple-500 rounded-full flex items-center justify-center">
                    <User className="w-4 h-4 text-white" />
                  </div>
                  <div className="hidden sm:block text-left">
                    <div className="text-sm font-medium text-gray-700">
                      {currentUser.name}
                    </div>
                    <div className={`text-xs px-2 py-0.5 rounded-full ${getRoleBadgeColor(currentUser.role)}`}>
                      {getRoleDisplayName(currentUser.role)}
                    </div>
                  </div>
                  <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showUserDropdown ? 'rotate-180' : ''}`} />
                </button>

                {/* User Dropdown */}
                {showUserDropdown && (
                  <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-50">
                    {/* User Info Header */}
                    <div className="bg-gradient-to-r from-pink-400 to-purple-500 p-4 text-white">
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                          <User className="w-6 h-6" />
                        </div>
                        <div>
                          <div className="font-semibold">{currentUser.name}</div>
                          <div className="text-xs text-pink-100">{currentUser.email}</div>
                          <div className="text-xs text-pink-200 mt-1">
                            {getRoleDisplayName(currentUser.role)}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* User Info Details */}
                    <div className="p-4 border-b border-gray-100">
                      <div className="space-y-2 text-sm">
                        {currentUser.firstName && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">Nombre:</span>
                            <span className="text-gray-800">{currentUser.firstName} {currentUser.lastName}</span>
                          </div>
                        )}
                        {currentUser.documentId && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">Documento:</span>
                            <span className="text-gray-800">{currentUser.documentId}</span>
                          </div>
                        )}
                        {currentUser.phone && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">Teléfono:</span>
                            <span className="text-gray-800">{currentUser.phone}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="p-2">
                      <button
                        onClick={() => {
                          setShowUserProfile(true);
                          setShowUserDropdown(false);
                        }}
                        className="w-full flex items-center space-x-3 px-3 py-2 text-left hover:bg-gray-50 rounded-lg transition-colors"
                      >
                        <Eye className="w-4 h-4 text-gray-500" />
                        <span className="text-gray-700">Mostrar Perfil</span>
                      </button>
                      
                      <button
                        onClick={() => {
                          setShowUserDropdown(false);
                          onLogout();
                        }}
                        className="w-full flex items-center space-x-3 px-3 py-2 text-left hover:bg-red-50 rounded-lg transition-colors text-red-600"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Cerrar Sesión</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={() => setShowAuthModal(true)}
                className="bg-gradient-to-r from-pink-400 to-purple-500 text-white px-4 py-2 rounded-lg hover:shadow-lg transition-all duration-200"
              >
                Iniciar Sesión
              </button>
            )}
          </div>
        </div>

        {/* Mobile Menu */}
        <div className="md:hidden border-t border-pink-100 py-2">
          <div className="flex flex-wrap gap-2">
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => setCurrentView(item.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 flex items-center space-x-1 ${
                    currentView === item.id
                      ? 'bg-gradient-to-r from-pink-400 to-purple-500 text-white'
                      : 'text-gray-700 hover:bg-pink-50'
                  }`}
                >
                  <Icon className="w-3 h-3" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
          
          {/* Mobile User Info */}
          {currentUser && (
            <div className="mt-2 pt-2 border-t border-pink-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <User className="w-4 h-4" />
                  <span>{currentUser.name}</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs ${getRoleBadgeColor(currentUser.role)}`}>
                    {getRoleDisplayName(currentUser.role)}
                  </span>
                </div>
                
                {/* Mobile Home Toggle */}
                {(currentUser?.role === 'admin' || currentUser?.role === 'super_admin' || currentUser?.role === 'asistente') && toggleClientView && (
                  <button
                    onClick={toggleClientView}
                    className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-lg hover:bg-purple-200 transition-colors flex items-center space-x-1"
                  >
                    <Home className="w-3 h-3" />
                    <span>{isClientView ? 'Admin' : 'Inicio'}</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}