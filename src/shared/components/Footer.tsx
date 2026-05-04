import React from 'react';
import { Phone, MapPin, Clock, Sparkles, Heart, Instagram, Facebook } from 'lucide-react';

export function Footer() {
  return (
    <footer className="footer-wrapper relative overflow-hidden">
      {/* Línea de acento superior con gradiente */}
      <div className="footer-top-accent" />

      {/* Efectos visuales de brillo suave (Glow) */}
      <div className="footer-glow footer-glow--left" />
      <div className="footer-glow footer-glow--right" />

      <div className="footer-inner relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Cuadrícula principal del footer */}
        <div className="footer-grid">

          {/* Columna de Marca y Logo */}
          <div className="footer-col">
            <div className="flex items-center space-x-3 mb-6 footer-brand-container">
              <div className="w-12 h-12 bg-gradient-brand rounded-2xl flex items-center justify-center shadow-lg shadow-pink-100 transform -rotate-3 hover:rotate-0 transition-transform duration-300">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <div className="flex flex-col">
                <span className="text-2xl font-black tracking-tight text-gradient-brand leading-none">
                  AsthroApp
                </span>
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400 mt-1">
                  Beauty Studio
                </span>
              </div>
            </div>
            <p className="footer-description mb-6">
              Tu salón de belleza de confianza en Medellín. Dirigido por{' '}
              <span className="footer-highlight">Astrid Eugenia Hoyos</span>,
              especialista en realzar tu belleza natural con pasión y dedicación.
            </p>
            <div className="flex items-center space-x-2 footer-tagline">
              <Heart className="w-4 h-4 text-brand-pink" />
              <span className="font-medium">Belleza con alma y corazón</span>
            </div>
          </div>

          {/* Columna de Enlaces Rápidos (Usabilidad) */}
          <div className="footer-col hidden lg:block">
            <h3 className="footer-section-title">
              Explorar
              <span className="footer-title-underline" />
            </h3>
            <ul className="footer-link-list">
              <li className="footer-nav-link">Inicio</li>
              <li className="footer-nav-link">Servicios</li>
              <li className="footer-nav-link">Agendamiento</li>
              <li className="footer-nav-link">Productos</li>
              <li className="footer-nav-link">Galería</li>
            </ul>
          </div>

          {/* Columna de Contacto y Horario */}
          <div className="footer-col">
            <h3 className="footer-section-title">
              Contacto
              <span className="footer-title-underline" />
            </h3>

            <div className="space-y-6">
              {/* Teléfono */}
              <a href="tel:+573148512539" className="footer-contact-link footer-contact-item">
                <div className="footer-icon-box footer-icon-box--pink">
                  <Phone className="w-4 h-4 text-brand-pink" />
                </div>
                <div className="ml-4">
                  <div className="footer-label">Llámanos</div>
                  <div className="footer-value font-bold">314 851 2539</div>
                </div>
              </a>

              {/* Dirección */}
              <div className="footer-contact-link footer-contact-item">
                <div className="footer-icon-box footer-icon-box--purple">
                  <MapPin className="w-4 h-4 text-brand-indigo" />
                </div>
                <div className="ml-4 text-left">
                  <div className="footer-label">Visítanos</div>
                  <div className="footer-value font-bold">Cl. 55 # 42-14</div>
                  <div className="footer-sublabel">Medellín, Antioquia</div>
                </div>
              </div>

              {/* Horario */}
              <div className="footer-contact-link footer-contact-item">
                <div className="footer-icon-box footer-icon-box--pink">
                  <Clock className="w-4 h-4 text-brand-pink" />
                </div>
                <div className="ml-4 text-left">
                  <div className="footer-label">Horario</div>
                  <div className="footer-value font-bold">Lun - Sáb</div>
                  <div className="footer-sublabel text-gray-800">8:00 AM - 7:00 PM</div>
                </div>
              </div>
            </div>
          </div>

          {/* Columna de Ubicación (Mapa) */}
          <div className="footer-col footer-map-col">
            <h3 className="footer-section-title">
              Ubicación
              <span className="footer-title-underline" />
            </h3>
            <div className="footer-map-container rounded-3xl overflow-hidden border-4 border-gray-50/50 group">
              <iframe
                title="Ubicación AsthroApp - Cl. 55 # 42-14, Medellín"
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d1978.5!2d-75.5568!3d6.2518!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2sCl.+55+%23+42-14%2C+Medell%C3%ADn%2C+Antioquia!5e0!3m2!1ses!2sco!4v1700000000000"
                width="100%"
                height="100%"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                className="group-hover:scale-110 transition-transform duration-700 grayscale-[0.2] group-hover:grayscale-0"
              />
            </div>
          </div>
        </div>

        {/* Divisor elegante */}
        <div className="footer-divider" />

        {/* Barra inferior de Copyright */}
        <div className="footer-bottom">
          <div className="flex flex-col md:flex-row items-center gap-2 md:gap-4">
            <p className="font-medium text-gray-500">
              © {new Date().getFullYear()} <span className="text-gray-800 font-bold">AsthroApp</span> — Beauty Studio.
            </p>
            <span className="hidden md:block text-gray-300">|</span>
            <p className="text-gray-400">Todos los derechos reservados.</p>
          </div>
          
          <div className="flex items-center space-x-6 mt-4 md:mt-0">
             <div className="flex items-center gap-1.5 text-gray-500 font-medium">
               <span>Hecho con</span>
               <Heart className="w-3.5 h-3.5 text-brand-pink fill-brand-pink animate-pulse" />
               <span>en Medellín</span>
             </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
