const BASE_URL = 'http://www.astrhoapp.somee.com';

// ── JWT Token Management ──
let _token: string | null = localStorage.getItem('auth_token');

export function setAuthToken(token: string) {
    _token = token;
    localStorage.setItem('auth_token', token);
}

export function clearAuthToken() {
    _token = null;
    localStorage.removeItem('auth_token');
}

/** Build headers for every request, injecting Bearer token when available */
function getHeaders(extra?: Record<string, string>): Record<string, string> {
    const headers: Record<string, string> = {
        'Accept': 'application/json',
        ...extra,
    };
    if (_token) {
        headers['Authorization'] = `Bearer ${_token}`;
    }
    return headers;
}

export interface PaginatedResponse<T> {
    data: T[];
    totalCount: number;
    page: number;
    pageSize: number;
    totalPages: number;
}

/** Normalizes response to handle .NET $values and different structures */
function normalizeResponse(data: any): any {
    if (!data) return data;

    // 1. If it's a paginated response object
    if (data.data !== undefined || data.totalRegistros !== undefined || data.totalPaginas !== undefined) {
        let normalized = { ...data };

        // Handle Spanish field names
        if (data.totalRegistros !== undefined && normalized.totalCount === undefined) {
            normalized.totalCount = data.totalRegistros;
        }
        if (data.totalPaginas !== undefined && normalized.totalPages === undefined) {
            normalized.totalPages = data.totalPaginas;
        }
        if (data.paginaActual !== undefined && normalized.page === undefined) {
            normalized.page = data.paginaActual;
        }
        if (data.registrosPorPagina !== undefined && normalized.pageSize === undefined) {
            normalized.pageSize = data.registrosPorPagina;
        }

        // Ensure totalPages is calculated if totalCount and pageSize are available
        if (normalized.totalCount !== undefined && normalized.pageSize !== undefined && (normalized.totalPages === undefined || normalized.totalPages === 0)) {
            normalized.totalPages = Math.ceil(normalized.totalCount / normalized.pageSize);
        }

        // If data.data is wrapped in $values
        if (normalized.data && normalized.data.$values && Array.isArray(normalized.data.$values)) {
            normalized.data = normalized.data.$values;
        }
        
        // If data itself is the $values array (some backends do this)
        if (normalized.$values && Array.isArray(normalized.$values)) {
            normalized.data = normalized.$values;
        }

        return normalized;
    }

    // 2. If it's a direct array wrapped in $values
    if (data.$values && Array.isArray(data.$values)) {
        return data.$values;
    }

    return data;
}

export const apiClient = {
    async get<T = any>(endpoint: string, params?: Record<string, string | number | boolean | undefined>): Promise<T> {
        try {
            let url = `${BASE_URL}${endpoint}`;
            if (params) {
                // Map frontend parameter names to backend parameter names (Spanish)
                const mappedParams: Record<string, string | number | boolean | undefined> = { ...params };
                
                if (params.page !== undefined) {
                    mappedParams.pagina = params.page;
                    delete mappedParams.page;
                }
                if (params.search !== undefined) {
                    mappedParams.buscar = params.search;
                    delete mappedParams.search;
                }
                if (params.pageSize !== undefined) {
                    mappedParams.registrosPorPagina = params.pageSize;
                    delete mappedParams.pageSize;
                }

                const query = Object.entries(mappedParams)
                    .filter(([_, value]) => value !== undefined && value !== '')
                    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
                    .join('&');
                if (query) {
                    url += `?${query}`;
                }
            }

            const response = await fetch(url, {
                headers: getHeaders()
            });
            if (!response.ok) {
                const errorText = await response.text();
                console.error(`Status: ${response.status}, Endpoint: ${endpoint}, Body:`, errorText);
                throw new Error(`API GET Error: ${endpoint} -> Status ${response.status}: ${errorText || response.statusText}`);
            }
            const json = await response.json();
            return normalizeResponse(json) as T;
        } catch (error) {
            console.error(`API GET error on ${endpoint}:`, error);
            throw error;
        }
    },

    async post(endpoint: string, data: any) {
        try {
            const isFormData = data instanceof FormData;
            const extra: Record<string, string> = {};

            if (!isFormData) {
                extra['Content-Type'] = 'application/json';
            }

            const response = await fetch(`${BASE_URL}${endpoint}`, {
                method: 'POST',
                headers: getHeaders(extra),
                body: isFormData ? data : JSON.stringify(data),
            });
            if (!response.ok) {
                const errorText = await response.text();
                console.error(`POST Error Status: ${response.status}, Endpoint: ${endpoint}, Body:`, errorText);
                throw new Error(`Error posting to ${endpoint} (${response.status}): ${errorText || response.statusText}`);
            }
            // Handle 204 No Content or empty body
            if (response.status === 204 || response.headers.get('content-length') === '0') {
                return null;
            }
            const text = await response.text();
            if (!text || text.trim() === '') {
                return null;
            }
            try {
                const json = JSON.parse(text);
                return normalizeResponse(json);
            } catch {
                return text;
            }
        } catch (error) {
            console.error(`API POST error on ${endpoint}:`, error);
            throw error;
        }
    },

    async put(endpoint: string, data: any) {
        try {
            const isFormData = data instanceof FormData;
            const extra: Record<string, string> = {};

            if (!isFormData) {
                extra['Content-Type'] = 'application/json';
            }

            const response = await fetch(`${BASE_URL}${endpoint}`, {
                method: 'PUT',
                headers: getHeaders(extra),
                body: isFormData ? data : JSON.stringify(data),
            });
            if (!response.ok) {
                const errorText = await response.text();
                console.error(`PUT Error Status: ${response.status}, Endpoint: ${endpoint}, Body:`, errorText);
                throw new Error(`API PUT Error: ${endpoint} -> Status ${response.status}: ${errorText || response.statusText}`);
            }
            // Handle 204 No Content
            if (response.status === 204 || response.headers.get('content-length') === '0') {
                return null;
            }
            const text = await response.text();
            if (!text || text.trim() === '') {
                return null;
            }
            
            // Try parsing as JSON, fall back to original text if fails
            try {
                return JSON.parse(text);
            } catch {
                return text;
            }
        } catch (error) {
            console.error(`API PUT error on ${endpoint}:`, error);
            throw error;
        }
    },

    async delete(endpoint: string) {
        try {
            const response = await fetch(`${BASE_URL}${endpoint}`, {
                method: 'DELETE',
                headers: getHeaders()
            });
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`API DELETE Error: ${endpoint} -> Status ${response.status}: ${errorText || response.statusText}`);
            }
            // Handle 204 No Content or empty body
            if (response.status === 204 || response.headers.get('content-length') === '0') {
                return null;
            }
            const text = await response.text();
            if (!text || text.trim() === '') {
                return null;
            }
            try {
                const json = JSON.parse(text);
                return normalizeResponse(json);
            } catch {
                return text;
            }
        } catch (error) {
            console.error(`API DELETE error on ${endpoint}:`, error);
            throw error;
        }
    },

    async patch(endpoint: string, data?: any) {
        try {
            const isFormData = data instanceof FormData;
            const extra: Record<string, string> = {};

            if (!isFormData && data) {
                extra['Content-Type'] = 'application/json';
            }

            const response = await fetch(`${BASE_URL}${endpoint}`, {
                method: 'PATCH',
                headers: getHeaders(extra),
                body: data ? (isFormData ? data : JSON.stringify(data)) : undefined,
            });
            if (!response.ok) {
                const errorText = await response.text();
                console.error(`PATCH Error Status: ${response.status}, Endpoint: ${endpoint}, Body:`, errorText);
                throw new Error(`API PATCH Error: ${endpoint} -> Status ${response.status}: ${errorText || response.statusText}`);
            }
            // Handle 204 No Content
            if (response.status === 204 || response.headers.get('content-length') === '0') {
                return null;
            }
            const text = await response.text();
            if (!text || text.trim() === '') {
                return null;
            }
            
            try {
                return JSON.parse(text);
            } catch {
                return text;
            }
        } catch (error) {
            console.error(`API PATCH error on ${endpoint}:`, error);
            throw error;
        }
    }
};
