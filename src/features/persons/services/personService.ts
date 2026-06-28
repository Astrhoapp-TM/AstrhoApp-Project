import { apiClient, type PaginatedResponse } from '@/shared/services/apiClient';

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
    agendable?: boolean;   // New field: indicates if employee can be scheduled
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
    agendable?: boolean;   // New field: indicates if employee can be scheduled
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
    email: data.email || data.nombreUsuario,
    agendable: data.agendable !== false // default true if missing
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
        // Only add agendable for employees
        if ((person as any).agendable !== undefined) {
            payload.agendable = (person as any).agendable;
        }
    }

    return payload;
};

export const personService = {
    // GET ALL
    async getPersons(type: 'client' | 'employee', params?: { page?: number; pageSize?: number; search?: string }): Promise<PaginatedResponse<Person>> {
        const endpoint = type === 'client' ? '/api/Clientes' : '/api/Empleados';
        // Fetch paginated data from API
        const apiResponse = await apiClient.get<PaginatedResponse<any>>(endpoint, params);
        
        // Fetch all users to enrich with userDocument
        const allUsers = await apiClient.getAllPages<any>('/api/Usuarios');
        
        // Map each API item to Person and enrich
        const mappedPersons = (apiResponse.data || []).map(item => {
            const person = mapBackendToPerson(item, type);
            // Force specific employee to always be active
            if (person.documentId === '8729451090') {
                person.status = 'active';
            }
            // Enrich with user document and role from allUsers
            if (person.usuarioId) {
                const user = allUsers.find((u: any) => Number(u.usuarioId) === Number(person.usuarioId));
                if (user?.documento) {
                    person.userDocument = user.documento;
                }
                // Attach role name for filtering
                (person as any)._rolNombre = (user?.rolNombre || '').toLowerCase().trim();
            }
            return person;
        });

        // Filter by user role: clients section only shows users with role 'cliente',
        // employees section only shows users whose role is NOT 'cliente'.
        const filteredPersons = mappedPersons.filter(person => {
            const roleName = (person as any)._rolNombre;
            // If no associated user, show in both sections (fallback)
            if (!person.usuarioId || !roleName) return true;
            if (type === 'client') {
                return roleName === 'cliente';
            } else {
                return roleName !== 'cliente';
            }
        });

        // Return the same pagination info from API but with filtered persons
        return {
            data: filteredPersons,
            totalCount: apiResponse.totalCount || 0,
            page: apiResponse.page || 1,
            pageSize: apiResponse.pageSize || 10,
            totalPages: apiResponse.totalPages || 0
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
