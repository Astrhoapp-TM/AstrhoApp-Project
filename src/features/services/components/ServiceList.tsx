import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Scissors, Sparkles, Heart, Clock, Calendar, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { toast } from 'sonner';
import { serviceService } from '../services/serviceService';

/* ─────────────────────────────────────────────────────────────
   Constants
───────────────────────────────────────────────────────────── */
const AUTOPLAY_MS  = 3500;
const RESUME_MS    = 6000;
const CARD_W       = 320;
const CARD_H       = 340;   // fixed height — all cards identical
const CARD_GAP     = 20;
const CARD_FULL    = CARD_W + CARD_GAP;
const CLONES       = 3;     // clones prepended AND appended
const EASE         = 'transform 0.65s cubic-bezier(0.25, 0.46, 0.45, 0.94)';

const ACCENTS = [
  { from: '#F279DE', to: '#8477D9' },
  { from: '#BF84D9', to: '#F279DE' },
  { from: '#8477D9', to: '#BBC3F2' },
  { from: '#BBC3F2', to: '#BF84D9' },
];

/* ─────────────────────────────────────────────────────────────
   Helpers
───────────────────────────────────────────────────────────── */
function resolveIcon(name = '', category = '') {
  const t = (name + category).toLowerCase();
  if (t.includes('corte') || t.includes('barba')) return Scissors;
  if (t.includes('color') || t.includes('tinte') || t.includes('peinado') || t.includes('uña'))
    return Sparkles;
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

/**
 * Given real services, build:
 *   [ ...last CLONES real items ]  [ ...all real items ]  [ ...first CLONES real items ]
 *
 * Each item carries `realIndex` so the dot indicators always know which real
 * service is conceptually active.
 */
function buildLoop(items: any[]) {
  if (items.length === 0) return [];
  const n      = items.length;
  const cloneN = Math.min(CLONES, n);
  const tail   = items.slice(n - cloneN).map((s, i) => ({ ...s, _key: `pre-${i}`,  realIndex: n - cloneN + i }));
  const head   = items.slice(0, cloneN).map((s, i) => ({ ...s, _key: `post-${i}`, realIndex: i }));
  return [
    ...tail,
    ...items.map((s, i) => ({ ...s, _key: `real-${i}`, realIndex: i })),
    ...head,
  ];
}

/* ─────────────────────────────────────────────────────────────
   ServiceList
───────────────────────────────────────────────────────────── */
interface ServicesProps {
  onBookAppointment: (selectedService?: any) => void;
}

export function ServiceList({ onBookAppointment }: ServicesProps) {
  const [services,    setServices]    = useState<any[]>([]);   // real items
  const [isLoading,   setIsLoading]   = useState(true);

  // loopItems = clones + reals + clones
  const [loopItems,   setLoopItems]   = useState<any[]>([]);

  // trackIndex is the index into loopItems (starts at CLONES so first real is centred)
  const [trackIndex,  setTrackIndex]  = useState(CLONES);

  // realIndex drives the dot indicators (0-based into real services)
  const realIndex = loopItems[trackIndex]?.realIndex ?? 0;

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
        setTrackIndex(Math.min(CLONES, mapped.length > 0 ? CLONES : 0));
      } catch {
        toast.error('Error al cargar servicios');
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  /* ── Refs ── */
  const trackRef       = useRef<HTMLDivElement>(null);
  const wrapRef        = useRef<HTMLDivElement>(null);
  const transitioning  = useRef(false);   // guard against rapid clicks during animation
  const paused         = useRef(false);
  const autoplayTimer  = useRef<ReturnType<typeof setInterval>  | null>(null);
  const resumeTimer    = useRef<ReturnType<typeof setTimeout>   | null>(null);

  /* ── Apply translate ── */
  const applyTranslate = useCallback((idx: number, animated: boolean) => {
    const track = trackRef.current;
    const wrap  = wrapRef.current;
    if (!track || !wrap) return;
    const offset = idx * CARD_FULL - (wrap.offsetWidth / 2 - CARD_W / 2);
    track.style.transition = animated ? EASE : 'none';
    track.style.transform  = `translateX(${-offset}px)`;
  }, []);

  useEffect(() => {
    applyTranslate(trackIndex, true);
  }, [trackIndex, applyTranslate]);

  /* ── After each animated transition, silently jump if we're on a clone ── */
  const handleTransitionEnd = useCallback(() => {
    transitioning.current = false;
    const n = services.length;
    if (n === 0) return;

    let next = -1;
    if (trackIndex < CLONES)          next = trackIndex + n;           // was in pre-clones  → jump to real end
    if (trackIndex >= CLONES + n)     next = trackIndex - n;           // was in post-clones → jump to real start

    if (next !== -1) {
      setTrackIndex(next);          // triggers applyTranslate with animated=true
      // But we want NO animation for the teleport → override immediately
      requestAnimationFrame(() => {
        applyTranslate(next, false);
      });
    }
  }, [trackIndex, services.length, applyTranslate]);

  /* ── Navigation ── */
  const advance = useCallback((delta: 1 | -1) => {
    if (transitioning.current) return;
    transitioning.current = true;
    setTrackIndex(i => i + delta);
  }, []);

  const pauseAndResume = useCallback(() => {
    paused.current = true;
    if (resumeTimer.current) clearTimeout(resumeTimer.current);
    resumeTimer.current = setTimeout(() => { paused.current = false; }, RESUME_MS);
  }, []);

  /* ── Autoplay ── */
  useEffect(() => {
    if (services.length <= 1) return;
    autoplayTimer.current = setInterval(() => {
      if (!paused.current) advance(1);
    }, AUTOPLAY_MS);
    return () => { if (autoplayTimer.current) clearInterval(autoplayTimer.current); };
  }, [services.length, advance]);

  /* ── Jump to a real index (dot click) ── */
  const goToReal = useCallback((ri: number) => {
    pauseAndResume();
    // Find the first occurrence of this realIndex inside the real-item section
    const targetTrackIdx = CLONES + ri;
    if (targetTrackIdx === trackIndex) return;
    transitioning.current = true;
    setTrackIndex(targetTrackIdx);
  }, [trackIndex, pauseAndResume]);

  /* ── Drag ── */
  const dragStartX = useRef<number | null>(null);
  const dragDelta  = useRef(0);
  const isDragging = useRef(false);

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

    // Live rubber-band preview
    const track = trackRef.current;
    const wrap  = wrapRef.current;
    if (!track || !wrap) return;
    const base = trackIndex * CARD_FULL - (wrap.offsetWidth / 2 - CARD_W / 2);
    track.style.transition = 'none';
    track.style.transform  = `translateX(${-(base - dx * 0.4)}px)`;
  };

  const onPointerUp = () => {
    if (!isDragging.current) { dragStartX.current = null; return; }
    const threshold = CARD_W * 0.22;
    if      (dragDelta.current < -threshold) advance(1);
    else if (dragDelta.current >  threshold) advance(-1);
    else applyTranslate(trackIndex, true);  // snap back
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
      className="relative bg-white overflow-hidden py-20"
      style={{ scrollSnapAlign: 'start' }}
      onMouseEnter={() => { paused.current = true;  }}
      onMouseLeave={() => { paused.current = false; }}
    >
      {/* ── Subtle light decorations ── */}
      <div className="absolute -top-32 -right-32 w-[420px] h-[420px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(242,121,222,0.06) 0%, transparent 70%)' }} />
      <div className="absolute -bottom-32 -left-16 w-[360px] h-[360px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(132,119,217,0.06) 0%, transparent 70%)' }} />
      <div className="absolute top-0 inset-x-0 h-px pointer-events-none"
        style={{ background: 'linear-gradient(to right, transparent, rgba(242,121,222,0.15), transparent)' }} />
      <div className="absolute bottom-0 inset-x-0 h-px pointer-events-none"
        style={{ background: 'linear-gradient(to right, transparent, rgba(132,119,217,0.12), transparent)' }} />
      {/* Diagonal gradient mesh — brand pink → indigo lines */}
      <div className="absolute inset-0 pointer-events-none" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0%25' y1='0%25' x2='100%25' y2='100%25'%3E%3Cstop offset='0%25' stop-color='%23F279DE' stop-opacity='0.18'/%3E%3Cstop offset='100%25' stop-color='%238477D9' stop-opacity='0.18'/%3E%3C/linearGradient%3E%3C/defs%3E%3Cline x1='0' y1='40' x2='40' y2='0' stroke='url(%23g)' stroke-width='1'/%3E%3C/svg%3E")`,
        backgroundSize: '40px 40px',
      }} />

      {/* ── Header ── */}
      <div className="max-w-7xl mx-auto px-6 lg:px-8 mb-14">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-brand-pink mb-2">
              Lo que ofrecemos
            </p>
            <h2 className="text-4xl md:text-5xl font-black text-gray-900 leading-tight tracking-tight">
              Nuestros Servicios
            </h2>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            <button
              onClick={() => { advance(-1); pauseAndResume(); }}
              disabled={services.length === 0}
              aria-label="Servicio anterior"
              className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center text-gray-400 hover:border-brand-pink hover:text-brand-pink disabled:opacity-25 transition-all duration-200"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={() => { advance(1); pauseAndResume(); }}
              disabled={services.length === 0}
              aria-label="Servicio siguiente"
              className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center text-gray-400 hover:border-brand-pink hover:text-brand-pink disabled:opacity-25 transition-all duration-200"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
            <span className="text-xs text-gray-400 font-medium pl-2 tabular-nums">
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
      )}      {/* ── Carousel ── */}
      {!isLoading && services.length > 0 && (
        <>
          {/* Viewport */}
          <div ref={wrapRef} className="relative overflow-hidden" style={{ height: CARD_H + 40 }}>

            {/* Track */}
            <div
              ref={trackRef}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerLeave={onPointerUp}
              onTransitionEnd={handleTransitionEnd}
              className="absolute top-0 left-0 flex items-center cursor-grab active:cursor-grabbing select-none"
              style={{ gap: CARD_GAP, height: '100%', willChange: 'transform' }}
            >
              {loopItems.map((service, i) => {
                const Icon     = resolveIcon(service.name, service.category);
                const isActive = i === trackIndex;
                return (
                  <ServiceCard
                    key={service._key}
                    service={service}
                    Icon={Icon}
                    isActive={isActive}
                    onBook={() => { if (!isDragging.current) onBookAppointment(service); }}
                  />
                );
              })}
            </div>
          </div>

          {/* Dots */}
          <div className="flex justify-center items-center gap-1.5 mt-10">
            {services.map((_, i) => (
              <button
                key={i}
                onClick={() => goToReal(i)}
                aria-label={`Ir al servicio ${i + 1}`}
                style={{
                  borderRadius: 9999,
                  height:       5,
                  width:        i === realIndex ? 24 : 5,
                  background:   i === realIndex
                    ? 'linear-gradient(to right, #F279DE, #8477D9)'
                    : '#e5e7eb',
                  transition:   'width 0.4s ease, background 0.4s ease',
                  border:       'none',
                  cursor:       'pointer',
                  padding:      0,
                }}
              />
            ))}
          </div>
        </>
      )}

      {/* ── Empty ── */}
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
  service:  any;
  Icon:     React.ElementType;
  isActive: boolean;
  onBook:   () => void;
}

function ServiceCard({ service, Icon, isActive, onBook }: CardProps) {
  const { accent } = service;

  return (
    <div
      className="flex-shrink-0 rounded-3xl overflow-hidden flex flex-col"
      style={{
        width:      CARD_W,
        height:     CARD_H,
        transition: `transform 0.65s cubic-bezier(0.25,0.46,0.45,0.94),
                     box-shadow 0.65s ease`,
        transform:  isActive ? 'scale(1) translateY(0px)' : 'scale(0.94) translateY(12px)',
        boxShadow:  isActive
          ? `0 0 0 1px rgba(242,121,222,0.2), 0 24px 60px -10px rgba(132,119,217,0.3), 0 8px 24px -8px rgba(0,0,0,0.25)`
          : '0 4px 16px -4px rgba(0,0,0,0.10)',
      }}
    >
      {/* Gradient band */}
      <div className="h-1.5 w-full"
        style={{ background: `linear-gradient(to right, ${accent.from}, ${accent.to})` }}
      />

      {/* Body — dark */}
      <div className="flex-1 rounded-b-3xl p-6 flex flex-col gap-5"
        style={{ background: '#111118', border: '1px solid rgba(255,255,255,0.06)', borderTop: 'none' }}
      >
        {/* Icon + category */}
        <div className="flex items-start justify-between">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center"
            style={{ background: `linear-gradient(135deg, ${accent.from}25, ${accent.to}25)` }}
          >
            <Icon className="w-5 h-5" style={{ color: accent.from }} />
          </div>
          <span className="text-[10px] font-semibold uppercase tracking-widest"
            style={{ color: 'rgba(255,255,255,0.3)' }}>
            {service.category}
          </span>
        </div>

        {/* Name + description */}
        <div>
          <h3 className="text-xl font-black leading-tight mb-2" style={{ color: '#ffffff' }}>
            {service.name}
          </h3>
          <p className="text-sm line-clamp-2 leading-relaxed" style={{ color: 'rgba(255,255,255,0.4)' }}>
            {service.description || 'Servicio de belleza profesional.'}
          </p>
        </div>

        {/* Meta */}
        <div className="flex items-center justify-between pt-1 mt-auto"
          style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex items-center space-x-1.5" style={{ color: 'rgba(255,255,255,0.35)' }}>
            <Clock className="w-3.5 h-3.5" />
            <span className="text-xs font-medium">{service.duration} min</span>
          </div>
          <span
            className="text-xl font-black"
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
          className="w-full flex items-center justify-center space-x-1.5 text-white text-sm font-semibold py-3 rounded-xl hover:opacity-90 hover:-translate-y-0.5 active:scale-95 transition-all duration-200"
          style={{ background: `linear-gradient(to right, ${accent.from}, ${accent.to})` }}
        >
          <Calendar className="w-4 h-4" />
          <span>Agendar</span>
        </button>
      </div>
    </div>
  );
}
