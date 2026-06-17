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
      className="overflow-y-scroll"
      style={{
        height: 'calc(100vh - 4rem)', // 4rem = 16 = h-16 nav height (pt-16 on main)
        scrollSnapType: 'y mandatory',
        scrollBehavior: 'smooth',
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
      <AppDownload scrollY={scrollY} sectionOffsetTop={appDownloadOffset} />

      {/* Footer — no snap, natural flow */}
      <div style={{ scrollSnapAlign: 'start' }}>
        <Footer />
      </div>
    </div>
  );
}
