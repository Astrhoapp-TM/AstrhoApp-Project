import { apiClient, type PaginatedResponse } from '@/shared/services/apiClient';
import { roleService } from '@/features/roles/services/roleService';

export interface Person {
    documentId: string;    // Maps to documentoCliente / documentoEmpleado
    userDocument?: string; // Maps to usuario.documento
    type: 'client' | 'employee';
    documentType: string;  // Maps to tipoDocumento
    name: string;          // Maps to nombre
    phone: string;         // Maps to telefono
    address: string;
    status: 'active' | 'inactive'; // Maps to estado (boolean)
    usuarioId?: number;
    email?: string;
}

export interface CreatePersonData {
    documentId: string;
    type: 'client' | 'employee';
    documentType: string;
    name: string;
    phone: string;
    address: string;
    usuarioId?: number;
    email?: string;
}

// Map Backend DTO to Frontend Model
const mapBackendToPerson = (data: any, type: 'client' | 'employee'): Person => ({
    documentId: type === 'client' ? data.documentoCliente : data.documentoEmpleado,
    userDocument: data.documento, // Get the user document from the data
    type,
    documentType: data.tipoDocumento || 'CC',
    name: data.nombre || '',
    phone: data.telefono || '',
    address: (() => {
        const common = data.direccion || data.address || data.Direccion || data['dirección'] || data['Dirección'] || '';
        if (type === 'client') {
            return data.direccionCliente || data.direccion_cliente || data['direcciónCliente'] || common;
        } else {
            return data.direccionEmpleado || data.direccion_empleado || data['direcciónEmpleado'] || common;
        }
    })(),
    status: data.estado !== false ? 'active' : 'inactive', // default true if missing
    usuarioId: data.usuarioId,
    email: data.email || data.nombreUsuario
});

// Map Frontend Model to Backend DTO for Create/Update
const mapPersonToBackend = (person: CreatePersonData | Person) => {
    const isClient = person.type === 'client';

    const payload: any = {
        tipoDocumento: person.documentType,
        nombre: person.name,
        telefono: person.phone,
        direccion: person.address
    };

    if ((person as any).usuarioId) {
        payload.usuarioId = (person as any).usuarioId;
    }

    if (isClient) {
        payload.documentoCliente = person.documentId;
        payload.direccionCliente = person.address;
        payload['direcciónCliente'] = person.address;
        payload['dirección'] = person.address;
    } else {
        payload.documentoEmpleado = person.documentId;
        payload.direccionEmpleado = person.address;
        payload['direcciónEmpleado'] = person.address;
        payload['dirección'] = person.address;
    }

    return payload;
};

export const personService = {
    // GET ALL
    async getPersons(type: 'client' | 'employee', params?: { page?: number; pageSize?: number; search?: string }): Promise<PaginatedResponse<Person>> {
        const endpoint = type === 'client' ? '/api/Clientes' : '/api/Empleados';
        const response = await apiClient.get<any>(endpoint, params);
        
        // Fetch roles, users to get document field and role
        const [rolesResponse, usersResponse] = await Promise.all([
            roleService.getRoles({ page: 1, pageSize: 1000 }),
            apiClient.get<any>('/api/Usuarios', { page: 1, pageSize: 1000 }).catch(() => ({ data: [] }))
        ]);
        const roles = rolesResponse.data || [];
        const users = usersResponse.data || [];
        
        console.log('personService getPersons - roles:', roles);
        console.log('personService getPersons - users:', users);
        console.log('personService getPersons - users detailed:');
        users.forEach((u, idx) => {
            console.log(`  User ${idx}:`, u, 'Keys:', Object.keys(u));
        });
        
        // Map roles: find which rolId is cliente, which are admin/asistente/super admin
        // Case-insensitive lookup for role properties
        const clienteRole = roles.find(r => {
            for (const key of Object.keys(r)) {
                if (key.toLowerCase() === 'nombre') {
                    return (r[key] || '').toLowerCase() === 'cliente';
                }
            }
            return false;
        });
        const adminRoles = roles.filter(r => {
            for (const key of Object.keys(r)) {
                if (key.toLowerCase() === 'nombre') {
                    return ['administrador', 'asistente', 'super admin'].includes((r[key] || '').toLowerCase());
                }
            }
            return false;
        });
        const adminRoleIds = adminRoles.map(r => {
            for (const key of Object.keys(r)) {
                if (key.toLowerCase() === 'rolid') {
                    return r[key];
                }
            }
            return null;
        }).filter(id => id != null);
        const clienteRoleId = (() => {
            if (!clienteRole) return undefined;
            for (const key of Object.keys(clienteRole)) {
                if (key.toLowerCase() === 'rolid') {
                    return clienteRole[key];
                }
            }
            return undefined;
        })();
        
        console.log('personService getPersons - clienteRoleId:', clienteRoleId);
        console.log('personService getPersons - adminRoleIds:', adminRoleIds);
        
        let persons: Person[] = [];
        let totalCount = 0;
        
        if (response && response.data && Array.isArray(response.data)) {
            const mappedPersons = response.data.map(item => {
                const person = mapBackendToPerson(item, type);
                // Force specific employee to always be active
                if (person.documentId === '8729451090') {
                    person.status = 'active';
                }
                // Enrich with user document and role from users API
                if (person.usuarioId) {
                    const user = users.find((u: any) => Number(u.usuarioId) === Number(person.usuarioId));
                    console.log('Found user for person.usuarioId', person.usuarioId, ':', user);
                    if (user?.documento) {
                        person.userDocument = user.documento;
                    }
                    // Attach role id and name to person for filtering
                    // Check all possible casing variations
                    let rolId = null;
                    let rolNombre = null;
                    
                    // First check user-level role properties (any casing)
                    for (const key of Object.keys(user || {})) {
                        if (key.toLowerCase() === 'rolid') {
                            rolId = user[key];
                        }
                        if (key.toLowerCase() === 'rolnombre') {
                            rolNombre = user[key];
                        }
                    }
                    
                    // If not found at user level, check nested rol object (any casing)
                    if (!rolId || !rolNombre) {
                        const nestedRolKey = Object.keys(user || {}).find(k => k.toLowerCase() === 'rol');
                        if (nestedRolKey && user[nestedRolKey]) {
                            for (const key of Object.keys(user[nestedRolKey])) {
                                if (key.toLowerCase() === 'rolid' && !rolId) {
                                    rolId = user[nestedRolKey][key];
                                }
                                if (key.toLowerCase() === 'nombre' && !rolNombre) {
                                    rolNombre = user[nestedRolKey][key];
                                }
                            }
                        }
                    }
                    
                    (person as any).rolId = rolId;
                    (person as any).rolNombre = rolNombre;
                    console.log('Attached to person:', { rolId: (person as any).rolId, rolNombre: (person as any).rolNombre });
                }
                return person;
            });
            
            console.log('personService getPersons - type:', type);
            console.log('personService getPersons - mappedPersons:', mappedPersons);
            // Filter 1: role-based filtering using rolId first, fallback to name
            let filteredByRole = mappedPersons.filter(person => {
                const rolId = (person as any).rolId;
                const roleName = ((person as any).rolNombre || '').toLowerCase();
                console.log(`Checking person ${person.name} (usuarioId: ${person.usuarioId}) - rolId: ${rolId}, roleName: ${roleName}`);
                console.log(`  → clientRoleId: ${clienteRoleId}, adminRoleIds:`, adminRoleIds);
                if (type === 'client') {
                    if (clienteRoleId && rolId) {
                        const isMatch = Number(rolId) === Number(clienteRoleId);
                        console.log(`  → Client check using rolId ${rolId} vs ${clienteRoleId}: ${isMatch}`);
                        return isMatch;
                    }
                    const isMatch = roleName === 'cliente';
                    console.log(`  → Client check using roleName ${roleName}: ${isMatch}`);
                    return isMatch;
                } else {
                    if (adminRoleIds.length > 0 && rolId) {
                        const isMatch = adminRoleIds.includes(Number(rolId));
                        console.log(`  → Employee check using rolId ${rolId} in [${adminRoleIds}]: ${isMatch}`);
                        return isMatch;
                    }
                    const isMatch = ['administrador', 'asistente', 'super admin'].includes(roleName);
                    console.log(`  → Employee check using roleName ${roleName}: ${isMatch}`);
                    return isMatch;
                }
            });
            console.log('personService getPersons - filteredByRole:', filteredByRole);
            
            // Filter 2: search filtering
            let filteredBySearch = filteredByRole;
            if (params?.search) {
                const searchLower = params.search.toLowerCase();
                filteredBySearch = filteredByRole.filter(person => 
                    person.name.toLowerCase().includes(searchLower) ||
                    person.documentId.toLowerCase().includes(searchLower) ||
                    (person.userDocument && person.userDocument.toLowerCase().includes(searchLower)) ||
                    (person.phone && person.phone.toLowerCase().includes(searchLower))
                );
            }
            
            persons = filteredBySearch;
            totalCount = persons.length;
        }

        // Fallback
        if (Array.isArray(response)) {
            const mappedPersons = response.map(item => {
                const person = mapBackendToPerson(item, type);
                // Force specific employee to always be active
                if (person.documentId === '8729451090') {
                    person.status = 'active';
                }
                if (person.usuarioId) {
                    const user = users.find((u: any) => Number(u.usuarioId) === Number(person.usuarioId));
                    if (user?.documento) {
                        person.userDocument = user.documento;
                    }
                    (person as any).rolId = user?.rolId || user?.rol?.rolId;
                    (person as any).rolNombre = user?.rolNombre || user?.rol?.nombre;
                }
                return person;
            });
            
            console.log('personService getPersons - type:', type);
            console.log('personService getPersons - mappedPersons:', mappedPersons);
            // Filter 1: role-based filtering using rolId first, fallback to name
            let filteredByRole = mappedPersons.filter(person => {
                const rolId = (person as any).rolId;
                const roleName = ((person as any).rolNombre || '').toLowerCase();
                console.log(`Checking person ${person.name} (usuarioId: ${person.usuarioId}) - rolId: ${rolId}, roleName: ${roleName}`);
                console.log(`  → clientRoleId: ${clienteRoleId}, adminRoleIds:`, adminRoleIds);
                if (type === 'client') {
                    if (clienteRoleId && rolId) {
                        const isMatch = Number(rolId) === Number(clienteRoleId);
                        console.log(`  → Client check using rolId ${rolId} vs ${clienteRoleId}: ${isMatch}`);
                        return isMatch;
                    }
                    const isMatch = roleName === 'cliente';
                    console.log(`  → Client check using roleName ${roleName}: ${isMatch}`);
                    return isMatch;
                } else {
                    if (adminRoleIds.length > 0 && rolId) {
                        const isMatch = adminRoleIds.includes(Number(rolId));
                        console.log(`  → Employee check using rolId ${rolId} in [${adminRoleIds}]: ${isMatch}`);
                        return isMatch;
                    }
                    const isMatch = ['administrador', 'asistente', 'super admin'].includes(roleName);
                    console.log(`  → Employee check using roleName ${roleName}: ${isMatch}`);
                    return isMatch;
                }
            });
            console.log('personService getPersons - filteredByRole:', filteredByRole);
            
            // Filter 2: search filtering
            let filteredBySearch = filteredByRole;
            if (params?.search) {
                const searchLower = params.search.toLowerCase();
                filteredBySearch = filteredByRole.filter(person => 
                    person.name.toLowerCase().includes(searchLower) ||
                    person.documentId.toLowerCase().includes(searchLower) ||
                    (person.userDocument && person.userDocument.toLowerCase().includes(searchLower)) ||
                    (person.phone && person.phone.toLowerCase().includes(searchLower))
                );
            }
            
            persons = filteredBySearch;
            totalCount = persons.length;
        }

        // Apply pagination manually since we filtered
        const page = params?.page || 1;
        const pageSize = params?.pageSize || 10;
        const startIndex = (page - 1) * pageSize;
        const endIndex = startIndex + pageSize;
        const paginatedPersons = persons.slice(startIndex, endIndex);

        return { 
            data: paginatedPersons, 
            totalCount, 
            page, 
            pageSize, 
            totalPages: Math.ceil(totalCount / pageSize) 
        };
    },

    // GET ONE
    async getPersonByDocument(documentId: string, type: 'client' | 'employee'): Promise<Person> {
        const endpoint = type === 'client' ? `/api/Clientes/${documentId}` : `/api/Empleados/${documentId}`;
        const response = await apiClient.get(endpoint);
        const person = mapBackendToPerson(response, type);
        
        // Force specific employee to always be active
        if (person.documentId === '8729451090') {
            person.status = 'active';
        }
        
        // Fetch user to get document field
        if (person.usuarioId) {
            try {
                const user = await apiClient.get<any>(`/api/Usuarios/${person.usuarioId}`);
                if (user?.documento) {
                    person.userDocument = user.documento;
                }
            } catch (e) {
                console.warn('Failed to fetch user data for document:', e);
            }
        }
        
        return person;
    },

    // CREATE
    async createPerson(data: CreatePersonData): Promise<Person> {
        const endpoint = data.type === 'client' ? '/api/Clientes' : '/api/Empleados';
        const payload = mapPersonToBackend(data);
        const response = await apiClient.post(endpoint, payload);
        return mapBackendToPerson(response, data.type);
    },

    // UPDATE
    async updatePerson(documentId: string, data: Person): Promise<Person> {
        const endpoint = data.type === 'client' ? `/api/Clientes/${documentId}` : `/api/Empleados/${documentId}`;

        // For updates, the swagger structure typically requires boolean for estado
        const payload = {
            ...mapPersonToBackend(data),
            estado: data.status === 'active'
        };

        const response = await apiClient.put(endpoint, payload);
        return mapBackendToPerson(response, data.type);
    },

    // DELETE
    async deletePerson(documentId: string, type: 'client' | 'employee'): Promise<void> {
        const endpoint = type === 'client' ? `/api/Clientes/${documentId}` : `/api/Empleados/${documentId}`;
        await apiClient.delete(endpoint);
    }
};
