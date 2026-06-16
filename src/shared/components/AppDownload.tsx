import React from 'react';
import { Download, Smartphone } from 'lucide-react';

export function AppDownload() {
  return (
    <section className="relative overflow-hidden bg-white py-10">
      {/* Decorative Background Elements */}
      <div className="absolute inset-0">
        <div className="absolute top-10 left-1/4 w-20 h-20 bg-brand-pink/10 rounded-full blur-xl"></div>
        <div className="absolute bottom-10 right-1/4 w-32 h-32 bg-brand-indigo/10 rounded-full blur-xl"></div>
      </div>

      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="flex items-center justify-center mb-6">
          <div className="w-16 h-16 bg-gradient-brand rounded-2xl flex items-center justify-center shadow-lg shadow-brand-pink/20">
            <Smartphone className="w-8 h-8 text-white" />
          </div>
        </div>

        <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mb-4">
          ¿Quieres usar nuestros servicios desde tu celular?
        </h2>

        <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
          Descarga nuestra aplicación móvil y disfruta de una experiencia aún mejor.
          Disponible para dispositivos Android.
        </p>

        <a
          href="/apk/astrhoapp.apk"
          download
          className="inline-flex items-center space-x-3 bg-gradient-brand text-white px-10 py-4 rounded-xl font-semibold hover:shadow-2xl hover:opacity-90 transform hover:-translate-y-1 transition-all duration-300 text-lg"
        >
          <Download className="w-6 h-6" />
          <span>Descargar nuestra aplicación</span>
        </a>
      </div>
    </section>
  );
}
