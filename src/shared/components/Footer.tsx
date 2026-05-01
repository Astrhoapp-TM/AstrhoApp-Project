import React from 'react';
import { Phone, MapPin, Clock, Sparkles, Heart } from 'lucide-react';

export function Footer() {
  return (
    <footer className="footer-wrapper relative overflow-hidden">
      {/* Decorative top gradient border */}
      <div className="footer-top-accent" />

      {/* Decorative blurred circles */}
      <div className="footer-glow footer-glow--left" />
      <div className="footer-glow footer-glow--right" />

      <div className="footer-inner relative max-w-7xl mx-auto px-4">
        {/* Main footer grid */}
        <div className="footer-grid">

          {/* Brand Column */}
          <div className="footer-col">
            <div className="flex items-center space-x-3 mb-5">
              <div className="w-10 h-10 bg-gradient-to-br from-pink-400 to-purple-500 rounded-full flex items-center justify-center footer-brand-icon">
                <Sparkles className="w-5 h-5 footer-icon-white" />
              </div>
              <span className="text-2xl font-bold bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text footer-brand-text">
                AsthroApp
              </span>
            </div>
            <p className="footer-description mb-4">
              Tu salón de belleza de confianza en Medellín. Dirigido por{' '}
              <span className="font-semibold footer-highlight">Astrid Eugenia Hoyos</span>,
              especialista en cuidado capilar y tratamientos de belleza.
            </p>
            <div className="flex items-center space-x-2 footer-tagline">
              <Heart className="w-4 h-4 footer-icon-pink" />
              <span>Belleza con pasión y dedicación</span>
            </div>
          </div>

          {/* Contact Column */}
          <div className="footer-col">
            <h3 className="footer-section-title font-semibold mb-5">
              Contacto
              <span className="footer-title-underline" />
            </h3>

            <div className="space-y-4">
              {/* Phone */}
              <a href="tel:+573148512539" className="footer-contact-link flex items-center space-x-4">
                <div className="footer-icon-box footer-icon-box--pink">
                  <Phone className="w-4 h-4 footer-icon-pink" />
                </div>
                <div>
                  <div className="footer-label">Llámanos</div>
                  <div className="footer-value font-medium">314 851 2539</div>
                </div>
              </a>

              {/* Address */}
              <div className="flex items-center space-x-4">
                <div className="footer-icon-box footer-icon-box--purple">
                  <MapPin className="w-4 h-4 footer-icon-purple" />
                </div>
                <div>
                  <div className="footer-label">Visítanos</div>
                  <div className="footer-value font-medium">Cl. 55 # 42-14</div>
                  <div className="footer-sublabel">Medellín, Antioquia</div>
                </div>
              </div>

              {/* Hours */}
              <div className="flex items-center space-x-4">
                <div className="footer-icon-box footer-icon-box--pink">
                  <Clock className="w-4 h-4 footer-icon-pink" />
                </div>
                <div>
                  <div className="footer-label">Horario</div>
                  <div className="footer-value font-medium">Lun - Sáb: 8:00 AM - 7:00 PM</div>
                </div>
              </div>
            </div>
          </div>

          {/* Map Column */}
          <div className="footer-col footer-map-col">
            <h3 className="footer-section-title font-semibold mb-5">
              Ubicación
              <span className="footer-title-underline" />
            </h3>
            <div className="footer-map-container rounded-2xl overflow-hidden">
              <iframe
                title="Ubicación AsthroApp - Cl. 55 # 42-14, Medellín"
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d1978.5!2d-75.5568!3d6.2518!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2sCl.+55+%23+42-14%2C+Medell%C3%ADn%2C+Antioquia!5e0!3m2!1ses!2sco!4v1700000000000"
                width="100%"
                height="100%"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="footer-divider" />

        {/* Bottom bar */}
        <div className="footer-bottom">
          <p>
            © {new Date().getFullYear()} AsthroApp — Salón de Belleza. Todos los derechos reservados.
          </p>
          <p className="flex items-center gap-1">
            Hecho con <Heart className="w-3 h-3 footer-icon-pink" style={{ margin: '0 3px' }} /> en Medellín, Colombia
          </p>
        </div>
      </div>
    </footer>
  );
}
