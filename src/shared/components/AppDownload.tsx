import React, { useState, useEffect } from 'react';
import { Download, Calendar, Bell, Star, Zap } from 'lucide-react';

const features = [
  { icon: Calendar, label: 'Agenda citas' },
  { icon: Bell,     label: 'Recordatorios' },
  { icon: Star,     label: 'Historial' },
  { icon: Zap,      label: 'Rápida y ligera' },
];

interface AppDownloadProps {
  scrollY?: number;
  sectionOffsetTop?: number;
}

export function AppDownload({ scrollY = 0, sectionOffsetTop = 0 }: AppDownloadProps) {
  const [isLargeScreen, setIsLargeScreen] = useState(true);

  useEffect(() => {
    const checkScreen = () => {
      setIsLargeScreen(window.innerWidth >= 1024);
    };
    checkScreen();
    window.addEventListener('resize', checkScreen);
    return () => window.removeEventListener('resize', checkScreen);
  }, []);

  // Local scroll: 0 when section enters viewport
  const local = Math.max(0, scrollY - sectionOffsetTop);

  // ── Parallax offsets at different "depths" ──────────────────
  const bgFar    = isLargeScreen ? local * 0.45 : 0;   // slowest  — far background glows
  const bgMid    = isLargeScreen ? local * 0.28 : 0;   // medium   — mid-layer rings
  const phoneY   = isLargeScreen ? local * 0.14 : 0;   // phone vertical drift (upward)
  const phoneTilt = isLargeScreen ? Math.min(local * 0.015, 6) : 0; // subtle tilt in deg, max 6°
  const labelY   = isLargeScreen ? local * 0.22 : 0;   // floating label, between bg and phone
  const orbA     = isLargeScreen ? local * 0.38 : 0;   // fast orb
  const orbB     = isLargeScreen ? local * 0.18 : 0;   // slow orb

  return (
    <section
      id="app-download-section"
      className="relative overflow-hidden bg-gray-950 min-h-screen flex items-center py-16 sm:py-24"
      style={{ scrollSnapAlign: 'start' }}
    >

      {/* ── Layer 1: far background (slowest) ── */}
      <div
        className="absolute inset-0 pointer-events-none will-change-transform"
        style={{ transform: `translateY(${bgFar}px)` }}
      >
        {/* Animated gradient — drifts left → right infinitely */}
        <div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(105deg, #0f0f13 0%, rgba(242,121,222,0.18) 25%, rgba(132,119,217,0.22) 50%, rgba(191,132,217,0.15) 75%, #0f0f13 100%)',
            backgroundSize: '300% 100%',
            animation: 'bgDrift 18s linear infinite',
          }}
        />

        {/* Grid mesh on top */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              'linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />

        {/* Keyframe injection */}
        <style>{`
          @keyframes bgDrift {
            0%   { background-position: 0% 50%; }
            100% { background-position: 100% 50%; }
          }
        `}</style>
      </div>

      {/* ── Layer 2: mid — concentric rings ── */}
      <div
        className="absolute inset-0 pointer-events-none will-change-transform"
        style={{ transform: `translateY(${bgMid}px)` }}
      >
        <div className="absolute -right-48 top-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full border border-white/[0.05]" />
        <div className="absolute -right-28 top-1/2 -translate-y-1/2 w-[420px] h-[420px] rounded-full border border-white/[0.05]" />
        <div className="absolute -right-10 top-1/2 -translate-y-1/2 w-[260px] h-[260px] rounded-full border border-white/[0.04]" />
      </div>

      {/* ── Orb A — fast, pink, top-left ── */}
      <div
        className="absolute pointer-events-none will-change-transform"
        style={{
          transform: `translateY(${-orbA}px)`,
          top: '-80px', left: '-60px',
          width: '420px', height: '420px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(242,121,222,0.12) 0%, transparent 70%)',
          filter: 'blur(40px)',
        }}
      />

      {/* ── Orb B — slow, indigo, bottom-right ── */}
      <div
        className="absolute pointer-events-none will-change-transform"
        style={{
          transform: `translateY(${orbB}px)`,
          bottom: '-100px', right: '-60px',
          width: '500px', height: '500px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(132,119,217,0.14) 0%, transparent 70%)',
          filter: 'blur(50px)',
        }}
      />

      {/* ── Content ── */}
      <div className="relative max-w-5xl mx-auto px-5 sm:px-6 lg:px-8 w-full">
        <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">

          {/* Left: text */}
          <div>
            <p className="text-xs font-semibold tracking-widest text-brand-pink mb-5">
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
              href="/apk/astrhoapp 1.0.5.apk"
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

          {/* Right: phone with parallax + tilt */}
          <div className="flex justify-center lg:justify-end mt-8 lg:mt-0">
            <div
              className="relative w-52 will-change-transform"
              style={{
                transform: `translateY(${-phoneY}px) rotateY(${phoneTilt}deg) rotateX(${phoneTilt * 0.4}deg)`,
                transformStyle: 'preserve-3d',
                transition: 'transform 0.1s linear',
              }}
            >
              {/* Glow behind phone — moves with phone */}
              <div
                className="absolute inset-0 bg-gradient-brand rounded-[2.5rem] blur-2xl scale-125 pointer-events-none"
                style={{ opacity: 0.18 }}
              />

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

                  <div className="flex justify-around items-center px-4 py-3 border-t border-gray-800">
                    {[...Array(4)].map((_, i) => (
                      <div key={i} className={`w-6 h-6 rounded-lg ${i === 0 ? 'bg-gradient-brand' : 'bg-gray-800'}`} />
                    ))}
                  </div>
                </div>
              </div>

              {/* Floating label — own parallax speed */}
              <div
                className="absolute -bottom-5 -left-8 bg-white/8 backdrop-blur border border-white/10 rounded-2xl px-4 py-2.5 will-change-transform"
                style={{ transform: `translateY(${labelY * 0.4}px)` }}
              >
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
