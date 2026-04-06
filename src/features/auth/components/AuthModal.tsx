import React, { useState } from 'react';
import { X, Mail, Lock, User, Eye, EyeOff, IdCard, Phone, ArrowLeft, CheckCircle, Loader2, Send, Save, AlertCircle } from 'lucide-react';
import { authService } from '../services/authService';
import { setAuthToken } from '@/shared/services/apiClient';

interface AuthModalProps {
  onClose: () => void;
  onLogin: (user: any) => void;
  onPasswordRecoveryDemo?: (email: string) => void;
}

export function AuthModal({ onClose, onLogin, onPasswordRecoveryDemo }: AuthModalProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [showResetPasswordForm, setShowResetPasswordForm] = useState(false);
  const [showChangeTempPassword, setShowChangeTempPassword] = useState(false);
  const [showResetPasswordVisible, setShowResetPasswordVisible] = useState(false);
  const [showTempPasswordVisible, setShowTempPasswordVisible] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [recoveryCode, setRecoveryCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [codeError, setCodeError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [apiError, setApiError] = useState('');
  const [loading, setLoading] = useState(false);

  // Tokens for the password recovery flow
  const [recoveryToken, setRecoveryToken] = useState('');
  const [resetToken, setResetToken] = useState('');

  const [formData, setFormData] = useState({
    documentType: 'cedula',
    firstName: '',
    lastName: '',
    documentId: '',
    email: '',
    phone: '',
    address: '',
    password: '',
    confirmPassword: ''
  });

  // ── LOGIN ──
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiError('');
    setLoading(true);

    try {
      const data = await authService.login(formData.email, formData.password);
      const user = authService.buildUserFromLoginResponse(data);
      setAuthToken(data.token);

      if (user.requiereCambioPassword) {
        setShowChangeTempPassword(true);
      } else {
        onLogin(user);
        onClose();
      }
    } catch (err: any) {
      console.error('Login error:', err);
      setApiError('Credenciales inválidas. Verifica tu correo y contraseña.');
    } finally {
      setLoading(false);
    }
  };

  // ── CHANGE TEMP PASSWORD ──
  const handleChangeTempPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      setPasswordError('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    setPasswordError('');
    setLoading(true);

    try {
      // Use the formData.password (current temporary password) and newPassword
      await authService.changePassword(formData.email, formData.password, newPassword);

      // Auto-login with the new password
      const data = await authService.login(formData.email, newPassword);
      const user = authService.buildUserFromLoginResponse(data);
      setAuthToken(data.token);

      setShowSuccessMessage(true);
      setTimeout(() => {
        onLogin(user);
        onClose();
      }, 2000);
    } catch (err: any) {
      console.error('Change temp password error:', err);
      const errorMessage = err.message || 'Error al cambiar la contraseña. Intenta nuevamente.';
      setPasswordError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // ── REGISTER ──
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiError('');

    // Validate passwords match
    if (formData.password !== formData.confirmPassword) {
      setApiError('Las contraseñas no coinciden');
      return;
    }
    if (formData.password.length < 6) {
      setApiError('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    const nombreUsuario = `${formData.firstName} ${formData.lastName}`.trim();
    if (!nombreUsuario) {
      setApiError('Ingresa tu nombre completo');
      return;
    }

    setLoading(true);

    try {
      // Register Client (backend will check for duplicates in the POST /api/Usuarios call)
      await authService.registerClient({
        documentType: formData.documentType,
        firstName: formData.firstName,
        lastName: formData.lastName,
        documentId: formData.documentId,
        phone: formData.phone,
        email: formData.email,
        password: formData.password,
        confirmPassword: formData.confirmPassword,
      });

      setApiError('');
      // Show success and switch to login
      setShowSuccessMessage(true);
      setTimeout(() => {
        setShowSuccessMessage(false);
        setIsLogin(true);
        setFormData({ ...formData, password: '', confirmPassword: '' });
      }, 2000);
    } catch (err: any) {
      console.error('Register error:', err);
      // El mensaje de error ya viene formateado del authService
      setApiError(err.message || 'Error al crear la cuenta. Intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    if (isLogin) {
      handleLogin(e);
    } else {
      handleRegister(e);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setApiError(''); // Clear error on input change
  };
  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setApiError('');
  };

  // ── FORGOT PASSWORD ──
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.trim()) return;
    setApiError('');
    setLoading(true);

    try {
      const response = await authService.requestPasswordRecovery(forgotEmail);
      // The API returns a token needed for code validation
      const token = typeof response === 'string' ? response : response?.token || response;
      setRecoveryToken(token);
      setShowForgotPassword(false);
      setShowCodeModal(true);
    } catch (err: any) {
      console.error('Recovery error:', err);
      setApiError('Error al enviar código de recuperación. Verifica tu correo.');
    } finally {
      setLoading(false);
    }
  };

  // ── VERIFY CODE ──
  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recoveryCode.trim()) {
      setCodeError('Ingresa el código de recuperación');
      return;
    }
    setCodeError('');
    setLoading(true);

    try {
      const result = await authService.validateRecoveryCode(recoveryToken, recoveryCode);

      if (result && (result.valid === true || result.resetToken)) {
        setResetToken(result.resetToken || result);
        setShowCodeModal(false);
        setShowResetPasswordForm(true);
      } else {
        setCodeError('Código de recuperación incorrecto');
      }
    } catch (err: any) {
      console.error('Code validation error:', err);
      setCodeError('Código de recuperación incorrecto');
    } finally {
      setLoading(false);
    }
  };

  // ── RESET PASSWORD ──
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword !== confirmNewPassword) {
      setPasswordError('Las contraseñas no coinciden');
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    setPasswordError('');
    setLoading(true);

    try {
      await authService.resetPassword(resetToken, newPassword, confirmNewPassword);

      setShowResetPasswordForm(false);
      setShowSuccessMessage(true);

      setTimeout(() => {
        setShowSuccessMessage(false);
        resetForgotPasswordState();
      }, 2000);
    } catch (err: any) {
      console.error('Reset password error:', err);
      setPasswordError('Error al cambiar la contraseña. Intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleViewPasswordRecovery = () => {
    if (onPasswordRecoveryDemo) {
      onPasswordRecoveryDemo(forgotEmail);
      onClose();
    }
  };

  const resetForgotPasswordState = () => {
    setShowForgotPassword(false);
    setResetEmailSent(false);
    setShowCodeModal(false);
    setShowResetPasswordForm(false);
    setShowSuccessMessage(false);
    setShowChangeTempPassword(false);
    setShowResetPasswordVisible(false);
    setShowTempPasswordVisible(false);
    setForgotEmail('');
    setRecoveryCode('');
    setNewPassword('');
    setConfirmNewPassword('');
    setCodeError('');
    setPasswordError('');
    setApiError('');
    setRecoveryToken('');
    setResetToken('');
  };

  // Handle view title and subtitle
  const getHeaderContent = () => {
    if (showSuccessMessage) {
      return {
        title: isLogin ? 'Cambio Exitoso' : '¡Cuenta Creada!',
        subtitle: isLogin
          ? 'Tu contraseña ha sido restablecida correctamente'
          : 'Tu cuenta ha sido creada exitosamente. Ahora puedes iniciar sesión.'
      };
    } else if (showResetPasswordForm || showChangeTempPassword) {
      return {
        title: 'Nueva Contraseña',
        subtitle: 'Ingresa tu nueva contraseña para acceder a tu cuenta'
      };
    } else if (showCodeModal) {
      return {
        title: 'Código de Recuperación',
        subtitle: 'Verifica el código que enviamos a tu correo'
      };
    } else if (showForgotPassword) {
      return {
        title: 'Recuperar Contraseña',
        subtitle: 'Ingresa tu email para recibir el código de recuperación'
      };
    } else if (resetEmailSent) {
      return {
        title: 'Email Enviado',
        subtitle: 'Revisa tu correo para restablecer tu contraseña'
      };
    } else {
      return {
        title: isLogin ? 'Iniciar Sesión' : 'Crear Cuenta',
        subtitle: isLogin
          ? 'Accede a tu cuenta de AsthroApp'
          : 'Únete a nuestra comunidad de belleza'
      };
    }
  };

  const headerContent = getHeaderContent();

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-pink-500 to-purple-600 p-6 text-white shrink-0 shadow-md z-20">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {(showForgotPassword || resetEmailSent || showCodeModal || showResetPasswordForm || showChangeTempPassword) ? (
                <button
                  onClick={() => showChangeTempPassword ? setShowChangeTempPassword(false) : resetForgotPasswordState()}
                  className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm shadow-inner hover:bg-white/30 transition-all"
                >
                  <ArrowLeft className="w-6 h-6 text-white" />
                </button>
              ) : (
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm shadow-inner">
                  {isLogin ? <Lock className="w-6 h-6 text-white" /> : <User className="w-6 h-6 text-white" />}
                </div>
              )}
              <div>
                <h3 className="text-xl font-bold leading-tight">{headerContent.title}</h3>
                <p className="text-pink-100 text-[10px] font-medium uppercase tracking-widest">{headerContent.subtitle}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-9 h-9 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/30 hover:scale-110 active:scale-95 transition-all shadow-sm"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 lg:p-8 bg-gray-50/30 no-scrollbar">
          <style>{`
            .no-scrollbar::-webkit-scrollbar { display: none; }
            .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
          `}</style>

          {/* API Error Message */}
          {apiError && (
            <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center space-x-3 animate-in fade-in slide-in-from-top-2 duration-300">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
              <p className="text-[10px] font-black text-red-600 uppercase tracking-widest">{apiError}</p>
            </div>
          )}

          {/* Success Message for Reset Email */}
          {resetEmailSent ? (
            <div className="space-y-6">
              <div className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm text-center">
                <div className="w-20 h-20 bg-green-50 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-green-100 rotate-3">
                  <CheckCircle className="w-10 h-10 text-green-500 -rotate-3" />
                </div>
                <h3 className="text-xl font-bold text-gray-800 mb-2">¡Email enviado!</h3>
                <p className="text-sm text-gray-500 leading-relaxed mb-6">
                  Hemos enviado un enlace para restablecer tu contraseña a:
                </p>
                <div className="bg-pink-50 rounded-xl p-4 border border-pink-100 mb-6">
                  <p className="font-bold text-pink-600">{forgotEmail}</p>
                </div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  Si no lo ves, revisa tu carpeta de spam.
                </p>
              </div>
              
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={handleViewPasswordRecovery}
                  className="w-full bg-gradient-to-r from-pink-500 to-purple-600 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:shadow-lg hover:scale-[1.02] active:scale-95 transition-all shadow-md"
                >
                  Ver proceso de recuperación
                </button>
                <button
                  type="button"
                  onClick={resetForgotPasswordState}
                  className="w-full bg-white text-gray-400 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-gray-50 transition-all border border-gray-100"
                >
                  Volver al inicio
                </button>
              </div>
            </div>
          ) : showForgotPassword ? (
            /* Forgot Password Form */
            <form onSubmit={handleForgotPassword} className="space-y-6">
              <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                <div className="flex items-center space-x-2 text-pink-500 mb-6">
                  <Mail className="w-4 h-4" />
                  <h4 className="font-bold uppercase text-[10px] tracking-widest">Recuperación de Cuenta</h4>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Correo Electrónico *</label>
                    <div className="relative group">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-pink-500 transition-colors w-5 h-5" />
                      <input
                        type="email"
                        value={forgotEmail}
                        onChange={(e) => { setForgotEmail(e.target.value); setApiError(''); }}
                        required
                        disabled={loading}
                        className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 transition-all text-sm font-medium"
                        placeholder="tu@email.com"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-pink-500 to-purple-600 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:shadow-lg hover:scale-[1.02] active:scale-95 transition-all shadow-md flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                <span>Enviar Código</span>
              </button>
            </form>
          ) : showCodeModal ? (
            /* Code Verification Form */
            <form onSubmit={handleVerifyCode} className="space-y-6">
              <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                <div className="flex items-center space-x-2 text-purple-500 mb-6">
                  <Lock className="w-4 h-4" />
                  <h4 className="font-bold uppercase text-[10px] tracking-widest">Verificar Identidad</h4>
                </div>
                
                <p className="text-sm text-gray-500 mb-6">
                  Ingresa el código enviado a <span className="font-bold text-gray-700">{forgotEmail}</span>
                </p>

                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Código de Verificación *</label>
                  <input
                    type="text"
                    value={recoveryCode}
                    onChange={(e) => { setRecoveryCode(e.target.value); setCodeError(''); }}
                    required
                    disabled={loading}
                    className="w-full px-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all text-center text-2xl font-black tracking-[0.5em] uppercase"
                    placeholder="000000"
                  />
                  {codeError && <p className="text-[10px] text-red-500 font-bold mt-2 uppercase text-center">{codeError}</p>}
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-pink-500 to-purple-600 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:shadow-lg hover:scale-[1.02] active:scale-95 transition-all shadow-md flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
                <span>Verificar Código</span>
              </button>
            </form>
          ) : showResetPasswordForm || showChangeTempPassword ? (
            /* Reset/Change Password Form */
            <form onSubmit={showResetPasswordForm ? handleResetPassword : handleChangeTempPassword} className="space-y-6">
              <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                <div className="flex items-center space-x-2 text-pink-500 mb-6">
                  <Lock className="w-4 h-4" />
                  <h4 className="font-bold uppercase text-[10px] tracking-widest">Seguridad de la Cuenta</h4>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Nueva Contraseña *</label>
                    <div className="relative group">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-pink-500 transition-colors w-5 h-5" />
                      <input
                        type={showResetPasswordVisible || showTempPasswordVisible ? 'text' : 'password'}
                        value={newPassword}
                        onChange={(e) => { setNewPassword(e.target.value); setPasswordError(''); }}
                        required
                        disabled={loading}
                        className="w-full pl-12 pr-12 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 transition-all text-sm font-medium"
                        placeholder="••••••••"
                      />
                      <button
                        type="button"
                        onClick={() => showResetPasswordForm ? setShowResetPasswordVisible(!showResetPasswordVisible) : setShowTempPasswordVisible(!showTempPasswordVisible)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300 hover:text-pink-500 transition-colors"
                      >
                        {showResetPasswordVisible || showTempPasswordVisible ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>

                  {showResetPasswordForm && (
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Confirmar Contraseña *</label>
                      <div className="relative group">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-pink-500 transition-colors w-5 h-5" />
                        <input
                          type={showResetPasswordVisible ? 'text' : 'password'}
                          value={confirmNewPassword}
                          onChange={(e) => { setConfirmNewPassword(e.target.value); setPasswordError(''); }}
                          required
                          className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 transition-all text-sm font-medium"
                          placeholder="••••••••"
                        />
                      </div>
                    </div>
                  )}
                </div>
                {passwordError && <p className="text-[10px] text-red-500 font-bold mt-4 uppercase">{passwordError}</p>}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-pink-500 to-purple-600 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:shadow-lg hover:scale-[1.02] active:scale-95 transition-all shadow-md flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                <span>{showResetPasswordForm ? 'Restablecer Contraseña' : 'Cambiar Contraseña'}</span>
              </button>
            </form>
          ) : showSuccessMessage ? (
            /* Success Message */
            <div className="space-y-6">
              <div className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm text-center">
                <div className="w-20 h-20 bg-green-50 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-green-100 rotate-3">
                  <CheckCircle className="w-10 h-10 text-green-500 -rotate-3" />
                </div>
                <h3 className="text-xl font-bold text-gray-800 mb-2">¡Operación Exitosa!</h3>
                <p className="text-sm text-gray-500 leading-relaxed">
                  {isLogin
                    ? 'Tu contraseña ha sido restablecida con éxito. Ahora puedes iniciar sesión con tus nuevas credenciales.'
                    : 'Tu cuenta ha sido creada correctamente. ¡Bienvenida a AsthroApp!'}
                </p>
              </div>
              <button
                type="button"
                onClick={resetForgotPasswordState}
                className="w-full bg-gradient-to-r from-pink-500 to-purple-600 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:shadow-lg hover:scale-[1.02] active:scale-95 transition-all shadow-md"
              >
                Iniciar Sesión Ahora
              </button>
            </div>
          ) : (
            /* Login/Register Form */
            <form onSubmit={handleSubmit} className="space-y-6">
              {!isLogin ? (
                /* Registration Cards */
                <div className="space-y-6">
                  <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                    <div className="flex items-center space-x-2 text-purple-500 mb-4">
                      <IdCard className="w-4 h-4" />
                      <h4 className="font-bold uppercase text-[10px] tracking-widest">Identificación</h4>
                    </div>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                          <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Tipo de Documento *</label>
                          <select
                            name="documentType"
                            value={formData.documentType}
                            onChange={handleSelectChange}
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all text-sm font-medium"
                          >
                            <option value="cedula">Cédula de Ciudadanía</option>
                            <option value="tarjeta_identidad">Tarjeta de Identidad</option>
                            <option value="cedula_extranjeria">Cédula de Extranjería</option>
                            <option value="pasaporte">Pasaporte</option>
                            <option value="nit">NIT</option>
                          </select>
                        </div>
                        <div className="col-span-2">
                          <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Número de Documento *</label>
                          <input
                            type="text"
                            name="documentId"
                            value={formData.documentId}
                            onChange={handleInputChange}
                            required
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all text-sm font-medium"
                            placeholder="Ej: 1020304050"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                    <div className="flex items-center space-x-2 text-pink-500 mb-4">
                      <User className="w-4 h-4" />
                      <h4 className="font-bold uppercase text-[10px] tracking-widest">Información Personal</h4>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Nombres *</label>
                        <input
                          type="text"
                          name="firstName"
                          value={formData.firstName}
                          onChange={handleInputChange}
                          required
                          className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 transition-all text-sm font-medium"
                          placeholder="Tus nombres"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Apellidos *</label>
                        <input
                          type="text"
                          name="lastName"
                          value={formData.lastName}
                          onChange={handleInputChange}
                          required
                          className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 transition-all text-sm font-medium"
                          placeholder="Tus apellidos"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Teléfono *</label>
                        <input
                          type="tel"
                          name="phone"
                          value={formData.phone}
                          onChange={handleInputChange}
                          required
                          className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 transition-all text-sm font-medium"
                          placeholder="+57 300 123 4567"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                    <div className="flex items-center space-x-2 text-blue-500 mb-4">
                      <Mail className="w-4 h-4" />
                      <h4 className="font-bold uppercase text-[10px] tracking-widest">Acceso y Seguridad</h4>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Correo Electrónico *</label>
                        <input
                          type="email"
                          name="email"
                          value={formData.email}
                          onChange={handleInputChange}
                          required
                          className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm font-medium"
                          placeholder="tu@email.com"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Contraseña *</label>
                          <input
                            type={showRegisterPassword ? 'text' : 'password'}
                            name="password"
                            value={formData.password}
                            onChange={handleInputChange}
                            required
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm font-medium"
                            placeholder="••••••••"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Confirmar *</label>
                          <input
                            type={showRegisterPassword ? 'text' : 'password'}
                            name="confirmPassword"
                            value={formData.confirmPassword}
                            onChange={handleInputChange}
                            required
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm font-medium"
                            placeholder="••••••••"
                          />
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowRegisterPassword(!showRegisterPassword)}
                        className="text-[9px] font-black text-blue-500 uppercase tracking-widest hover:text-blue-600 transition-colors"
                      >
                        {showRegisterPassword ? 'Ocultar Contraseñas' : 'Ver Contraseñas'}
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                /* Login Card */
                <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-6">
                  <div className="flex items-center space-x-2 text-purple-500">
                    <Lock className="w-4 h-4" />
                    <h4 className="font-bold uppercase text-[10px] tracking-widest">Credenciales de Acceso</h4>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Correo Electrónico</label>
                      <div className="relative group">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-purple-500 transition-colors w-5 h-5" />
                        <input
                          type="email"
                          name="email"
                          value={formData.email}
                          onChange={handleInputChange}
                          required
                          className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all text-sm font-medium"
                          placeholder="tu@email.com"
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Contraseña</label>
                        <button
                          type="button"
                          onClick={() => setShowForgotPassword(true)}
                          className="text-[9px] font-black text-pink-500 uppercase tracking-widest hover:text-pink-600 transition-colors"
                        >
                          ¿Olvidaste tu contraseña?
                        </button>
                      </div>
                      <div className="relative group">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-purple-500 transition-colors w-5 h-5" />
                        <input
                          type={showLoginPassword ? 'text' : 'password'}
                          name="password"
                          value={formData.password}
                          onChange={handleInputChange}
                          required
                          className="w-full pl-12 pr-12 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all text-sm font-medium"
                          placeholder="••••••••"
                        />
                        <button
                          type="button"
                          onClick={() => setShowLoginPassword(!showLoginPassword)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300 hover:text-purple-500 transition-colors"
                        >
                          {showLoginPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-pink-500 to-purple-600 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:shadow-lg hover:scale-[1.02] active:scale-95 transition-all shadow-md flex items-center justify-center space-x-2 disabled:opacity-50"
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    isLogin ? <Lock className="w-5 h-5" /> : <User className="w-5 h-5" />
                  )}
                  <span>{isLogin ? 'Iniciar Sesión' : 'Crear Cuenta'}</span>
                </button>

                <div className="text-center">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
                    {isLogin ? '¿Aún no tienes una cuenta?' : '¿Ya eres parte de AsthroApp?'}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setIsLogin(!isLogin);
                      setApiError('');
                      setFormData({
                        documentType: 'cedula',
                        firstName: '',
                        lastName: '',
                        documentId: '',
                        email: '',
                        phone: '',
                        address: '',
                        password: '',
                        confirmPassword: ''
                      });
                    }}
                    className="text-[11px] font-black text-pink-500 uppercase tracking-[0.2em] hover:text-purple-600 transition-colors"
                  >
                    {isLogin ? 'Regístrate Gratis' : 'Inicia Sesión'}
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
