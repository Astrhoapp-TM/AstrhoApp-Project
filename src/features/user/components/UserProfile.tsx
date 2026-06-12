import React, { useState, useEffect } from 'react';
import {
  User, Mail, Phone, MapPin, IdCard, Camera, X, Save,
  LogOut, Shield, UserCog, CheckCircle, AlertCircle,
  FileText, Calendar, Sparkles, Key, Edit, Loader2, Eye, EyeOff, Lock
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
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Form states
  const [userForm, setUserForm] = useState({
    email: user.email || '',
  });

  const [personForm, setPersonForm] = useState({
    nombre: '',
    telefono: '',
    direccion: '',
  });

  const [passwordForm, setPasswordForm] = useState({
    nuevaContrasena: '',
    confirmarContrasena: '',
  });
  const [passwordErrors, setPasswordErrors] = useState<{ nueva?: string; confirmar?: string }>({});
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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

    // Password validation (only if user filled in at least one field)
    const hasPasswordInput = passwordForm.nuevaContrasena || passwordForm.confirmarContrasena;
    if (hasPasswordInput) {
      const pwErrors: { nueva?: string; confirmar?: string } = {};

      if (!passwordForm.nuevaContrasena) {
        pwErrors.nueva = 'La nueva contraseña es obligatoria';
      } else if (passwordForm.nuevaContrasena.length < 6) {
        pwErrors.nueva = 'La contraseña debe tener al menos 6 caracteres';
      } else if (passwordForm.nuevaContrasena.length > 15) {
        pwErrors.nueva = 'La contraseña no puede superar 15 caracteres';
      }

      if (!passwordForm.confirmarContrasena) {
        pwErrors.confirmar = 'Debe confirmar la contraseña';
      } else if (passwordForm.nuevaContrasena !== passwordForm.confirmarContrasena) {
        pwErrors.confirmar = 'Las contraseñas no coinciden';
      }

      if (Object.keys(pwErrors).length > 0) {
        setPasswordErrors(pwErrors);
        setSaving(false);
        return;
      }
      setPasswordErrors({});
    }

    try {
      const userId = user.usuarioId || user.id;
      const docId = personData.documentId;
      const isClient = personData.type === 'Cliente';

      // 1. Update User (Email and other basics if needed)
      // Determine correct rolId: prioritize user.rolId, then use role name
      let rolIdToUse = user.rolId;
      if (!rolIdToUse) {
        const roleName = (user.role || user.rol?.nombre || '').toLowerCase();
        if (roleName.includes('super')) {
          rolIdToUse = 4;
        } else if (roleName.includes('admin')) {
          rolIdToUse = 1;
        } else if (roleName.includes('asistente')) {
          rolIdToUse = 3;
        } else if (roleName.includes('cliente') || roleName.includes('customer')) {
          rolIdToUse = 2;
        } else {
          rolIdToUse = user.role === 'customer' ? 2 : 1;
        }
      }

      const userUpdatePayload = {
        email: userForm.email,
        rolId: rolIdToUse,
        estado: true,
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

      // 3. Change password if provided
      if (hasPasswordInput) {
        await userService.changePassword(
          userId,
          passwordForm.nuevaContrasena,
          passwordForm.confirmarContrasena
        );
        // Clear password fields after successful change
        setPasswordForm({ nuevaContrasena: '', confirmarContrasena: '' });
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
        setSuccess(false);
      }, 3000);

    } catch (err: any) {
      console.error("Error updating profile:", err);
      const errorMsg = err?.response?.data || err?.message || "Error al actualizar el perfil. Por favor, intente de nuevo.";
      setError(typeof errorMsg === 'string' ? errorMsg : JSON.stringify(errorMsg));
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
      case 'super_admin': return 'bg-gray-50 text-pink-700 border border-brand-periwinkle';
      case 'admin': return 'bg-gray-100 text-brand-pink';
      case 'asistente': return 'bg-blue-100 text-blue-700';
      case 'customer': return 'bg-green-100 text-green-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header - Fixed at top */}
        <div className="bg-gradient-brand p-5 text-white shrink-0 shadow-md z-20">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <User className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold leading-tight">
                  Mi Perfil de Usuario
                </h3>
              </div>
            </div>
            <div className="flex items-center space-x-2">
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
              <Loader2 className="w-12 h-12 text-brand-pink animate-spin" />
              <p className="text-gray-500 font-medium">Cargando información del perfil...</p>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto space-y-6">
              {/* Notifications */}
              {error && (
                <div className="bg-gray-50 border border-red-200 text-brand-pink px-6 py-4 rounded-2xl flex items-center space-x-3 animate-in fade-in duration-300">
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

              <form id="profile-form" onSubmit={handleSave} className="space-y-6 animate-in slide-in-from-bottom-4 duration-300">
                {/* Identity Header Card */}
                <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-3 min-w-0">
                    <div className="w-12 h-12 bg-gradient-brand rounded-xl flex items-center justify-center shadow-md shrink-0">
                      <span className="text-white font-bold text-base">
                        {personData?.name?.charAt(0).toUpperCase() || user.email.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-gray-800 text-base truncate">
                        {personData?.name || 'Usuario'}
                      </p>
                      <div className="flex items-center mt-0.5">
                        <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${getRoleBadgeColor(user.role)}`}>
                          {getRoleDisplayName(user.role)}
                        </span>
                      </div>
                    </div>
                  </div>
                  {personData && (
                    <div className="text-right border-l border-gray-100 pl-4 shrink-0">
                      <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Documento</p>
                      <p className="font-bold text-gray-700 text-xs">{personData.documentType} {personData.documentId || 'N/A'}</p>
                    </div>
                  )}
                </div>

                {/* Personal Information Card */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="px-6 py-4 bg-gray-50/50 border-b border-gray-100 flex items-center space-x-2">
                    <IdCard className="w-4 h-4 text-purple-400" />
                    <h4 className="font-bold text-gray-700 text-sm">Información Personal</h4>
                  </div>
                  <div className="p-6 space-y-6">
                    <div className="grid md:grid-cols-2 gap-6">
                      {/* Column 1 */}
                      <div className="space-y-4">
                        <div>
                          <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">Nombre Completo</label>
                          <div className="relative">
                            <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                            <input
                              type="text"
                              value={personForm.nombre}
                              onChange={(e) => setPersonForm({ ...personForm, nombre: e.target.value })}
                              className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-periwinkle/300 focus:border-transparent transition-all outline-none"
                              required
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">Correo Electrónico</label>
                          <div className="relative">
                            <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                            <input
                              type="email"
                              value={userForm.email}
                              onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                              className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-periwinkle/300 focus:border-transparent transition-all outline-none"
                              required
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">Nueva Contraseña</label>
                          <div className="relative">
                            <Key className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                            <input
                              type={showNewPassword ? 'text' : 'password'}
                              value={passwordForm.nuevaContrasena}
                              onChange={(e) => {
                                const val = e.target.value.slice(0, 15);
                                setPasswordForm({ ...passwordForm, nuevaContrasena: val });
                                if (passwordErrors.nueva) setPasswordErrors(prev => ({ ...prev, nueva: undefined }));
                              }}
                              className={`w-full pl-10 pr-10 py-3 bg-gray-50 border rounded-xl focus:ring-2 focus:ring-brand-periwinkle/300 focus:border-transparent transition-all outline-none ${
                                passwordErrors.nueva ? 'border-red-300 ring-1 ring-red-100' : 'border-gray-200'
                              }`}
                              placeholder="Dejar vacío para no cambiar"
                              maxLength={15}
                              autoComplete="new-password"
                            />
                            <button
                              type="button"
                              onClick={() => setShowNewPassword(!showNewPassword)}
                              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                            >
                              {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>
                          {passwordErrors.nueva && <p className="text-brand-pink text-[9px] mt-1 font-bold">{passwordErrors.nueva}</p>}
                        </div>
                      </div>

                      {/* Column 2 */}
                      <div className="space-y-4">
                        <div>
                          <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">Teléfono</label>
                          <div className="relative">
                            <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                            <input
                              type="tel"
                              value={personForm.telefono}
                              onChange={(e) => setPersonForm({ ...personForm, telefono: e.target.value })}
                              className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-periwinkle/300 focus:border-transparent transition-all outline-none"
                              required
                            />
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
                              className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-periwinkle/300 focus:border-transparent transition-all outline-none"
                              required
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">Confirmar Contraseña</label>
                          <div className="relative">
                            <Key className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                            <input
                              type={showConfirmPassword ? 'text' : 'password'}
                              value={passwordForm.confirmarContrasena}
                              onChange={(e) => {
                                const val = e.target.value.slice(0, 15);
                                setPasswordForm({ ...passwordForm, confirmarContrasena: val });
                                if (passwordErrors.confirmar) setPasswordErrors(prev => ({ ...prev, confirmar: undefined }));
                              }}
                              className={`w-full pl-10 pr-10 py-3 bg-gray-50 border rounded-xl focus:ring-2 focus:ring-brand-periwinkle/300 focus:border-transparent transition-all outline-none ${
                                passwordErrors.confirmar ? 'border-red-300 ring-1 ring-red-100' : 'border-gray-200'
                              }`}
                              placeholder="Repetir nueva contraseña"
                              maxLength={15}
                              autoComplete="new-password"
                            />
                            <button
                              type="button"
                              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                            >
                              {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>
                          {passwordErrors.confirmar && <p className="text-brand-pink text-[9px] mt-1 font-bold">{passwordErrors.confirmar}</p>}
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-gray-100 flex items-start space-x-2">
                      <Lock className="w-3.5 h-3.5 text-brand-pink shrink-0 mt-0.5" />
                      <p className="text-[10px] text-gray-400 italic">
                        Cambio de contraseña (opcional): Deje los campos vacíos si solo desea actualizar sus datos personales. La contraseña debe tener entre 6 y 15 caracteres.
                      </p>
                    </div>
                  </div>
                </div>
              </form>
            </div>
          )}
        </div>

        {/* Footer - Fixed at bottom */}
        <div className="p-5 bg-white border-t border-gray-100 flex flex-wrap gap-3 justify-end shrink-0 z-20">
          <button
            onClick={onClose}
            className="px-8 py-2.5 rounded-xl font-black text-gray-500 hover:bg-gray-200 hover:text-gray-800 active:scale-95 transition-all text-sm uppercase tracking-widest shadow-sm"
            disabled={saving}
            type="button"
          >
            Cerrar
          </button>
          <button
            type="submit"
            form="profile-form"
            disabled={saving || loading}
            className="px-8 py-2.5 rounded-xl font-black text-white bg-gradient-brand hover:opacity-90 shadow-lg active:scale-95 transition-all text-sm uppercase tracking-widest flex items-center space-x-2 disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>{saving ? 'Guardando...' : 'Guardar Cambios'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
