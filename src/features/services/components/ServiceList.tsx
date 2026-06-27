import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Scissors, Sparkles, Heart, Clock, Calendar, ChevronLeft, ChevronRight,
  Search, X,
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
  const [modalOpen,  setModalOpen]  = useState(false);

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
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0%25' y1='0%25' x2='100%25' y2='100%25'%3E%3Cstop offset='0%25' stop-color='%23F279DE' stop-opacity='0.18'/%3E%3Cstop offset='100%25' stop-color='%238477D9' stop-opacity='0.18'/%3E%3C/linearGradient%3E%3C/defs%3E%3Cline x1='0' y1='40' x2='40' y2='0' stroke='url(%23g)' stroke-width='2'/%3E%3C/svg%3E")`,
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

          <div className="flex items-center gap-3 shrink-0">
            <span className="text-xs text-gray-400 font-bold tracking-widest bg-gray-50 border border-gray-100 px-4 py-2 rounded-2xl tabular-nums shadow-sm">
              {String(realIndex + 1).padStart(2, '0')} / {String(services.length).padStart(2, '0')}
            </span>
            {services.length > 0 && (
              <button
                onClick={() => setModalOpen(true)}
                className="group relative overflow-hidden text-xs font-semibold px-4 py-2 rounded-2xl border border-transparent text-white shadow-sm transition-all duration-300 cursor-pointer"
                style={{ background: 'linear-gradient(to right, #F279DE, #8477D9)' }}
              >
                Ver más
              </button>
            )}
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
              className="group flex-shrink-0 w-5 rounded-lg bg-white/95 backdrop-blur-sm shadow-xl border border-gray-200/80 flex items-center justify-center text-gray-700 active:scale-95 transition-all duration-300 cursor-pointer relative overflow-hidden"
              style={{ height: 145 }}
            >
              {/* gradient overlay — fades in on hover */}
              <span
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                style={{ background: 'linear-gradient(to bottom, #F279DE, #8477D9)' }}
              />
              <ChevronLeft className="w-3.5 h-3.5 relative z-10 transition-colors duration-300 group-hover:text-white" />
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
              className="group flex-shrink-0 w-5 rounded-lg bg-white/95 backdrop-blur-sm shadow-xl border border-gray-200/80 flex items-center justify-center text-gray-700 active:scale-95 transition-all duration-300 cursor-pointer relative overflow-hidden"
              style={{ height: 145 }}
            >
              {/* gradient overlay — fades in on hover */}
              <span
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                style={{ background: 'linear-gradient(to bottom, #F279DE, #8477D9)' }}
              />
              <ChevronRight className="w-3.5 h-3.5 relative z-10 transition-colors duration-300 group-hover:text-white" />
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

      {/* ── Modal "Ver más" ── */}
      {modalOpen && (
        <ServicesModal
          onClose={() => setModalOpen(false)}
          onBookAppointment={onBookAppointment}
        />
      )}
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────
   ServicesModal
───────────────────────────────────────────────────────────── */

interface ModalProps {
  onClose:           () => void;
  onBookAppointment: (service?: any) => void;
}

function ServicesModal({ onClose, onBookAppointment }: ModalProps) {
  const [search,     setSearch]     = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [page,       setPage]       = useState(1);
  const [items,      setItems]      = useState<any[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [total,      setTotal]      = useState(0);
  const [loading,    setLoading]    = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);

  // Debounce search, reset to page 1
  useEffect(() => {
    const t = setTimeout(() => { setDebouncedQ(search); setPage(1); }, 350);
    return () => clearTimeout(t);
  }, [search]);

  // Server-side fetch on page / query change
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const data = await serviceService.getServices({
          page,
          search: debouncedQ || undefined,
        }) as any;
        if (cancelled) return;

        // The API always paginates with its own pageSize (5).
        // Read server-provided pagination metadata.
        const arr: any[] = Array.isArray(data)
          ? data
          : data.data || data.$values || [];

        const tp: number = data.totalPaginas ?? data.totalPages ?? 1;
        const tr: number = data.totalRegistros ?? data.totalCount ?? data.total ?? arr.length;

        setItems(arr.map(mapService));
        setTotalPages(Math.max(1, tp));
        setTotal(tr);
      } catch {
        toast.error('Error al cargar servicios');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [page, debouncedQ]);

  // Focus input & block body scroll
  useEffect(() => {
    inputRef.current?.focus();
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  // Close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Panel */}
      <div
        className="relative w-full max-w-5xl max-h-[90vh] flex flex-col rounded-3xl overflow-hidden shadow-2xl"
        style={{ background: '#ffffff', border: '1px solid rgba(0,0,0,0.08)' }}
      >
        {/* ── Modal header ── */}
        <div
          className="flex items-center justify-between px-6 py-5 flex-shrink-0"
          style={{ borderBottom: '1px solid rgba(0,0,0,0.07)' }}
        >
          <div>
            <p className="text-[10px] font-semibold tracking-widest mb-0.5"
               style={{ color: '#F279DE' }}>
              Catálogo completo
            </p>
            <h3 className="text-xl font-black text-gray-900 leading-tight">
              Todos los Servicios
            </h3>
          </div>

          {/* Search */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none"
                style={{ color: 'rgba(0,0,0,0.35)' }}
              />
              <input
                ref={inputRef}
                type="text"
                placeholder="Buscar servicio…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-8 pr-4 py-2 text-sm rounded-xl outline-none text-gray-800 placeholder:text-gray-400 transition-all duration-200"
                style={{
                  background: '#f3f4f6',
                  border:     '1px solid #e5e7eb',
                  width:      220,
                }}
                onFocus={e => {
                  e.currentTarget.style.borderColor = '#F279DE';
                  e.currentTarget.style.boxShadow   = '0 0 0 3px rgba(242,121,222,0.15)';
                }}
                onBlur={e => {
                  e.currentTarget.style.borderColor = '#e5e7eb';
                  e.currentTarget.style.boxShadow   = 'none';
                }}
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-200 hover:bg-gray-100 text-gray-400 hover:text-gray-700 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ── Grid ── */}
        <div className="flex-1 overflow-y-auto px-6 py-5 min-h-0">
          {loading ? (
            <div className="flex justify-center items-center h-48">
              <div className="w-7 h-7 rounded-full border-2 border-t-transparent animate-spin"
                   style={{ borderColor: '#F279DE', borderTopColor: 'transparent' }} />
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-center gap-3">
              <Scissors className="w-8 h-8 text-gray-300" />
              <p className="text-sm font-medium text-gray-400">
                {debouncedQ
                  ? `Sin resultados para "${debouncedQ}"`
                  : 'No hay servicios disponibles'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {items.map((service, idx) => {
                const Icon = resolveIcon(service.name, service.category);
                return (
                  <ModalCard
                    key={service.id ?? idx}
                    service={service}
                    Icon={Icon}
                    onBook={() => { onBookAppointment(service); onClose(); }}
                  />
                );
              })}
            </div>
          )}
        </div>

        {/* ── Pagination ── */}
        <div
          className="flex items-center justify-between px-6 py-4 flex-shrink-0"
          style={{ borderTop: '1px solid rgba(0,0,0,0.07)' }}
        >
          <p className="text-xs tabular-nums text-gray-400">
            {loading ? '…' : `${total} servicio${total !== 1 ? 's' : ''}`}
          </p>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1 || loading}
              className="w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
              style={{ background: '#f3f4f6', color: '#374151' }}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {/* Page numbers */}
            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(n => n === 1 || n === totalPages || Math.abs(n - page) <= 1)
                .reduce<(number | '…')[]>((acc, n, idx, arr) => {
                  if (idx > 0 && n - (arr[idx - 1] as number) > 1) acc.push('…');
                  acc.push(n);
                  return acc;
                }, [])
                .map((n, i) =>
                  n === '…' ? (
                    <span key={`ellipsis-${i}`} className="w-8 text-center text-xs text-gray-400">…</span>
                  ) : (
                    <button
                      key={n}
                      onClick={() => setPage(n as number)}
                      className="w-8 h-8 rounded-lg text-xs font-semibold transition-all duration-200 cursor-pointer"
                      style={
                        page === n
                          ? { background: 'linear-gradient(to right, #F279DE, #8477D9)', color: '#fff' }
                          : { background: '#f3f4f6', color: '#6b7280' }
                      }
                    >
                      {n}
                    </button>
                  )
                )
              }
            </div>

            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages || loading}
              className="w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
              style={{ background: '#f3f4f6', color: '#374151' }}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   ModalCard — compact dark card for the modal grid
───────────────────────────────────────────────────────────── */
interface ModalCardProps {
  service: any;
  Icon:    React.ElementType;
  onBook:  () => void;
}

function ModalCard({ service, Icon, onBook }: ModalCardProps) {
  const { accent } = service;
  return (
    <div
      className="rounded-2xl overflow-hidden flex flex-col"
      style={{
        background: '#ffffff',
        border:     '1px solid #e5e7eb',
        boxShadow:  '0 2px 12px -4px rgba(0,0,0,0.08)',
      }}
    >
      <div className="h-1 w-full"
           style={{ background: `linear-gradient(to right, ${accent.from}, ${accent.to})` }} />
      <div className="p-4 flex flex-col gap-3 flex-1">
        <div className="flex items-start justify-between">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
               style={{ background: `linear-gradient(135deg, ${accent.from}20, ${accent.to}20)` }}>
            <Icon className="w-4 h-4" style={{ color: accent.from }} />
          </div>
          <span className="text-[10px] font-semibold tracking-widest text-gray-400">
            {service.category}
          </span>
        </div>
        <div className="flex-1">
          <h4 className="text-sm font-black leading-tight mb-1 text-gray-900">{service.name}</h4>
          <p className="text-[11px] line-clamp-2 leading-relaxed text-gray-400">
            {service.description || 'Servicio de belleza profesional.'}
          </p>
        </div>
        <div className="flex items-center justify-between pt-2"
             style={{ borderTop: '1px solid #f3f4f6' }}>
          <div className="flex items-center gap-1 text-gray-400">
            <Clock className="w-3 h-3" />
            <span className="text-[11px] font-medium">{service.duration} min</span>
          </div>
          <span className="text-sm font-black"
                style={{
                  background: `linear-gradient(to right, ${accent.from}, ${accent.to})`,
                  WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                }}>
            ${service.price.toLocaleString()}
          </span>
        </div>
        <button
          onClick={onBook}
          className="w-full flex items-center justify-center gap-1.5 text-white text-xs font-semibold py-2 rounded-lg hover:opacity-90 active:scale-95 transition-all duration-200"
          style={{ background: `linear-gradient(to right, ${accent.from}, ${accent.to})` }}
        >
          <Calendar className="w-3.5 h-3.5" />
          Agendar
        </button>
      </div>
    </div>
  );
}


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
          background: '#ffffff',
          border:     '1px solid #e5e7eb',
          borderTop:  'none',
        }}
      >
        {/* Icon + category */}
        <div className="flex items-start justify-between">
          <div
            className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0"
            style={{ background: `linear-gradient(135deg, ${accent.from}20, ${accent.to}20)` }}
          >
            <Icon className="w-5 h-5" style={{ color: accent.from }} />
          </div>
          <span className="text-[10px] font-semibold tracking-widest text-right text-gray-400">
            {service.category}
          </span>
        </div>

        {/* Name + description */}
        <div className="flex-1 min-h-0">
          <h3 className="text-base font-black leading-tight mb-1.5 text-gray-900">
            {service.name}
          </h3>
          <p className="text-xs line-clamp-2 leading-relaxed text-gray-400">
            {service.description || 'Servicio de belleza profesional.'}
          </p>
        </div>

        {/* Meta */}
        <div
          className="flex items-center justify-between pt-2 mt-auto flex-shrink-0"
          style={{ borderTop: '1px solid #f3f4f6' }}
        >
          <div className="flex items-center space-x-1.5 text-gray-400">
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
