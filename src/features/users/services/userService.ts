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
    documentoCliente?: string;
    documentoEmpleado?: string;
}

export interface UpdateUsuarioDto {
    rolId: number;
    email: string;
    contrasena?: string;
    confirmarContrasena?: string;
    estado: boolean;
}

// ── User Service ──

export const userService = {
    getAll: async (params?: { page?: number; pageSize?: number; search?: string }): Promise<PaginatedResponse<UsuarioListItem>> => {
        const response = await apiClient.get<any>('/api/Usuarios', params);
        
        if (response && response.data && Array.isArray(response.data)) {
            return response;
        }

        // Fallback for simple array response
        if (Array.isArray(response)) {
            return {
                data: response,
                totalCount: response.length,
                page: params?.page || 1,
                pageSize: params?.pageSize || response.length,
                totalPages: 1
            };
        }

        return { data: [], totalCount: 0, page: 1, pageSize: 10, totalPages: 0 };
    },

    getById: async (id: number): Promise<UsuarioDetail> => {
        return apiClient.get<UsuarioDetail>(`/api/Usuarios/${id}`);
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

            // 1. Try to find the document ID from the user object if present
            const documentId = user.documentoCliente || user.documentoEmpleado || user.documento || user.documentoIdentidad || user.documentId;
            console.log('🔍 [getPersonForUser] documentId from user:', documentId);

            if (documentId) {
                try {
                    const endpoint = isClient ? `/api/Clientes/${documentId}` : `/api/Empleados/${documentId}`;
                    console.log('🔍 [getPersonForUser] Trying direct fetch to:', endpoint);
                    const data = await apiClient.get<any>(endpoint);
                    console.log('🔍 [getPersonForUser] Direct fetch response:', data);
                    
                    if (data && (data.documentoCliente || data.documentoEmpleado || data.nombre)) {
                        console.log('✅ [getPersonForUser] Direct fetch successful, returning data');
                        return {
                            documentId: isClient ? (data.documentoCliente || documentId) : (data.documentoEmpleado || documentId),
                            documentType: data.tipoDocumento || 'CC',
                            name: data.nombre || (isClient ? 'Cliente' : 'Empleado'),
                            phone: data.telefono || '',
                            address: data.dirección || data.direccion || '',
                            type: isClient ? 'client' : 'employee'
                        };
                    }
                } catch (e) {
                    console.warn(`⚠️ [getPersonForUser] Direct fetch failed for ${documentId}`, e);
                }
            }

            // 2. Exhaustive Fallback: Search by usuarioId in the corresponding table
            // Search in the table that SHOULD contain the user
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
                    console.log('✅ [getPersonForUser] Found client, returning data');
                    return {
                        documentId: client.documentoCliente,
                        documentType: client.tipoDocumento || 'CC',
                        name: client.nombre || 'Cliente',
                        phone: client.telefono || '',
                        address: client.dirección || client.direccion || '',
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
                    console.log('✅ [getPersonForUser] Found employee, returning data');
                    return {
                        documentId: employee.documentoEmpleado,
                        documentType: employee.tipoDocumento || 'CC',
                        name: employee.nombre || 'Empleado',
                        phone: employee.telefono || '',
                        address: employee.dirección || employee.direccion || '',
                        type: 'employee'
                    };
                }
            }

            // 3. Final Fallback: Cross-search in BOTH tables just in case
            console.log('🔍 [getPersonForUser] Final fallback: searching both tables');
            const [allClients, allEmployees] = await Promise.all([
                apiClient.getAllPages<any>('/api/Clientes').catch(() => []),
                apiClient.getAllPages<any>('/api/Empleados').catch(() => [])
            ]);

            const foundClient = allClients.find((x: any) => Number(x.usuarioId) === targetId);
            console.log('🔍 [getPersonForUser] Cross-search found client:', foundClient);
            if (foundClient) {
                console.log('✅ [getPersonForUser] Cross-search found client, returning data');
                return {
                    documentId: foundClient.documentoCliente,
                    documentType: foundClient.tipoDocumento || 'CC',
                    name: foundClient.nombre || 'Cliente',
                    phone: foundClient.telefono || '',
                    address: foundClient.dirección || foundClient.direccion || '',
                    type: 'client'
                };
            }

            const foundEmployee = allEmployees.find((x: any) => Number(x.usuarioId) === targetId);
            console.log('🔍 [getPersonForUser] Cross-search found employee:', foundEmployee);
            if (foundEmployee) {
                console.log('✅ [getPersonForUser] Cross-search found employee, returning data');
                return {
                    documentId: foundEmployee.documentoEmpleado,
                    documentType: foundEmployee.tipoDocumento || 'CC',
                    name: foundEmployee.nombre || 'Empleado',
                    phone: foundEmployee.telefono || '',
                    address: foundEmployee.dirección || foundEmployee.direccion || '',
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
};
