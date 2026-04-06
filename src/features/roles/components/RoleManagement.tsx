import React, { useState, useEffect } from 'react';
import {
  Shield, Users, Edit, Save, X, Plus, AlertCircle,
  CheckCircle, UserCheck, UserX, Settings, Eye, Trash2, Search,
  LayoutDashboard, Calendar, Scissors, ShoppingCart,
  ShoppingBag, Truck, Box, UsersRound, Tag, Clock, Boxes,
  PackageCheck, Loader2, Briefcase, Lock, RefreshCw
} from 'lucide-react';
import { mockRoles, mockPermissions } from '@/shared/data/management';
import { roleService, type RolListDto, type RolResponseDto } from '../services/roleService';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/shared/components/ui/pagination';

interface Role {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
  isSuperUser?: boolean;
}

interface RoleManagementProps {
  hasPermission: (permission: string) => boolean;
}

export function RoleManagement({ hasPermission }: RoleManagementProps) {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [viewingRole, setViewingRole] = useState<Role | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showInactiveWarningModal, setShowInactiveWarningModal] = useState(false);
  const [showDeleteWarningModal, setShowDeleteWarningModal] = useState(false);
  const [showValidationErrorModal, setShowValidationErrorModal] = useState(false);
  const [roleToDelete, setRoleToDelete] = useState<Role | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(5);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [showSuccessAlert, setShowSuccessAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');

  // Mapping for permissions (Frontend Strings <-> Backend IDs)
  const PERMISSION_MAP = {
    'module_appointments': 1,
    'module_categories': 2,
    'module_clients': 3,
    'module_purchases': 4,
    'module_employees': 5,
    'module_deliveries': 6,
    'module_schedules': 7,
    'module_supplies': 8,
    'module_suppliers': 9,
    'module_roles': 10,
    'module_services': 11,
    'module_users': 12,
    'module_sales': 13,
    'module_dashboard': 14
  };

  const REVERSE_PERMISSION_MAP = Object.fromEntries(
    Object.entries(PERMISSION_MAP).map(([k, v]) => [v, k])
  );

  // Fetch roles from API
  const fetchRoles = async () => {
    try {
      setLoading(true);
      const response = await roleService.getRoles({
        page: currentPage,
        pageSize: itemsPerPage,
        search: searchTerm
      });
      
      const data = response.data || [];
      setTotalCount(response.totalCount || 0);
      setTotalPages(response.totalPages || 0);

      // Map API roles to internal interface
      const mappedRoles = data.map(role => {
        // Intentamos mapear los permisos por ID primero
        let permissions = (role.permisosIds || []).map(id => REVERSE_PERMISSION_MAP[id]).filter(p => p);
        
        // Si no hay permisos mapeados por ID, usamos los nombres si existen
        if (permissions.length === 0 && role.permisos && role.permisos.length > 0) {
          permissions = role.permisos;
        }

        return {
          id: role.rolId.toString(),
          name: role.nombre,
          description: role.descripcion,
          permissions: permissions,
          status: role.estado ? 'active' : 'inactive',
          createdAt: 'N/A',
          updatedAt: 'N/A',
          isSuperUser: role.nombre.toLowerCase().trim() === 'super admin'
        };
      });
      setRoles(mappedRoles);
    } catch (error) {
      console.error('Error fetching roles:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoles();
  }, [currentPage, searchTerm]);

  // New role form data
  const [newRoleData, setNewRoleData] = useState({
    name: '',
    description: '',
    permissions: []
  });

  // Módulos permitidos para gestionar roles
  const ALLOWED_MODULES = [
    'appointments',   // Agenda (ID 1)
    'categories',     // Categoría (ID 2)
    'clients',        // Clientes (ID 3)
    'purchases',      // Compras (ID 4)
    'employees',      // Empleados (ID 5)
    'deliveries',     // Entregas (ID 6)
    'schedules',      // Horarios (ID 7)
    'supplies',       // Insumo (ID 8)
    'suppliers',      // Proveedores (ID 9)
    'roles',          // Roles (ID 10)
    'services',       // Servicios (ID 11)
    'users',          // Usuarios (ID 12)
    'sales',          // Ventas (ID 13)
    'dashboard'       // Dashboard (ID 14)
  ];

  // Auto-hide success alert after 4 seconds
  useEffect(() => {
    if (showSuccessAlert) {
      const timer = setTimeout(() => {
        setShowSuccessAlert(false);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [showSuccessAlert]);

  // Agrupar permisos por módulo
  const groupPermissionsByModule = () => {
    const grouped = {};
    mockPermissions.forEach(permission => {
      if (!grouped[permission.module]) {
        grouped[permission.module] = [];
      }
      grouped[permission.module].push(permission);
    });
    return grouped;
  };

  // Definir nombres y orden de módulos
  const moduleNames = {
    appointments: 'Agenda',
    categories: 'Categoría',
    clients: 'Clientes',
    purchases: 'Compras',
    employees: 'Empleados',
    deliveries: 'Entregas',
    schedules: 'Horarios',
    supplies: 'Insumo',
    suppliers: 'Proveedores',
    roles: 'Roles',
    services: 'Servicios',
    users: 'Usuarios',
    sales: 'Ventas',
    dashboard: 'Dashboard'
  };

  // Iconos para cada módulo
  const moduleIcons = {
    dashboard: LayoutDashboard,
    users: Users,
    roles: Settings,
    appointments: Calendar,
    services: Scissors,
    sales: ShoppingCart,
    purchases: ShoppingBag,
    suppliers: Truck,
    clients: UsersRound,
    employees: Briefcase,
    categories: Tag,
    schedules: Clock,
    supplies: Boxes,
    deliveries: PackageCheck
  };

  const getModuleIcon = (module: string) => {
    return moduleIcons[module] || Settings;
  };

  const permissionsByModule = groupPermissionsByModule();

  // Reset page when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  // Ya no filtramos en el cliente, usamos lo que viene de la API
  const paginatedRoles = roles;

  const goToPage = (page: number) => {
    setCurrentPage(page);
  };

  const goToPreviousPage = () => {
    setCurrentPage(prev => Math.max(prev - 1, 1));
  };

  const goToNextPage = () => {
    setCurrentPage(prev => Math.min(prev + 1, totalPages));
  };

  const handleViewRole = async (role: any) => {
    try {
      setLoading(true);
      const fullRole = await roleService.getRoleById(parseInt(role.id));
      
      // Intentamos mapear los permisos por ID primero
      let permissions = (fullRole.permisosIds || []).map(id => REVERSE_PERMISSION_MAP[id]).filter(p => p);
      
      // Si no hay permisos mapeados pero el API devolvió nombres de permisos, los usamos
      if (permissions.length === 0 && fullRole.permisos && fullRole.permisos.length > 0) {
        permissions = fullRole.permisos;
      }

      setViewingRole({
        id: fullRole.rolId.toString(),
        name: fullRole.nombre,
        description: fullRole.descripcion,
        permissions: permissions,
        status: fullRole.estado ? 'active' : 'inactive',
        createdAt: 'N/A',
        updatedAt: 'N/A'
      });
    } catch (error) {
      console.error('Error fetching role detail:', error);
      // Fallback
      setViewingRole(role);
    } finally {
      setLoading(false);
    }
  };

  const getRoleColor = (roleId) => {
    switch (roleId) {
      case 'super_admin': return 'from-pink-500 to-purple-700';
      default: return 'from-pink-400 to-purple-500';
    }
  };

  const getRoleIcon = (roleId) => {
    switch (roleId) {
      case 'super_admin': return Shield;
      case 'admin': return Shield;
      case 'asistente': return Shield; // Use Shield as requested in the image example
      case 'customer': return Shield;  // Use Shield as requested in the image example
      default: return Settings;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'inactive': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'active': return 'Activo';
      case 'inactive': return 'Inactivo';
      default: return status;
    }
  };

  const handleCreateRole = async () => {
    if (newRoleData.name.trim() === '' || newRoleData.description.trim() === '') {
      setShowValidationErrorModal(true);
      return;
    }

    const normalizedName = newRoleData.name.trim().toLowerCase();
    if (normalizedName.includes('super')) {
      setAlertMessage('No se puede crear un rol de tipo Super Admin');
      setShowSuccessAlert(true);
      return;
    }

    try {
      setLoading(true);
      // Map frontend permission string IDs to backend numeric IDs
      const permisosIds: number[] = newRoleData.permissions
        .map((pId: string) => PERMISSION_MAP[pId as keyof typeof PERMISSION_MAP])
        .filter((id): id is number => id !== undefined);

      const payload = {
        nombre: newRoleData.name.trim(),
        descripcion: newRoleData.description.trim(),
        permisosIds
      };

      console.log('[CreateRole] Sending payload:', JSON.stringify(payload));

      await roleService.createRole(payload);

      setAlertMessage('Rol creado exitosamente');
      setShowSuccessAlert(true);
      setShowCreateModal(false);
      setNewRoleData({ name: '', description: '', permissions: [] });
      await fetchRoles();
    } catch (error: any) {
      console.error('[CreateRole] Error:', error);
      const msg = error?.message || '';
      // Extract the HTTP error body from the message if present
      const bodyMatch = msg.match(/\(\d+\): (.+)$/);
      const detail = bodyMatch ? bodyMatch[1] : msg;
      setAlertMessage(`Error al crear el rol: ${detail}`);
      setShowSuccessAlert(true);
    } finally {
      setLoading(false);
    }
  };

  const handleEditRole = async (role) => {
    setLoading(true);
    try {
      const fullRole = await roleService.getRoleById(parseInt(role.id));
      
      // Intentamos mapear los permisos por ID primero
      let permissions = (fullRole.permisosIds || []).map(id => REVERSE_PERMISSION_MAP[id]).filter(p => p);
      
      // Si no hay permisos mapeados por ID, usamos los nombres si existen
      if (permissions.length === 0 && fullRole.permisos && fullRole.permisos.length > 0) {
        permissions = fullRole.permisos;
      }

      const mappedRole = {
        id: fullRole.rolId.toString(),
        name: fullRole.nombre,
        description: fullRole.descripcion,
        permissions: permissions,
        status: fullRole.estado ? 'active' : 'inactive',
        isSuperUser: fullRole.nombre.toLowerCase().trim() === 'super admin'
      };
      setEditingRole(mappedRole);
    } catch (error) {
      console.error('Error fetching role details:', error);
      // Fallback to basic info if API fails
      setEditingRole({ ...role });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveRole = async () => {
    try {
      setLoading(true);
      const permisosIds = editingRole.permissions.map(pId => PERMISSION_MAP[pId]).filter(id => id !== undefined);

      await roleService.updateRole(parseInt(editingRole.id), {
        nombre: editingRole.name,
        descripcion: editingRole.description,
        permisosIds,
        estado: editingRole.status === 'active'
      });

      setAlertMessage('Rol actualizado exitosamente');
      setShowSuccessAlert(true);
      setEditingRole(null);
      await fetchRoles();
    } catch (error: any) {
      console.error('Error updating role:', error);
      const msg = error?.message || '';
      const bodyMatch = msg.match(/\(\d+\): (.+)$/);
      const detail = bodyMatch ? bodyMatch[1] : msg;
      setAlertMessage(`Error al actualizar el rol: ${detail}`);
      setShowSuccessAlert(true);
    } finally {
      setLoading(false);
    }
  };

  const toggleRoleStatus = async (roleId) => {
    const role = roles.find(r => r.id === roleId);
    if (!role) return;

    if ((role.name.toLowerCase() === 'super admin' || role.name === 'Administrador') && role.status === 'active') {
      setShowInactiveWarningModal(true);
      return;
    }

    try {
      setLoading(true);
      const newStatus = role.status === 'active' ? 'inactive' : 'active';

      // We need more details if we had a proper getRoleById, but we can try updating with existing info
      // Fetch current details first to be safe
      const currentDetails = await roleService.getRoleById(parseInt(roleId));

      await roleService.updateRole(parseInt(roleId), {
        nombre: currentDetails.nombre,
        descripcion: currentDetails.descripcion,
        permisosIds: currentDetails.permisosIds,
        estado: newStatus === 'active'
      });

      await fetchRoles();
    } catch (error) {
      console.error('Error toggling status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRole = (role) => {
    if (role.name.toLowerCase() === 'super admin' || role.name === 'Administrador') {
      setShowDeleteWarningModal(true);
      return;
    }
    setRoleToDelete(role);
    setShowDeleteModal(true);
  };

  const confirmDeleteRole = async () => {
    try {
      setLoading(true);
      await roleService.deleteRole(parseInt(roleToDelete.id));

      setAlertMessage('Rol eliminado exitosamente');
      setShowSuccessAlert(true);
      setShowDeleteModal(false);
      setRoleToDelete(null);
      await fetchRoles();
    } catch (error: any) {
      console.error('Error deleting role:', error);
      const msg = error?.message || '';
      const bodyMatch = msg.match(/\(\d+\): (.+)$/);
      const detail = bodyMatch ? bodyMatch[1] : msg;
      setAlertMessage(`Error al eliminar el rol: ${detail}`);
      setShowSuccessAlert(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-bold text-gray-800">Gestión de Roles</h2>
          <p className="text-gray-600">
            Administra los roles del sistema y sus permisos asociados
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
              placeholder="Buscar roles por nombre o descripción..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-pink-300 focus:border-transparent"
            />
          </div>

          <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
            <button
              onClick={fetchRoles}
              className="p-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors flex items-center justify-center"
              title="Recargar datos"
            >
              <RefreshCw className="w-5 h-5" />
            </button>

            {hasPermission('module_roles') && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="w-full md:w-auto bg-gradient-to-r from-pink-400 to-purple-500 text-white px-6 py-3 rounded-xl font-semibold hover:shadow-lg transition-all flex items-center justify-center space-x-2 whitespace-nowrap"
              >
                <Plus className="w-5 h-5" />
                <span>Registrar Rol</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Roles Table */}
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
        <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-6 border-b border-gray-100">
          <h3 className="text-xl font-bold text-gray-800">Lista de Roles</h3>
          <p className="text-gray-600">
            {totalCount} rol{totalCount !== 1 ? 'es' : ''} encontrado{totalCount !== 1 ? 's' : ''}
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-left font-semibold text-gray-800">Rol</th>
                <th className="px-6 py-4 text-left font-semibold text-gray-800">Permisos</th>
                <th className="px-6 py-4 text-left font-semibold text-gray-800">Estado</th>
                <th className="px-6 py-4 text-left font-semibold text-gray-800">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {paginatedRoles.map((role) => {
                const Icon = getRoleIcon(role.id);

                return (
                  <tr key={role.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-3">
                        <div className={`w-10 h-10 bg-gradient-to-r ${getRoleColor(role.id)} rounded-full flex items-center justify-center`}>
                          <Icon className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <div className="font-semibold text-gray-800">{role.name}</div>
                          <div className="text-sm text-gray-600">{role.description}</div>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        <span className="text-sm text-gray-700">
                          {role.permissions.length} permiso{role.permissions.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-3">
                        {role.id === 'super_admin' || role.isSuperUser ? (
                          // Super admin siempre activo, sin switch
                          <div className="flex items-center space-x-2">
                            <div className="w-11 h-6 bg-gradient-to-r from-pink-400 to-purple-500 rounded-full relative">
                              <div className="absolute top-[2px] right-[2px] bg-white border-white border rounded-full h-5 w-5"></div>
                            </div>
                            <span className="ml-1 text-sm font-medium text-green-600">
                              Activo
                            </span>
                          </div>
                        ) : (
                          // Otros roles con switch
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={role.status === 'active'}
                              onChange={() => toggleRoleStatus(role.id)}
                              className="sr-only peer"
                            />
                            <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-pink-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-pink-400 peer-checked:to-purple-500"></div>
                            <span className={`ml - 3 text - sm font - medium ${role.status === 'active' ? 'text-green-600' : 'text-red-600'
                              } `}>
                              {role.status === 'active' ? 'Activo' : 'Inactivo'}
                            </span>
                          </label>
                        )}
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleViewRole(role)}
                          className="p-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                          title="Ver detalle"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {hasPermission('module_roles') && (
                          <>
                            <button
                              onClick={() => handleEditRole(role)}
                              className="p-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
                              title="Editar rol"
                            >
                              <Edit className="w-4 h-4" />
                            </button>

                            <button
                              onClick={() => handleDeleteRole(role)}
                              className="p-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
                              title="Eliminar rol"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-6 py-4 flex flex-col sm:flex-row items-center justify-between border-t border-gray-100 gap-4">
          <div className="text-sm text-gray-500">
            Mostrando {totalCount > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0} a {Math.min(currentPage * itemsPerPage, totalCount)} de {totalCount} entradas
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={goToPreviousPage}
              disabled={currentPage === 1}
              className="w-8 h-8 flex items-center justify-center rounded-xl bg-white border border-gray-200 text-gray-400 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
            </button>

            {[...Array(totalPages)].map((_, index) => {
              const pageNum = index + 1;
              return (
                <button
                  key={pageNum}
                  onClick={() => goToPage(pageNum)}
                  className={`w-8 h-8 text-sm flex items-center justify-center rounded-xl font-bold transition-all ${currentPage === pageNum
                    ? 'bg-pink-500 text-white shadow-md shadow-pink-500/30'
                    : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 shadow-sm'
                    }`}
                >
                  {pageNum}
                </button>
              );
            })}

            <button
              onClick={goToNextPage}
              disabled={totalPages <= 1 || currentPage === totalPages}
              className="w-8 h-8 flex items-center justify-center rounded-xl bg-white border border-gray-200 text-gray-400 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
            </button>
          </div>
        </div>
      </div>

      {/* Create Role Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Header - Fixed at top */}
            <div className="bg-gradient-to-r from-pink-500 to-purple-600 p-5 text-white shrink-0 shadow-md z-20">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                    <Plus className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold leading-tight">Registrar Nuevo Rol</h3>
                    <p className="text-pink-100 text-sm">Define un nuevo rol y sus permisos</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <button
                    onClick={handleCreateRole}
                    disabled={loading}
                    className="flex items-center space-x-2 bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-xl transition-all font-bold text-xs uppercase tracking-widest backdrop-blur-sm shadow-sm"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    <span>{loading ? 'Guardando...' : 'Guardar'}</span>
                  </button>
                  <button
                    onClick={() => {
                      setShowCreateModal(false);
                      setNewRoleData({ name: '', description: '', permissions: [] });
                    }}
                    className="w-9 h-9 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/30 hover:scale-110 active:scale-95 transition-all shadow-sm"
                  >
                    <X className="w-5 h-5 text-white" />
                  </button>
                </div>
              </div>
            </div>

            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto p-6 lg:p-8 bg-gray-50/30 no-scrollbar">
              <style>{`
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
              `}</style>

              <div className="max-w-4xl mx-auto space-y-6">
                {/* Form Alert if needed */}
                {(newRoleData.name.trim() === '' || newRoleData.description.trim() === '') && showValidationErrorModal && (
                  <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-xl flex items-center space-x-3 animate-in slide-in-from-left-2 duration-200">
                    <AlertCircle className="w-5 h-5 text-red-500" />
                    <p className="text-sm text-red-700">Por favor, completa los campos obligatorios.</p>
                  </div>
                )}

                <div className="grid md:grid-cols-2 gap-6">
                  {/* Basic Info Card */}
                  <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-5">
                    <div className="flex items-center space-x-2 text-pink-500">
                      <Settings className="w-4 h-4" />
                      <h4 className="font-bold uppercase text-[10px] tracking-widest">Información del Rol</h4>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">Nombre del Rol *</label>
                        <input
                          type="text"
                          value={newRoleData.name}
                          onChange={(e) => setNewRoleData({ ...newRoleData, name: e.target.value })}
                          className="w-full px-4 py-3 bg-gray-50/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-300 focus:border-transparent transition-all font-medium text-gray-700"
                          placeholder="Ej: Supervisor de Salón"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">Descripción *</label>
                        <textarea
                          value={newRoleData.description}
                          onChange={(e) => setNewRoleData({ ...newRoleData, description: e.target.value })}
                          className="w-full px-4 py-3 bg-gray-50/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-300 focus:border-transparent transition-all font-medium text-gray-700 resize-none"
                          rows={4}
                          placeholder="Describe las funciones y responsabilidades..."
                        />
                      </div>
                    </div>
                  </div>

                  {/* Permissions Summary Card */}
                  <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm flex flex-col justify-center items-center text-center space-y-4">
                    <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mb-2">
                      <Lock className="w-8 h-8 text-purple-600" />
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-800 text-lg">Resumen de Accesos</h4>
                      <p className="text-sm text-gray-500 px-4">Has seleccionado <span className="font-bold text-purple-600">{newRoleData.permissions.length}</span> permisos para este rol.</p>
                    </div>
                    <div className="w-full h-px bg-gray-100 my-2"></div>
                    <div className="flex items-center space-x-2 text-[10px] font-black uppercase tracking-widest text-gray-400">
                      <Shield className="w-3 h-3" />
                      <span>Seguridad del Sistema</span>
                    </div>
                  </div>
                </div>

                {/* Permissions Selection Section */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="px-6 py-4 bg-gray-50/50 border-b border-gray-100 flex items-center justify-between">
                    <h4 className="font-bold text-gray-700 text-sm flex items-center space-x-2">
                      <Lock className="w-4 h-4 text-purple-400" />
                      <span>Configuración de Permisos por Módulo</span>
                    </h4>
                    <span className="text-[10px] font-black bg-purple-100 text-purple-600 px-2 py-0.5 rounded-full uppercase">
                      Selecciona los módulos
                    </span>
                  </div>

                  <div className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {ALLOWED_MODULES
                        .filter(module => permissionsByModule[module])
                        .map(module => {
                          const ModuleIcon = getModuleIcon(module);
                          const modulePermissions = permissionsByModule[module].map(p => p.id);
                          const isModuleSelected = modulePermissions.every(permId =>
                            newRoleData.permissions.includes(permId)
                          );

                          return (
                            <label
                              key={module}
                              className={`flex items-center space-x-4 p-4 border-2 rounded-2xl cursor-pointer transition-all ${isModuleSelected
                                ? 'border-pink-400 bg-pink-50/30 shadow-sm ring-1 ring-pink-100'
                                : 'border-gray-100 hover:border-pink-200 hover:bg-gray-50'
                                }`}
                            >
                              <div className="relative flex items-center justify-center">
                                <input
                                  type="checkbox"
                                  checked={isModuleSelected}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setNewRoleData({
                                        ...newRoleData,
                                        permissions: [...new Set([...newRoleData.permissions, ...modulePermissions])]
                                      });
                                    } else {
                                      setNewRoleData({
                                        ...newRoleData,
                                        permissions: newRoleData.permissions.filter(p => !modulePermissions.includes(p))
                                      });
                                    }
                                  }}
                                  className="sr-only"
                                />
                                <div className={`w-6 h-6 border-2 rounded-lg flex items-center justify-center transition-all ${isModuleSelected
                                  ? 'bg-gradient-to-r from-pink-400 to-purple-500 border-transparent shadow-sm'
                                  : 'border-gray-200 bg-white'
                                  }`}>
                                  {isModuleSelected && <CheckCircle className="w-3.5 h-3.5 text-white" />}
                                </div>
                              </div>

                              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isModuleSelected
                                ? 'bg-gradient-to-r from-pink-400 to-purple-500 shadow-sm'
                                : 'bg-gray-100'
                                }`}>
                                <ModuleIcon className={`w-5 h-5 ${isModuleSelected ? 'text-white' : 'text-gray-500'}`} />
                              </div>

                              <div className="flex-1">
                                <div className={`font-bold text-sm ${isModuleSelected ? 'text-purple-700' : 'text-gray-700'}`}>
                                  {moduleNames[module as keyof typeof moduleNames]}
                                </div>
                                <div className="text-[10px] text-gray-400 font-medium">
                                  {isModuleSelected ? 'Habilitado' : 'Sin acceso'}
                                </div>
                              </div>
                            </label>
                          );
                        })}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer - Fixed at bottom */}
            <div className="p-5 bg-white border-t border-gray-100 flex flex-wrap gap-3 justify-end shrink-0 z-20">
              <button
                type="button"
                onClick={() => {
                  setShowCreateModal(false);
                  setNewRoleData({ name: '', description: '', permissions: [] });
                }}
                className="px-8 py-2.5 rounded-xl font-black text-gray-500 hover:bg-gray-200 hover:text-gray-800 active:scale-95 transition-all text-sm uppercase tracking-widest shadow-sm"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateRole}
                disabled={loading}
                className="px-8 py-2.5 bg-gradient-to-r from-pink-400 to-purple-500 text-white rounded-xl font-black hover:shadow-lg active:scale-95 transition-all text-sm uppercase tracking-widest shadow-md flex items-center space-x-2"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                <span>{loading ? 'Creando...' : 'Crear Rol'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Role Modal */}
      {viewingRole && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Header - Fixed at top */}
            <div className="bg-gradient-to-r from-pink-500 to-purple-600 p-5 text-white shrink-0 shadow-md z-20">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                    {React.createElement(getRoleIcon(viewingRole.id), { className: "w-6 h-6 text-white" })}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold leading-tight">Detalle del Rol: {viewingRole.name}</h3>
                    <p className="text-pink-100 text-sm">Configuración de accesos y permisos</p>
                  </div>
                </div>
                <button
                  onClick={() => setViewingRole(null)}
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
                  {/* General Info Card */}
                  <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm md:col-span-2">
                    <div className="flex items-center space-x-2 text-pink-500 mb-3">
                      <Shield className="w-4 h-4" />
                      <h4 className="font-bold uppercase text-[10px] tracking-widest">Información General</h4>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">Identificador:</span>
                        <p className="font-mono text-gray-600 text-sm">#{viewingRole.id}</p>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">Creado el:</span>
                        <p className="font-bold text-gray-700 text-sm">{viewingRole.createdAt || 'N/A'}</p>
                      </div>
                    </div>
                    <div className="mt-4 pt-4 border-t border-gray-50">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">Descripción:</span>
                      <p className="text-gray-700 text-sm mt-1 italic">{viewingRole.description || 'Sin descripción disponible.'}</p>
                    </div>
                  </div>

                  {/* Status Card */}
                  <div className={`rounded-2xl p-5 border shadow-sm flex flex-col items-center justify-center ${
                    viewingRole.status === 'active' 
                    ? 'bg-green-50/50 border-green-100 text-green-600' 
                    : 'bg-red-50/50 border-red-100 text-red-600'
                  }`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center mb-2 ${
                      viewingRole.status === 'active' ? 'bg-green-100' : 'bg-red-100'
                    }`}>
                      {viewingRole.status === 'active' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                    </div>
                    <span className="font-black uppercase text-[10px] tracking-[0.2em]">
                      {viewingRole.status === 'active' ? 'Rol Activo' : 'Rol Inactivo'}
                    </span>
                  </div>
                </div>

                {/* Permissions Section */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="px-6 py-4 bg-gray-50/50 border-b border-gray-100 flex items-center justify-between">
                    <h4 className="font-bold text-gray-700 text-sm flex items-center space-x-2">
                      <Lock className="w-4 h-4 text-purple-400" />
                      <span>Permisos y Accesos Asignados</span>
                    </h4>
                    <span className="text-[10px] font-black bg-purple-100 text-purple-600 px-2 py-0.5 rounded-full uppercase">
                      {viewingRole.isSuperUser ? 'Acceso Total' : `${viewingRole.permissions.length} permisos`}
                    </span>
                  </div>
                  
                  <div className="p-6">
                    {viewingRole.isSuperUser ? (
                      <div className="bg-purple-50 border border-purple-100 rounded-2xl p-6 flex flex-col items-center text-center space-y-3">
                        <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                          <Shield className="w-6 h-6 text-purple-600" />
                        </div>
                        <div>
                          <h5 className="font-bold text-purple-900">Permisos Totales Protegidos</h5>
                          <p className="text-sm text-purple-700">Este rol tiene acceso completo a todos los módulos y funciones del sistema por seguridad.</p>
                        </div>
                        <div className="flex flex-wrap justify-center gap-2 mt-2">
                          {mockPermissions.map((permission) => (
                            <span key={permission.id} className="px-3 py-1 bg-white border border-purple-100 text-[10px] font-bold text-purple-600 rounded-full uppercase tracking-wider">
                              {permission.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {viewingRole.permissions.length > 0 ? (
                          viewingRole.permissions.map((perm) => {
                            // Si perm ya es un objeto de permiso (por alguna razón) o es un ID
                            const permission = mockPermissions.find(p => p.id === perm || p.name === perm);
                            const displayName = permission ? permission.name : perm;
                            
                            return (
                              <div key={perm} className="flex items-center space-x-3 p-3 bg-gray-50/50 rounded-xl border border-gray-100 hover:bg-gray-50 transition-colors">
                                <div className="w-2 h-2 rounded-full bg-purple-400" />
                                <span className="text-xs font-bold text-gray-700">{displayName}</span>
                              </div>
                            );
                          })
                        ) : (
                          <div className="col-span-full py-8 flex flex-col items-center justify-center text-gray-400 space-y-2">
                            <Lock className="w-8 h-8 opacity-20" />
                            <p className="text-sm font-medium">No hay permisos asignados a este rol.</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Footer - Fixed at bottom */}
            <div className="p-5 bg-white border-t border-gray-100 flex flex-wrap gap-3 justify-end shrink-0 z-20">
              <button
                onClick={() => setViewingRole(null)}
                className="px-8 py-2.5 rounded-xl font-black text-gray-500 hover:bg-gray-200 hover:text-gray-800 active:scale-95 transition-all text-sm uppercase tracking-widest shadow-sm"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Role Modal */}
      {editingRole && (() => {
        // Verificar si es el Super Admin
        const isSuperAdmin = editingRole.id === 'super_admin' || editingRole.isSuperUser;
        // Si es super admin, asegurarse de que tenga todos los permisos
        const allPermissions = mockPermissions.map(p => p.id);
        if (isSuperAdmin && editingRole.permissions.length !== allPermissions.length) {
          editingRole.permissions = allPermissions;
        }

        return (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
              {/* Header - Fixed at top */}
              <div className="bg-gradient-to-r from-pink-500 to-purple-600 p-5 text-white shrink-0 shadow-md z-20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm shadow-inner">
                      {React.createElement(getRoleIcon(editingRole.id), { className: "w-6 h-6 text-white" })}
                    </div>
                    <div>
                      <h3 className="text-xl font-bold leading-tight">Editar Rol: {editingRole.name}</h3>
                      <p className="text-pink-100 text-sm">
                        {isSuperAdmin
                          ? 'Rol de sistema con permisos totales protegidos'
                          : 'Configura las capacidades y descripción del rol'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    {!isSuperAdmin && (
                      <button
                        onClick={handleSaveRole}
                        disabled={loading}
                        className="flex items-center space-x-2 bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-xl transition-all font-bold text-xs uppercase tracking-widest backdrop-blur-sm shadow-sm"
                      >
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        <span>{loading ? 'Guardando...' : 'Guardar'}</span>
                      </button>
                    )}
                    <button
                      onClick={() => setEditingRole(null)}
                      className="w-9 h-9 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/30 hover:scale-110 active:scale-95 transition-all shadow-sm"
                    >
                      <X className="w-5 h-5 text-white" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Scrollable Body */}
              <div className="flex-1 overflow-y-auto p-6 lg:p-8 bg-gray-50/30 no-scrollbar">
                <style>{`
                  .no-scrollbar::-webkit-scrollbar { display: none; }
                  .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
                `}</style>

                <div className="max-w-4xl mx-auto space-y-6">
                  {/* Mensaje informativo para Super Admin */}
                  {isSuperAdmin && (
                    <div className="bg-gradient-to-r from-pink-50 to-purple-50 border-2 border-pink-200 rounded-2xl p-5 animate-in fade-in duration-500">
                      <div className="flex items-start space-x-4">
                        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm shrink-0">
                          <Shield className="w-6 h-6 text-purple-600" />
                        </div>
                        <div>
                          <h4 className="font-bold text-gray-800 mb-1">Rol del Sistema Protegido</h4>
                          <p className="text-sm text-gray-700 leading-relaxed">
                            El rol <span className="font-bold text-purple-600">Super Admin</span> tiene todos los permisos habilitados de forma permanente.
                            Esta configuración garantiza el acceso total para la administración del sistema y no puede ser modificado.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="grid md:grid-cols-2 gap-6">
                    {/* Basic Info Card */}
                    <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-5">
                      <div className="flex items-center space-x-2 text-pink-500">
                        <Settings className="w-4 h-4" />
                        <h4 className="font-bold uppercase text-[10px] tracking-widest">Identidad del Rol</h4>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">Nombre del Rol</label>
                          <input
                            type="text"
                            value={editingRole.name}
                            onChange={(e) => setEditingRole({ ...editingRole, name: e.target.value })}
                            disabled={isSuperAdmin}
                            className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-pink-300 focus:border-transparent transition-all font-medium ${isSuperAdmin ? 'bg-gray-100 text-gray-500 border-gray-200 cursor-not-allowed' : 'bg-gray-50/50 border-gray-200 text-gray-700'
                              }`}
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">Descripción</label>
                          <textarea
                            value={editingRole.description}
                            onChange={(e) => setEditingRole({ ...editingRole, description: e.target.value })}
                            disabled={isSuperAdmin}
                            className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-pink-300 focus:border-transparent transition-all font-medium resize-none ${isSuperAdmin ? 'bg-gray-100 text-gray-500 border-gray-200 cursor-not-allowed' : 'bg-gray-50/50 border-gray-200 text-gray-700'
                              }`}
                            rows={4}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Permissions Summary Card */}
                    <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm flex flex-col justify-center items-center text-center space-y-4">
                      <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-2 ${isSuperAdmin ? 'bg-pink-100' : 'bg-purple-100'}`}>
                        {isSuperAdmin ? <Shield className="w-8 h-8 text-pink-600" /> : <Lock className="w-8 h-8 text-purple-600" />}
                      </div>
                      <div>
                        <h4 className="font-bold text-gray-800 text-lg">Permisos Asignados</h4>
                        <p className="text-sm text-gray-500 px-4">Este rol cuenta con <span className="font-bold text-purple-600">{editingRole.permissions.length}</span> permisos activos en el sistema.</p>
                      </div>
                      <div className="w-full h-px bg-gray-100 my-2"></div>
                      <div className="flex items-center space-x-2 text-[10px] font-black uppercase tracking-widest text-gray-400">
                        <Shield className="w-3 h-3" />
                        <span>Estado: {editingRole.status === 'active' ? 'Activo' : 'Inactivo'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Permissions Selection Section */}
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="px-6 py-4 bg-gray-50/50 border-b border-gray-100 flex items-center justify-between">
                      <h4 className="font-bold text-gray-700 text-sm flex items-center space-x-2">
                        <Lock className="w-4 h-4 text-purple-400" />
                        <span>Configuración de Accesos</span>
                      </h4>
                      {isSuperAdmin && (
                        <span className="text-[10px] font-black bg-pink-100 text-pink-600 px-2 py-0.5 rounded-full uppercase">
                          Control Total Habilitado
                        </span>
                      )}
                    </div>

                    <div className="p-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {ALLOWED_MODULES
                          .filter(module => permissionsByModule[module])
                          .map(module => {
                            const ModuleIcon = getModuleIcon(module);
                            const modulePermissions = permissionsByModule[module].map(p => p.id);
                            const isModuleSelected = modulePermissions.every(permId =>
                              editingRole.permissions.includes(permId)
                            );

                            return (
                              <label
                                key={module}
                                className={`flex items-center space-x-4 p-4 border-2 rounded-2xl transition-all ${isSuperAdmin
                                  ? 'bg-gray-50 border-gray-100 cursor-not-allowed opacity-80'
                                  : isModuleSelected
                                    ? 'border-pink-400 bg-pink-50/30 shadow-sm ring-1 ring-pink-100 cursor-pointer'
                                    : 'border-gray-100 hover:border-pink-200 hover:bg-gray-50 cursor-pointer'
                                  }`}
                              >
                                <div className="relative flex items-center justify-center">
                                  <input
                                    type="checkbox"
                                    checked={isModuleSelected}
                                    disabled={isSuperAdmin}
                                    onChange={(e) => {
                                      if (!isSuperAdmin) {
                                        if (e.target.checked) {
                                          setEditingRole({
                                            ...editingRole,
                                            permissions: [...new Set([...editingRole.permissions, ...modulePermissions])]
                                          });
                                        } else {
                                          setEditingRole({
                                            ...editingRole,
                                            permissions: editingRole.permissions.filter(p => !modulePermissions.includes(p))
                                          });
                                        }
                                      }
                                    }}
                                    className="sr-only"
                                  />
                                  <div className={`w-6 h-6 border-2 rounded-lg flex items-center justify-center transition-all ${isModuleSelected
                                    ? 'bg-gradient-to-r from-pink-400 to-purple-500 border-transparent shadow-sm'
                                    : 'border-gray-200 bg-white'
                                    }`}>
                                    {isModuleSelected && <CheckCircle className="w-3.5 h-3.5 text-white" />}
                                  </div>
                                </div>

                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isModuleSelected
                                  ? 'bg-gradient-to-r from-pink-400 to-purple-500 shadow-sm'
                                  : 'bg-gray-100'
                                  }`}>
                                  <ModuleIcon className={`w-5 h-5 ${isModuleSelected ? 'text-white' : 'text-gray-500'}`} />
                                </div>

                                <div className="flex-1">
                                  <div className={`font-bold text-sm ${isModuleSelected ? 'text-purple-700' : 'text-gray-700'}`}>
                                    {moduleNames[module as keyof typeof moduleNames]}
                                  </div>
                                  <div className="text-[10px] text-gray-400 font-medium">
                                    {isModuleSelected ? 'Acceso Permitido' : 'Sin acceso'}
                                  </div>
                                </div>
                              </label>
                            );
                          })}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer - Fixed at bottom */}
              <div className="p-5 bg-white border-t border-gray-100 flex flex-wrap gap-3 justify-end shrink-0 z-20">
                <button
                  type="button"
                  onClick={() => setEditingRole(null)}
                  className="px-8 py-2.5 rounded-xl font-black text-gray-500 hover:bg-gray-200 hover:text-gray-800 active:scale-95 transition-all text-sm uppercase tracking-widest shadow-sm"
                >
                  {isSuperAdmin ? 'Cerrar' : 'Cancelar'}
                </button>
                {!isSuperAdmin && (
                  <button
                    onClick={handleSaveRole}
                    disabled={loading}
                    className="px-8 py-2.5 bg-gradient-to-r from-pink-400 to-purple-500 text-white rounded-xl font-black hover:shadow-lg active:scale-95 transition-all text-sm uppercase tracking-widest shadow-md flex items-center space-x-2"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    <span>{loading ? 'Guardando...' : 'Actualizar Rol'}</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Delete Role Modal */}
      {showDeleteModal && roleToDelete && (
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
                <div className="w-20 h-20 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-red-100 rotate-3">
                  <AlertCircle className="w-10 h-10 text-red-500 -rotate-3" />
                </div>
                <h4 className="text-lg font-bold text-gray-800 mb-2">
                  ¿Eliminar rol "{roleToDelete.name}"?
                </h4>
                <p className="text-sm text-gray-500 leading-relaxed mb-6">
                  Estás a punto de eliminar este rol de forma permanente. 
                  Esta acción afectará los accesos de los usuarios que tengan este rol asignado.
                </p>
                
                <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 flex items-center space-x-4">
                  <div className={`w-12 h-12 bg-gradient-to-r ${getRoleColor(roleToDelete.id)} rounded-xl shadow-sm flex items-center justify-center`}>
                    {React.createElement(getRoleIcon(roleToDelete.id), { className: "w-6 h-6 text-white" })}
                  </div>
                  <div className="text-left">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Rol a eliminar</p>
                    <p className="font-bold text-gray-700">{roleToDelete.name}</p>
                    <p className="text-[10px] text-gray-400 uppercase">{roleToDelete.permissions.length} permisos asignados</p>
                  </div>
                </div>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  disabled={loading}
                  className="flex-1 px-6 py-3 rounded-xl font-black text-gray-400 hover:bg-gray-100 transition-all text-[10px] uppercase tracking-widest disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmDeleteRole}
                  disabled={loading}
                  className="flex-1 bg-gradient-to-r from-red-500 to-red-600 text-white px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:shadow-lg hover:scale-105 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center space-x-2"
                >
                  {loading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="w-3.5 h-3.5" />
                  )}
                  <span>Eliminar</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Inactive Role Warning Modal */}
      {showInactiveWarningModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="bg-gradient-to-r from-red-500 to-pink-600 p-5 text-white shrink-0 shadow-md">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm shadow-inner">
                    <Shield className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold leading-tight">Acción No Permitida</h3>
                    <p className="text-red-100 text-xs font-medium">Restricción de seguridad</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowInactiveWarningModal(false)}
                  className="w-9 h-9 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/30 transition-all"
                >
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>
            </div>

            <div className="p-8 text-center">
              <div className="w-20 h-20 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-red-100">
                <AlertCircle className="w-10 h-10 text-red-500" />
              </div>
              <h4 className="text-lg font-bold text-gray-800 mb-2">
                No se puede inactivar el Administrador
              </h4>
              <p className="text-sm text-gray-500 leading-relaxed mb-6">
                Por motivos de seguridad y para garantizar que siempre haya acceso administrativo al sistema, 
                el rol de Administrador principal no puede ser desactivado.
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

      {/* Delete Role Warning Modal */}
      {showDeleteWarningModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="bg-gradient-to-r from-red-500 to-pink-600 p-5 text-white shrink-0 shadow-md">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm shadow-inner">
                    <Trash2 className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold leading-tight">Rol Protegido</h3>
                    <p className="text-red-100 text-xs font-medium">Elemento del sistema</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowDeleteWarningModal(false)}
                  className="w-9 h-9 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/30 transition-all"
                >
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>
            </div>

            <div className="p-8 text-center">
              <div className="w-20 h-20 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-red-100">
                <Shield className="w-10 h-10 text-red-500" />
              </div>
              <h4 className="text-lg font-bold text-gray-800 mb-2">
                No se puede eliminar roles principales
              </h4>
              <p className="text-sm text-gray-500 leading-relaxed mb-6">
                Los roles de Administrador y Super Admin son esenciales para el funcionamiento del sistema 
                y no pueden ser eliminados bajo ninguna circunstancia.
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

      {/* Validation Error Modal */}
      {showValidationErrorModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="bg-gradient-to-r from-red-500 to-pink-600 p-5 text-white shrink-0 shadow-md">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm shadow-inner">
                    <AlertCircle className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold leading-tight">Campos Requeridos</h3>
                    <p className="text-red-100 text-xs font-medium">Error de validación</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowValidationErrorModal(false)}
                  className="w-9 h-9 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/30 transition-all"
                >
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>
            </div>

            <div className="p-8 text-center">
              <div className="w-20 h-20 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-red-100">
                <AlertCircle className="w-10 h-10 text-red-500" />
              </div>
              <h4 className="text-lg font-bold text-gray-800 mb-2">
                Falta información obligatoria
              </h4>
              <p className="text-sm text-gray-500 leading-relaxed mb-6 italic">
                Debes completar el nombre y la descripción del rol antes de crearlo.
              </p>
              
              <button
                onClick={() => setShowValidationErrorModal(false)}
                className="w-full bg-red-500 hover:bg-red-600 text-white px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all shadow-md shadow-red-200"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Alert */}
      {showSuccessAlert && (
        <div className="fixed bottom-4 right-4 z-[60] animate-in slide-in-from-bottom-5 duration-300">
          <div className="bg-gradient-to-r from-pink-400 to-purple-500 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center space-x-4 min-w-[320px]">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-white" />
              </div>
            </div>
            <div className="flex-1">
              <p className="font-semibold">{alertMessage}</p>
            </div>
            <button
              onClick={() => setShowSuccessAlert(false)}
              className="flex-shrink-0 w-8 h-8 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Loading Overlay */}
      {loading && (
        <div className="fixed inset-0 bg-white/10 backdrop-blur-[2px] z-[100] flex items-center justify-center">
          <div className="bg-white/80 p-8 rounded-3xl shadow-2xl flex flex-col items-center space-y-4 border border-white/50 animate-in zoom-in-95 duration-200">
            <div className="relative">
              <Loader2 className="w-14 h-14 text-pink-500 animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <Shield className="w-6 h-6 text-purple-600 animate-pulse" />
              </div>
            </div>
            <div className="flex flex-col items-center">
              <p className="text-gray-800 font-bold text-lg">Procesando</p>
              <p className="text-pink-600 text-sm animate-pulse font-medium">Sincronizando con la API...</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}