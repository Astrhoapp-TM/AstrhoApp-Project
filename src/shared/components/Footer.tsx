import React from 'react';
import { Phone, MapPin, Clock, Sparkles, Heart, Shield } from 'lucide-react';

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer
      className="relative overflow-hidden flex flex-col border-t border-white/5"
      style={{
        minHeight: 'calc(100vh - 4rem)',
        background: 'linear-gradient(160deg, #0f0f1a 0%, #12101f 60%, #0d0d18 100%)',
      }}
    >
      {/* ── Decorative blobs ── */}
      <div
        className="absolute -top-40 -left-40 w-96 h-96 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(242,121,222,0.12) 0%, transparent 70%)' }}
      />
      <div
        className="absolute top-1/3 -right-40 w-96 h-96 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(132,119,217,0.10) 0%, transparent 70%)' }}
      />
      {/* Top gradient bar */}
      <div
        className="absolute top-0 left-0 w-full h-1 pointer-events-none"
        style={{ background: 'linear-gradient(to right, #F279DE, #8477D9, #BBC3F2)' }}
      />

      {/* ── Main content ── */}
      <div className="relative flex-1 flex flex-col max-w-7xl mx-auto w-full px-6 lg:px-8 py-10 lg:py-12 gap-8">

        {/* Top row: Brand + Contact (2 columns) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-16">

          {/* ── Brand column ── */}
          <div className="flex flex-col gap-5">
            <div className="flex items-center space-x-3">
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg"
                style={{ background: 'linear-gradient(135deg, #F279DE, #8477D9)' }}
              >
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <span
                className="text-2xl font-black"
                style={{
                  background: 'linear-gradient(to right, #F279DE, #8477D9)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                AsthroApp
              </span>
            </div>

            <p className="text-sm leading-relaxed max-w-sm" style={{ color: 'rgba(255,255,255,0.45)' }}>
              Tu salón de belleza de confianza en Medellín. Dirigido por{' '}
              <span className="font-semibold" style={{ color: 'rgba(255,255,255,0.75)' }}>
                Astrid Eugenia Hoyos
              </span>
              , especialista en cuidado capilar y tratamientos de belleza.
            </p>

            <div
              className="flex items-center space-x-2 w-max px-4 py-2 rounded-full text-sm font-medium"
              style={{
                background: 'rgba(242,121,222,0.08)',
                border: '1px solid rgba(242,121,222,0.15)',
                color: '#F279DE',
              }}
            >
              <Heart className="w-4 h-4" />
              <span>Belleza con pasión y dedicación</span>
            </div>
          </div>

          {/* ── Contact column ── */}
          <div className="flex flex-col gap-5">
            <h3 className="text-lg font-bold relative inline-block w-max" style={{ color: '#ffffff' }}>
              Contacto
              <span
                className="absolute -bottom-1.5 left-0 w-1/2 h-0.5 rounded-full"
                style={{ background: 'linear-gradient(to right, #F279DE, #8477D9)' }}
              />
            </h3>

            <div className="space-y-4">
              {/* WhatsApp */}
              <a
                href="https://wa.me/573148512539?text=Hola,%20quiero%20más%20información%20sobre%20sus%20servicios"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center space-x-4 group hover:translate-x-1 transition-transform duration-200"
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all duration-200 group-hover:scale-110"
                  style={{
                    background: 'rgba(242,121,222,0.1)',
                    border: '1px solid rgba(242,121,222,0.15)',
                  }}
                >
                  <Phone className="w-4 h-4" style={{ color: '#F279DE' }} />
                </div>
                <div>
                  <p className="text-xs font-medium" style={{ color: 'rgba(255,255,255,0.35)' }}>
                    Escríbenos por WhatsApp
                  </p>
                  <p className="text-sm font-semibold" style={{ color: 'rgba(255,255,255,0.85)' }}>
                    314 851 2539
                  </p>
                </div>
              </a>

              {/* Address */}
              <div className="flex items-center space-x-4 hover:translate-x-1 transition-transform duration-200">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{
                    background: 'rgba(132,119,217,0.1)',
                    border: '1px solid rgba(132,119,217,0.15)',
                  }}
                >
                  <MapPin className="w-4 h-4" style={{ color: '#8477D9' }} />
                </div>
                <div>
                  <p className="text-xs font-medium" style={{ color: 'rgba(255,255,255,0.35)' }}>
                    Visítanos
                  </p>
                  <p className="text-sm font-semibold" style={{ color: 'rgba(255,255,255,0.85)' }}>
                    Cl. 55 # 42-16, Medellín, Antioquia
                  </p>
                </div>
              </div>

              {/* Hours */}
              <div className="flex items-center space-x-4 hover:translate-x-1 transition-transform duration-200">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{
                    background: 'rgba(187,195,242,0.1)',
                    border: '1px solid rgba(187,195,242,0.15)',
                  }}
                >
                  <Clock className="w-4 h-4" style={{ color: '#BBC3F2' }} />
                </div>
                <div>
                  <p className="text-xs font-medium" style={{ color: 'rgba(255,255,255,0.35)' }}>
                    Horario de atención
                  </p>
                  <p className="text-sm font-semibold" style={{ color: 'rgba(255,255,255,0.85)' }}>
                    Lun – Sáb: 8:00 AM – 10:30 PM
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Full-width Map ── */}
        <div className="flex flex-col gap-3 flex-1 min-h-0">
          <h3 className="text-lg font-bold relative inline-block w-max flex-shrink-0" style={{ color: '#ffffff' }}>
            Ubicación
            <span
              className="absolute -bottom-1.5 left-0 w-1/2 h-0.5 rounded-full"
              style={{ background: 'linear-gradient(to right, #F279DE, #8477D9)' }}
            />
          </h3>

          {/* Map grows to fill remaining vertical space */}
          <div
            className="relative flex-1 w-full rounded-2xl overflow-hidden min-h-[200px]"
            style={{
              border: '1px solid rgba(255,255,255,0.08)',
              boxShadow: '0 8px 40px rgba(0,0,0,0.5)',
            }}
          >
            <iframe
              title="Ubicación AsthroApp – Cl. 55 # 42-14, Medellín"
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d1978.5!2d-75.5568!3d6.2518!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2sCl.+55+%23+42-14%2C+Medell%C3%ADn%2C+Antioquia!5e0!3m2!1ses!2sco!4v1700000000000"
              className="absolute inset-0 w-full h-full"
              style={{ border: 0, filter: 'saturate(0.85) brightness(0.88)' }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        </div>
      </div>

      {/* ── Copyright bar ── */}
      <div
        className="relative shrink-0"
        style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
      >
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2" style={{ color: 'rgba(255,255,255,0.3)' }}>
            <Shield className="w-3.5 h-3.5 flex-shrink-0" />
            <p className="text-xs">
              © {year}{' '}
              <span className="font-semibold" style={{ color: 'rgba(255,255,255,0.45)' }}>
                AsthroApp
              </span>
              . Todos los derechos reservados.
            </p>
          </div>
          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.2)' }}>
            Hecho con <span style={{ color: '#F279DE' }}>♥</span> en Medellín, Colombia
          </p>
        </div>
      </div>
    </footer>
  );
}
