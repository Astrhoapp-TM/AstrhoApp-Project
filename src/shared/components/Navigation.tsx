import React, { useState, useRef, useEffect } from 'react';
import { User, Calendar, Home, Sparkles, Settings, Shield, Eye, ArrowLeft, ChevronDown, Edit, LogOut, Menu, X } from 'lucide-react';
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
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const dropdownRef = useRef(null);
  const mobileMenuRef = useRef(null);

  // Close dropdown and mobile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowUserDropdown(false);
      }
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target) && !event.target.closest('.mobile-menu-toggle')) {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Close mobile menu on view change
  useEffect(() => {
    setIsMenuOpen(false);
  }, [currentView]);

  // Base menu items available to all users
  const baseMenuItems = [
    { id: 'home', label: 'Inicio', icon: Home },
    { id: 'services', label: 'Servicios', icon: Sparkles }
  ];

  // Menu items for authenticated users
  const authenticatedMenuItems = [
    { id: 'my-appointments', label: 'Mis Citas', icon: Calendar, permission: 'module_appointments' },
    { id: 'my-purchases', label: 'Mis Compras', icon: Sparkles, permission: 'module_sales' }
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
        // Only show 'my-appointments' and 'my-purchases' if user is a customer
        if ((item.id === 'my-appointments' || item.id === 'my-purchases') && 
            (currentUser.role === 'admin' || currentUser.role === 'super_admin' || currentUser.role === 'asistente')) {
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
      case 'super_admin': return 'badge-role-super-admin';
      case 'admin': return 'badge-role-admin';
      case 'asistente': return 'badge-role-assistant';
      case 'customer': return 'badge-role-customer';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <nav 
      className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md shadow-sm border-b border-gray-100 transition-all duration-300"
      role="navigation"
      aria-label="Navegación principal"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          {/* Logo & Brand */}
          <div 
            className="flex items-center space-x-3 cursor-pointer group"
            onClick={() => setCurrentView('home')}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && setCurrentView('home')}
            aria-label="Ir al inicio"
          >
            <div className="w-10 h-10 bg-gradient-brand rounded-xl flex items-center justify-center shadow-indigo-200 shadow-lg group-hover:scale-110 transition-transform duration-300">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="text-2xl font-black tracking-tight text-gradient-brand leading-none">
                AsthroApp
              </span>
              {(currentUser?.role === 'admin' || currentUser?.role === 'super_admin' || currentUser?.role === 'asistente') && (
                <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mt-1">
                  {(currentUser?.role === 'admin' || currentUser?.role === 'super_admin') && !isClientView ? 'Admin Panel' : 
                   isClientView ? 'Portal Cliente' : 'Gestión'}
                </div>
              )}
            </div>
          </div>

          {/* Desktop Navigation Menu */}
          <div className="hidden md:flex items-center space-x-2">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setCurrentView(item.id)}
                  aria-current={isActive ? 'page' : undefined}
                  className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 flex items-center space-x-2 group relative focus:outline-none focus:ring-2 focus:ring-brand-indigo/30 ${
                    isActive
                      ? 'bg-gradient-brand text-white shadow-md shadow-indigo-100'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-brand-indigo'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-gray-400 group-hover:text-brand-indigo'}`} aria-hidden="true" />
                  <span>{item.label}</span>
                  {!isActive && (
                    <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-0 h-0.5 bg-brand-indigo transition-all duration-300 group-hover:w-1/2 rounded-full" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Right Side Actions */}
          <div className="flex items-center space-x-2 sm:space-x-4">
            {/* Home/Inicio Toggle for Staff - Desktop only */}
            {(currentUser?.role === 'admin' || currentUser?.role === 'super_admin' || currentUser?.role === 'asistente') && toggleClientView && (
              <button
                onClick={toggleClientView}
                className="hidden sm:flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-gray-50 text-brand-indigo font-semibold text-sm hover:bg-brand-indigo hover:text-white transition-all duration-300 border border-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-indigo/30"
                title={isClientView ? 'Volver a Vista Admin' : 'Ir a Inicio (Vista Cliente)'}
                aria-label={isClientView ? 'Cambiar a vista de administrador' : 'Cambiar a vista de cliente'}
              >
                {isClientView ? (
                  <>
                    <ArrowLeft className="w-4 h-4" aria-hidden="true" />
                    <span>Admin</span>
                  </>
                ) : (
                  <>
                    <Home className="w-4 h-4" aria-hidden="true" />
                    <span>Inicio</span>
                  </>
                )}
              </button>
            )}

            {/* Notification Bell */}
            {currentUser && (
              <div className="p-1">
                <NotificationBell currentUser={currentUser} />
              </div>
            )}

            {/* User Menu - Desktop */}
            {currentUser ? (
              <div className="relative hidden sm:block" ref={dropdownRef}>
                <button
                  onClick={() => setShowUserDropdown(!showUserDropdown)}
                  aria-expanded={showUserDropdown}
                  aria-haspopup="true"
                  className="flex items-center space-x-3 p-1.5 pr-3 rounded-2xl hover:bg-gray-50 transition-all duration-300 border border-transparent hover:border-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-indigo/30"
                >
                  <div className="w-10 h-10 bg-gradient-brand rounded-xl flex items-center justify-center shadow-md">
                    <User className="w-5 h-5 text-white" aria-hidden="true" />
                  </div>
                  <div className="text-left">
                    <div className="text-sm font-bold text-gray-800 leading-tight">
                      {currentUser.name.split(' ')[0]}
                    </div>
                    <div className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md mt-0.5 ${getRoleBadgeColor(currentUser.role)}`}>
                      {getRoleDisplayName(currentUser.role)}
                    </div>
                  </div>
                  <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-300 ${showUserDropdown ? 'rotate-180' : ''}`} aria-hidden="true" />
                </button>

                {/* User Dropdown */}
                {showUserDropdown && (
                  <div 
                    className="absolute right-0 mt-3 w-72 bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden z-50 animate-in fade-in slide-in-from-top-5 duration-300"
                    role="menu"
                    aria-orientation="vertical"
                  >
                    <div className="bg-gradient-brand p-6 text-white relative overflow-hidden">
                      <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full blur-2xl" />
                      <div className="relative flex items-center space-x-4">
                        <div className="w-14 h-14 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/30 shadow-xl">
                          <User className="w-7 h-7" aria-hidden="true" />
                        </div>
                        <div>
                          <div className="font-bold text-lg leading-tight">{currentUser.name}</div>
                          <div className="text-xs text-white/80 font-medium truncate max-w-[160px]">{currentUser.email}</div>
                          <div className="inline-block px-2 py-0.5 bg-white/20 rounded-lg text-[10px] font-bold uppercase tracking-wider mt-2">
                            {getRoleDisplayName(currentUser.role)}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 space-y-1">
                      <button
                        onClick={() => {
                          setShowUserProfile(true);
                          setShowUserDropdown(false);
                        }}
                        role="menuitem"
                        className="w-full flex items-center space-x-3 px-4 py-3 text-left hover:bg-indigo-50 rounded-2xl transition-all duration-200 group focus:outline-none focus:bg-indigo-50"
                      >
                        <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center group-hover:bg-white transition-colors">
                          <Eye className="w-4 h-4 text-brand-indigo" aria-hidden="true" />
                        </div>
                        <span className="text-sm font-semibold text-gray-700">Mi Perfil</span>
                      </button>
                      
                      <button
                        onClick={() => {
                          setShowUserDropdown(false);
                          onLogout();
                        }}
                        role="menuitem"
                        className="w-full flex items-center space-x-3 px-4 py-3 text-left hover:bg-rose-50 rounded-2xl transition-all duration-200 group focus:outline-none focus:bg-rose-50"
                      >
                        <div className="w-8 h-8 rounded-lg bg-rose-50 flex items-center justify-center group-hover:bg-white transition-colors">
                          <LogOut className="w-4 h-4 text-rose-500" aria-hidden="true" />
                        </div>
                        <span className="text-sm font-semibold text-rose-600">Cerrar Sesión</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={() => setShowAuthModal(true)}
                className="hidden sm:block bg-gradient-brand text-white px-6 py-2.5 rounded-xl font-bold text-sm hover:shadow-xl hover:shadow-indigo-200 hover:-translate-y-0.5 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-brand-indigo/30"
              >
                Iniciar Sesión
              </button>
            )}

            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              aria-expanded={isMenuOpen}
              aria-label={isMenuOpen ? 'Cerrar menú' : 'Abrir menú'}
              className="md:hidden p-2 rounded-xl bg-gray-50 text-gray-600 hover:bg-gray-100 mobile-menu-toggle transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-brand-indigo/30"
            >
              {isMenuOpen ? <X className="w-6 h-6" aria-hidden="true" /> : <Menu className="w-6 h-6" aria-hidden="true" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      <div 
        className={`md:hidden absolute top-full left-0 right-0 bg-white border-b border-gray-100 shadow-xl transition-all duration-300 ease-in-out overflow-hidden ${
          isMenuOpen ? 'max-h-[80vh] opacity-100 visible' : 'max-h-0 opacity-0 invisible'
        }`}
        ref={mobileMenuRef}
      >
        <div className="p-4 space-y-4">
          {/* Mobile Nav Items */}
          <div className="grid grid-cols-1 gap-2">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setCurrentView(item.id);
                    setIsMenuOpen(false);
                  }}
                  aria-current={isActive ? 'page' : undefined}
                  className={`w-full px-4 py-3.5 rounded-2xl text-sm font-bold transition-all duration-200 flex items-center space-x-3 ${
                    isActive
                      ? 'bg-gradient-brand text-white shadow-lg'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-gray-400'}`} aria-hidden="true" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>

          {/* Mobile Admin/Home Toggle */}
          {(currentUser?.role === 'admin' || currentUser?.role === 'super_admin' || currentUser?.role === 'asistente') && toggleClientView && (
            <button
              onClick={() => {
                toggleClientView();
                setIsMenuOpen(false);
              }}
              className="w-full flex items-center justify-between px-4 py-3.5 rounded-2xl bg-indigo-50 text-brand-indigo font-bold text-sm hover:bg-indigo-100 transition-colors"
            >
              <div className="flex items-center space-x-3">
                {isClientView ? <ArrowLeft className="w-5 h-5" aria-hidden="true" /> : <Home className="w-5 h-5" aria-hidden="true" />}
                <span>{isClientView ? 'Volver a Admin' : 'Ir a Vista Cliente'}</span>
              </div>
            </button>
          )}

          {/* Mobile User Section */}
          <div className="pt-4 border-t border-gray-100">
            {currentUser ? (
              <div className="space-y-4">
                <div className="flex items-center space-x-3 px-2">
                  <div className="w-12 h-12 bg-gradient-brand rounded-2xl flex items-center justify-center shadow-md">
                    <User className="w-6 h-6 text-white" aria-hidden="true" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-gray-800">{currentUser.name}</div>
                    <div className={`text-[10px] font-bold px-2 py-1 rounded-lg mt-0.5 inline-block ${getRoleBadgeColor(currentUser.role)}`}>
                      {getRoleDisplayName(currentUser.role)}
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => {
                      setShowUserProfile(true);
                      setIsMenuOpen(false);
                    }}
                    className="flex items-center justify-center space-x-2 px-4 py-3.5 rounded-2xl bg-gray-50 text-gray-700 font-bold text-xs hover:bg-gray-100 transition-colors"
                  >
                    <Eye className="w-4 h-4" aria-hidden="true" />
                    <span>Perfil</span>
                  </button>
                  <button
                    onClick={() => {
                      onLogout();
                      setIsMenuOpen(false);
                    }}
                    className="flex items-center justify-center space-x-2 px-4 py-3.5 rounded-2xl bg-rose-50 text-rose-600 font-bold text-xs hover:bg-rose-100 transition-colors"
                  >
                    <LogOut className="w-4 h-4" aria-hidden="true" />
                    <span>Salir</span>
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => {
                  setShowAuthModal(true);
                  setIsMenuOpen(false);
                }}
                className="w-full bg-gradient-brand text-white py-4 rounded-2xl font-bold text-sm shadow-lg shadow-indigo-100"
              >
                Iniciar Sesión
              </button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}