import React, { useState, useEffect } from 'react';
import { X, Mail, Lock, User, Eye, EyeOff, IdCard, Phone, ArrowLeft, CheckCircle, Loader2, Send, Save, AlertCircle } from 'lucide-react';
import { authService } from '../services/authService';
import { setAuthToken } from '@/shared/services/apiClient';
import { useLoading } from '@/shared/contexts/LoadingContext';

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
  const [newPasswordErrors, setNewPasswordErrors] = useState<{ password?: string; confirm?: string }>({});

  // Validate temp/reset password fields
  const validateNewPasswords = (pwd: string, confirm: string) => {
    const errors: { password?: string; confirm?: string } = {};
    
    if (pwd) {
      if (pwd.length < 7) {
        errors.password = 'La contraseña debe tener al menos 7 caracteres';
      } else if (pwd.length > 15) {
        errors.password = 'La contraseña no puede superar 15 caracteres';
      } else if (!/[A-Z]/.test(pwd)) {
        errors.password = 'La contraseña debe contener al menos una letra mayúscula';
      } else if ((pwd.match(/\d/g) || []).length < 2) {
        errors.password = 'La contraseña debe contener al menos 2 números';
      }
    }

    if (confirm && pwd !== confirm) {
      errors.confirm = 'Las contraseñas no coinciden';
    }

    setNewPasswordErrors(errors);
  };

  // Real-time validation for newPassword and confirmNewPassword
  useEffect(() => {
    validateNewPasswords(newPassword, confirmNewPassword);
  }, [newPassword, confirmNewPassword]);
  const [apiError, setApiError] = useState('');
  const [loading, setLoading] = useState(false);
  const { showLoading, hideLoading } = useLoading();

  // Tokens for the password recovery flow
  const [recoveryToken, setRecoveryToken] = useState('');
  const [resetToken, setResetToken] = useState('');

  const [formData, setFormData] = useState({
    documentType: 'CC',
    firstName: '',
    lastName: '',
    userDocument: '',
    email: '',
    phone: '',
    address: '',
    password: '',
    confirmPassword: ''
  });

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [validatingFields, setValidatingFields] = useState<Record<string, boolean>>({});

  // Blur handler: sync validation + async uniqueness checks
  const handleBlur = async (e: React.FocusEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    let finalValue = value;

    // Sanitize first name and last name on blur
    if (name === 'firstName' || name === 'lastName') {
      finalValue = value.trim().replace(/\s+/g, ' ');
      setFormData(prev => ({ ...prev, [name]: finalValue }));
    }
    
    const syncError = validateField(name, finalValue);
    if (syncError) {
      setFieldErrors(prev => ({ ...prev, [name]: syncError }));
      return;
    }

    // Async check: duplicate email only for self-registration
    if (name === 'email' && value.trim() && !isLogin) {
      setValidatingFields(prev => ({ ...prev, email: true }));
      try {
        // Wait, authService.checkDuplicates requires auth, but for self-registration we can't use that,
        // so we'll rely on backend error for now, but let's at least show validation before submit!
        // For now we'll just skip the async check here and let the backend handle it on submit!
      } catch { }
      setValidatingFields(prev => ({ ...prev, email: false }));
    }
  };

  // Validation functions
  const validateField = (name: string, value: string, docType?: string): string => {
    switch (name) {
      case 'firstName':
      case 'lastName':
        if (!value.trim()) return `El ${name === 'firstName' ? 'nombre' : 'apellido'} es obligatorio`;
        if (value.trim() && !/^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]+$/.test(value))
          return `El ${name === 'firstName' ? 'nombre' : 'apellido'} solo debe contener letras`;
        return '';
      case 'email':
        if (!value.trim()) return 'El correo electrónico es obligatorio';
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) return 'El formato del correo no es válido';
        return '';
      case 'userDocument': {
        if (!value.trim()) return 'El documento de usuario es obligatorio';
        if (!/^\d+$/.test(value.trim()))
          return 'El documento de usuario solo debe contener números';
        const len = value.trim().length;
        if (len < 7) return 'El documento de usuario debe tener al menos 7 caracteres';
        if (len > 11) return 'El documento de usuario debe tener máximo 11 caracteres';
        return '';
      }
      case 'phone':
        if (!value.trim()) return 'El teléfono es obligatorio';
        if (value.trim() && !/^\d{10}$/.test(value))
          return 'El teléfono debe tener exactamente 10 dígitos numéricos';
        return '';
      case 'password':
        if (!value) return 'La contraseña es obligatoria';
        if (value.length < 7) return 'La contraseña debe tener entre 7 y 15 caracteres';
        if (value.length > 15) return 'La contraseña debe tener entre 7 y 15 caracteres';
        if (!/[A-Z]/.test(value)) return 'La contraseña debe contener al menos una letra mayúscula';
        if ((value.match(/\d/g) || []).length < 2) return 'La contraseña debe contener al menos 2 números';
        return '';
      case 'confirmPassword':
        if (!value) return 'Confirmar la contraseña es obligatorio';
        if (value !== formData.password) return 'Las contraseñas no coinciden';
        return '';
      default:
        return '';
    }
  };

  // Key down handler for numeric fields
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const { name } = e.currentTarget;

    // Allow: backspace, delete, tab, escape, enter
    if (['Backspace', 'Delete', 'Tab', 'Escape', 'Enter'].includes(e.key)) {
      return;
    }

    // Allow: Ctrl+A, Ctrl+C, Ctrl+X
    if ((e.ctrlKey || e.metaKey) && ['a', 'c', 'x'].includes(e.key.toLowerCase())) {
      return;
    }

    // Allow: home, end, left, right
    if (['Home', 'End', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
      return;
    }

    // For phone and userDocument: only allow numbers
    if (name === 'phone' || name === 'userDocument') {
      if (!/^[0-9]$/.test(e.key)) {
        e.preventDefault();
      }
    }
  };

  // Paste handler for sanitization
  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const { name } = e.currentTarget;

    e.preventDefault();
    const pastedText = e.clipboardData.getData('text');
    let sanitizedText = pastedText;

    if (name === 'phone') {
      sanitizedText = pastedText.replace(/[^0-9]/g, '');
    }

    if (name === 'userDocument') {
      sanitizedText = pastedText.replace(/[^a-zA-Z0-9]/g, '');
    }

    // Real-time validation
    const error = validateField(name, sanitizedText);
    setFieldErrors(prev => ({ ...prev, [name]: error }));

    // Update form data
    setFormData(prev => ({
      ...prev,
      [name]: sanitizedText
    }));
  };

  // ── LOGIN ──
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiError('');
    setLoading(true);

    try {
      showLoading("Validando credenciales...");
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
      
      const status = err.status;
      const message = (err.message || '').toLowerCase();
      const body = (err.body || '').toLowerCase();
      
      if (message.includes('desactivado') || message.includes('inactivo') || message.includes('inactive') || body.includes('desactivado') || body.includes('inactivo')) {
        setApiError('Tu cuenta está inactiva. Contacta al administrador.');
      } else if (
        status === 404 || 
        status === 401 || 
        message.includes('no existe') || 
        message.includes('not found') || 
        message.includes('contraseña') || 
        message.includes('password') || 
        message.includes('unauthorized')
      ) {
        setApiError('Credenciales incorrectas, verifica los datos.');
      } else {
        setApiError('Credenciales inválidas o error de conexión. Verifica tus datos.');
      }
    } finally {
      setLoading(false);
      hideLoading();
    }
  };

  // ── CHANGE TEMP PASSWORD ──
  const handleChangeTempPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Re-validate to make sure we have the latest errors
    validateNewPasswords(newPassword, confirmNewPassword);
    
    // Check if there are any errors
    if (Object.keys(newPasswordErrors).length > 0 || !newPassword) {
      if (!newPassword) {
        setPasswordError('La contraseña es obligatoria');
      }
      setLoading(false);
      return;
    }

    setPasswordError('');
    setLoading(true);

    try {
      showLoading("Actualizando tu seguridad...");
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
      hideLoading();
    }
  };

  // ── REGISTER ──
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiError('');

    // Validate all fields
    const fieldsToValidate = ['firstName', 'lastName', 'userDocument', 'email', 'phone', 'password', 'confirmPassword'];
    const errors: Record<string, string> = {};
    for (const field of fieldsToValidate) {
      const err = validateField(field, formData[field as keyof typeof formData]);
      if (err) errors[field] = err;
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setLoading(true);

    try {
      showLoading("Creando tu perfil de belleza...");
      // Register Client (backend will check for duplicates in the POST /api/Usuarios call)
      await authService.registerClient({
        documentType: formData.documentType,
        firstName: formData.firstName,
        lastName: formData.lastName,
        userDocument: formData.userDocument,
        phone: formData.phone,
        email: formData.email,
        password: formData.password,
        confirmPassword: formData.confirmPassword,
        address: formData.address,
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
      const errorMessage = err.message || 'Error al crear la cuenta. Intenta nuevamente.';
      
      if (errorMessage.toLowerCase().includes('correo') || errorMessage.toLowerCase().includes('email')) {
        // It's an email-specific error
        setFieldErrors(prev => ({ ...prev, email: errorMessage }));
        setApiError(''); // Clear general error if it's field-specific
      } else {
        setApiError(errorMessage);
      }
    } finally {
      setLoading(false);
      hideLoading();
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
    const { name, value } = e.target;
    let sanitized = value;

    // Sanitize phone: only numbers, max 10 digits
    if (name === 'phone') {
      sanitized = value.replace(/[^0-9]/g, '').slice(0, 10);
    }

    // Sanitize userDocument: only numbers, max 11 digits
    if (name === 'userDocument') {
      sanitized = value.replace(/[^0-9]/g, '').slice(0, 11);
    }

    // Sanitize password: max 15 characters
    if (name === 'password' || name === 'confirmPassword') {
      sanitized = value.slice(0, 15);
    }

    // Update form data first so we have the latest values
    const newFormData = {
      ...formData,
      [name]: sanitized
    };
    setFormData(newFormData);

    // Real-time validation
    const errors = { ...fieldErrors };
    
    // Validate current field
    errors[name] = validateField(name, sanitized);
    
    // If password changed and confirmPassword is not empty, re-validate confirmPassword
    if (name === 'password' && newFormData.confirmPassword) {
      errors.confirmPassword = validateField('confirmPassword', newFormData.confirmPassword);
    }
    
    setFieldErrors(errors);

    setApiError(''); // Clear error on input change
  };

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
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

    // Re-validate to make sure we have the latest errors
    validateNewPasswords(newPassword, confirmNewPassword);
    
    // Check if there are any errors
    if (Object.keys(newPasswordErrors).length > 0 || !newPassword || !confirmNewPassword) {
      if (!newPassword) {
        setPasswordError('La contraseña es obligatoria');
      }
      if (!confirmNewPassword) {
        setNewPasswordErrors(prev => ({ ...prev, confirm: 'Debe confirmar la contraseña' }));
      }
      setLoading(false);
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
    setNewPasswordErrors({});
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
        <div className="bg-gradient-brand p-6 text-white shrink-0 shadow-md z-20">
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
                <p className="text-white/80 text-[10px] font-medium uppercase tracking-widest">{headerContent.subtitle}</p>
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
            <div className="mb-6 p-4 bg-gray-50 border border-red-100 rounded-2xl flex items-center space-x-3 animate-in fade-in slide-in-from-top-2 duration-300">
              <AlertCircle className="w-5 h-5 text-brand-pink flex-shrink-0" />
              <p className="text-[10px] font-black text-brand-pink uppercase tracking-widest">{apiError}</p>
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
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 mb-6">
                  <p className="font-bold text-brand-indigo">{forgotEmail}</p>
                </div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  Si no lo ves, revisa tu carpeta de spam.
                </p>
              </div>
              
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={handleViewPasswordRecovery}
                  className="w-full bg-gradient-brand text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:shadow-lg hover:opacity-90 hover:scale-[1.02] active:scale-95 transition-all shadow-md"
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
                <div className="flex items-center space-x-2 text-brand-indigo mb-6">
                  <Mail className="w-4 h-4" />
                  <h4 className="font-bold uppercase text-[10px] tracking-widest">Recuperación de Cuenta</h4>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Correo Electrónico *</label>
                    <div className="relative group">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-brand-indigo transition-colors w-5 h-5" />
                      <input
                        type="email"
                        value={forgotEmail}
                        onChange={(e) => { setForgotEmail(e.target.value); setApiError(''); }}
                        required
                        disabled={loading}
                        className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-brand-periwinkle/30 focus:border-brand-indigo transition-all text-sm font-medium"
                        placeholder="tu@email.com"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-brand text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:shadow-lg hover:opacity-90 hover:scale-[1.02] active:scale-95 transition-all shadow-md flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                <span>Enviar Código</span>
              </button>
            </form>
          ) : showCodeModal ? (
            /* Code Verification Form */
            <form onSubmit={handleVerifyCode} className="space-y-6">
              <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                <div className="flex items-center space-x-2 text-brand-violet mb-6">
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
                    className="w-full px-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-brand-periwinkle/30 focus:border-brand-indigo transition-all text-center text-2xl font-black tracking-[0.5em] uppercase"
                    placeholder="000000"
                  />
                  {codeError && <p className="text-[10px] text-brand-pink font-bold mt-2 uppercase text-center">{codeError}</p>}
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-brand text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:shadow-lg hover:opacity-90 hover:scale-[1.02] active:scale-95 transition-all shadow-md flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
                <span>Verificar Código</span>
              </button>
            </form>
          ) : showResetPasswordForm || showChangeTempPassword ? (
            /* Reset/Change Password Form */
            <form onSubmit={showResetPasswordForm ? handleResetPassword : handleChangeTempPassword} className="space-y-6">
              <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                <div className="flex items-center space-x-2 text-brand-indigo mb-6">
                  <Lock className="w-4 h-4" />
                  <h4 className="font-bold uppercase text-[10px] tracking-widest">Seguridad de la Cuenta</h4>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Nueva Contraseña *</label>
                    <div className="relative group">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-brand-indigo transition-colors w-5 h-5" />
                      <input
                        type={showResetPasswordVisible || showTempPasswordVisible ? 'text' : 'password'}
                        value={newPassword}
                        onChange={(e) => { setNewPassword(e.target.value); setPasswordError(''); }}
                        required
                        disabled={loading}
                        className="w-full pl-12 pr-12 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-brand-periwinkle/30 focus:border-brand-indigo transition-all text-sm font-medium"
                        placeholder="••••••••"
                      />
                      <button
                        type="button"
                        onClick={() => showResetPasswordForm ? setShowResetPasswordVisible(!showResetPasswordVisible) : setShowTempPasswordVisible(!showTempPasswordVisible)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300 hover:text-brand-indigo transition-colors"
                      >
                        {showResetPasswordVisible || showTempPasswordVisible ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                    {newPasswordErrors.password && (
                      <p className="text-[10px] text-brand-pink font-bold mt-2">{newPasswordErrors.password}</p>
                    )}
                  </div>

                  {showResetPasswordForm && (
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Confirmar Contraseña *</label>
                      <div className="relative group">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-brand-indigo transition-colors w-5 h-5" />
                        <input
                          type={showResetPasswordVisible ? 'text' : 'password'}
                          value={confirmNewPassword}
                          onChange={(e) => { setConfirmNewPassword(e.target.value); setPasswordError(''); }}
                          required
                          className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-brand-periwinkle/30 focus:border-brand-indigo transition-all text-sm font-medium"
                          placeholder="••••••••"
                        />
                      </div>
                      {newPasswordErrors.confirm && (
                        <p className="text-[10px] text-brand-pink font-bold mt-2">{newPasswordErrors.confirm}</p>
                      )}
                    </div>
                  )}
                </div>
                {passwordError && <p className="text-[10px] text-brand-pink font-bold mt-4 uppercase">{passwordError}</p>}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-brand text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:shadow-lg hover:opacity-90 hover:scale-[1.02] active:scale-95 transition-all shadow-md flex items-center justify-center space-x-2 disabled:opacity-50"
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
                className="w-full bg-gradient-brand text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:shadow-lg hover:opacity-90 hover:scale-[1.02] active:scale-95 transition-all shadow-md"
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
                    <div className="flex items-center space-x-2 text-brand-violet mb-4">
                      <IdCard className="w-4 h-4" />
                      <h4 className="font-bold uppercase text-[10px] tracking-widest">Identificación</h4>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Tipo de Documento *</label>
                        <select
                          name="documentType"
                          value={formData.documentType}
                          onChange={handleSelectChange}
                          required
                          className={`w-full px-4 py-3 bg-gray-50 border rounded-xl focus:ring-2 focus:ring-brand-periwinkle/30 focus:border-brand-indigo transition-all text-sm font-medium ${fieldErrors.documentType ? 'border-red-300 ring-1 ring-red-100' : 'border-gray-100'}`}
                        >
                          <option value="CC">Cédula de Ciudadanía (CC)</option>
                          <option value="CE">Cédula de Extranjería (CE)</option>
                          <option value="TI">Tarjeta de Identidad (TI)</option>
                          <option value="NIT">Número de Identificación Tributaria (NIT)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Número de Documento *</label>
                        <input
                          type="text"
                          name="userDocument"
                          value={formData.userDocument}
                          onChange={handleInputChange}
                          onBlur={handleBlur}
                          onKeyDown={handleKeyDown}
                          onPaste={handlePaste}
                          maxLength={11}
                          required
                          className={`w-full px-4 py-3 bg-gray-50 border rounded-xl focus:ring-2 focus:ring-brand-periwinkle/30 focus:border-brand-indigo transition-all text-sm font-medium ${fieldErrors.userDocument ? 'border-red-300 ring-1 ring-red-100' : 'border-gray-100'}`}
                          placeholder="Ej: 1234567890"
                        />
                        {fieldErrors.userDocument && <p className="text-[9px] text-brand-pink mt-1">{fieldErrors.userDocument}</p>}
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                    <div className="flex items-center space-x-2 text-brand-pink mb-4">
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
                          onBlur={handleBlur}
                          required
                          className={`w-full px-4 py-3 bg-gray-50 border rounded-xl focus:ring-2 focus:ring-brand-periwinkle/30 focus:border-brand-indigo transition-all text-sm font-medium ${fieldErrors.firstName ? 'border-red-300 ring-1 ring-red-100' : 'border-gray-100'}`}
                          placeholder="Tus nombres"
                        />
                        {fieldErrors.firstName && <p className="text-[9px] text-brand-pink mt-1">{fieldErrors.firstName}</p>}
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Apellidos *</label>
                        <input
                          type="text"
                          name="lastName"
                          value={formData.lastName}
                          onChange={handleInputChange}
                          onBlur={handleBlur}
                          required
                          className={`w-full px-4 py-3 bg-gray-50 border rounded-xl focus:ring-2 focus:ring-brand-periwinkle/30 focus:border-brand-indigo transition-all text-sm font-medium ${fieldErrors.lastName ? 'border-red-300 ring-1 ring-red-100' : 'border-gray-100'}`}
                          placeholder="Tus apellidos"
                        />
                        {fieldErrors.lastName && <p className="text-[9px] text-brand-pink mt-1">{fieldErrors.lastName}</p>}
                      </div>
                      <div className="col-span-2">
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Teléfono *</label>
                        <input
                          type="tel"
                          name="phone"
                          inputMode="tel"
                          value={formData.phone}
                          onChange={handleInputChange}
                          onKeyDown={handleKeyDown}
                          onPaste={handlePaste}
                          maxLength={10}
                          required
                          className={`w-full px-4 py-3 bg-gray-50 border rounded-xl focus:ring-2 focus:ring-brand-periwinkle/30 focus:border-brand-indigo transition-all text-sm font-medium ${fieldErrors.phone ? 'border-red-300 ring-1 ring-red-100' : 'border-gray-100'}`}
                          placeholder="3001234567"
                        />
                        {fieldErrors.phone && <p className="text-[9px] text-brand-pink mt-1">{fieldErrors.phone}</p>}
                      </div>
                      <div className="col-span-2">
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Dirección de Residencia</label>
                        <input
                          type="text"
                          name="address"
                          value={formData.address}
                          onChange={handleInputChange}
                          maxLength={100}
                          className="w-full px-4 py-3 bg-gray-50 border rounded-xl focus:ring-2 focus:ring-brand-periwinkle/30 focus:border-brand-indigo transition-all text-sm font-medium border-gray-100"
                          placeholder="Calle 10 #20-30"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                    <div className="flex items-center space-x-2 text-brand-indigo mb-4">
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
                          onBlur={handleBlur}
                          required
                          className={`w-full px-4 py-3 bg-gray-50 border rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm font-medium ${fieldErrors.email ? 'border-red-300 ring-1 ring-red-100' : 'border-gray-100'}`}
                          placeholder="tu@email.com"
                        />
                        {validatingFields.email && <p className="text-[9px] text-blue-500 mt-1 animate-pulse">Verificando...</p>}
                        {fieldErrors.email && <p className="text-[9px] text-brand-pink mt-1">{fieldErrors.email}</p>}
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Contraseña *</label>
                          <input
                            type={showRegisterPassword ? 'text' : 'password'}
                            name="password"
                            value={formData.password}
                            onChange={handleInputChange}
                            maxLength={15}
                            required
                            className={`w-full px-4 py-3 bg-gray-50 border rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm font-medium ${fieldErrors.password ? 'border-red-300 ring-1 ring-red-100' : 'border-gray-100'}`}
                            placeholder="••••••••"
                          />
                          {fieldErrors.password && <p className="text-[9px] text-brand-pink mt-1">{fieldErrors.password}</p>}
                        </div>
                        <div>
                          <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Confirmar *</label>
                          <input
                            type={showRegisterPassword ? 'text' : 'password'}
                            name="confirmPassword"
                            value={formData.confirmPassword}
                            onChange={handleInputChange}
                            maxLength={15}
                            required
                            className={`w-full px-4 py-3 bg-gray-50 border rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm font-medium ${fieldErrors.confirmPassword ? 'border-red-300 ring-1 ring-red-100' : 'border-gray-100'}`}
                            placeholder="••••••••"
                          />
                          {fieldErrors.confirmPassword && <p className="text-[9px] text-brand-pink mt-1">{fieldErrors.confirmPassword}</p>}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowRegisterPassword(!showRegisterPassword)}
                        className="text-[9px] font-black text-brand-indigo uppercase tracking-widest hover:text-brand-violet transition-colors"
                      >
                        {showRegisterPassword ? 'Ocultar Contraseñas' : 'Ver Contraseñas'}
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                /* Login Card */
                <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-6">
                  <div className="flex items-center space-x-2 text-brand-violet">
                    <Lock className="w-4 h-4" />
                    <h4 className="font-bold uppercase text-[10px] tracking-widest">Credenciales de Acceso</h4>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Correo Electrónico</label>
                      <div className="relative group">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-brand-indigo transition-colors w-5 h-5" />
                        <input
                          type="email"
                          name="email"
                          value={formData.email}
                          onChange={handleInputChange}
                          required
                          className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-brand-periwinkle/30 focus:border-brand-indigo transition-all text-sm font-medium"
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
                          className="text-[9px] font-black text-brand-pink uppercase tracking-widest hover:text-brand-violet transition-colors"
                        >
                          ¿Olvidaste tu contraseña?
                        </button>
                      </div>
                      <div className="relative group">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-brand-indigo transition-colors w-5 h-5" />
                        <input
                          type={showLoginPassword ? 'text' : 'password'}
                          name="password"
                          value={formData.password}
                          onChange={handleInputChange}
                          required
                          className="w-full pl-12 pr-12 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-brand-periwinkle/30 focus:border-brand-indigo transition-all text-sm font-medium"
                          placeholder="••••••••"
                        />
                        <button
                          type="button"
                          onClick={() => setShowLoginPassword(!showLoginPassword)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300 hover:text-brand-indigo transition-colors"
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
                  className="w-full bg-gradient-brand text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:shadow-lg hover:scale-[1.02] active:scale-95 transition-all shadow-md flex items-center justify-center space-x-2 disabled:opacity-50"
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
                        documentType: 'CC',
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
                    className="text-[11px] font-black text-brand-pink uppercase tracking-[0.2em] hover:text-brand-indigo transition-colors"
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
