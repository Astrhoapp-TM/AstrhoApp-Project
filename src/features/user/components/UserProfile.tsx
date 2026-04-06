import React, { useState, useEffect } from 'react';
import { 
  User, Mail, Phone, MapPin, IdCard, Camera, X, Save, 
  LogOut, Shield, UserCog, CheckCircle, AlertCircle,
  FileText, Calendar, Sparkles, Key, Edit, Loader2
} from 'lucide-react';
import { apiClient } from '@/shared/services/apiClient';
import { userService } from '@/features/users/services/userService';

interface UserProfileProps {
  user: any;
  onClose: () => void;
  onUpdateProfile: (data: any) => void;
  onLogout: () => void;
}

export function UserProfile({ user, onClose, onUpdateProfile, onLogout }: UserProfileProps) {
  const [personData, setPersonData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Form states
  const [userForm, setUserForm] = useState({
    email: user.email || '',
    password: '',
    confirmPassword: '',
  });

  const [personForm, setPersonForm] = useState({
    nombre: '',
    telefono: '',
    direccion: '',
  });

  useEffect(() => {
    if (user?.email) {
      setUserForm(prev => ({ ...prev, email: user.email }));
    }
  }, [user]);

  useEffect(() => {
    const fetchPersonData = async () => {
      try {
        setLoading(true);
        const data = await userService.getPersonForUser(user);
        
        if (data) {
          setPersonData({
            ...data,
            type: data.type === 'client' ? 'Cliente' : 'Empleado'
          });
          
          setPersonForm({
            nombre: data.name || '',
            telefono: data.phone || '',
            direccion: data.address || '',
          });

          // Also ensure userForm is updated if user object had missing info
          setUserForm(prev => ({
            ...prev,
            email: user.email || prev.email
          }));
        } else {
          console.warn("No person data found for user", user.usuarioId || user.id);
        }
      } catch (e) {
        console.error("Error fetching person data for profile", e);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchPersonData();
    } else {
      setLoading(false);
    }
  }, [user]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const userId = user.usuarioId || user.id;
      const docId = personData.documentId;
      const isClient = personData.type === 'Cliente';

      // Validación de contraseña
      if (userForm.password || userForm.confirmPassword) {
        if (userForm.password !== userForm.confirmPassword) {
          setError("Las contraseñas no coinciden");
          setSaving(false);
          return;
        }
        if (userForm.password.length < 6) {
          setError("La contraseña debe tener al menos 6 caracteres");
          setSaving(false);
          return;
        }
      }

      // 1. Update User (Email and other basics if needed)
      // Note: Backend might require current roleId and status
      const userUpdatePayload = {
        email: userForm.email,
        rolId: user.rolId || (user.role === 'customer' ? 2 : 1), // Fallback to common role IDs
        estado: true,
        contrasena: userForm.password || "placeholder", // Use new password if provided
        confirmarContrasena: userForm.confirmPassword || "placeholder"
      };
      
      await apiClient.put(`/api/Usuarios/${userId}`, userUpdatePayload);

      // 2. Update Person (Client or Employee)
      if (isClient) {
        await apiClient.put(`/api/Clientes/${docId}`, {
          documentoCliente: docId,
          usuarioId: userId,
          tipoDocumento: personData.documentType,
          nombre: personForm.nombre,
          telefono: personForm.telefono,
          dirección: personForm.direccion,
        });
      } else {
        await apiClient.put(`/api/Empleados/${docId}`, {
          documentoEmpleado: docId,
          usuarioId: userId,
          tipoDocumento: personData.documentType,
          nombre: personForm.nombre,
          telefono: personForm.telefono,
          dirección: personForm.direccion,
        });
      }

      setSuccess(true);
      
      // Update local state
      setPersonData({
        ...personData,
        nombre: personForm.nombre,
        telefono: personForm.telefono,
        direccion: personForm.direccion,
        dirección: personForm.direccion
      });

      // Notify parent
      onUpdateProfile({
        ...user,
        email: userForm.email,
        name: personForm.nombre
      });

      setTimeout(() => {
        setIsEditing(false);
        setSuccess(false);
      }, 1500);

    } catch (err: any) {
      console.error("Error updating profile:", err);
      setError(err?.response?.data || "Error al actualizar el perfil. Por favor, intente de nuevo.");
    } finally {
      setSaving(false);
    }
  };

  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case 'super_admin': return 'Super Administradora';
      case 'admin': return 'Administradora';
      case 'asistente': return 'Asistente';
      case 'customer': return 'Cliente';
      default: return 'Usuario';
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'super_admin': return 'bg-pink-100 text-pink-700 border border-pink-200';
      case 'admin': return 'bg-red-100 text-red-700';
      case 'asistente': return 'bg-blue-100 text-blue-700';
      case 'customer': return 'bg-green-100 text-green-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header - Fixed at top */}
        <div className="bg-gradient-to-r from-pink-500 to-purple-600 p-5 text-white shrink-0 shadow-md z-20">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <User className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold leading-tight">
                  {isEditing ? 'Editar Perfil' : 'Mi Perfil de Usuario'}
                </h3>
                <p className="text-pink-100 text-sm">{user.email}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {!isEditing ? (
                <>
                  <button
                    onClick={() => setIsEditing(true)}
                    className="flex items-center space-x-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-xl transition-all text-sm font-bold border border-white/20"
                  >
                    <Edit className="w-4 h-4" />
                    <span>Editar Perfil</span>
                  </button>
                  <button
                    onClick={onLogout}
                    className="flex items-center space-x-2 px-4 py-2 bg-white/10 hover:bg-red-500/40 rounded-xl transition-all text-sm font-bold border border-white/20"
                  >
                    <LogOut className="w-4 h-4" />
                    <span className="hidden sm:inline">Cerrar Sesión</span>
                  </button>
                </>
              ) : (
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center space-x-2 px-4 py-2 bg-green-500 hover:bg-green-600 rounded-xl transition-all text-sm font-bold border border-green-400 shadow-lg disabled:opacity-50"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  <span>{saving ? 'Guardando...' : 'Guardar Cambios'}</span>
                </button>
              )}
              <button
                onClick={onClose}
                className="w-9 h-9 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/30 hover:scale-110 active:scale-95 transition-all shadow-sm"
              >
                <X className="w-5 h-5" />
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

          {loading ? (
            <div className="flex flex-col items-center justify-center h-64 space-y-4">
              <Loader2 className="w-12 h-12 text-pink-500 animate-spin" />
              <p className="text-gray-500 font-medium">Cargando información del perfil...</p>
            </div>
          ) : (
            <div className="max-w-5xl mx-auto space-y-6">
              {/* Notifications */}
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-2xl flex items-center space-x-3 animate-in fade-in duration-300">
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  <p className="font-semibold text-sm">{error}</p>
                </div>
              )}
              {success && (
                <div className="bg-green-50 border border-green-200 text-green-700 px-6 py-4 rounded-2xl flex items-center space-x-3 animate-in fade-in duration-300">
                  <CheckCircle className="w-5 h-5 shrink-0" />
                  <p className="font-semibold text-sm">Perfil actualizado exitosamente</p>
                </div>
              )}

              {!isEditing ? (
                /* VIEW MODE */
                <>
                  <div className="grid md:grid-cols-2 gap-4">
                    {/* Identity Card */}
                    <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                      <div className="flex items-center space-x-2 text-purple-500 mb-3">
                        <Sparkles className="w-4 h-4" />
                        <h4 className="font-bold uppercase text-[10px] tracking-widest">Identidad</h4>
                      </div>
                      <div className="flex items-center space-x-4">
                        <div className="w-16 h-16 bg-gradient-to-br from-pink-400 to-purple-500 rounded-2xl flex items-center justify-center shadow-lg shrink-0">
                          <span className="text-white font-bold text-2xl">
                            {personData?.name?.charAt(0).toUpperCase() || user.email.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-gray-800 text-lg truncate">
                            {personData?.name || 'Usuario'}
                          </p>
                          <div className="flex items-center space-x-1 mt-1">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${getRoleBadgeColor(user.role)}`}>
                              {getRoleDisplayName(user.role)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Account Card */}
                    <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                      <div className="flex items-center space-x-2 text-pink-500 mb-3">
                        <Shield className="w-4 h-4" />
                        <h4 className="font-bold uppercase text-[10px] tracking-widest">Cuenta y Acceso</h4>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-400">ID Usuario:</span>
                          <span className="font-mono text-gray-700 font-bold">{user.usuarioId || user.id || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-400">Email:</span>
                          <span className="font-bold text-gray-700 truncate ml-2">{user.email}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-400">Estado:</span>
                          <span className="font-bold text-green-600 flex items-center space-x-1">
                            <CheckCircle className="w-3 h-3" />
                            <span>Activa</span>
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    {/* Personal Information Section */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                      <div className="px-6 py-4 bg-gray-50/50 border-b border-gray-100 flex items-center justify-between">
                        <h4 className="font-bold text-gray-700 text-sm flex items-center space-x-2">
                          <IdCard className="w-4 h-4 text-purple-400" />
                          <span>Información Personal</span>
                        </h4>
                      </div>
                      <div className="p-6 space-y-4">
                        {personData ? (
                          <>
                            <div className="flex items-center space-x-4 p-3 bg-gray-50/50 rounded-xl">
                              <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm">
                                <IdCard className="w-5 h-5 text-gray-400" />
                              </div>
                              <div>
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Documento</p>
                                <p className="font-bold text-gray-800">{personData.documentType} {personData.documentId}</p>
                              </div>
                            </div>
                            <div className="flex items-center space-x-4 p-3 bg-gray-50/50 rounded-xl">
                              <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm">
                                <Phone className="w-5 h-5 text-gray-400" />
                              </div>
                              <div>
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Teléfono</p>
                                <p className="font-bold text-gray-800">{personData.phone || 'No registrado'}</p>
                              </div>
                            </div>
                            <div className="flex items-center space-x-4 p-3 bg-gray-50/50 rounded-xl">
                              <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm">
                                <MapPin className="w-5 h-5 text-gray-400" />
                              </div>
                              <div>
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Dirección</p>
                                <p className="font-bold text-gray-800">{personData.address || 'No registrada'}</p>
                              </div>
                            </div>
                          </>
                        ) : (
                          <div className="text-center py-8">
                            <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-3" />
                            <p className="text-sm text-gray-500">No se encontró información personal vinculada.</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Account Security */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                      <div className="px-6 py-4 bg-gray-50/50 border-b border-gray-100 flex items-center justify-between">
                        <h4 className="font-bold text-gray-700 text-sm flex items-center space-x-2">
                          <Key className="w-4 h-4 text-pink-400" />
                          <span>Seguridad</span>
                        </h4>
                      </div>
                      <div className="p-6">
                        <div className="p-4 bg-pink-50 rounded-2xl border border-pink-100 mb-4">
                          <div className="flex items-start space-x-3">
                            <Shield className="w-5 h-5 text-pink-500 mt-0.5" />
                            <div>
                              <p className="text-sm font-bold text-pink-700">Contraseña Protegida</p>
                              <p className="text-xs text-pink-600 mt-1 italic">Tu contraseña está cifrada y no es visible.</p>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-4 p-3 bg-gray-50/50 rounded-xl">
                          <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm">
                            <Mail className="w-5 h-5 text-gray-400" />
                          </div>
                          <div>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Email Principal</p>
                            <p className="font-bold text-gray-800">{user.email}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                /* EDIT MODE */
                <form onSubmit={handleSave} className="space-y-6 animate-in slide-in-from-bottom-4 duration-300">
                  <div className="grid md:grid-cols-2 gap-6">
                    {/* User Account Edit */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                      <div className="px-6 py-4 bg-gray-50/50 border-b border-gray-100 flex items-center space-x-2">
                        <Shield className="w-4 h-4 text-pink-500" />
                        <h4 className="font-bold text-gray-700 text-sm">Datos de Usuario</h4>
                      </div>
                      <div className="p-6 space-y-4">
                        <div>
                          <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">Correo Electrónico</label>
                          <div className="relative">
                            <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                            <input
                              type="email"
                              value={userForm.email}
                              onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                              className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-300 focus:border-transparent transition-all outline-none"
                              required
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">Nueva Contraseña</label>
                            <div className="relative">
                              <Key className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                              <input
                                type="password"
                                value={userForm.password}
                                onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                                placeholder="Mín. 6 caracteres"
                                className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-300 focus:border-transparent transition-all outline-none"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">Confirmar</label>
                            <div className="relative">
                              <Key className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                              <input
                                type="password"
                                value={userForm.confirmPassword}
                                onChange={(e) => setUserForm({ ...userForm, confirmPassword: e.target.value })}
                                placeholder="Repetir contraseña"
                                className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-300 focus:border-transparent transition-all outline-none"
                              />
                            </div>
                          </div>
                        </div>

                        <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 opacity-60">
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Rol (No Editable)</p>
                          <p className="font-bold text-gray-700">{getRoleDisplayName(user.role)}</p>
                        </div>
                      </div>
                    </div>

                    {/* Person Data Edit */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                      <div className="px-6 py-4 bg-gray-50/50 border-b border-gray-100 flex items-center space-x-2">
                        <IdCard className="w-4 h-4 text-purple-400" />
                        <h4 className="font-bold text-gray-700 text-sm">Datos de {personData?.type || 'Perfil'}</h4>
                      </div>
                      <div className="p-6 space-y-4">
                        <div>
                          <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">Nombre Completo</label>
                          <div className="relative">
                            <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                            <input
                              type="text"
                              value={personForm.nombre}
                              onChange={(e) => setPersonForm({ ...personForm, nombre: e.target.value })}
                              className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-300 focus:border-transparent transition-all outline-none"
                              required
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">Teléfono</label>
                            <div className="relative">
                              <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                              <input
                                type="tel"
                                value={personForm.telefono}
                                onChange={(e) => setPersonForm({ ...personForm, telefono: e.target.value })}
                                className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-300 focus:border-transparent transition-all outline-none"
                                required
                              />
                            </div>
                          </div>
                          <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 opacity-60">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Documento (No Editable)</p>
                            <p className="font-bold text-gray-700">{personData?.documentId || 'N/A'}</p>
                          </div>
                        </div>
                        <div>
                          <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">Dirección</label>
                          <div className="relative">
                            <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                            <input
                              type="text"
                              value={personForm.direccion}
                              onChange={(e) => setPersonForm({ ...personForm, direccion: e.target.value })}
                              className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-300 focus:border-transparent transition-all outline-none"
                              required
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>

        {/* Footer - Fixed at bottom */}
        <div className="p-5 bg-white border-t border-gray-100 flex flex-wrap gap-3 justify-end shrink-0 z-20">
          <button
            onClick={isEditing ? () => setIsEditing(false) : onClose}
            className="px-8 py-2.5 rounded-xl font-black text-gray-500 hover:bg-gray-200 hover:text-gray-800 active:scale-95 transition-all text-sm uppercase tracking-widest shadow-sm"
            disabled={saving}
          >
            {isEditing ? 'Cancelar' : 'Cerrar'}
          </button>
        </div>
      </div>
    </div>
  );
}
