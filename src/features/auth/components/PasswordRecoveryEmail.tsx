import React from 'react';
import { Mail, Shield, Clock, MapPin, Phone } from 'lucide-react';

interface PasswordRecoveryEmailProps {
  userEmail?: string;
}

export function PasswordRecoveryEmail({ userEmail = 'maria.rodriguez@gmail.com' }: PasswordRecoveryEmailProps) {
  // Extract the name from email for greeting
  const getName = (email: string) => {
    const localPart = email.split('@')[0];
    return localPart.split('.').map(part => 
      part.charAt(0).toUpperCase() + part.slice(1)
    ).join(' ');
  };
  
  const userName = getName(userEmail);
  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Email Header - Simulating Gmail interface */}
        <div className="bg-white rounded-t-lg border border-gray-200 p-4 mb-0">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <div className="flex items-center space-x-2">
              <Mail className="w-4 h-4" />
              <span>Bandeja de entrada</span>
            </div>
            <div className="flex items-center space-x-4">
              <span>hace 2 minutos</span>
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            </div>
          </div>
        </div>

        {/* Email Content */}
        <div className="bg-white border-x border-gray-200 p-0">
          {/* Email Header */}
          <div className="border-b border-gray-200 p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h1 className="text-xl font-bold text-gray-900">Recuperación de contraseña - AsthroApp</h1>
                <div className="flex items-center space-x-2 text-sm text-gray-600 mt-1">
                  <span>De: noreply@asthroapp.com</span>
                  <span>•</span>
                  <span>Para: {userEmail}</span>
                </div>
              </div>
              <div className="flex items-center space-x-1 text-xs text-gray-500">
                <Clock className="w-3 h-3" />
                <span>19 sep 2025, 2:45 PM</span>
              </div>
            </div>
          </div>

          {/* Email Body */}
          <div className="p-0">
            {/* Header with Logo */}
            <div className="bg-gradient-brand text-white p-8 text-center">
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold mb-2">AsthroApp</h2>
              <p className="text-pink-100">Salón de belleza Astrid Eugenia Hoyos</p>
            </div>

            {/* Main Content */}
            <div className="p-8">
              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold text-gray-800 mb-4">Recupera tu contraseña</h3>
                <p className="text-gray-600 text-lg">
                  Hola <strong>{userName}</strong>, recibimos una solicitud para restablecer tu contraseña.
                </p>
              </div>

              <div className="bg-gradient-to-r from-pink-50 to-purple-50 rounded-2xl p-6 mb-8 border border-brand-periwinkle">
                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-gradient-brand rounded-full flex items-center justify-center flex-shrink-0">
                    <Shield className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-800 mb-2">Información de seguridad</h4>
                    <div className="text-sm text-gray-600 space-y-1">
                      <p><strong>Fecha:</strong> 19 de septiembre, 2025 - 2:45 PM</p>
                      <p><strong>Dispositivo:</strong> Chrome en Windows</p>
                      <p><strong>Ubicación:</strong> Medellín, Colombia</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Reset Button */}
              <div className="text-center mb-8">
                <button className="bg-gradient-brand text-white px-8 py-4 rounded-2xl font-bold text-lg hover:shadow-lg transition-all transform hover:scale-105">
                  Restablecer mi contraseña
                </button>
                <p className="text-sm text-gray-500 mt-4">
                  Este enlace expirará en <strong>24 horas</strong>
                </p>
              </div>

              {/* Alternative Link */}
              <div className="bg-gray-50 rounded-xl p-6 mb-8">
                <h4 className="font-semibold text-gray-800 mb-2">¿No puedes hacer clic en el botón?</h4>
                <p className="text-sm text-gray-600 mb-3">Copia y pega este enlace en tu navegador:</p>
                <div className="bg-white border border-gray-200 rounded-lg p-3 text-sm font-mono text-blue-600 break-all">
                  https://asthroapp.com/reset-password?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
                </div>
              </div>

              {/* Security Notice */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 mb-8">
                <h4 className="font-semibold text-yellow-800 mb-2">⚠️ Importante</h4>
                <ul className="text-sm text-yellow-700 space-y-1">
                  <li>• Si no solicitaste este cambio, ignora este correo</li>
                  <li>• Nunca compartas este enlace con otras personas</li>
                  <li>• Tu contraseña actual sigue siendo válida hasta que la cambies</li>
                </ul>
              </div>

              {/* Footer */}
              <div className="border-t border-gray-200 pt-8">
                <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-6">
                  <div className="flex items-start space-x-4">
                    <div className="w-12 h-12 bg-gradient-brand rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-white font-bold text-sm">AE</span>
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-gray-800 mb-2">Salón de Belleza Astrid Eugenia Hoyos</h4>
                      <div className="text-sm text-gray-600 space-y-1">
                        <div className="flex items-center space-x-2">
                          <MapPin className="w-4 h-4" />
                          <span>Cll 55 #42-16, Medellín, Colombia</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Phone className="w-4 h-4" />
                          <span>+57 304 123 4567</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="text-center mt-6">
                  <p className="text-xs text-gray-500">
                    Este correo fue enviado desde AsthroApp. Si tienes dudas, contáctanos.
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    © 2025 AsthroApp - Todos los derechos reservados
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Email Footer - Simulating Gmail interface */}
        <div className="bg-gray-50 rounded-b-lg border border-gray-200 border-t-0 p-4">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <div className="flex items-center space-x-4">
              <button className="hover:text-gray-800">Responder</button>
              <button className="hover:text-gray-800">Reenviar</button>
            </div>
            <div className="flex items-center space-x-2">
              <span>🔒 Cifrado</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}