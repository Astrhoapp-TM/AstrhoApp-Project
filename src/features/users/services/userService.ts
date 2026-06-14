import { apiClient, type PaginatedResponse } from '@/shared/services/apiClient';

// ── Interfaces ──

export interface UsuarioListItem {
    usuarioId: number;
    email: string;
    contrasena?: string;
    estado: boolean;
    rolNombre: string;
}

export interface UsuarioDetail {
    usuarioId: number;
    email: string;
    contrasena?: string;
    estado: boolean;
    rol: {
        rolId: number;
        nombre: string;
        descripcion: string;
    };
    documento?: string;
    documentoCliente?: string;
    documentoEmpleado?: string;
}

export interface UpdateUsuarioDto {
    rolId: number;
    email: string;
    contrasena?: string;
    confirmarContrasena?: string;
    estado: boolean;
    documento?: string;
}

// ── User Service ──

export const userService = {
    getAll: async (params?: { page?: number; pageSize?: number; search?: string }): Promise<PaginatedResponse<UsuarioListItem>> => {
        const response = await apiClient.get<any>('/api/Usuarios', params);
        
        let processedData: UsuarioListItem[] = [];
        
        if (response && response.data && Array.isArray(response.data)) {
            processedData = response.data.map((user: UsuarioListItem) => {
                // Force Super Admin to always be active
                if ((user.rolNombre || '').toLowerCase().includes('super admin')) {
                    return { ...user, estado: true };
                }
                return user;
            });
            return { ...response, data: processedData };
        }

        // Fallback for simple array response
        if (Array.isArray(response)) {
            processedData = response.map((user: UsuarioListItem) => {
                if ((user.rolNombre || '').toLowerCase().includes('super admin')) {
                    return { ...user, estado: true };
                }
                return user;
            });
            return {
                data: processedData,
                totalCount: processedData.length,
                page: params?.page || 1,
                pageSize: params?.pageSize || processedData.length,
                totalPages: 1
            };
        }

        return { data: [], totalCount: 0, page: 1, pageSize: 10, totalPages: 0 };
    },

    getById: async (id: number): Promise<UsuarioDetail> => {
        const user = await apiClient.get<UsuarioDetail>(`/api/Usuarios/${id}`);
        // Force Super Admin to always be active
        if ((user.rol?.nombre || '').toLowerCase().includes('super admin')) {
            return { ...user, estado: true };
        }
        return user;
    },

    update: async (id: number, data: UpdateUsuarioDto): Promise<void> => {
        return apiClient.put<void>(`/api/Usuarios/${id}`, data);
    },

    delete: async (id: number): Promise<void> => {
        // First get the associated person (client or employee)
        const personInfo = await userService.getPersonForUser({ usuarioId: id });
        
        if (personInfo) {
            try {
                if (personInfo.type === 'client') {
                    // Delete client first
                    await apiClient.delete(`/api/Clientes/${personInfo.documentId}`);
                } else if (personInfo.type === 'employee') {
                    // Delete employee first
                    await apiClient.delete(`/api/Empleados/${personInfo.documentId}`);
                }
            } catch (error) {
                console.error('Error deleting associated client/employee:', error);
            }
        }
        
        // Then delete the user
        return apiClient.delete<void>(`/api/Usuarios/${id}`);
    },

    getPersonForUser: async (user: any): Promise<{ 
        documentId: string; 
        documentType: string;
        name: string;
        phone: string;
        address: string;
        type: 'client' | 'employee' 
    } | null> => {
        try {
            console.log('🔍 [getPersonForUser] Starting with user:', user);
            if (!user) {
                console.log('❌ [getPersonForUser] No user provided');
                return null;
            }

            // Normalize role name
            const roleName = (user.rol?.nombre || user.rolNombre || user.role || '').toLowerCase().trim();
            console.log('🔍 [getPersonForUser] Extracted roleName:', roleName);
            
            // ROLE LOGIC:
            // 'cliente', 'customer' -> Clients table
            // 'administrador', 'asistente', 'super admin', 'admin', etc. -> Employees table
            const isClient = roleName === 'cliente' || roleName === 'customer';
            console.log('🔍 [getPersonForUser] isClient:', isClient);
            
            const userId = user.usuarioId || user.id;
            console.log('🔍 [getPersonForUser] userId:', userId);
            if (!userId) {
                console.log('❌ [getPersonForUser] No userId found');
                return null;
            }

            const targetId = Number(userId);
            console.log('🔍 [getPersonForUser] targetId:', targetId);

            // Helper function to get address from data
            const getAddress = (data: any, type: 'client' | 'employee') => {
                const common = data.direccion || data.address || data.Direccion || data['dirección'] || data['Dirección'] || '';
                if (type === 'client') {
                    return data.direccionCliente || data.direccion_cliente || data['direcciónCliente'] || common;
                } else {
                    return data.direccionEmpleado || data.direccion_empleado || data['direcciónEmpleado'] || common;
                }
            };

            // 1. First priority: Search by usuarioId in the corresponding table
            if (isClient) {
                console.log('🔍 [getPersonForUser] Searching in /api/Clientes by usuarioId');
                // Search in /Clientes
                const clients = await apiClient.getAllPages<any>('/api/Clientes').catch((err) => {
                    console.error('❌ [getPersonForUser] Error fetching /api/Clientes:', err);
                    return [];
                });
                console.log('🔍 [getPersonForUser] All clients:', clients);
                const client = clients.find((c: any) => Number(c.usuarioId) === targetId);
                console.log('🔍 [getPersonForUser] Found client:', client);
                
                if (client) {
                    console.log('✅ [getPersonForUser] Found client, client keys:', Object.keys(client));
                    const address = getAddress(client, 'client');
                    console.log('✅ [getPersonForUser] Client address:', address);
                    return {
                        documentId: client.documentoCliente,
                        documentType: client.tipoDocumento || 'CC',
                        name: client.nombre || 'Cliente',
                        phone: client.telefono || '',
                        address: address,
                        type: 'client'
                    };
                }
            } else {
                console.log('🔍 [getPersonForUser] Searching in /api/Empleados by usuarioId');
                // Search in /Empleados (for Admin, Assistant, Super Admin, etc.)
                const employees = await apiClient.getAllPages<any>('/api/Empleados').catch((err) => {
                    console.error('❌ [getPersonForUser] Error fetching /api/Empleados:', err);
                    return [];
                });
                console.log('🔍 [getPersonForUser] All employees:', employees);
                const employee = employees.find((e: any) => Number(e.usuarioId) === targetId);
                console.log('🔍 [getPersonForUser] Found employee:', employee);
                
                if (employee) {
                    console.log('✅ [getPersonForUser] Found employee, employee keys:', Object.keys(employee));
                    const address = getAddress(employee, 'employee');
                    console.log('✅ [getPersonForUser] Employee address:', address);
                    return {
                        documentId: employee.documentoEmpleado,
                        documentType: employee.tipoDocumento || 'CC',
                        name: employee.nombre || 'Empleado',
                        phone: employee.telefono || '',
                        address: address,
                        type: 'employee'
                    };
                }
            }

            // 2. Cross-search in BOTH tables just in case
            console.log('🔍 [getPersonForUser] Cross-searching both tables');
            const [allClients, allEmployees] = await Promise.all([
                apiClient.getAllPages<any>('/api/Clientes').catch(() => []),
                apiClient.getAllPages<any>('/api/Empleados').catch(() => [])
            ]);

            const foundClient = allClients.find((x: any) => Number(x.usuarioId) === targetId);
            console.log('🔍 [getPersonForUser] Cross-search found client:', foundClient);
            if (foundClient) {
                console.log('✅ [getPersonForUser] Cross-search found client, client keys:', Object.keys(foundClient));
                const address = getAddress(foundClient, 'client');
                console.log('✅ [getPersonForUser] Cross-search client address:', address);
                return {
                    documentId: foundClient.documentoCliente,
                    documentType: foundClient.tipoDocumento || 'CC',
                    name: foundClient.nombre || 'Cliente',
                    phone: foundClient.telefono || '',
                    address: address,
                    type: 'client'
                };
            }

            const foundEmployee = allEmployees.find((x: any) => Number(x.usuarioId) === targetId);
            console.log('🔍 [getPersonForUser] Cross-search found employee:', foundEmployee);
            if (foundEmployee) {
                console.log('✅ [getPersonForUser] Cross-search found employee, employee keys:', Object.keys(foundEmployee));
                const address = getAddress(foundEmployee, 'employee');
                console.log('✅ [getPersonForUser] Cross-search employee address:', address);
                return {
                    documentId: foundEmployee.documentoEmpleado,
                    documentType: foundEmployee.tipoDocumento || 'CC',
                    name: foundEmployee.nombre || 'Empleado',
                    phone: foundEmployee.telefono || '',
                    address: address,
                    type: 'employee'
                };
            }

            console.log('❌ [getPersonForUser] No person found, returning null');
            return null;
        } catch (error) {
            console.error('❌ [getPersonForUser] Error in function:', error);
            return null;
        }
    },

    checkDocumentDuplicate: async (documentId: string): Promise<boolean> => {
        try {
            const clientes = await apiClient.get<any[]>('/api/Clientes').catch(() => []);
            const empleados = await apiClient.get<any[]>('/api/Empleados').catch(() => []);

            const existsInClientes = (clientes || []).some(
                (c: any) => String(c.documentoCliente) === String(documentId)
            );
            const existsInEmpleados = (empleados || []).some(
                (e: any) => String(e.documentoEmpleado) === String(documentId)
            );
            return existsInClientes || existsInEmpleados;
        } catch {
            return false;
        }
    },

    changePassword: async (userId: number, nuevaContrasena: string, confirmarContrasena: string): Promise<void> => {
        return apiClient.put<void>(`/api/Usuarios/${userId}/contrasena`, {
            nuevaContrasena,
            confirmarContrasena,
        });
    },
};
