import React, { useState } from 'react';
import { Lock, Eye, EyeOff, Shield, CheckCircle, X, AlertCircle, ArrowLeft } from 'lucide-react';

interface PasswordResetFormProps {
  userEmail?: string;
}

export function PasswordResetForm({ userEmail = 'maria.rodriguez@gmail.com' }: PasswordResetFormProps) {
  // Extract the name from email for greeting
  const getName = (email: string) => {
    const localPart = email.split('@')[0];
    return localPart.split('.').map(part => 
      part.charAt(0).toUpperCase() + part.slice(1)
    ).join(' ');
  };
  
  const userName = getName(userEmail);
  const initials = userName.split(' ').map(name => name.charAt(0)).join('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const passwordRequirements = [
    { text: 'Mínimo 8 caracteres', met: newPassword.length >= 8 },
    { text: 'Al menos una mayúscula', met: /[A-Z]/.test(newPassword) },
    { text: 'Al menos una minúscula', met: /[a-z]/.test(newPassword) },
    { text: 'Al menos un número', met: /\d/.test(newPassword) },
    { text: 'Al menos un carácter especial', met: /[!@#$%^&*]/.test(newPassword) },
  ];

  const allRequirementsMet = passwordRequirements.every(req => req.met);
  const passwordsMatch = newPassword === confirmPassword && confirmPassword !== '';

  const handleSubmit = (e) => {
    e.preventDefault();
    if (allRequirementsMet && passwordsMatch) {
      setIsSubmitted(true);
      // Simulate API call
      setTimeout(() => {
        setIsSuccess(true);
      }, 2000);
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 text-center">
          <div className="w-20 h-20 bg-gradient-to-r from-green-400 to-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-white" />
          </div>
          
          <h2 className="text-2xl font-bold text-gray-800 mb-4">
            ¡Contraseña actualizada!
          </h2>
          
          <p className="text-gray-600 mb-8">
            Tu contraseña ha sido restablecida exitosamente. Ya puedes iniciar sesión con tu nueva contraseña.
          </p>
          
          <button className="bg-gradient-to-r from-pink-400 to-purple-500 text-white px-8 py-3 rounded-xl font-semibold hover:shadow-lg transition-all w-full mb-4">
            Ir a iniciar sesión
          </button>
          
          <button className="text-gray-500 hover:text-gray-700 text-sm">
            Volver al inicio
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-pink-400 to-purple-500 text-white p-8 text-center">
          <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Restablecer contraseña</h1>
          <p className="text-pink-100">Crea una nueva contraseña segura</p>
        </div>

        {/* Content */}
        <div className="p-8">
          {isSubmitted ? (
            <div className="text-center">
              <div className="animate-spin w-12 h-12 border-4 border-pink-200 border-t-pink-500 rounded-full mx-auto mb-4"></div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Actualizando contraseña...</h3>
              <p className="text-gray-600">Por favor espera un momento</p>
            </div>
          ) : (
            <>
              {/* User Info */}
              <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-4 mb-6 border border-purple-200">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-r from-pink-400 to-purple-500 rounded-full flex items-center justify-center">
                    <span className="text-white font-semibold text-sm">{initials}</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-800">{userName}</h3>
                    <p className="text-sm text-gray-600">{userEmail}</p>
                  </div>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* New Password Field */}
                <div>
                  <label className="block font-semibold text-gray-700 mb-2">
                    Nueva contraseña
                  </label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-pink-300 focus:border-transparent pr-12"
                      placeholder="Ingresa tu nueva contraseña"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                {/* Password Requirements */}
                {newPassword && (
                  <div className="bg-gray-50 rounded-xl p-4">
                    <h4 className="font-semibold text-gray-700 mb-3 flex items-center">
                      <Shield className="w-4 h-4 mr-2" />
                      Requisitos de seguridad
                    </h4>
                    <div className="space-y-2">
                      {passwordRequirements.map((req, index) => (
                        <div key={index} className="flex items-center space-x-2">
                          {req.met ? (
                            <CheckCircle className="w-4 h-4 text-green-500" />
                          ) : (
                            <X className="w-4 h-4 text-gray-400" />
                          )}
                          <span className={`text-sm ${req.met ? 'text-green-700' : 'text-gray-600'}`}>
                            {req.text}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Confirm Password Field */}
                <div>
                  <label className="block font-semibold text-gray-700 mb-2">
                    Confirmar nueva contraseña
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-pink-300 focus:border-transparent pr-12"
                      placeholder="Confirma tu nueva contraseña"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  
                  {confirmPassword && (
                    <div className="mt-2 flex items-center space-x-2">
                      {passwordsMatch ? (
                        <>
                          <CheckCircle className="w-4 h-4 text-green-500" />
                          <span className="text-sm text-green-700">Las contraseñas coinciden</span>
                        </>
                      ) : (
                        <>
                          <AlertCircle className="w-4 h-4 text-red-500" />
                          <span className="text-sm text-red-600">Las contraseñas no coinciden</span>
                        </>
                      )}
                    </div>
                  )}
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={!allRequirementsMet || !passwordsMatch}
                  className={`w-full py-3 px-6 rounded-xl font-semibold transition-all ${
                    allRequirementsMet && passwordsMatch
                      ? 'bg-gradient-to-r from-pink-400 to-purple-500 text-white hover:shadow-lg'
                      : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  Actualizar contraseña
                </button>
              </form>

              {/* Security Notice */}
              <div className="mt-6 bg-blue-50 border border-blue-200 rounded-xl p-4">
                <div className="flex items-start space-x-3">
                  <Shield className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-blue-800">
                    <p className="font-semibold mb-1">Importante:</p>
                    <ul className="space-y-1 text-blue-700">
                      <li>• Esta sesión expirará en 15 minutos por seguridad</li>
                      <li>• Se cerrará tu sesión en todos los dispositivos</li>
                      <li>• Recibirás un correo de confirmación</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Footer Links */}
              <div className="mt-6 pt-6 border-t border-gray-200 text-center space-y-3">
                <button className="flex items-center justify-center space-x-2 text-gray-600 hover:text-gray-800 mx-auto">
                  <ArrowLeft className="w-4 h-4" />
                  <span>Volver al inicio de sesión</span>
                </button>
                
                <div className="text-xs text-gray-500">
                  <p>¿Tienes problemas? <a href="#" className="text-pink-600 hover:underline">Contáctanos</a></p>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}