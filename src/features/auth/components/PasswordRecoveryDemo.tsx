import React, { useState } from 'react';
import { PasswordRecoveryEmail } from './PasswordRecoveryEmail';
import { PasswordResetForm } from './PasswordResetForm';
import { Mail, Lock, ArrowRight } from 'lucide-react';

interface PasswordRecoveryDemoProps {
  userEmail?: string;
}

export function PasswordRecoveryDemo({ userEmail = 'maria.rodriguez@gmail.com' }: PasswordRecoveryDemoProps) {
  const [currentView, setCurrentView] = useState('email');

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50">
      {/* Navigation Header */}
      <div className="bg-white shadow-lg border-b border-gray-200 p-4 mb-8">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-gradient-to-r from-pink-400 to-purple-500 rounded-full flex items-center justify-center">
              <span className="text-white font-bold">AE</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-800">Demo - Recuperación de Contraseña</h1>
              <p className="text-sm text-gray-600">AsthroApp - Salón de Belleza</p>
            </div>
          </div>
          
          <div className="flex items-center bg-gray-100 rounded-full p-1">
            <button
              onClick={() => setCurrentView('email')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-full transition-all ${
                currentView === 'email'
                  ? 'bg-white shadow-md text-pink-600'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <Mail className="w-4 h-4" />
              <span>Correo</span>
            </button>
            <div className="mx-2">
              <ArrowRight className="w-4 h-4 text-gray-400" />
            </div>
            <button
              onClick={() => setCurrentView('form')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-full transition-all ${
                currentView === 'form'
                  ? 'bg-white shadow-md text-purple-600'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <Lock className="w-4 h-4" />
              <span>Formulario</span>
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      {currentView === 'email' && (
        <div className="space-y-6">
          <div className="max-w-4xl mx-auto px-4">
            <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center">
                <Mail className="w-6 h-6 mr-2 text-pink-500" />
                Paso 1: Correo de Recuperación
              </h2>
              <p className="text-gray-600 mb-4">
                Este es el correo electrónico que recibe el usuario cuando solicita recuperar su contraseña.
                Incluye información de seguridad, instrucciones claras y el enlace para restablecer la contraseña.
              </p>
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                <span>Enviado desde: noreply@asthroapp.com</span>
              </div>
            </div>
          </div>
          <PasswordRecoveryEmail userEmail={userEmail} />
        </div>
      )}

      {currentView === 'form' && (
        <div className="space-y-6">
          <div className="max-w-4xl mx-auto px-4">
            <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center">
                <Lock className="w-6 h-6 mr-2 text-purple-500" />
                Paso 2: Formulario de Restablecimiento
              </h2>
              <p className="text-gray-600 mb-4">
                Esta es la interfaz que aparece cuando el usuario hace clic en el enlace del correo.
                Permite crear una nueva contraseña con validaciones de seguridad en tiempo real.
              </p>
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                <span>URL: https://asthroapp.com/reset-password?token=...</span>
              </div>
            </div>
          </div>
          <PasswordResetForm userEmail={userEmail} />
        </div>
      )}

      {/* Footer Info */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl p-6 border border-purple-200">
          <h3 className="font-bold text-gray-800 mb-4">Características de seguridad implementadas:</h3>
          <div className="grid md:grid-cols-2 gap-4 text-sm text-gray-700">
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                <span>Enlace de un solo uso con expiración de 24 horas</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                <span>Validación de contraseña en tiempo real</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                <span>Información de dispositivo y ubicación</span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                <span>Cierre automático de todas las sesiones</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                <span>Confirmación por correo electrónico</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                <span>Diseño responsive y accesible</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}