import { apiClient, setAuthToken } from '@/shared/services/apiClient';

// ── Role mapping from API to internal app roles ──
const ROLE_MAP: Record<string, string> = {
    'administrador': 'admin',
    'administradora': 'admin',
    'super admin': 'super_admin',
    'asistente': 'asistente',
    'cliente': 'customer',
};

function mapRole(apiRole: any): string {
    if (typeof apiRole !== 'string') return 'customer';
    const normalized = apiRole.toLowerCase().trim();
    return ROLE_MAP[normalized] || 'customer';
}

// ── Interfaces ──
export interface LoginResponse {
    token: string;
    rol: string;
    usuarioId: number;
    email: string;
    mustChangePassword?: boolean;
    [key: string]: any; // allow extra fields from API
}

export interface RegisterData {
    rolId?: number;
    email: string;
    contrasena: string;
    confirmarContrasena: string;
}

export interface TempUserData {
    rolId?: number;
    email: string;
}

export interface UsuarioListItem {
    usuarioId: number;
    email: string;
    estado: boolean;
    rolNombre: string;
}

// ── Auth Service ──
export const authService = {
    /**
     * Login: POST /api/auth/login
     * Returns the full API response with token + user data
     */
    async login(email: string, password: string): Promise<LoginResponse> {
        const response = await apiClient.post('/api/auth/login', {
            email: email.trim().toLowerCase(),
            password,
        });
        return response;
    },

    /**
     * Register a new user: POST /api/Usuarios
     * Registers with dynamic rolId; defaults to 2 (Cliente) if not provided.
     */
    async register(data: RegisterData): Promise<any> {
        const response = await apiClient.post('/api/Usuarios', {
            rolId: data.rolId || 2,
            email: data.email.trim().toLowerCase(),
            contrasena: data.contrasena,
            confirmarContrasena: data.confirmarContrasena,
        });
        return response;
    },

    async createTempUser(data: TempUserData): Promise<any> {
        const tempPassword = Math.random().toString(36).slice(-10);
        const response = await apiClient.post('/api/auth/create-temp-user', {
            rolId: data.rolId || 2,
            email: data.email.trim().toLowerCase(),
            contrasena: tempPassword,
            confirmarContrasena: tempPassword,
        });
        return response;
    },

    async getUserIdByEmail(email: string): Promise<number | null> {
        try {
            // El endpoint /api/Usuarios requiere autenticación en GET.
            // Si no hay token, esta llamada fallará con 401.
            const response: any = await apiClient.get('/api/Usuarios', { search: email.trim() });
            
            // Handle both array and paginated response { data: [...], ... }
            const usersList = Array.isArray(response) ? response : (response?.data || []);
            
            const found = usersList.find((u: any) => 
                (u.email || u.Email)?.toLowerCase() === email.trim().toLowerCase()
            );
            return found?.usuarioId || found?.UsuarioId || null;
        } catch (error: any) {
            // No logueamos error 401 como error crítico ya que es esperado si el usuario no está autenticado
            if (error?.message?.includes('401')) {
                console.warn('getUserIdByEmail: No autorizado (requiere login)');
            } else {
                console.error('Error in getUserIdByEmail:', error);
            }
            return null;
        }
    },

    /**
     * Register a new client: POST /api/Usuarios then POST /api/Clientes
     */
    async registerClient(data: any): Promise<any> {
        // 1. Create the User (Rol 2 is Cliente)
        const userPayload = {
            rolId: 2,
            email: data.email.trim().toLowerCase(),
            contrasena: data.password,
            confirmarContrasena: data.confirmPassword,
        };

        let userResponse;
        try {
            userResponse = await apiClient.post('/api/Usuarios', userPayload);
        } catch (error: any) {
            console.error('Error creating user:', error);
            const errorMessage = error.message || 'Error al crear el usuario.';
            throw new Error(errorMessage);
        }

        // Try to login immediately to get a token and the user ID
        // This is necessary because GET /api/Usuarios (to find the ID) is protected
        // and creating the Client details might also be protected.
        let usuarioId = null;
        try {
            const loginData = await this.login(data.email, data.password);
            if (loginData && loginData.token) {
                setAuthToken(loginData.token);
                usuarioId = loginData.usuarioId || loginData.UsuarioId;
            }
        } catch (loginError) {
            console.warn('Could not auto-login after user creation:', loginError);
        }

        // If login failed or didn't provide ID, try to get it from the creation response
        if (!usuarioId) {
            if (typeof userResponse === 'number') {
                usuarioId = userResponse;
            } else if (typeof userResponse === 'string' && !isNaN(Number(userResponse))) {
                usuarioId = Number(userResponse);
            } else if (userResponse) {
                usuarioId = userResponse.usuarioId || userResponse.id || userResponse.UsuarioId || userResponse.usuarioID;
            }
        }

        // Final attempt if still no ID (might fail due to 401, but we try)
        if (!usuarioId) {
            try {
                usuarioId = await this.getUserIdByEmail(data.email);
            } catch (err) {
                console.warn('Final attempt to fetch user ID failed:', err);
            }
        }

        if (!usuarioId) {
            throw new Error('El usuario fue creado pero no se pudo obtener su ID para completar el registro del cliente.');
        }

        // 2. Create the Client details
        const mapDocType = (t: string): string => {
            const key = (t || '').toLowerCase();
            if (key === 'cedula' || key === 'cédula' || key === 'cedula_ciudadania' || key === 'cédula_ciudadanía') return 'CC';
            if (key === 'tarjeta_identidad' || key === 'ti') return 'TI';
            if (key === 'cedula_extranjeria' || key === 'cédula_extranjería' || key === 'ce') return 'CE';
            if (key === 'pasaporte' || key === 'passport') return 'PAS';
            if (key === 'nit') return 'NIT';
            return 'CC';
        };

        const clientPayload = {
            documentoCliente: data.documentId,
            usuarioId: usuarioId,
            tipoDocumento: mapDocType(data.documentType),
            nombre: `${data.firstName} ${data.lastName}`.trim(),
            telefono: data.phone
        };

        try {
            const clientResponse = await apiClient.post('/api/Clientes', clientPayload);
            return { user: userResponse, client: clientResponse };
        } catch (error: any) {
            console.error('Error creating client:', error);
            // Optionally, delete the user if client creation fails, but leaving it is safer without knowing API constraints
            throw new Error(error?.response?.data || 'Error al guardar los datos del cliente.');
        }
    },

    /**
     * Check if email already exists: GET /api/Usuarios
     * Returns { emailExists }
     */
    async checkDuplicates(
        email: string
    ): Promise<{ emailExists: boolean }> {
        try {
            // El endpoint /api/Usuarios requiere autenticación en GET.
            const response: any = await apiClient.get('/api/Usuarios', { search: email.trim() });
            
            // Handle both array and paginated response { data: [...], ... }
            const usersList = Array.isArray(response) ? response : (response?.data || []);
            
            const emailExists = usersList.some(
                (u: any) => (u.email || u.Email)?.toLowerCase() === email.trim().toLowerCase()
            );
            return { emailExists };
        } catch (error: any) {
            // Si falla por 401, simplemente asumimos que no hay duplicados visibles
            // El POST de registro hará la validación final en el servidor
            if (error?.message?.includes('401')) {
                console.warn('checkDuplicates: No autorizado (requiere login)');
            }
            return { emailExists: false };
        }
    },

    /**
     * Request password recovery: POST /api/Usuarios/recuperar-password
     * Returns the token needed for code validation
     */
    async requestPasswordRecovery(email: string): Promise<any> {
        const response = await apiClient.post('/api/Usuarios/recuperar-password', {
            email: email.trim().toLowerCase(),
        });
        return response;
    },

    /**
     * Validate recovery code: POST /api/Usuarios/validar-codigo-recuperacion
     * Returns { valid, resetToken } or similar
     */
    async validateRecoveryCode(token: string, codigo: string): Promise<any> {
        const response = await apiClient.post('/api/Usuarios/validar-codigo-recuperacion', {
            token,
            codigo,
        });
        return response;
    },

    /**
     * Reset password: POST /api/Usuarios/reset-password
     */
    async resetPassword(
        resetToken: string,
        nuevaContrasena: string,
        confirmarContrasena: string
    ): Promise<any> {
        const response = await apiClient.post('/api/Usuarios/reset-password', {
            resetToken,
            nuevaContrasena,
            confirmarContrasena,
        });
        return response;
    },


    /**
     * Change password explicitly from the UI
     */
    async changePassword(email: string, contrasenaActual: string, nuevaContrasena: string): Promise<any> {
        try {
            const response = await apiClient.post('/api/auth/change-password', {
                Email: email.trim().toLowerCase(),
                CurrentPassword: contrasenaActual,
                NewPassword: nuevaContrasena
            });
            return response;
        } catch (error) {
            console.error('Error in changePassword:', error);
            throw error;
        }
    },

    /**
     * Build the user object expected by the app from the login API response
     */
    buildUserFromLoginResponse(data: LoginResponse): any {
        const role = mapRole(data.rol);
        const derivedName = data.email ? data.email.split('@')[0] : '';
        return {
            id: data.usuarioId,
            usuarioId: data.usuarioId, // Keep both for consistency
            name: derivedName,
            firstName: derivedName,
            lastName: '',
            documentId: data.documentId || '', // Check if documentId is present
            email: data.email || '',
            phone: '',
            role,
            token: data.token,
            permissions: data.permisos || data.permisosIds || [],
            requiereCambioPassword: data.mustChangePassword === true
        };
    },
};
