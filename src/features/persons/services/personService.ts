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
        
        // Fetch users to get document field
        const usersResponse = await apiClient.get<any>('/api/Usuarios', { page: 1, pageSize: 1000 }).catch(() => ({ data: [] }));
        const users = usersResponse.data || [];
        
        if (response && response.data && Array.isArray(response.data)) {
            return {
                ...response,
                data: response.data.map(item => {
                    const person = mapBackendToPerson(item, type);
                    // Enrich with user document from users API
                    if (person.usuarioId) {
                        const user = users.find((u: any) => Number(u.usuarioId) === Number(person.usuarioId));
                        if (user?.documento) {
                            person.userDocument = user.documento;
                        }
                    }
                    return person;
                })
            };
        }

        // Fallback
        if (Array.isArray(response)) {
            return {
                data: response.map(item => {
                    const person = mapBackendToPerson(item, type);
                    if (person.usuarioId) {
                        const user = users.find((u: any) => Number(u.usuarioId) === Number(person.usuarioId));
                        if (user?.documento) {
                            person.userDocument = user.documento;
                        }
                    }
                    return person;
                }),
                totalCount: response.length,
                page: params?.page || 1,
                pageSize: params?.pageSize || response.length,
                totalPages: 1
            };
        }

        return { data: [], totalCount: 0, page: 1, pageSize: 10, totalPages: 0 };
    },

    // GET ONE
    async getPersonByDocument(documentId: string, type: 'client' | 'employee'): Promise<Person> {
        const endpoint = type === 'client' ? `/api/Clientes/${documentId}` : `/api/Empleados/${documentId}`;
        const response = await apiClient.get(endpoint);
        const person = mapBackendToPerson(response, type);
        
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
