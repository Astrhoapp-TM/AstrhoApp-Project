import React from 'react';
import { Phone, MapPin, Clock, Sparkles, Heart } from 'lucide-react';

export function Footer() {
  return (
    <footer className="relative overflow-hidden bg-white dark:bg-slate-950 border-t border-slate-100 dark:border-slate-900">
      {/* Decorative top gradient border */}
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-brand" />

      {/* Decorative blurred circles */}
      <div className="absolute -top-40 -left-40 w-80 h-80 bg-brand-pink/20 rounded-full blur-3xl" />
      <div className="absolute -bottom-40 -right-40 w-80 h-80 bg-brand-indigo/20 rounded-full blur-3xl" />

      <div className="relative max-w-7xl mx-auto px-4 py-12 md:py-16">
        {/* Main footer grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">

          {/* Brand Column */}
          <div className="flex flex-col">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-12 h-12 bg-gradient-brand rounded-2xl flex items-center justify-center shadow-lg shadow-brand-pink/20">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <span className="text-2xl font-bold text-gradient-brand">
                AsthroApp
              </span>
            </div>
            <p className="text-slate-600 dark:text-slate-300 mb-6 leading-relaxed">
              Tu salón de belleza de confianza en Medellín. Dirigido por{' '}
              <span className="font-semibold text-slate-900 dark:text-white">Astrid Eugenia Hoyos</span>,
              especialista en cuidado capilar y tratamientos de belleza.
            </p>
            <div className="flex items-center space-x-2 text-sm text-brand-indigo dark:text-brand-lavender font-medium bg-brand-indigo/5 dark:bg-brand-indigo/10 w-max px-4 py-2 rounded-full">
              <Heart className="w-4 h-4 text-brand-pink" />
              <span>Belleza con pasión y dedicación</span>
            </div>
          </div>

          {/* Contact Column */}
          <div className="flex flex-col">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6 relative inline-block w-max">
              Contacto
              <span className="absolute -bottom-2 left-0 w-1/2 h-1 bg-gradient-brand rounded-full" />
            </h3>

            <div className="space-y-6">
              {/* Phone */}
              <a
                href="https://wa.me/573148512539?text=Hola,%20quiero%20más%20información%20sobre%20sus%20servicios"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-start space-x-4 group transition-all duration-300 hover:translate-x-1"
              >
                <div className="w-12 h-12 rounded-2xl bg-brand-pink/10 flex items-center justify-center shrink-0 group-hover:bg-brand-pink group-hover:text-white transition-colors duration-300">
                  <Phone className="w-5 h-5 text-brand-pink group-hover:text-white transition-colors" />
                </div>

                <div className="pt-1">
                  <div className="text-sm font-medium text-slate-500 dark:text-slate-400">
                    Escríbenos por WhatsApp
                  </div>
                  <div className="text-base font-semibold text-slate-900 dark:text-white group-hover:text-brand-pink transition-colors">
                    314 851 2539
                  </div>
                </div>
              </a>

              {/* Address */}
              <div className="flex items-start space-x-4 group transition-all duration-300 hover:translate-x-1">
                <div className="w-12 h-12 rounded-2xl bg-brand-indigo/10 flex items-center justify-center shrink-0 group-hover:bg-brand-indigo transition-colors duration-300">
                  <MapPin className="w-5 h-5 text-brand-indigo group-hover:text-white transition-colors" />
                </div>
                <div className="pt-1">
                  <div className="text-sm font-medium text-slate-500 dark:text-slate-400">Visítanos</div>
                  <div className="text-base font-semibold text-slate-900 dark:text-white">Cl. 55 # 42-14</div>
                  <div className="text-sm text-slate-500 dark:text-slate-400">Medellín, Antioquia</div>
                </div>
              </div>

              {/* Hours */}
              <div className="flex items-start space-x-4 group transition-all duration-300 hover:translate-x-1">
                <div className="w-12 h-12 rounded-2xl bg-brand-violet/10 flex items-center justify-center shrink-0 group-hover:bg-brand-violet transition-colors duration-300">
                  <Clock className="w-5 h-5 text-brand-violet group-hover:text-white transition-colors" />
                </div>
                <div className="pt-1">
                  <div className="text-sm font-medium text-slate-500 dark:text-slate-400">Horario</div>
                  <div className="text-base font-semibold text-slate-900 dark:text-white">Lun - Sáb: 8:00 AM - 10:30 PM</div>
                </div>
              </div>
            </div>
          </div>

          {/* Map Column */}
          <div className="flex flex-col h-full min-h-[250px]">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6 relative inline-block w-max">
              Ubicación
              <span className="absolute -bottom-2 left-0 w-1/2 h-1 bg-gradient-brand rounded-full" />
            </h3>
            <div className="flex-1 w-full rounded-2xl overflow-hidden shadow-lg border border-slate-200/50 dark:border-slate-800/50 relative z-10 group">
              <div className="absolute inset-0 bg-brand-indigo/5 group-hover:bg-transparent transition-colors pointer-events-none z-20" />
              <iframe
                title="Ubicación AsthroApp - Cl. 55 # 42-14, Medellín"
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d1978.5!2d-75.5568!3d6.2518!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2sCl.+55+%23+42-14%2C+Medell%C3%ADn%2C+Antioquia!5e0!3m2!1ses!2sco!4v1700000000000"
                className="w-full h-full min-h-[250px] md:min-h-full transition-transform duration-700 group-hover:scale-105"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
