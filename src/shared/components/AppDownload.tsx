import React from 'react';
import { Download, Calendar, Bell, Star, Zap } from 'lucide-react';

const features = [
  { icon: Calendar, label: 'Agenda citas' },
  { icon: Bell,     label: 'Recordatorios' },
  { icon: Star,     label: 'Historial' },
  { icon: Zap,      label: 'Rápida y ligera' },
];

interface AppDownloadProps {
  /** Scroll position used for parallax on the background layer */
  scrollY?: number;
  /** Pixel offset of this section from document top, used to normalise parallax */
  sectionOffsetTop?: number;
}

export function AppDownload({ scrollY = 0, sectionOffsetTop = 0 }: AppDownloadProps) {
  // Normalise scroll relative to this section so parallax only activates when visible
  const localScroll = Math.max(0, scrollY - sectionOffsetTop);
  const bgOffset   = localScroll * 0.35;
  const cardOffset = localScroll * 0.12;

  return (
    <section
      className="relative overflow-hidden bg-gray-950 min-h-screen flex items-center py-24"
      style={{ scrollSnapAlign: 'start' }}
    >
      {/* ── Parallax background ── */}
      <div
        className="absolute inset-0 will-change-transform pointer-events-none"
        style={{ transform: `translateY(${bgOffset}px)` }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-brand-pink/15 via-transparent to-brand-indigo/15" />
        <div className="absolute -left-32 top-1/2 -translate-y-1/2 w-[480px] h-[480px] bg-brand-pink/8 rounded-full blur-3xl" />
        {/* Concentric rings */}
        <div className="absolute -right-40 top-1/2 -translate-y-1/2 w-[520px] h-[520px] rounded-full border border-white/[0.04]" />
        <div className="absolute -right-24 top-1/2 -translate-y-1/2 w-[360px] h-[360px] rounded-full border border-white/[0.04]" />
        {/* Fine grid */}
        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage:
              'linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />
      </div>

      <div className="relative max-w-5xl mx-auto px-6 lg:px-8 w-full">
        <div className="grid lg:grid-cols-2 gap-16 items-center">

          {/* ── Left: text & CTA ── */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-brand-pink mb-5">
              Aplicación móvil · Android
            </p>

            <h2 className="text-4xl md:text-5xl font-black text-white leading-[1.05] mb-6 tracking-tight">
              AsthroApp,<br />
              <span className="text-gradient-brand">siempre contigo.</span>
            </h2>

            <p className="text-gray-400 text-lg leading-relaxed mb-10 max-w-sm">
              Gestiona tus citas, consulta servicios y recibe recordatorios
              directamente desde tu teléfono.
            </p>

            {/* Feature pills */}
            <div className="flex flex-wrap gap-2 mb-10">
              {features.map(({ icon: Icon, label }) => (
                <span
                  key={label}
                  className="inline-flex items-center space-x-1.5 border border-white/10 bg-white/5 backdrop-blur-sm text-gray-300 text-sm px-3 py-1.5 rounded-full"
                >
                  <Icon className="w-3.5 h-3.5 text-brand-pink" />
                  <span>{label}</span>
                </span>
              ))}
            </div>

            <a
              href="/apk/astrhoapp.apk"
              download
              className="inline-flex items-center space-x-2.5 bg-gradient-brand text-white px-8 py-3.5 rounded-xl font-semibold shadow-lg shadow-brand-pink/20 hover:shadow-xl hover:opacity-90 hover:-translate-y-0.5 transition-all duration-200"
            >
              <Download className="w-4 h-4" />
              <span>Descargar APK gratis</span>
            </a>

            <p className="mt-4 text-xs text-gray-600">
              Descarga directa · Sin costos · Sin publicidad
            </p>
          </div>

          {/* ── Right: abstract phone ── */}
          <div
            className="flex justify-center lg:justify-end will-change-transform"
            style={{ transform: `translateY(${-cardOffset}px)` }}
          >
            <div className="relative w-52">
              <div className="absolute inset-0 bg-gradient-brand opacity-10 rounded-[2.5rem] blur-2xl scale-125" />

              {/* Phone shell */}
              <div className="relative bg-gray-900 rounded-[2.5rem] p-2.5 shadow-2xl ring-1 ring-white/5">
                <div className="bg-gray-950 rounded-[2rem] overflow-hidden">
                  {/* Notch */}
                  <div className="h-6 bg-gray-950 flex items-center justify-center">
                    <div className="w-14 h-3 bg-gray-800 rounded-full" />
                  </div>

                  <div className="px-4 pb-6 space-y-3">
                    <div className="h-16 bg-gradient-brand rounded-2xl opacity-90" />

                    <div className="space-y-2">
                      <div className="h-2.5 bg-gray-700 rounded-full w-3/4" />
                      <div className="h-2   bg-gray-800 rounded-full w-1/2" />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="h-16 bg-gray-800 rounded-xl" />
                      <div className="h-16 bg-gray-800 rounded-xl" />
                    </div>

                    {[true, false].map((accent, i) => (
                      <div key={i} className="h-10 bg-gray-800 rounded-xl flex items-center px-3">
                        <div className={`w-6 h-6 rounded-lg mr-2 flex-shrink-0 ${accent ? 'bg-gradient-brand' : 'bg-gray-700'}`} />
                        <div className="space-y-1 flex-1">
                          <div className="h-1.5 bg-gray-600 rounded-full w-full" />
                          <div className="h-1.5 bg-gray-700 rounded-full w-2/3" />
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Bottom nav */}
                  <div className="flex justify-around items-center px-4 py-3 border-t border-gray-800">
                    {[...Array(4)].map((_, i) => (
                      <div key={i} className={`w-6 h-6 rounded-lg ${i === 0 ? 'bg-gradient-brand' : 'bg-gray-800'}`} />
                    ))}
                  </div>
                </div>
              </div>

              {/* Floating label */}
              <div className="absolute -bottom-5 -left-8 bg-white/8 backdrop-blur border border-white/10 rounded-2xl px-4 py-2.5">
                <p className="text-xs font-bold text-white">100% gratis</p>
                <p className="text-[10px] text-gray-500">Sin publicidad</p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
