import { apiClient, type PaginatedResponse } from '@/shared/services/apiClient';
import { horarioEmpleadoService } from '@/features/schedule/services/scheduleService';

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
        let personInfo = null;
        try {
            personInfo = await userService.getPersonForUser({ usuarioId: id });
        } catch (e) {
            console.warn('Could not get person info for user, proceeding to delete user anyway', e);
        }
        
        if (personInfo) {
            try {
                if (personInfo.type === 'employee') {
                    // Remove all schedule assignments for this employee first
                    // so the backend doesn't block deletion due to horario records
                    try {
                        const assignments = await horarioEmpleadoService.getByEmpleado(personInfo.documentId);
                        const list = Array.isArray(assignments) ? assignments
                            : (assignments as any)?.$values ?? (assignments as any)?.data ?? [];
                        await Promise.all(
                            list.map((a: any) => horarioEmpleadoService.delete(a.horarioEmpleadoId).catch(() => {}))
                        );
                    } catch (scheduleError) {
                        console.warn('Could not remove schedule assignments, proceeding anyway:', scheduleError);
                    }
                    // Delete employee record
                    try {
                        await apiClient.delete(`/api/Empleados/${personInfo.documentId}`);
                    } catch (e) {
                        console.warn('Could not delete employee record, proceeding to delete user anyway', e);
                    }
                } else if (personInfo.type === 'client') {
                    // Delete client record
                    try {
                        await apiClient.delete(`/api/Clientes/${personInfo.documentId}`);
                    } catch (e) {
                        console.warn('Could not delete client record, proceeding to delete user anyway', e);
                    }
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

            // Try direct fetch if the user object contains a document ID
            let docId = user.documento || user.documentId || user.documentoCliente || user.documentoEmpleado;

            // Helper: fetch full detail and extract address from it
            const fetchDetail = async (documentId: string, type: 'client' | 'employee', fallbackData: any) => {
                try {
                    const endpoint = type === 'client'
                        ? `/api/Clientes/${documentId}`
                        : `/api/Empleados/${documentId}`;
                    const detail = await apiClient.get<any>(endpoint);
                    const d = detail || fallbackData;
                    const common = d.direccion || d.address || d.Direccion || d['dirección'] || d['Dirección'] || '';
                    const address = type === 'client'
                        ? (d.direccionCliente || d.direccion_cliente || d['direcciónCliente'] || common)
                        : (d.direccionEmpleado || d.direccion_empleado || d['direcciónEmpleado'] || common);
                    return address;
                } catch {
                    // Fallback to list data if detail fetch fails
                    const d = fallbackData;
                    const common = d.direccion || d.address || d.Direccion || d['dirección'] || d['Dirección'] || '';
                    return type === 'client'
                        ? (d.direccionCliente || d.direccion_cliente || d['direcciónCliente'] || common)
                        : (d.direccionEmpleado || d.direccion_empleado || d['direcciónEmpleado'] || common);
                }
            };

            // If we don't have docId on the user object, try fetching user details first
            if (!docId && targetId) {
                try {
                    console.log('🔍 [getPersonForUser] No docId in user object, fetching user detail from /api/Usuarios/', targetId);
                    const userDetail = await userService.getById(targetId);
                    docId = userDetail?.documento || userDetail?.documentoCliente || userDetail?.documentoEmpleado;
                    console.log('🔍 [getPersonForUser] Obtained docId from user detail:', docId);
                } catch (err) {
                    console.error('❌ [getPersonForUser] Error fetching user detail:', err);
                }
            }

            // If we have docId, fetch details directly instead of scanning the full list
            if (docId) {
                console.log('🔍 [getPersonForUser] Attempting direct fetch using docId:', docId);
                try {
                    const type = isClient ? 'client' : 'employee';
                    const address = await fetchDetail(docId, type, {});
                    const endpoint = isClient ? `/api/Clientes/${docId}` : `/api/Empleados/${docId}`;
                    const person = await apiClient.get<any>(endpoint);
                    
                    if (person) {
                        console.log('✅ [getPersonForUser] Direct fetch succeeded');
                        return {
                            documentId: docId,
                            documentType: person.tipoDocumento || 'CC',
                            name: person.nombre || (isClient ? 'Cliente' : 'Empleado'),
                            phone: person.telefono || '',
                            address,
                            type: isClient ? 'client' : 'employee'
                        };
                    }
                } catch (err) {
                    console.warn('⚠️ [getPersonForUser] Direct fetch failed, falling back to list scan:', err);
                }
            }

            // 1. First priority: Search by usuarioId in the corresponding table
            if (isClient) {
                console.log('🔍 [getPersonForUser] Searching in /api/Clientes by usuarioId');
                const clients = await apiClient.getAllPages<any>('/api/Clientes').catch((err) => {
                    console.error('❌ [getPersonForUser] Error fetching /api/Clientes:', err);
                    return [];
                });
                const client = clients.find((c: any) => Number(c.usuarioId) === targetId);
                
                if (client) {
                    const docId = client.documentoCliente;
                    const address = await fetchDetail(docId, 'client', client);
                    console.log('✅ [getPersonForUser] Client address from detail:', address);
                    return {
                        documentId: docId,
                        documentType: client.tipoDocumento || 'CC',
                        name: client.nombre || 'Cliente',
                        phone: client.telefono || '',
                        address,
                        type: 'client'
                    };
                }
            } else {
                console.log('🔍 [getPersonForUser] Searching in /api/Empleados by usuarioId');
                const employees = await apiClient.getAllPages<any>('/api/Empleados').catch((err) => {
                    console.error('❌ [getPersonForUser] Error fetching /api/Empleados:', err);
                    return [];
                });
                const employee = employees.find((e: any) => Number(e.usuarioId) === targetId);
                
                if (employee) {
                    const docId = employee.documentoEmpleado;
                    const address = await fetchDetail(docId, 'employee', employee);
                    console.log('✅ [getPersonForUser] Employee address from detail:', address);
                    return {
                        documentId: docId,
                        documentType: employee.tipoDocumento || 'CC',
                        name: employee.nombre || 'Empleado',
                        phone: employee.telefono || '',
                        address,
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
            if (foundClient) {
                const docId = foundClient.documentoCliente;
                const address = await fetchDetail(docId, 'client', foundClient);
                console.log('✅ [getPersonForUser] Cross-search client address from detail:', address);
                return {
                    documentId: docId,
                    documentType: foundClient.tipoDocumento || 'CC',
                    name: foundClient.nombre || 'Cliente',
                    phone: foundClient.telefono || '',
                    address,
                    type: 'client'
                };
            }

            const foundEmployee = allEmployees.find((x: any) => Number(x.usuarioId) === targetId);
            if (foundEmployee) {
                const docId = foundEmployee.documentoEmpleado;
                const address = await fetchDetail(docId, 'employee', foundEmployee);
                console.log('✅ [getPersonForUser] Cross-search employee address from detail:', address);
                return {
                    documentId: docId,
                    documentType: foundEmployee.tipoDocumento || 'CC',
                    name: foundEmployee.nombre || 'Empleado',
                    phone: foundEmployee.telefono || '',
                    address,
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
