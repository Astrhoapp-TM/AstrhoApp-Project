import React, { useEffect, useState } from 'react';
import {
  Users, Plus, Edit, Trash2, Eye, Search, Filter, CheckCircle, XCircle, X, Save,
  AlertCircle, Mail, Phone, Calendar, Shield, UserCog, Download, Upload,
  FileText, Camera, MapPin, IdCard, UserCheck, User, Star, Loader2, RefreshCw, Info
} from 'lucide-react';
import { toast } from 'sonner';
import { SimplePagination } from '@/shared/components/ui/simple-pagination';
import { cn } from '@/shared/components/ui/utils';
import { userService, type UsuarioListItem, type UsuarioDetail } from '../services/userService';
import { authService } from '@/features/auth/services/authService';
import { agendaService } from '@/features/appointments/services/agendaService';
import { salesService } from '@/features/sales/services/salesService';
import { roleService, type RolListDto } from '@/features/roles/services/roleService';
import { apiClient } from '@/shared/services/apiClient';
import { useLoading } from '@/shared/contexts/LoadingContext';
import { SectionLoader } from '@/shared/components/GlobalLoader';

interface UserManagementProps {
  hasPermission: (permission: string) => boolean;
}

export function UserManagement({ hasPermission }: UserManagementProps) {

  const [users, setUsers] = useState<UsuarioListItem[]>([]);
  const [roles, setRoles] = useState<RolListDto[]>([]);
  const [loading, setLoading] = useState(false);
  const { showSectionLoading, hideSectionLoading } = useLoading();
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showInactiveWarningModal, setShowInactiveWarningModal] = useState(false);
  const [showDeleteWarningModal, setShowDeleteWarningModal] = useState(false);
  const [userToDelete, setUserToDelete] = useState<UsuarioListItem | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(5);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [alert, setAlert] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  const showAlert = (type: 'success' | 'error' | 'info', message: string) => {
    setAlert({ type, message });
    setTimeout(() => setAlert(null), 4000);
  };

  // Fetch users and roles from API
  const fetchUsers = async () => {
    try {
      showSectionLoading("Obteniendo usuarios...");
      setLoading(true);
      const response = await userService.getAll({
        page: currentPage,
        pageSize: itemsPerPage,
        search: searchTerm
      });
      setUsers(response.data || []);
      setTotalCount(response.totalCount || 0);
      setTotalPages(response.totalPages || 0);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Error al cargar los usuarios');
    } finally {
      setLoading(false);
      hideSectionLoading();
    }
  };

  const fetchRoles = async () => {
    try {
      const response = await roleService.getRoles();
      setRoles(response.data || []);
    } catch (error) {
      console.error('Error fetching roles:', error);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [currentPage, searchTerm]);

  useEffect(() => {
    fetchRoles();
  }, []);

  // Reset page when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  // Ya no filtramos en el cliente, usamos lo que viene de la API
  const paginatedUsers = users;

  const goToPage = (page: number) => {
    setCurrentPage(page);
  };

  const goToPreviousPage = () => {
    setCurrentPage(prev => Math.max(prev - 1, 1));
  };

  const goToNextPage = () => {
    setCurrentPage(prev => Math.min(prev + 1, totalPages));
  };

  const handleCreateUser = () => {
    setSelectedUser(null);
    setShowUserModal(true);
  };

  const handleEditUser = async (user: UsuarioListItem) => {
    try {
      showSectionLoading("Cargando datos del usuario...");
      const detail = await userService.getById(user.usuarioId);
      setSelectedUser(detail);
      setShowUserModal(true);
    } catch (error) {
      console.error('Error fetching user details:', error);
      toast.error('Error al cargar los datos del usuario');
    } finally {
      hideSectionLoading();
    }
  };

  const handleViewUser = async (user: UsuarioListItem) => {
    try {
      showSectionLoading("Cargando detalle del usuario...");
      // Show basic info from the list first to avoid empty screen
      setSelectedUser({
        ...user,
        rol: { nombre: user.rolNombre }
      });
      setShowDetailModal(true);
      
      // Fetch full details
      const detail = await userService.getById(user.usuarioId);
      setSelectedUser(detail);
    } catch (error) {
      console.error('Error fetching user details:', error);
      // Detail modal will still show basic info from 'user' param
    } finally {
      hideSectionLoading();
    }
  };

  const handleDeleteUser = (user: UsuarioListItem) => {
    // No permitir eliminar el super administrador
    if ((user.rolNombre || '').toLowerCase() === 'super admin') {
      setShowDeleteWarningModal(true);
      return;
    }

    setUserToDelete(user);
    setShowDeleteModal(true);
  };

  const confirmDeleteUser = async () => {
    if (userToDelete) {
      try {
        showSectionLoading("Verificando dependencias...");
        setLoading(true);

        // 1. Get associated person to check for appointments/sales
        const personInfo = await userService.getPersonForUser(userToDelete);

        // 2. Check associations with appointments and sales
        const [appointmentsRes, salesRes] = await Promise.all([
          agendaService.getAll(),
          salesService.getAll()
        ]);

        const appointments = appointmentsRes?.data || [];
        const sales = salesRes?.data || [];

        const hasAppointments = appointments.some(apt => {
          const personIdStr = String(userToDelete.usuarioId);
          const personDocStr = String(personInfo?.documentId || '');

          return String(apt.documentoCliente) === personDocStr || 
                 String(apt.documentoEmpleado) === personDocStr ||
                 (apt as any).customer_id === userToDelete.usuarioId ||
                 (apt as any).assigned_to === userToDelete.usuarioId;
        });

        const hasSales = sales.some(sale => {
          const saleCustId = String(sale.customerId || '');
          const saleEmpId = String(sale.employeeId || '');
          const personIdStr = String(userToDelete.usuarioId);
          const personDocStr = String(personInfo?.documentId || '');

          return (saleCustId === personIdStr) || 
                 (saleEmpId === personIdStr) ||
                 (personDocStr && saleCustId === personDocStr) ||
                 (personDocStr && saleEmpId === personDocStr);
        });

        if (hasAppointments) {
          toast.error("Este usuario tiene citas asociadas y no puede ser eliminado");
          setLoading(false);
          hideSectionLoading();
          setShowDeleteModal(false);
          setUserToDelete(null);
          return;
        }

        showSectionLoading("Eliminando cuenta...");
        await userService.delete(userToDelete.usuarioId);
        setShowDeleteModal(false);
        setUserToDelete(null);
        toast.success('Usuario eliminado correctamente');
        await fetchUsers();
      } catch (error) {
        console.error('Error deleting user:', error);
        toast.error('Error al eliminar el usuario. Verifique que no existan dependencias activas.');
      } finally {
        setLoading(false);
        hideSectionLoading();
      }
    }
  };

  const handleSaveUser = async (userData: any) => {
    if (selectedUser) {
      // ── EDIT ──
      try {
        showSectionLoading("Actualizando datos...");
        const userId = selectedUser.usuarioId;
        
        // Check if user is super admin (rolId 4 or role name includes "super")
        const isSuperAdmin = 
          selectedUser.rolId === 4 || 
          (selectedUser.rol?.nombre || '').toLowerCase().includes('super');
        
        const updatePayload = {
          rolId: isSuperAdmin ? 4 : userData.rolId, // Preserve super admin role
          email: userData.email,
          estado: userData.estado !== undefined ? userData.estado : selectedUser.estado,
          documento: userData.documento,
        };

        // 1. Update User Record
        await userService.update(userId, updatePayload);

        // 2. Handle Client and Employee Records
        const newEstado = userData.estado !== undefined ? userData.estado : selectedUser.estado;
        const direccion = userData.direccion || '';
        const documentId = userData.documentId || userData.documento || String(userId);
        const documentType = userData.documentType || 'CC';
        const nombre = userData.nombre;
        const telefono = userData.phone;

        // Get both existing client and employee for this user
        const [allClients, allEmployees] = await Promise.all([
          apiClient.getAllPages<any>('/api/Clientes').catch(() => []),
          apiClient.getAllPages<any>('/api/Empleados').catch(() => [])
        ]);
        const existingClient = allClients.find((c: any) => Number(c.usuarioId) === userId);
        const existingEmployee = allEmployees.find((e: any) => Number(e.usuarioId) === userId);

        // Determine what type(s) we need
        const selectedRole = roles.find(r => r.rolId === updatePayload.rolId);
        const roleName = (selectedRole?.nombre || '').toLowerCase();
        const needsClient = roleName === 'cliente';
        const needsEmployee = ['administrador', 'asistente', 'super admin'].includes(roleName);

        // Update or create Client if needed (or if it already exists)
        if (existingClient || needsClient) {
          const clientDocId = existingClient ? existingClient.documentoCliente : documentId;
          // Client is active only when the new role IS 'cliente'; otherwise deactivate it
          const clientEstado = needsClient ? newEstado : false;
          const clientPayload = {
            documentoCliente: clientDocId,
            usuarioId: userId,
            tipoDocumento: existingClient ? existingClient.tipoDocumento : documentType,
            nombre,
            telefono,
            direccion: direccion,
            direccionCliente: direccion,
            'dirección': direccion,
            'direcciónCliente': direccion,
            estado: clientEstado,
          };
          if (existingClient) {
            await apiClient.put(`/api/Clientes/${clientDocId}`, clientPayload);
          } else {
            await apiClient.post('/api/Clientes', clientPayload);
          }
        }

        // Update or create Employee if needed (or if it already exists)
        if (existingEmployee || needsEmployee) {
          const empDocId = existingEmployee ? existingEmployee.documentoEmpleado : documentId;
          // Employee is active only when the new role IS a staff role; otherwise deactivate it
          const empEstado = needsEmployee ? newEstado : false;
          const empPayload = {
            documentoEmpleado: empDocId,
            usuarioId: userId,
            tipoDocumento: existingEmployee ? existingEmployee.tipoDocumento : documentType,
            nombre,
            telefono,
            direccion: direccion,
            direccionEmpleado: direccion,
            'dirección': direccion,
            'direcciónEmpleado': direccion,
            estado: empEstado,
          };
          if (existingEmployee) {
            await apiClient.put(`/api/Empleados/${empDocId}`, empPayload);
          } else {
            await apiClient.post('/api/Empleados', empPayload);
          }
        }

        // If role changed to 'cliente' and the user previously had an employee record,
        // remove all schedule assignments so they don't appear in schedules as staff
        if (needsClient && existingEmployee) {
          const empDocId = existingEmployee.documentoEmpleado;
          try {
            const assignments = await horarioEmpleadoService.getByEmpleado(empDocId);
            const list = Array.isArray(assignments) ? assignments
              : (assignments as any)?.$values ?? (assignments as any)?.data ?? [];
            await Promise.all(
              list.map((a: any) =>
                horarioEmpleadoService.delete(a.horarioEmpleadoId).catch(() => {})
              )
            );
          } catch (scheduleErr) {
            console.warn('Could not remove schedule assignments on role change:', scheduleErr);
          }
        }

        setShowUserModal(false);
        showAlert('success', 'Usuario y datos personales actualizados correctamente');
        await fetchUsers();
      } catch (error: any) {
        console.error('Error updating user:', error);
        showAlert('error', error?.message || 'Error al actualizar el usuario');
      } finally {
        hideSectionLoading();
      }
      return;
    }

    // ── CREATE ──
    try {
      showSectionLoading("Registrando nuevo usuario...");

      // Step 1: Create temp user via auth endpoint
      const selectedRole = roles.find(r => r.rolId === userData.rolId);
      const tempUserResponse = await authService.createTempUser({
        email: userData.email.trim().toLowerCase(),
        rolId: userData.rolId,
        password: userData.password,
        documento: userData.documento,
      });

      // Get the created usuarioId
      let usuarioId = typeof tempUserResponse === 'number' ? tempUserResponse : (tempUserResponse?.usuarioId || tempUserResponse?.id || tempUserResponse?.UsuarioId);
      
      if (!usuarioId) {
        // Fallback: look up by email
        usuarioId = await authService.getUserIdByEmail(userData.email);
        if (!usuarioId) {
          throw new Error('No se pudo obtener el ID del usuario creado. Por favor, intente buscarlo en la lista de usuarios e intente registrar sus datos personales nuevamente.');
        }
      }

      // Step 2: Create Empleado or Cliente record depending on role
      const roleName = (selectedRole?.nombre || '').toLowerCase();

      if (roleName === 'cliente') {
        await apiClient.post('/api/Clientes', {
          documentoCliente: userData.documento,
          usuarioId: usuarioId,
          tipoDocumento: 'CC',
          nombre: userData.nombre,
          telefono: userData.phone,
          direccion: userData.direccion || '',
          direccionCliente: userData.direccion || '',
          'dirección': userData.direccion || '',
          'direcciónCliente': userData.direccion || '',
        });
      } else {
        // Empleado (Administrador, Asistente, or any other non-client role)
        await apiClient.post('/api/Empleados', {
          documentoEmpleado: userData.documento,
          usuarioId: usuarioId,
          tipoDocumento: 'CC',
          nombre: userData.nombre,
          telefono: userData.phone,
          direccion: userData.direccion || '',
          direccionEmpleado: userData.direccion || '',
          'dirección': userData.direccion || '',
          'direcciónEmpleado': userData.direccion || '',
        });
      }

      setShowUserModal(false);
      showAlert('success', 'Usuario registrado correctamente');
      await fetchUsers();
    } catch (err: any) {
      console.error('Error creating user:', err);
      showAlert('error', err?.message || 'Error al registrar the usuario');
    } finally {
      hideSectionLoading();
    }
  };

  const toggleUserStatus = async (userId: number) => {
    const user = users.find(u => u.usuarioId === userId);

    // No permitir inactivar al super administrador
    if (user && (user.rolNombre || '').toLowerCase() === 'super admin') {
      setShowInactiveWarningModal(true);
      return;
    }

    if (!user) return;

    try {
      showSectionLoading("Cambiando estado...");
      const detail = await userService.getById(userId);
      const newEstado = !user.estado;
      await userService.update(userId, {
        rolId: detail.rol.rolId,
        email: detail.email,
        estado: newEstado,
      });
      
      // Also update associated client or employee
      const personInfo = await userService.getPersonForUser(user);
      if (personInfo) {
        const docId = personInfo.documentId;
        if (personInfo.type === 'client') {
          // First get the client to keep other data unchanged
          try {
            const existingClient = await apiClient.get(`/api/Clientes/${docId}`);
            await apiClient.put(`/api/Clientes/${docId}`, {
              ...existingClient,
              estado: newEstado,
            });
          } catch (e) {
            // If we can't get existing client, just send the required fields
            await apiClient.put(`/api/Clientes/${docId}`, {
              documentoCliente: docId,
              usuarioId: userId,
              estado: newEstado,
            });
          }
        } else if (personInfo.type === 'employee') {
          try {
            const existingEmployee = await apiClient.get(`/api/Empleados/${docId}`);
            await apiClient.put(`/api/Empleados/${docId}`, {
              ...existingEmployee,
              estado: newEstado,
            });
          } catch (e) {
            await apiClient.put(`/api/Empleados/${docId}`, {
              documentoEmpleado: docId,
              usuarioId: userId,
              estado: newEstado,
            });
          }
        }
      }
      
      showAlert('success', 'Estado de usuario actualizado correctamente');
      await fetchUsers();
    } catch (error) {
      console.error('Error toggling user status:', error);
      showAlert('error', 'Error al actualizar el estado del usuario');
    } finally {
      hideSectionLoading();
    }
  };

  const getRoleDisplayName = (rolNombre: string) => {
    return rolNombre || 'Sin rol';
  };

  const getRoleBadgeColor = (rolNombre: string) => {
    const name = (rolNombre || '').toLowerCase();
    if (name === 'super admin') return 'status-confirmed';
    if (name === 'administrador') return 'status-cancelled';
    if (name === 'asistente') return 'status-completed';
    if (name === 'cliente') return 'status-confirmed';
    return 'status-inactive';
  };


  return (
    <div className="p-8">
      {/* Notification Banner */}
      {alert && (
        <div className="fixed bottom-6 right-6 z-[9999] animate-in slide-in-from-right-5 duration-300">
          <div className={cn(
            "text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center space-x-4 min-w-[320px] bg-gradient-to-r",
            alert.type === 'success' ? "from-pink-400 to-purple-500" :
              alert.type === 'error' ? "from-red-500 to-pink-600" :
                "from-blue-400 to-indigo-500"
          )}>
            <div className="flex-shrink-0">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                {alert.type === 'success' && <CheckCircle className="w-6 h-6 text-white" />}
                {alert.type === 'error' && <AlertCircle className="w-6 h-6 text-white" />}
                {alert.type === 'info' && <Info className="w-6 h-6 text-white" />}
              </div>
            </div>
            <div className="flex-1">
              <p className="font-semibold">{alert.message}</p>
            </div>
            <button
              onClick={() => setAlert(null)}
              className="flex-shrink-0 w-8 h-8 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-bold text-gray-800">Gestión de Usuarios</h2>
          <p className="text-gray-600">
            Administra todos los usuarios del sistema
          </p>
        </div>
      </div>

      {/* Search and Register */}
      <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="w-full md:max-w-md relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Buscar por email o rol..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-periwinkle/300 focus:border-transparent"
            />
          </div>

          <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
            <button
              onClick={fetchUsers}
              disabled={loading}
              className="p-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors flex items-center justify-center disabled:opacity-50"
              title="Recargar datos"
            >
              <RefreshCw className={cn("w-5 h-5", loading && "animate-spin")} />
            </button>

            {hasPermission('manage_users') && (
              <button
                onClick={handleCreateUser}
                className="w-full md:w-auto bg-gradient-brand text-white px-6 py-3 rounded-xl font-semibold hover:shadow-lg transition-all flex items-center justify-center space-x-2 whitespace-nowrap"
              >
                <Plus className="w-5 h-5" />
                <span>Registrar Usuario</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden relative min-h-[400px]">
        {loading && paginatedUsers.length > 0 && (
          <div className="absolute inset-0 bg-white/60 backdrop-blur-sm z-10 flex flex-col items-center justify-center">
            <Loader2 className="w-8 h-8 text-brand-pink animate-spin mb-2" />
            <span className="text-sm font-medium text-gray-500">Cargando...</span>
          </div>
        )}
        <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-6 border-b border-gray-100">
          <h3 className="text-xl font-bold text-gray-800">Lista de Usuarios</h3>
          <p className="text-gray-600">
            {totalCount} usuario{totalCount !== 1 ? 's' : ''} encontrado{totalCount !== 1 ? 's' : ''}
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-left font-semibold text-gray-800">Usuario</th>
                <th className="px-6 py-4 text-left font-semibold text-gray-800">Rol</th>
                <th className="px-6 py-4 text-left font-semibold text-gray-800">Estado</th>
                <th className="px-6 py-4 text-left font-semibold text-gray-800">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading && paginatedUsers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                    Cargando usuarios...
                  </td>
                </tr>
              ) : paginatedUsers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                    No se encontraron usuarios
                  </td>
                </tr>
              ) : (
                paginatedUsers.map((user) => (
                  <tr key={user.usuarioId} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gradient-brand rounded-full flex items-center justify-center">
                          <span className="text-white font-semibold text-sm">
                            {user.email.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <div className="font-semibold text-gray-800">{user.email}</div>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getRoleBadgeColor(user.rolNombre)}`}>
                        {getRoleDisplayName(user.rolNombre)}
                      </span>
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-3">
                        {(user.rolNombre || '').toLowerCase() === 'super admin' ? (
                          // Super admin siempre activo, sin switch
                          <div className="flex items-center space-x-2 cursor-not-allowed opacity-60" title="El Super Administrador no puede ser desactivado">
                            <div className="w-11 h-6 bg-gradient-to-r from-pink-400 to-purple-500 rounded-full relative">
                              <div className="absolute top-[2px] right-[2px] bg-white border-white border rounded-full h-5 w-5 shadow-sm"></div>
                            </div>
                          </div>
                        ) : (
                          // Otros usuarios con switch
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={user.estado === true}
                              onChange={() => toggleUserStatus(user.usuarioId)}
                              className="sr-only peer"
                            />
                            <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-brand-periwinkle/300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-pink-400 peer-checked:to-purple-500"></div>
                            
                          </label>
                        )}
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleViewUser(user)}
                          className="p-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                          title="Ver detalles"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {hasPermission('manage_users') && (
                          <>
                            <button
                              onClick={() => handleEditUser(user)}
                              disabled={user.estado !== true}
                              className={cn(
                                "p-2 rounded-lg transition-colors",
                                user.estado !== true
                                  ? "bg-gray-100 text-gray-400 cursor-not-allowed opacity-50"
                                  : "bg-green-100 text-green-700 hover:bg-green-200"
                              )}
                              title={user.estado !== true ? "No se puede editar un usuario inactivo" : "Editar usuario"}
                            >
                              <Edit className="w-4 h-4" />
                            </button>

                            {(user.rolNombre || '').toLowerCase() !== 'super admin' && (
                              <button
                                onClick={() => handleDeleteUser(user)}
                                disabled={user.estado !== true}
                                className={cn(
                                  "p-2 rounded-lg transition-colors",
                                  user.estado !== true
                                    ? "bg-gray-100 text-gray-400 cursor-not-allowed opacity-50"
                                    : "bg-gray-100 text-brand-pink hover:bg-red-200"
                                )}
                                title={user.estado !== true ? "No se puede eliminar un usuario inactivo" : "Eliminar usuario"}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-6 py-4 border-t border-gray-100">
          <SimplePagination
            totalPages={totalPages}
            currentPage={currentPage}
            onPageChange={goToPage}
            totalRecords={totalCount}
            recordsPerPage={itemsPerPage}
          />
        </div>
      </div>

      {/* User Modal */}
      {showUserModal && (
        <UserModal
          user={selectedUser}
          onClose={() => setShowUserModal(false)}
          onSave={handleSaveUser}
          roles={roles}
        />
      )}

      {/* User Detail Modal */}
      {showDetailModal && selectedUser && (
        <UserDetailModal
          user={selectedUser}
          onClose={() => setShowDetailModal(false)}
        />
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && userToDelete && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="bg-gradient-to-r from-red-500 to-pink-600 p-5 text-white shrink-0 shadow-md">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm shadow-inner">
                    <Trash2 className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold leading-tight">Confirmar Eliminación</h3>
                    <p className="text-red-100 text-xs font-medium">Esta acción no se puede deshacer</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="w-9 h-9 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/30 hover:scale-110 active:scale-95 transition-all shadow-sm"
                >
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>
            </div>

            <div className="p-8">
              <div className="text-center mb-8">
                <div className="w-20 h-20 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-red-100 rotate-3">
                  <AlertCircle className="w-10 h-10 text-brand-pink -rotate-3" />
                </div>
                <h4 className="text-lg font-bold text-gray-800 mb-2">
                  ¿Eliminar usuario "{userToDelete.email}"?
                </h4>
                <p className="text-sm text-gray-500 leading-relaxed mb-6">
                  Estás a punto de eliminar este acceso de forma permanente. 
                  Esto deshabilitará el inicio de sesión para esta cuenta.
                </p>
                
                <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 flex items-center space-x-4">
                  <div className="w-12 h-12 bg-gradient-brand rounded-xl shadow-sm flex items-center justify-center">
                    <span className="text-white font-bold text-lg">
                      {userToDelete.email.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="text-left">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Cuenta a eliminar</p>
                    <p className="font-bold text-gray-700 line-clamp-1">{userToDelete.email}</p>
                    <p className="text-[10px] text-gray-400 uppercase">{userToDelete.rolNombre}</p>
                  </div>
                </div>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="flex-1 px-6 py-3 rounded-xl font-black text-gray-400 hover:bg-gray-100 transition-all text-[10px] uppercase tracking-widest"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmDeleteUser}
                  className="flex-1 bg-gradient-to-r from-red-500 to-red-600 text-white px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:shadow-lg hover:scale-105 active:scale-95 transition-all flex items-center justify-center space-x-2"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Eliminar</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Inactive Warning Modal */}
      {showInactiveWarningModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="bg-gradient-to-r from-red-500 to-pink-600 p-5 text-white shrink-0 shadow-md">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm shadow-inner">
                    <Shield className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold leading-tight">Acción Protegida</h3>
                    <p className="text-red-100 text-xs font-medium">Restricción del sistema</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowInactiveWarningModal(false)}
                  className="w-9 h-9 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/30 transition-all shadow-sm"
                >
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>
            </div>

            <div className="p-8 text-center">
              <div className="w-20 h-20 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-red-100 rotate-3">
                <AlertCircle className="w-10 h-10 text-brand-pink -rotate-3" />
              </div>
              <h4 className="text-lg font-bold text-gray-800 mb-2">
                No se puede inactivar al Super Administrador
              </h4>
              <p className="text-sm text-gray-500 leading-relaxed mb-6">
                Por seguridad del sistema, la cuenta principal de Super Administrador debe permanecer activa 
                en todo momento para garantizar el acceso total a la plataforma.
              </p>
              
              <button
                onClick={() => setShowInactiveWarningModal(false)}
                className="w-full bg-gray-100 hover:bg-gray-200 text-gray-600 px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Warning Modal */}
      {showDeleteWarningModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="bg-gradient-to-r from-red-500 to-pink-600 p-5 text-white shrink-0 shadow-md">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm shadow-inner">
                    <Trash2 className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold leading-tight">Acceso Restringido</h3>
                    <p className="text-red-100 text-xs font-medium">Elemento del sistema</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowDeleteWarningModal(false)}
                  className="w-9 h-9 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/30 transition-all shadow-sm"
                >
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>
            </div>

            <div className="p-8 text-center">
              <div className="w-20 h-20 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-red-100">
                <Shield className="w-10 h-10 text-brand-pink" />
              </div>
              <h4 className="text-lg font-bold text-gray-800 mb-2">
                No se puede eliminar al Super Administrador
              </h4>
              <p className="text-sm text-gray-500 leading-relaxed mb-6">
                La cuenta de Super Administrador es fundamental para la administración global y no puede 
                ser eliminada. Si necesita realizar cambios, considere editar el perfil en su lugar.
              </p>
              
              <button
                onClick={() => setShowDeleteWarningModal(false)}
                className="w-full bg-gray-100 hover:bg-gray-200 text-gray-600 px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all"
              >
                Cerrar Advertencia
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// User Modal Component
function UserModal({ user, onClose, onSave, roles }: { user: any; onClose: () => void; onSave: (data: any) => void; roles: RolListDto[] }) {
  // If editing a user and they are super admin, we must include the super admin role in the list so it displays correctly, otherwise hide it.
  const isEditingSuperAdmin = user && (user.rol?.nombre || user.rolNombre || '').toLowerCase() === 'super admin';
  const availableRoles = isEditingSuperAdmin ? roles : roles.filter(r => r.nombre.toLowerCase() !== 'super admin');

  const [formData, setFormData] = useState({
    rolId: user?.rol?.rolId || (availableRoles.length > 0 ? availableRoles[0].rolId : 0),
    documentType: 'cedula',
    documentId: '',
    documento: user?.documento || '',
    nombre: '',
    email: user?.email || '',
    phone: '',
    direccion: '',
    estado: user?.estado !== undefined ? user.estado : true,
    password: '',
  });
  const [originalData, setOriginalData] = useState<{ email: string; documentId: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [validatingFields, setValidatingFields] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (user && user.usuarioId) {
      const fetchPersonData = async () => {
        try {
          const data = await userService.getPersonForUser(user);
          
          const mapDocTypeBack = (t: string) => {
            if (t === 'CC') return 'cedula';
            if (t === 'CE') return 'cedula_extranjeria';
            if (t === 'TI') return 'tarjeta_identidad';
            if (t === 'PAS') return 'pasaporte';
            if (t === 'NIT') return 'nit';
            return 'cedula';
          };
          
          if (data) {
            setFormData(prev => ({
              ...prev,
              documentType: mapDocTypeBack(data.documentType),
              documentId: data.documentId,
              nombre: data.name,
              phone: data.phone,
              direccion: data.address || '',
            }));
            setOriginalData({
              email: user.email || '',
              documentId: data.documentId,
            });
          }
        } catch (e) {
          console.error("Error fetching person data for user", e);
        }
      };
      
      fetchPersonData();
    }
  }, [user]);

  // ── Centralized synchronous validation per field ──
  const validateField = (name: string, value: string, docType?: string): string => {
    const isCreate = !user;
    switch (name) {
      case 'nombre':
        if (!value.trim()) return 'El nombre es obligatorio';
        if (value.trim() && !/^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]+$/.test(value))
          return 'El nombre solo debe contener letras';
        return '';
      case 'email':
        if (!value.trim()) return 'El correo electrónico es obligatorio';
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) return 'El formato del correo no es válido';
        return '';
      case 'documento': {
        if (isCreate && !value.trim()) return 'El documento de usuario es obligatorio';
        if (value.trim()) {
          if (!/^[0-9]+$/.test(value.trim()))
            return 'El documento de usuario solo debe contener números';
          if (value.trim().length < 7 || value.trim().length > 11) return 'El documento de usuario debe tener entre 7 y 11 caracteres';
        }
        return '';
      }
      case 'phone':
        if (!value.trim()) return 'El teléfono es obligatorio';
        if (value.trim() && !/^\d{10}$/.test(value))
          return 'El teléfono debe tener exactamente 10 dígitos numéricos';
        return '';
      case 'direccion':
        if (!value.trim()) return 'La dirección es obligatoria';
        return '';
      default:
        return '';
    }
  };

  // ── Blur handler: sync validation on all fields + async uniqueness checks ──
  const handleBlur = async (e: React.FocusEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    let finalValue = value;

    // Sanitize nombre on blur
    if (name === 'nombre') {
      finalValue = value
        .trim()
        .replace(/\s+/g, ' ');
      setFormData(prev => ({ ...prev, [name]: finalValue }));
    }

    // Always run sync validation on blur (shows "required" errors when leaving empty fields)
    const syncError = validateField(name, finalValue);
    if (syncError) {
      setFieldErrors(prev => ({ ...prev, [name]: syncError }));
      return;
    }

    if (user) return; // skip uniqueness checks on edit

    // Async uniqueness checks for email only
    if (name === 'email' && value.trim()) {
      setValidatingFields(prev => ({ ...prev, email: true }));
      try {
        const { emailExists } = await authService.checkDuplicates(value);
        if (emailExists) {
          setFieldErrors(prev => ({ ...prev, email: 'El correo electrónico ya se encuentra registrado' }));
        }
      } catch { /* allow submit to re-check */ }
      setValidatingFields(prev => ({ ...prev, email: false }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};

    // Run all sync validations
    const fieldsToValidate = !user
      ? ['nombre', 'email', 'documento', 'phone', 'direccion']
      : ['nombre', 'email', 'phone', 'direccion'];

    for (const field of fieldsToValidate) {
      const err = validateField(field, (formData as any)[field]);
      if (err) errors[field] = err;
    }

    // Stop early if local validations fail
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    // Async uniqueness checks (on create or if values changed from original on edit)
    setIsSaving(true);
    try {
      const emailChanged = !user || (originalData && formData.email.trim().toLowerCase() !== originalData.email.trim().toLowerCase());

      const checks: Promise<any>[] = [];
      if (emailChanged) {
        checks.push(authService.checkDuplicates(formData.email));
      } else {
        checks.push(Promise.resolve({ emailExists: false }));
      }

      // We don't check document duplicate anymore because we generate it automatically
      checks.push(Promise.resolve(false));

      const [emailCheckResult] = await Promise.all(checks);
      const emailExists = emailCheckResult?.emailExists ?? false;

      if (emailExists) errors.email = 'El correo electrónico ya se encuentra registrado';

      if (Object.keys(errors).length > 0) {
        setFieldErrors(errors);
        setIsSaving(false);
        return;
      }
    } catch {
      setIsSaving(false);
      return;
    }

    setFieldErrors({});
    setIsSaving(true);
    try {
      await onSave(formData);
    } finally {
      setIsSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const { name } = e.currentTarget;
    
    // Allow: backspace, delete, tab, escape, enter
    if (['Backspace', 'Delete', 'Tab', 'Escape', 'Enter'].includes(e.key)) {
      return;
    }

    // Allow: Ctrl+A, Ctrl+C, Ctrl+X, Ctrl+V (we'll handle paste separately)
    if ((e.ctrlKey || e.metaKey) && ['a', 'c', 'v', 'x'].includes(e.key.toLowerCase())) {
      return;
    }

    // Allow: home, end, left, right
    if (['Home', 'End', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
      return;
    }

    const docTypeLower = (formData.documentType || '').toLowerCase();

    // For phone and numeric-only documentIds (except NIT and Pasaporte)
    if (name === 'phone' || (name === 'documentId' && docTypeLower !== 'nit' && docTypeLower !== 'pasaporte')) {
      if (!/^[0-9]$/.test(e.key)) {
        e.preventDefault();
      }
    }

    // For passport documentId: allow letters and numbers
    if (name === 'documentId' && docTypeLower === 'pasaporte') {
      if (!/^[a-zA-Z0-9]$/.test(e.key)) {
        e.preventDefault();
      }
    }

    // For NIT: allow numbers and a single hyphen
    if (name === 'documentId' && docTypeLower === 'nit') {
      const currentValue = e.currentTarget.value;
      if (!/^[0-9-]$/.test(e.key)) {
        e.preventDefault();
      }
      if (e.key === '-' && currentValue.includes('-')) {
        e.preventDefault();
      }
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const { name } = e.currentTarget;
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text');
    let sanitizedText = pastedText;

    const docTypeLower = (formData.documentType || '').toLowerCase();

    if (name === 'phone' || (name === 'documentId' && docTypeLower !== 'nit' && docTypeLower !== 'pasaporte')) {
      sanitizedText = pastedText.replace(/[^0-9]/g, '');
    } else if (name === 'documentId' && docTypeLower === 'pasaporte') {
      sanitizedText = pastedText.replace(/[^a-zA-Z0-9]/g, '');
    } else if (name === 'documentId' && docTypeLower === 'nit') {
      sanitizedText = pastedText.replace(/[^0-9-]/g, '');
      const firstDashIndex = sanitizedText.indexOf('-');
      if (firstDashIndex !== -1) {
        sanitizedText = sanitizedText.slice(0, firstDashIndex + 1) + sanitizedText.slice(firstDashIndex + 1).replace(/-/g, '');
      }
    }

    // Real-time synchronous validation
    const error = validateField(name, sanitizedText, formData.documentType);
    setFieldErrors(prev => ({ ...prev, [name]: error }));

    // Update form data with sanitized text
    setFormData(prev => ({
      ...prev,
      [name]: sanitizedText,
    }));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    let sanitized = value;

    // Strip non-numeric characters for phone & limit to 10 digits
    if (name === 'phone') {
      sanitized = value.replace(/[^0-9]/g, '').slice(0, 10);
    }

    // Strip non-numeric characters for documento & limit to 11 digits
    if (name === 'documento') {
      sanitized = value.replace(/[^0-9]/g, '').slice(0, 11);
    }

    // Sanitize documentId based on doc type
    if (name === 'documentId') {
      const docTypeLower = (formData.documentType || '').toLowerCase();
      if (docTypeLower === 'pasaporte') {
        sanitized = value.replace(/[^a-zA-Z0-9]/g, '').slice(0, 20);
      } else if (docTypeLower === 'nit') {
        sanitized = value.replace(/[^0-9-]/g, '');
        const firstDashIndex = sanitized.indexOf('-');
        if (firstDashIndex !== -1) {
          sanitized = sanitized.slice(0, firstDashIndex + 1) + sanitized.slice(firstDashIndex + 1).replace(/-/g, '');
        }
        sanitized = sanitized.slice(0, 11);
      } else {
        sanitized = value.replace(/[^0-9]/g, '').slice(0, 15);
      }
    }

    // Limit text fields to 100 chars
    if (['nombre', 'email', 'direccion'].includes(name)) {
      sanitized = value.slice(0, 100);
    }

    // Real-time synchronous validation (without sanitizing nombre yet)
    const error = validateField(name, sanitized, name === 'documentType' ? sanitized : undefined);
    setFieldErrors(prev => ({ ...prev, [name]: error }));

    // When document type changes, truncate documentId to new max and re-validate
    if (name === 'documentType') {
      const docTypeLower = (sanitized || '').toLowerCase();
      let newMaxLen = 15;
      if (docTypeLower === 'pasaporte') newMaxLen = 20;
      else if (docTypeLower === 'nit') newMaxLen = 11;

      const trimmedDocId = formData.documentId.slice(0, newMaxLen);
      const docError = validateField('documentId', trimmedDocId, sanitized);
      setFieldErrors(prev => ({ ...prev, documentId: docError }));
      setFormData(prev => ({
        ...prev,
        documentType: sanitized,
        documentId: trimmedDocId,
      }));
      return;
    }

    setFormData({
      ...formData,
      [name]: name === 'rolId' ? parseInt(sanitized) : sanitized,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header - Fixed at top */}
        <div className="bg-gradient-brand p-5 text-white shrink-0 shadow-md z-20">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <UserCog className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold leading-tight">
                  {user ? 'Editar Usuario' : 'Registrar Nuevo Usuario'}
                </h3>
                <p className="text-pink-100 text-sm">
                  {user ? `Actualizando a ${user.email}` : 'Complete la información para el nuevo acceso'}
                </p>
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
        <form onSubmit={handleSubmit} id="user-form" className="flex-1 overflow-y-auto p-6 lg:p-8 bg-gray-50/30 no-scrollbar">
          <style>{`
            .no-scrollbar::-webkit-scrollbar { display: none; }
            .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
          `}</style>

          <div className="max-w-4xl mx-auto space-y-6">
            {/* Errors Notification */}
            {Object.keys(fieldErrors).length > 0 && (
              <div className="bg-gray-50 border border-red-200 text-brand-pink px-6 py-4 rounded-2xl flex items-center space-x-3 animate-in fade-in duration-300">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <p className="font-semibold text-sm">Por favor corrija los errores marcados en el formulario</p>
              </div>
            )}

            <div className="grid md:grid-cols-2 gap-6">
              {/* Account Data Section */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-6 py-4 bg-gray-50/50 border-b border-gray-100 flex items-center space-x-2">
                  <Shield className="w-4 h-4 text-brand-pink" />
                  <h4 className="font-bold text-gray-700 text-sm uppercase tracking-wider">Acceso y Rol</h4>
                </div>
                <div className="p-6 space-y-4">
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">Rol del Sistema *</label>
                    <div className="relative">
                      <Shield className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <select
                        name="rolId"
                        value={formData.rolId}
                        onChange={handleInputChange}
                        className={`w-full pl-10 pr-4 py-3 bg-gray-50 border rounded-xl focus:ring-2 focus:ring-brand-periwinkle/300 focus:border-transparent transition-all outline-none appearance-none ${
                          isEditingSuperAdmin ? 'opacity-60 cursor-not-allowed' : 'border-gray-200'
                        }`}
                        disabled={isEditingSuperAdmin}
                      >
                        <option value="">Seleccionar rol</option>
                        {availableRoles.map(role => (
                          <option key={role.rolId} value={role.rolId}>{role.nombre}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">Correo Electrónico *</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        onBlur={handleBlur}
                        className={`w-full pl-10 pr-4 py-3 bg-gray-50 border rounded-xl focus:ring-2 focus:ring-brand-periwinkle/300 focus:border-transparent transition-all outline-none ${
                          fieldErrors.email ? 'border-red-300 ring-1 ring-red-100' : 'border-gray-200'
                        }`}
                        placeholder="correo@ejemplo.com"
                        maxLength={100}
                      />
                    </div>
                    {validatingFields.email && <p className="text-[9px] text-blue-500 mt-1 animate-pulse">Verificando...</p>}
                    {fieldErrors.email && <p className="text-[9px] text-brand-pink mt-1">{fieldErrors.email}</p>}
                  </div>




                </div>
              </div>

              {/* Personal Data Section */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-6 py-4 bg-gray-50/50 border-b border-gray-100 flex items-center space-x-2">
                  <IdCard className="w-4 h-4 text-brand-violet" />
                  <h4 className="font-bold text-gray-700 text-sm uppercase tracking-wider">Ficha de Identidad</h4>
                </div>
                <div className="p-6 space-y-4">
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">Nombre Completo *</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <input
                        type="text"
                        name="nombre"
                        value={formData.nombre}
                        onChange={handleInputChange}
                        onBlur={handleBlur}
                        className={`w-full pl-10 pr-4 py-3 bg-gray-50 border rounded-xl focus:ring-2 focus:ring-brand-periwinkle/300 focus:border-transparent transition-all outline-none ${
                          fieldErrors.nombre ? 'border-red-300 ring-1 ring-red-100' : 'border-gray-200'
                        }`}
                        placeholder="Nombre y Apellidos"
                        maxLength={100}
                      />
                    </div>
                    {fieldErrors.nombre && <p className="text-[9px] text-brand-pink mt-1">{fieldErrors.nombre}</p>}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {user ? (
                      <div className="col-span-2">
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">Documento Usuario</label>
                        <div className="relative">
                          <IdCard className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                          <input
                            type="text"
                            name="documento"
                            value={formData.documento}
                            onChange={handleInputChange}
                            onBlur={handleBlur}
                            onKeyDown={(e) => {
                              // Allow only numeric characters
                              if (['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) {
                                return;
                              }
                              if ((e.ctrlKey || e.metaKey) && ['a', 'c', 'v', 'x'].includes(e.key.toLowerCase())) {
                                return;
                              }
                              if (!/^[0-9]$/.test(e.key)) {
                                e.preventDefault();
                              }
                            }}
                            onPaste={(e) => {
                              e.preventDefault();
                              const pastedText = e.clipboardData.getData('text');
                              const sanitized = pastedText.replace(/[^0-9]/g, '').slice(0, 11);
                              setFormData(prev => ({ ...prev, documento: sanitized }));
                            }}
                            className={`w-full pl-10 pr-4 py-3 bg-gray-50 border rounded-xl focus:ring-2 focus:ring-brand-periwinkle/300 focus:border-transparent transition-all outline-none border-gray-200`}
                            placeholder="Documento del usuario"
                            maxLength={11}
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="col-span-2">
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">Documento Usuario</label>
                        <div className="relative">
                          <IdCard className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                          <input
                            type="text"
                            name="documento"
                            value={formData.documento}
                            onChange={handleInputChange}
                            onBlur={handleBlur}
                            onKeyDown={(e) => {
                              // Allow only numeric characters
                              if (['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) {
                                return;
                              }
                              if ((e.ctrlKey || e.metaKey) && ['a', 'c', 'v', 'x'].includes(e.key.toLowerCase())) {
                                return;
                              }
                              if (!/^[0-9]$/.test(e.key)) {
                                e.preventDefault();
                              }
                            }}
                            onPaste={(e) => {
                              e.preventDefault();
                              const pastedText = e.clipboardData.getData('text');
                              const sanitized = pastedText.replace(/[^0-9]/g, '').slice(0, 11);
                              setFormData(prev => ({ ...prev, documento: sanitized }));
                            }}
                            className={`w-full pl-10 pr-4 py-3 bg-gray-50 border rounded-xl focus:ring-2 focus:ring-brand-periwinkle/300 focus:border-transparent transition-all outline-none ${fieldErrors.documento ? 'border-red-300 ring-1 ring-red-100' : 'border-gray-200'}`}
                            placeholder="Documento de usuario"
                            maxLength={11}
                          />
                        </div>
                        {fieldErrors.documento && <p className="text-[9px] text-brand-pink mt-1">{fieldErrors.documento}</p>}
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">Teléfono *</label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <input
                          type="tel"
                          name="phone"
                          inputMode="tel"
                          autoComplete="off"
                          spellCheck="false"
                          pattern="[0-9]{10}"
                          maxLength={10}
                          value={formData.phone}
                          onChange={handleInputChange}
                          onBlur={handleBlur}
                          onKeyDown={handleKeyDown}
                          onPaste={handlePaste}
                          className={`w-full pl-10 pr-4 py-3 bg-gray-50 border rounded-xl focus:ring-2 focus:ring-brand-periwinkle/300 focus:border-transparent transition-all outline-none ${
                            fieldErrors.phone ? 'border-red-300 ring-1 ring-red-100' : 'border-gray-200'
                          }`}
                          placeholder="3001234567"
                        />
                      </div>
                      {fieldErrors.phone && <p className="text-[9px] text-brand-pink mt-1">{fieldErrors.phone}</p>}
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">Dirección</label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <input
                          type="text"
                          name="direccion"
                          value={formData.direccion}
                          onChange={handleInputChange}
                          onBlur={handleBlur}
                          className={`w-full pl-10 pr-4 py-3 bg-gray-50 border rounded-xl focus:ring-2 focus:ring-brand-periwinkle/300 focus:border-transparent transition-all outline-none ${
                            fieldErrors.direccion ? 'border-red-300 ring-1 ring-red-100' : 'border-gray-200'
                          }`}
                          placeholder="Ej: Calle 10 #20-30"
                          maxLength={100}
                        />
                      </div>
                      {fieldErrors.direccion && <p className="text-[9px] text-brand-pink mt-1">{fieldErrors.direccion}</p>}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Warning / Summary Card */}
            <div className="bg-gradient-to-br from-pink-50 to-purple-50 rounded-3xl p-6 border border-gray-200 shadow-sm">
                <div className="flex items-center space-x-3 mb-3">
                  <Star className="w-5 h-5 text-brand-pink" />
                  <h4 className="font-black text-[10px] uppercase tracking-[0.2em] text-gray-700">Aviso de Seguridad</h4>
                </div>
                <p className="text-sm text-gray-600 italic leading-relaxed">
                  {user 
                    ? "Está modificando un acceso existente. Los cambios de rol pueden afectar los permisos del usuario." 
                    : "La creación de un usuario genera automáticamente un perfil vinculado (Cliente o Empleado) según el rol seleccionado."}
                </p>
            </div>
          </div>
        </form>

        {/* Footer - Fixed at bottom */}
        <div className="p-5 bg-white border-t border-gray-100 flex flex-wrap gap-3 justify-end shrink-0 z-20">
          <button
            type="button"
            onClick={onClose}
            className="px-8 py-2.5 rounded-xl font-black text-gray-500 hover:bg-gray-200 hover:text-gray-800 active:scale-95 transition-all text-sm uppercase tracking-widest shadow-sm"
            disabled={isSaving}
          >
            Cancelar
          </button>
          <button
            form="user-form"
            type="submit"
            disabled={isSaving}
            className="px-8 py-2.5 rounded-xl font-black text-white bg-gradient-brand active:scale-95 transition-all text-sm uppercase tracking-widest shadow-lg hover:shadow-pink-200 disabled:opacity-50 flex items-center space-x-2"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{user ? 'Actualizando...' : 'Registrando usuario...'}</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>{user ? 'Actualizar' : 'Registrar'}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// User Detail Modal Component
function UserDetailModal({ user, onClose }: { user: any; onClose: () => void }) {
  const [personData, setPersonData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPerson = async () => {
      try {
        const data = await userService.getPersonForUser(user);
        setPersonData(data);
      } catch (error) {
        console.error("Error fetching person for detail:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchPerson();
  }, [user]);

  const getRoleDisplayName = (rolNombre: string) => rolNombre || 'Sin rol';
  const getRoleBadgeColor = (rolNombre: string) => {
    const name = (rolNombre || '').toLowerCase();
    if (name === 'super admin') return 'bg-gray-50 text-brand-indigo border border-purple-200';
    if (name === 'administrador') return 'bg-gray-100 text-brand-pink';
    if (name === 'asistente') return 'bg-blue-100 text-blue-700';
    if (name === 'cliente') return 'bg-green-100 text-green-700';
    return 'bg-gray-100 text-gray-700';
  };

  const rolNombre = user.rol?.nombre || user.rolNombre || '';

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header - Fixed at top */}
        <div className="bg-gradient-brand p-5 text-white shrink-0 shadow-md z-20">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <UserCheck className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold leading-tight">Perfil de Usuario</h3>
                <p className="text-pink-100 text-sm">{user.email}</p>
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

          <div className="max-w-4xl mx-auto space-y-6">
            <div className="grid md:grid-cols-3 gap-4">
              {/* Identity Card */}
              <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex flex-col items-center justify-center text-center">
                <div className="w-20 h-20 bg-gradient-brand rounded-3xl flex items-center justify-center shadow-lg mb-3">
                  <span className="text-white font-bold text-3xl">{user.email.charAt(0).toUpperCase()}</span>
                </div>
                <h4 className="font-bold text-gray-800 text-lg line-clamp-1">{personData?.name || 'Usuario'}</h4>
                <div className="mt-2">
                  <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${getRoleBadgeColor(rolNombre)}`}>
                    {getRoleDisplayName(rolNombre)}
                  </span>
                </div>
              </div>

              {/* Account Card */}
              <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm col-span-2">
                <div className="flex items-center space-x-2 text-brand-pink mb-4">
                  <Shield className="w-4 h-4" />
                  <h4 className="font-bold uppercase text-[10px] tracking-widest">Estado y Datos</h4>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">ID Usuario</span>
                    <p className="font-mono font-bold text-gray-700">{user.usuarioId}</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Estado</span>
                    <p className={`font-bold ${user.estado ? 'text-green-600' : 'text-brand-pink'} flex items-center space-x-1`}>
                      {user.estado ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                      <span>{user.estado ? 'ACTIVA' : 'INACTIVA'}</span>
                    </p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Documento Usuario</span>
                    <p className="font-bold text-gray-700">{personData?.documentType || 'CC'} {user.documento || 'N/A'}</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Teléfono</span>
                    <p className="font-bold text-gray-700">{personData?.phone || 'N/A'}</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 col-span-2">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Dirección</span>
                    <p className="font-bold text-gray-700">{personData?.address || 'No registrada'}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer - Fixed at bottom */}
        <div className="p-5 bg-white border-t border-gray-100 flex flex-wrap gap-3 justify-end shrink-0 z-20">
          <button
            onClick={onClose}
            className="px-8 py-2.5 rounded-xl font-black text-gray-500 hover:bg-gray-200 hover:text-gray-800 active:scale-95 transition-all text-sm uppercase tracking-widest shadow-sm"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}

