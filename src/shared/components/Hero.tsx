import React from 'react';
import { Calendar, Sparkles, MapPin, ArrowDown } from 'lucide-react';
import { ImageWithFallback } from './figma/ImageWithFallback';

interface HeroProps {
  onBookAppointment: (selectedService?: any) => void;
  scrollY?: number;
}

export function Hero({ onBookAppointment, scrollY = 0 }: HeroProps) {
  const bgOffset  = scrollY * 0.4;
  const imgOffset = scrollY * 0.18;

  return (
    <section
      className="relative overflow-hidden bg-white min-h-screen flex items-center"
      style={{ scrollSnapAlign: 'start' }}
    >
      {/* ── Parallax background decorations ── */}
      <div
        className="absolute inset-0 will-change-transform pointer-events-none"
        style={{ transform: `translateY(${bgOffset}px)` }}
      >
        {/* Brand pink radial — top left */}
        <div className="absolute -top-32 -left-32 w-[560px] h-[560px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(242,121,222,0.10) 0%, transparent 70%)' }} />
        {/* Brand indigo radial — bottom right */}
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(132,119,217,0.09) 0%, transparent 70%)' }} />
        {/* Grid mesh */}
        <div
          className="absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage:
              'linear-gradient(#000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />
      </div>

      {/* ── Content ── */}
      <div className="relative max-w-7xl mx-auto px-6 lg:px-8 w-full py-28 lg:py-0">
        <div className="grid lg:grid-cols-2 gap-16 items-center">

          {/* Left */}
          <div>
            {/* Eyebrow pill */}
            <div className="inline-flex items-center space-x-2 border border-gray-200 bg-gray-50 text-gray-500 px-4 py-1.5 rounded-full text-xs font-semibold mb-8 tracking-wide">
              <MapPin className="w-3.5 h-3.5 text-brand-pink" />
              <span>Medellín, Antioquia · Cll 55 #42-16</span>
            </div>

            <h1 className="text-5xl lg:text-7xl font-black leading-[1.0] mb-6 tracking-tight">
              <span className="block text-gray-900">Bienvenido a</span>
              <span className="text-gradient-brand">AsthroApp</span>
            </h1>

            <p className="text-gray-500 text-lg leading-relaxed mb-4 max-w-md">
              Tu salón de belleza de confianza en Medellín. Dirigido por{' '}
              <span className="text-gray-900 font-semibold">Astrid Eugenia Hoyos</span>,
              especialista en cuidado capilar y tratamientos de belleza.
            </p>

            {/* Stat */}
            <div className="flex items-baseline space-x-2 mb-10">
              <span className="text-4xl font-black text-gradient-brand">+25</span>
              <span className="text-gray-400 text-sm">años de experiencia</span>
            </div>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => onBookAppointment()}
                className="inline-flex items-center justify-center space-x-2 bg-gradient-brand text-white px-8 py-3.5 rounded-xl font-semibold shadow-lg shadow-brand-pink/20 hover:shadow-xl hover:opacity-90 hover:-translate-y-0.5 transition-all duration-200"
              >
                <Calendar className="w-4 h-4" />
                <span>Agendar cita</span>
              </button>

              <button
                onClick={() => {
                  const el = document.getElementById('services-section');
                  el?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="inline-flex items-center justify-center space-x-2 border border-gray-200 text-gray-600 bg-white px-8 py-3.5 rounded-xl font-semibold hover:border-brand-pink hover:text-brand-pink transition-all duration-200"
              >
                <Sparkles className="w-4 h-4" />
                <span>Ver servicios</span>
              </button>
            </div>
          </div>

          {/* Right — parallax image card */}
          <div
            className="relative flex justify-center lg:justify-end will-change-transform"
            style={{ transform: `translateY(${-imgOffset}px)` }}
          >
            {/* Soft glow behind card */}
            <div className="absolute inset-4 bg-gradient-brand opacity-10 rounded-3xl blur-2xl" />

            <div className="relative w-full max-w-sm bg-white border border-gray-100 rounded-3xl p-5 shadow-xl shadow-gray-200/80">
              <ImageWithFallback
                src="https://images.unsplash.com/photo-1560066984-138dadb4c035?w=500&h=600&fit=crop&crop=center"
                alt="AsthroApp - Salón de belleza en Medellín"
                className="w-full h-80 object-cover rounded-2xl"
              />

              {/* Floating badge top-right */}
              <div className="absolute -top-3 -right-3 bg-white border border-gray-100 text-gray-700 rounded-2xl px-3 py-2 text-xs font-semibold shadow-md">
                ✨ Cuidado Premium
              </div>

              {/* Floating badge bottom-left */}
              <div className="absolute -bottom-3 -left-3 bg-gradient-brand text-white rounded-2xl px-4 py-2.5 shadow-lg">
                <div className="text-xs font-bold">Astrid Eugenia Hoyos</div>
                <div className="text-[10px] opacity-80">Especialista en Belleza</div>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Scroll hint */}
      <div
        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center space-y-1 text-black-300 animate-bounce"
        aria-hidden="true"
      >
        <ArrowDown className="w-4 h-4" />
        <span className="text-[10px] tracking-widest uppercase">Scroll</span>
      </div>
    </section>
  );
}
