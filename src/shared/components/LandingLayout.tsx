import React, { useRef } from 'react';
import { Hero } from './Hero';
import { AppDownload } from './AppDownload';
import { Footer } from './Footer';
import { ServiceList } from '@/features/services/components/ServiceList';
import { useLandingScroll } from '@/shared/hooks/useLandingScroll';

interface LandingLayoutProps {
  onBookAppointment: (selectedService?: any) => void;
}

/**
 * Full-page scroll-snap container for the public landing.
 * Each child section declares `scroll-snap-align: start` on its own root element.
 * Parallax `scrollY` is derived from this container's scrollTop.
 */
export function LandingLayout({ onBookAppointment }: LandingLayoutProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollY = useLandingScroll(containerRef);

  // Approximate pixel offsets — sections stack sequentially.
  // Hero starts at 0. Services at ~100vh. AppDownload after services (~200vh estimate).
  // These are rough values; parallax effect degrades gracefully if off.
  const viewportH = typeof window !== 'undefined' ? window.innerHeight : 800;
  const appDownloadOffset = viewportH * 2; // hero + services ≈ 2 viewport heights

  return (
    <div
      ref={containerRef}
      className="w-full h-auto overflow-y-visible lg:h-[calc(100vh-4rem)] lg:overflow-y-scroll lg:snap-y lg:snap-mandatory scroll-smooth"
      style={{
        scrollbarWidth: 'thin',
        scrollbarColor: 'rgba(242,121,222,0.3) transparent',
      }}
    >
      {/* Hero — snap point 1 */}
      <Hero onBookAppointment={onBookAppointment} scrollY={scrollY} />

      {/* Services — snap point 2 */}
      <div style={{ scrollSnapAlign: 'start' }}>
        <ServiceList onBookAppointment={onBookAppointment} />
      </div>

      {/* App Download — snap point 3 */}
      <div style={{ scrollSnapAlign: 'start' }}>
        <AppDownload scrollY={scrollY} sectionOffsetTop={appDownloadOffset} />
      </div>

      {/* Footer — snap point 4
          min-height must equal the snap-container height (calc(100vh - 4rem))
          so that scroll-snap-mandatory can actually reach this stop.
          Content sits at the top; remaining space is transparent dead area. */}
      <div style={{ scrollSnapAlign: 'start', minHeight: 'calc(100vh - 4rem)' }}>
        <Footer />
      </div>
    </div>
  );
}
