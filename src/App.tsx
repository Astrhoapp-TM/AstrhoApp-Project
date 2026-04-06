import React, { useState, useEffect } from "react";
import { clearAuthToken } from "@/shared/services/apiClient";
import { AlertCircle, LogOut } from "lucide-react";
import { Navigation } from "@/shared/components/Navigation";
import { Hero } from "@/shared/components/Hero";
import { ServiceList } from "@/features/services/components/ServiceList";
import { AppointmentList } from "@/features/appointments/components/AppointmentList";
import { ClientAppointments } from "@/features/appointments/components/ClientAppointments";
import { AppointmentBooking } from "@/features/appointments/components/AppointmentBooking";
import { AdminPanel } from "@/features/admin/components/AdminPanel";
import { AuthModal } from "@/features/auth/components/AuthModal";
import { UserProfile } from "@/features/user/components/UserProfile";
import { Toaster } from "@/shared/components/ui/sonner";

function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [currentView, setCurrentView] = useState("home");
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showUserProfile, setShowUserProfile] = useState(false);
  const [isClientView, setIsClientView] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [selectedServiceForBooking, setSelectedServiceForBooking] = useState(null);
  const [appointmentToReschedule, setAppointmentToReschedule] = useState(null);

  // Redirect admin users to admin panel automatically
  useEffect(() => {
    if ((currentUser?.role === "admin" || currentUser?.role === "super_admin") && !isClientView) {
      setCurrentView("admin");
    }
  }, [currentUser, isClientView]);

  // Handle navigation to appointments
  const navigateToAppointments = (selectedService = null) => {
    if (!currentUser) {
      setShowAuthModal(true);
      return;
    }

    // Ensure we only pass the service object, not an event
    const serviceToBook = (selectedService && typeof selectedService === 'object' && ('servicioId' in selectedService || 'id' in selectedService)) ? selectedService : null;
    setSelectedServiceForBooking(serviceToBook);

    // Redirect clients to booking interface
    if (
      currentUser.role === "customer" ||
      ((currentUser.role === "admin" || currentUser.role === "super_admin" || currentUser.role === "asistente") && isClientView)
    ) {
      setCurrentView("book-appointment");
    } else {
      // Admin and assistants go to admin appointments view
      setCurrentView("appointments");
    }
  };

  // Navigate to client appointments view
  const navigateToClientAppointments = () => {
    setAppointmentToReschedule(null); // Reset when going back
    setSelectedServiceForBooking(null); // Reset when going back
    setCurrentView("my-appointments");
  };

  // Handle rescheduling navigation
  const handleRescheduleAppointment = (appointment) => {
    setAppointmentToReschedule(appointment);
    setCurrentView("book-appointment");
  };

  // Handle booking completion - redirect to client appointments
  const handleBookingComplete = (appointment) => {
    setAppointmentToReschedule(null); // Clear reschedule state
    setSelectedServiceForBooking(null); // Clear service state
    setCurrentView("my-appointments");
  };

  // Check user permissions
  const hasPermission = (permission) => {
    if (!currentUser) return false;

    // Super admin has all permissions
    if (currentUser.role === "super_admin") return true;

    // Map legacy/internal permission strings to backend module permissions if needed
    const permissionMapping = {
      'view_dashboard': 'module_dashboard',
      'manage_users': 'module_users',
      'manage_roles': 'module_roles',
      'manage_appointments': 'module_appointments',
      'manage_schedules': 'module_schedules',
      'manage_sales': 'module_sales',
      'manage_services': 'module_services',
      'manage_clients': 'module_clients',
      'manage_purchases': 'module_purchases',
      'manage_products': 'module_products',
      'manage_categories': 'module_categories',
      'manage_suppliers': 'module_suppliers',
      'manage_deliveries': 'module_deliveries',
      'manage_supplies': 'module_supplies',
      'book_appointments': 'module_appointments',
      'view_services': 'module_services',
      'view_own_appointments': 'module_appointments'
    };

    const backendPermission = permissionMapping[permission] || permission;

    // Special case: if we're in client view, everyone should have access to client-specific modules
    if (isClientView && (backendPermission === 'module_appointments' || backendPermission === 'module_services')) {
      return true;
    }

    // Define allowed modules per role as a strict filter
    const ROLE_ALLOWED_MODULES = {
      asistente: [
        "module_dashboard",
        "module_appointments",
        "module_services",
        "module_sales",
        "module_purchases",
        "module_suppliers",
        "module_clients",
        "module_schedules",
        "module_products",
        "module_deliveries"
      ],
      admin: [
        "module_dashboard",
        "module_users",
        "module_appointments",
        "module_services",
        "module_sales",
        "module_purchases",
        "module_suppliers",
        "module_clients",
        "module_categories",
        "module_schedules",
        "module_deliveries",
        "module_roles"
      ],
      customer: [
        "module_appointments",
        "module_services"
      ]
    };

    // If the role is not super_admin, we must check if the module is allowed for this role
    if (currentUser.role !== 'super_admin') {
      const allowedForRole = ROLE_ALLOWED_MODULES[currentUser.role as keyof typeof ROLE_ALLOWED_MODULES] || [];
      if (!allowedForRole.includes(backendPermission)) {
        return false;
      }
    }

    // Staff members (admin/assistant) should always have access to the dashboard to enter the panel
    if (backendPermission === 'module_dashboard' && (currentUser.role === 'admin' || currentUser.role === 'asistente')) {
      return true;
    }

    // If user has permissions from the backend, use them
    if (currentUser.permissions && currentUser.permissions.length > 0) {
      // The backend might return numeric IDs or strings. Let's handle both.
      const PERMISSION_ID_MAP = {
        1: 'module_dashboard',
        2: 'module_users',
        3: 'module_appointments',
        4: 'module_services',
        6: 'module_sales',
        7: 'module_purchases',
        8: 'module_suppliers',
        9: 'module_products',
        10: 'module_clients',
        11: 'module_categories',
        12: 'module_schedules',
        13: 'module_supplies',
        14: 'module_deliveries',
        16: 'module_roles'
      };

      const userPermissions = currentUser.permissions
        .filter((p: any) => p !== null && p !== undefined)
        .map((p: any) => {
          // Handle numeric IDs
          if (typeof p === 'number' || !isNaN(Number(p))) {
            return PERMISSION_ID_MAP[Number(p) as keyof typeof PERMISSION_ID_MAP] || p;
          }
          
          // Handle names like "Dashboard" -> "module_dashboard"
          if (typeof p === 'string') {
            const lowerP = p.toLowerCase().trim();
            if (lowerP === 'dashboard') return 'module_dashboard';
            if (lowerP === 'usuarios' || lowerP === 'users') return 'module_users';
            if (lowerP === 'citas' || lowerP === 'agendamiento' || lowerP === 'agenda' || lowerP === 'calendario' || lowerP === 'appointments') return 'module_appointments';
            if (lowerP === 'servicios' || lowerP === 'services') return 'module_services';
            if (lowerP === 'ventas' || lowerP === 'sales') return 'module_sales';
            if (lowerP === 'compras' || lowerP === 'purchases') return 'module_purchases';
            if (lowerP === 'proveedores' || lowerP === 'suppliers') return 'module_suppliers';
            if (lowerP === 'productos' || lowerP === 'insumos' || lowerP === 'products' || lowerP === 'supplies' || lowerP === 'insumo') return 'module_products';
            if (lowerP === 'clientes' || lowerP === 'personas' || lowerP === 'clients') return 'module_clients';
            if (lowerP === 'categoría de insumos' || lowerP === 'categorías' || lowerP === 'categories') return 'module_categories';
            if (lowerP === 'horarios' || lowerP === 'schedules') return 'module_schedules';
            if (lowerP === 'entrega de insumos' || lowerP === 'entregas' || lowerP === 'deliveries') return 'module_deliveries';
            if (lowerP === 'roles' || lowerP === 'permisos') return 'module_roles';
          }
          return p;
        });

      return userPermissions.includes(backendPermission);
    }

    // For staff (admin/assistant), if no permissions in DB, only allow dashboard
    if (currentUser.role === 'admin' || currentUser.role === 'asistente') {
      return backendPermission === 'module_dashboard';
    }

    // Fallback hardcoded permissions for other roles (like customer)
    const permissions = {
      customer: [
        "module_appointments",
        "module_services",
      ],
    };

    return (
      permissions[currentUser.role]?.includes(backendPermission) ||
      false
    );
  };

  const toggleClientView = () => {
    setIsClientView(!isClientView);
    if (!isClientView) {
      setCurrentView("home"); // Go to home when switching to client view
    } else {
      setCurrentView("admin"); // Go to admin when switching back
    }
  };

  const handleUpdateProfile = (updatedData) => {
    setCurrentUser({
      ...currentUser,
      ...updatedData,
    });
  };

  const handleLogout = () => {
    setShowLogoutModal(true);
  };

  const confirmLogout = () => {
    clearAuthToken();
    setCurrentUser(null);
    setCurrentView("home");
    setIsClientView(false);
    setShowLogoutModal(false);
  };

  const renderCurrentView = () => {
    // If admin/asistente is in client view, show regular client interface
    if ((currentUser?.role === "admin" || currentUser?.role === "super_admin" || currentUser?.role === "asistente") && isClientView) {
      switch (currentView) {
        case "services":
          return (
            <ServiceList
              onBookAppointment={navigateToAppointments}
            />
          );
        case "my-appointments":
          // Employees should not see "My Appointments"
          if (currentUser.role !== 'customer') {
            return (
              <div className="pt-20 text-center">
                <h2 className="text-xl font-bold text-gray-700">Esta sección es exclusiva para clientes</h2>
                <button 
                  onClick={() => setCurrentView('home')}
                  className="mt-4 text-pink-500 hover:underline"
                >
                  Volver al inicio
                </button>
              </div>
            );
          }
          return (
            <ClientAppointments
              currentUser={currentUser}
              onBookNewAppointment={() => navigateToAppointments()}
              onRescheduleAppointment={handleRescheduleAppointment}
            />
          );
        case "book-appointment":
          return (
            <AppointmentBooking
              currentUser={currentUser}
              onBookingComplete={handleBookingComplete}
              onBack={navigateToClientAppointments}
            />
          );
        default:
          return (
            <>
              <Hero
                onBookAppointment={navigateToAppointments}
              />
              <ServiceList
                onBookAppointment={navigateToAppointments}
              />
            </>
          );
      }
    }

    // Regular view logic
    switch (currentView) {
      case "services":
        return (
          <ServiceList
            onBookAppointment={navigateToAppointments}
          />
        );
      case "appointments":
        return (
          <AppointmentList
            currentUser={currentUser}
            hasPermission={hasPermission}
          />
        );
      case "my-appointments":
        if (currentUser && currentUser.role !== 'customer') {
          return (
            <div className="pt-20 text-center">
              <h2 className="text-xl font-bold text-gray-700">Esta sección es exclusiva para clientes</h2>
              <button 
                onClick={() => setCurrentView('home')}
                className="mt-4 text-pink-500 hover:underline"
              >
                Volver al inicio
              </button>
            </div>
          );
        }
        return (
          <ClientAppointments
            currentUser={currentUser}
            onBookNewAppointment={() => navigateToAppointments()}
            onRescheduleAppointment={handleRescheduleAppointment}
          />
        );
      case "book-appointment":
        return (
          <AppointmentBooking
            currentUser={currentUser}
            onBookingComplete={handleBookingComplete}
            onBack={navigateToClientAppointments}
            initialService={selectedServiceForBooking}
            appointmentToReschedule={appointmentToReschedule}
          />
        );
      case "admin":
        return hasPermission("module_dashboard") ? (
          <AdminPanel
            currentUser={currentUser}
            hasPermission={hasPermission}
          />
        ) : (
          <div className="text-center py-8">
            <div className="bg-red-50 border border-red-200 rounded-2xl p-8 max-w-md mx-auto">
              <h3 className="text-xl font-bold text-red-800 mb-2">
                Acceso Denegado
              </h3>
              <p className="text-red-600">
                No tienes permisos para acceder al panel
                administrativo.
              </p>
            </div>
          </div>
        );
      default:
        // For admin and assistant users, default to admin panel unless in client view
        if ((currentUser?.role === "admin" || currentUser?.role === "super_admin" || currentUser?.role === "asistente") && !isClientView) {
          return (
            <AdminPanel
              currentUser={currentUser}
              hasPermission={hasPermission}
            />
          );
        }
        return (
          <>
            <Hero onBookAppointment={navigateToAppointments} />
            <ServiceList
              onBookAppointment={navigateToAppointments}
            />
          </>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50">
      <Navigation
        currentUser={currentUser}
        currentView={currentView}
        setCurrentView={setCurrentView}
        setShowAuthModal={setShowAuthModal}
        setShowUserProfile={setShowUserProfile}
        hasPermission={hasPermission}
        isClientView={isClientView}
        toggleClientView={toggleClientView}
        onLogout={handleLogout}
      />

      <main className="pt-16">{renderCurrentView()}</main>

      {showAuthModal && (
        <AuthModal
          onClose={() => setShowAuthModal(false)}
          onLogin={(user) => {
            setCurrentUser(user);
            // If user was trying to book an appointment, redirect them
            if (
              currentView === "book-appointment" ||
              window.location.hash === "#book-appointment"
            ) {
              setCurrentView("book-appointment");
            } else if (currentView === "my-appointments") {
              setCurrentView("my-appointments");
            }
          }}
        />
      )}

      {showUserProfile && currentUser && (
        <UserProfile
          user={currentUser}
          onClose={() => setShowUserProfile(false)}
          onUpdateProfile={handleUpdateProfile}
          onLogout={handleLogout}
        />
      )}

      {showLogoutModal && currentUser && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md">
            <div className="p-6">
              <div className="flex items-center space-x-4 mb-6">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                  <AlertCircle className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-800">Confirmar Cierre de Sesión</h3>
                  <p className="text-gray-600">Esta acción cerrará tu sesión actual</p>
                </div>
              </div>

              <div className="mb-6">
                <p className="text-gray-700 mb-4">
                  ¿Estás segura de que quieres cerrar sesión?
                </p>
                <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                  <div className="flex items-start space-x-3">
                    <LogOut className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-gray-800">
                        {currentUser.name}
                      </div>
                      <div className="text-sm text-gray-600">
                        {currentUser.email}
                      </div>
                      <div className="text-sm text-gray-600 capitalize">
                        Rol: {currentUser.role}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => setShowLogoutModal(false)}
                  className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmLogout}
                  className="flex-1 bg-gradient-to-r from-red-400 to-red-500 text-white px-6 py-3 rounded-xl font-semibold hover:shadow-lg transition-all"
                >
                  Cerrar Sesión
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      <Toaster position="bottom-right" closeButton richColors />
    </div>
  );
}

export default App;