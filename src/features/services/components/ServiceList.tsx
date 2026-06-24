import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Scissors, Sparkles, Heart, Clock, Calendar, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { toast } from 'sonner';
import { serviceService } from '../services/serviceService';

/* ─────────────────────────────────────────────────────────────
   Constants
───────────────────────────────────────────────────────────── */
const AUTOPLAY_MS = 3500;
const RESUME_MS   = 6000;
const CARD_GAP    = 16;   // px gap between cards
const CLONES      = 4;    // cards cloned at each end (covers up to spv=4)
const EASE        = 'transform 0.55s cubic-bezier(0.25, 0.46, 0.45, 0.94)';

const ACCENTS = [
  { from: '#F279DE', to: '#8477D9' },
  { from: '#BF84D9', to: '#F279DE' },
  { from: '#8477D9', to: '#BBC3F2' },
  { from: '#BBC3F2', to: '#BF84D9' },
];

/* ─────────────────────────────────────────────────────────────
   Responsive slides-per-view
───────────────────────────────────────────────────────────── */
function getSlidesPerView(): number {
  if (typeof window === 'undefined') return 3;
  const vw = window.innerWidth;
  if (vw < 640)  return 1;
  if (vw < 1024) return 2;
  if (vw < 1440) return 3;
  return 4;
}

/* ─────────────────────────────────────────────────────────────
   Build infinite loop: [tail clones] [real items] [head clones]
   Each item keeps `realIndex` so dots always know the active card.
───────────────────────────────────────────────────────────── */
function buildLoop(items: any[]) {
  if (items.length === 0) return [];
  const n  = items.length;
  const cn = Math.min(CLONES, n);

  // last `cn` items prepended  → pre-clones
  const pre = items
    .slice(n - cn)
    .map((s, i) => ({ ...s, _key: `pre-${i}`, realIndex: n - cn + i }));

  // first `cn` items appended  → post-clones
  const post = items
    .slice(0, cn)
    .map((s, i) => ({ ...s, _key: `post-${i}`, realIndex: i }));

  return [
    ...pre,
    ...items.map((s, i) => ({ ...s, _key: `real-${i}`, realIndex: i })),
    ...post,
  ];
}

/* ─────────────────────────────────────────────────────────────
   Helpers
───────────────────────────────────────────────────────────── */
function resolveIcon(name = '', category = '') {
  const t = (name + category).toLowerCase();
  if (t.includes('corte') || t.includes('barba')) return Scissors;
  if (
    t.includes('color') || t.includes('tinte') ||
    t.includes('peinado') || t.includes('uña')
  ) return Sparkles;
  return Heart;
}

function mapService(s: any, index: number) {
  return {
    id:          s.servicioId || s.ServicioId || s.id,
    name:        s.nombre     || s.Nombre     || 'Sin nombre',
    description: s.descripcion || s.Descripcion || '',
    price:       s.precio     || s.Precio     || 0,
    duration:    s.duracion   || s.Duracion   || 0,
    category:    s.categoriaNombre || s.CategoriaNombre || 'General',
    accent:      ACCENTS[index % ACCENTS.length],
    isActive:    s.estado ?? s.Estado ?? s.activo ?? s.Activo ?? undefined,
  };
}

/* ─────────────────────────────────────────────────────────────
   ServiceList
───────────────────────────────────────────────────────────── */
interface ServicesProps {
  onBookAppointment: (selectedService?: any) => void;
}

export function ServiceList({ onBookAppointment }: ServicesProps) {
  const [services,   setServices]   = useState<any[]>([]);
  const [loopItems,  setLoopItems]  = useState<any[]>([]);
  const [isLoading,  setIsLoading]  = useState(true);
  const [spv,        setSpv]        = useState<number>(getSlidesPerView);

  // `offset` indexes into loopItems; starts at CLONES so real[0] is first visible
  const [offset, setOffsetState] = useState(CLONES);
  const offsetRef = useRef(CLONES);
  const setOffset = useCallback((val: number | ((o: number) => number)) => {
    setOffsetState(prev => {
      const next = typeof val === 'function' ? val(prev) : val;
      offsetRef.current = next;
      return next;
    });
  }, []);

  // realIndex = which real card is first visible (for dots)
  const realIndex = loopItems[offsetRef.current]?.realIndex ?? 0;

  /* ── Fetch ── */
  useEffect(() => {
    (async () => {
      setIsLoading(true);
      try {
        const data = await serviceService.getServices({ page: 1, pageSize: 50 });
        let arr: any[] = Array.isArray(data)
          ? data
          : (data as any).data || (data as any).$values || [];
        arr = arr.filter(s => {
          const a = s.estado ?? s.Estado ?? s.activo ?? s.Activo ?? true;
          return a === true || a === 1 || a === '1' || a === 'Activo' || a === 'activo';
        });
        const mapped = arr.map(mapService);
        setServices(mapped);
        setLoopItems(buildLoop(mapped));
        const startOffset = Math.min(CLONES, mapped.length > 0 ? CLONES : 0);
        setOffset(startOffset);
      } catch {
        toast.error('Error al cargar servicios');
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);  // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Refs ── */
  const viewportRef    = useRef<HTMLDivElement>(null);
  const trackRef       = useRef<HTMLDivElement>(null);
  const transitioning  = useRef(false);
  const paused         = useRef(false);
  const autoplayTimer  = useRef<ReturnType<typeof setInterval> | null>(null);
  const resumeTimer    = useRef<ReturnType<typeof setTimeout>  | null>(null);
  const isDragging     = useRef(false);
  const dragStartX     = useRef<number | null>(null);
  const dragDelta      = useRef(0);

  /* ── Responsive spv ── */
  useEffect(() => {
    const onResize = () => setSpv(getSlidesPerView());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  /* ── Card width from viewport ── */
  const getCardWidth = useCallback((): number => {
    const vp = viewportRef.current;
    if (!vp) return 0;
    return (vp.clientWidth - CARD_GAP * (spv - 1)) / spv;
  }, [spv]);

  /* ── Apply CSS transform ── */
  const applyTranslate = useCallback((idx: number, animated: boolean) => {
    const track = trackRef.current;
    if (!track) return;
    const cw = getCardWidth();
    if (cw <= 0) return;
    const px = idx * (cw + CARD_GAP);
    track.style.transition = animated ? EASE : 'none';
    track.style.transform  = `translateX(-${px}px)`;
  }, [getCardWidth]);

  // Re-apply whenever offset, spv, or loopItems changes
  useEffect(() => {
    applyTranslate(offsetRef.current, true);
  }, [offset, applyTranslate, spv, loopItems]);

  /* ── Seamless teleport after animation ends (infinite loop magic) ── */
  const handleTransitionEnd = useCallback(() => {
    transitioning.current = false;
    const n = services.length;
    if (n === 0) return;

    const cur  = offsetRef.current;
    const cn   = Math.min(CLONES, n);
    let   next = -1;

    if (cur < cn)          next = cur + n;   // landed on pre-clone  → jump to real end
    if (cur >= cn + n)     next = cur - n;   // landed on post-clone → jump to real start

    if (next !== -1) {
      // Update state silently (no visual change — clones look identical)
      setOffset(next);
      // Force instant translate BEFORE React re-renders (avoids flash)
      requestAnimationFrame(() => {
        applyTranslate(next, false);
      });
    }
  }, [services.length, setOffset, applyTranslate]);

  /* ── Navigation (no clamping — allows entering clone territory) ── */
  const advance = useCallback((delta: 1 | -1) => {
    if (transitioning.current) return;
    transitioning.current = true;
    setOffset(o => o + delta);
  }, [setOffset]);

  const pauseAndResume = useCallback(() => {
    paused.current = true;
    if (resumeTimer.current) clearTimeout(resumeTimer.current);
    resumeTimer.current = setTimeout(() => { paused.current = false; }, RESUME_MS);
  }, []);

  /* ── Autoplay (always advance, teleport handles wrap) ── */
  useEffect(() => {
    if (services.length < 2) return;
    autoplayTimer.current = setInterval(() => {
      if (!paused.current) advance(1);
    }, AUTOPLAY_MS);
    return () => { if (autoplayTimer.current) clearInterval(autoplayTimer.current); };
  }, [services.length, advance]);

  /* ── Dot click → jump to real[i] ── */
  const goToReal = useCallback((ri: number) => {
    pauseAndResume();
    const target = CLONES + ri;
    if (target === offsetRef.current) return;
    transitioning.current = true;
    setOffset(target);
  }, [pauseAndResume, setOffset]);

  /* ── Drag ── */
  const onPointerDown = (e: React.PointerEvent) => {
    dragStartX.current = e.clientX;
    dragDelta.current  = 0;
    isDragging.current = false;
    pauseAndResume();
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (dragStartX.current === null) return;
    const dx = e.clientX - dragStartX.current;
    if (Math.abs(dx) > 6) isDragging.current = true;
    dragDelta.current = dx;

    const track = trackRef.current;
    if (!track) return;
    const cw    = getCardWidth();
    const basePx = offsetRef.current * (cw + CARD_GAP);
    track.style.transition = 'none';
    track.style.transform  = `translateX(-${basePx - dx * 0.4}px)`;
  };

  const onPointerUp = () => {
    if (!isDragging.current) { dragStartX.current = null; return; }
    const cw        = getCardWidth();
    const threshold = cw * 0.22;
    if      (dragDelta.current < -threshold) advance(1);
    else if (dragDelta.current >  threshold) advance(-1);
    else applyTranslate(offsetRef.current, true);
    dragStartX.current = null;
    isDragging.current = false;
  };

  /* ── Keyboard ── */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft')  { advance(-1); pauseAndResume(); }
      if (e.key === 'ArrowRight') { advance(1);  pauseAndResume(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [advance, pauseAndResume]);

  /* ─────────────────────────────────────────────────────────
     Render
  ───────────────────────────────────────────────────────── */
  return (
    <section
      id="services-section"
      className="relative bg-white overflow-hidden flex flex-col py-10 lg:py-0 lg:h-[calc(100vh-4rem)] lg:justify-center"
      style={{ scrollSnapAlign: 'start' }}
      onMouseEnter={() => { paused.current = true;  }}
      onMouseLeave={() => { paused.current = false; }}
    >
      {/* ── Decorations ── */}
      <div className="absolute -top-32 -right-32 w-[420px] h-[420px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(242,121,222,0.06) 0%, transparent 70%)' }} />
      <div className="absolute -bottom-32 -left-16 w-[360px] h-[360px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(132,119,217,0.06) 0%, transparent 70%)' }} />
      <div className="absolute top-0 inset-x-0 h-px pointer-events-none"
        style={{ background: 'linear-gradient(to right, transparent, rgba(242,121,222,0.15), transparent)' }} />
      <div className="absolute bottom-0 inset-x-0 h-px pointer-events-none"
        style={{ background: 'linear-gradient(to right, transparent, rgba(132,119,217,0.12), transparent)' }} />
      <div className="absolute inset-0 pointer-events-none" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0%25' y1='0%25' x2='100%25' y2='100%25'%3E%3Cstop offset='0%25' stop-color='%23F279DE' stop-opacity='0.18'/%3E%3Cstop offset='100%25' stop-color='%238477D9' stop-opacity='0.18'/%3E%3C/linearGradient%3E%3C/defs%3E%3Cline x1='0' y1='40' x2='40' y2='0' stroke='url(%23g)' stroke-width='1'/%3E%3C/svg%3E")`,
        backgroundSize: '40px 40px',
      }} />

      {/* ── Header ── */}
      <div className="w-full max-w-7xl mx-auto px-6 lg:px-8 mb-6 lg:mb-8 flex-shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6">
          <div>
            <p className="text-xs font-semibold tracking-widest text-brand-pink mb-2">
              Lo que ofrecemos
            </p>
            <h2 className="text-3xl md:text-4xl font-black text-gray-900 leading-tight tracking-tight">
              Nuestros Servicios
            </h2>
          </div>

          <div className="flex items-center shrink-0">
            <span className="text-xs text-gray-400 font-bold tracking-widest bg-gray-50 border border-gray-100 px-4 py-2 rounded-2xl tabular-nums shadow-sm">
              {String(realIndex + 1).padStart(2, '0')} / {String(services.length).padStart(2, '0')}
            </span>
          </div>
        </div>
      </div>

      {/* ── Loading ── */}
      {isLoading && (
        <div className="flex justify-center items-center h-64">
          <div className="w-8 h-8 rounded-full border-2 border-brand-pink border-t-transparent animate-spin" />
        </div>
      )}

      {/* ── Carousel ── */}
      {!isLoading && services.length > 0 && (
        <div className="w-full max-w-7xl mx-auto flex-shrink-0 px-4 sm:px-6 lg:px-8">
          {/* Row: prev button | viewport | next button */}
          <div className="flex items-center gap-3">

            {/* ← Prev */}
            <button
              onClick={() => { advance(-1); pauseAndResume(); }}
              aria-label="Servicio anterior"
              className="flex-shrink-0 w-10 h-10 md:w-12 md:h-12 rounded-full bg-white/95 backdrop-blur-sm shadow-xl border border-gray-200/80 flex items-center justify-center text-gray-700 hover:bg-brand-pink hover:text-white active:scale-95 transition-all duration-200 cursor-pointer"
            >
              <ChevronLeft className="w-5 h-5 md:w-6 md:h-6" />
            </button>

            {/* Viewport */}
            <div
              ref={viewportRef}
              className="flex-1 overflow-hidden"
              style={{ minWidth: 0 }}
            >
              {/* Track — infinite loop: [pre-clones][real items][post-clones] */}
              <div
                ref={trackRef}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerLeave={onPointerUp}
                onTransitionEnd={handleTransitionEnd}
                className="flex cursor-grab active:cursor-grabbing select-none"
                style={{ gap: CARD_GAP, willChange: 'transform' }}
              >
                {loopItems.map((service, i) => {
                  const Icon = resolveIcon(service.name, service.category);
                  return (
                    <ServiceCard
                      key={service._key}
                      service={service}
                      Icon={Icon}
                      slidesPerView={spv}
                      gapPx={CARD_GAP}
                      onBook={() => { if (!isDragging.current) onBookAppointment(service); }}
                    />
                  );
                })}
              </div>
            </div>

            {/* → Next */}
            <button
              onClick={() => { advance(1); pauseAndResume(); }}
              aria-label="Servicio siguiente"
              className="flex-shrink-0 w-10 h-10 md:w-12 md:h-12 rounded-full bg-white/95 backdrop-blur-sm shadow-xl border border-gray-200/80 flex items-center justify-center text-gray-700 hover:bg-brand-pink hover:text-white active:scale-95 transition-all duration-200 cursor-pointer"
            >
              <ChevronRight className="w-5 h-5 md:w-6 md:h-6" />
            </button>
          </div>

          {/* Dots — one per real service */}
          <div className="flex justify-center items-center gap-2 mt-6 lg:mt-8">
            {services.map((_, i) => (
              <button
                key={i}
                onClick={() => goToReal(i)}
                aria-label={`Ir al servicio ${i + 1}`}
                style={{
                  borderRadius: 9999,
                  height:       8,
                  width:        i === realIndex ? 32 : 8,
                  background:   i === realIndex
                    ? 'linear-gradient(to right, #F279DE, #8477D9)'
                    : '#cbd5e1',
                  transition:   'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  border:       'none',
                  cursor:       'pointer',
                  padding:      0,
                }}
                className="hover:opacity-80 hover:scale-110 active:scale-90 transition-transform"
              />
            ))}
          </div>
        </div>
      )}

      {/* ── Empty state ── */}
      {!isLoading && services.length === 0 && (
        <div className="max-w-md mx-auto text-center px-6 py-20">
          <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Scissors className="w-6 h-6 text-brand-pink" />
          </div>
          <h3 className="text-lg font-bold text-gray-800 mb-2">Sin servicios disponibles</h3>
          <p className="text-sm text-gray-400">Vuelve pronto para ver nuestro catálogo actualizado.</p>
        </div>
      )}
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────
   ServiceCard
───────────────────────────────────────────────────────────── */
interface CardProps {
  service:       any;
  Icon:          React.ElementType;
  slidesPerView: number;
  gapPx:         number;
  onBook:        () => void;
}

function ServiceCard({ service, Icon, slidesPerView, gapPx, onBook }: CardProps) {
  const { accent } = service;

  // Each card takes an equal fraction of the viewport width, accounting for gaps
  const flexBasis = `calc((100% - ${gapPx * (slidesPerView - 1)}px) / ${slidesPerView})`;

  return (
    <div
      className="flex-shrink-0 rounded-3xl overflow-hidden flex flex-col"
      style={{
        flexBasis,
        width:      flexBasis,   // belt-and-suspenders so flex-shrink:0 uses the right size
        minWidth:   0,
        height:     290,
        boxShadow:  '0 4px 16px -4px rgba(0,0,0,0.10)',
        transition: 'box-shadow 0.4s ease',
      }}
    >
      {/* Gradient band */}
      <div
        className="h-1.5 w-full flex-shrink-0"
        style={{ background: `linear-gradient(to right, ${accent.from}, ${accent.to})` }}
      />

      {/* Body */}
      <div
        className="flex-1 rounded-b-3xl p-5 flex flex-col gap-4 min-h-0"
        style={{
          background: '#111118',
          border:     '1px solid rgba(255,255,255,0.06)',
          borderTop:  'none',
        }}
      >
        {/* Icon + category */}
        <div className="flex items-start justify-between">
          <div
            className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0"
            style={{ background: `linear-gradient(135deg, ${accent.from}25, ${accent.to}25)` }}
          >
            <Icon className="w-5 h-5" style={{ color: accent.from }} />
          </div>
          <span
            className="text-[10px] font-semibold tracking-widest text-right"
            style={{ color: 'rgba(255,255,255,0.3)' }}
          >
            {service.category}
          </span>
        </div>

        {/* Name + description */}
        <div className="flex-1 min-h-0">
          <h3 className="text-base font-black leading-tight mb-1.5" style={{ color: '#ffffff' }}>
            {service.name}
          </h3>
          <p className="text-xs line-clamp-2 leading-relaxed" style={{ color: 'rgba(255,255,255,0.4)' }}>
            {service.description || 'Servicio de belleza profesional.'}
          </p>
        </div>

        {/* Meta */}
        <div
          className="flex items-center justify-between pt-2 mt-auto flex-shrink-0"
          style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
        >
          <div className="flex items-center space-x-1.5" style={{ color: 'rgba(255,255,255,0.35)' }}>
            <Clock className="w-3.5 h-3.5" />
            <span className="text-xs font-medium">{service.duration} min</span>
          </div>
          <span
            className="text-lg font-black"
            style={{
              background:           `linear-gradient(to right, ${accent.from}, ${accent.to})`,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor:  'transparent',
            }}
          >
            ${service.price.toLocaleString()}
          </span>
        </div>

        {/* CTA */}
        <button
          onClick={onBook}
          className="w-full flex items-center justify-center space-x-1.5 text-white text-sm font-semibold py-2.5 rounded-xl hover:opacity-90 hover:-translate-y-0.5 active:scale-95 transition-all duration-200 flex-shrink-0"
          style={{ background: `linear-gradient(to right, ${accent.from}, ${accent.to})` }}
        >
          <Calendar className="w-4 h-4" />
          <span>Agendar</span>
        </button>
      </div>
    </div>
  );
}
