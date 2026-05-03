import React from 'react';
import { Scissors, Sparkles, Wind } from 'lucide-react';
import { useLoading } from '../contexts/LoadingContext';

interface SalonLoaderProps {
  isLoading: boolean;
  message: string;
  isFullPage?: boolean;
}

export function SalonLoader({ isLoading, message, isFullPage = true }: SalonLoaderProps) {
  if (!isLoading) return null;

  return (
    <div className={`${isFullPage ? 'fixed inset-0 z-[9999]' : 'absolute inset-0 z-[40]'} flex items-center justify-center bg-white/60 backdrop-blur-md transition-all duration-500 animate-in fade-in`}>
      <div className="relative flex flex-col items-center scale-90 md:scale-100">
        {/* Decorative Background Elements */}
        <div className="absolute -z-10 w-48 h-48 bg-gradient-to-tr from-brand-pink/20 to-brand-indigo/20 rounded-full blur-3xl animate-pulse-soft" />
        <div className="absolute -z-10 w-32 h-32 bg-gradient-to-bl from-brand-violet/20 to-brand-periwinkle/20 rounded-full blur-2xl animate-spin-slow" />

        {/* Main Icon Animation */}
        <div className="relative mb-6">
          <div className="bg-white p-6 rounded-[2rem] shadow-2xl shadow-brand-indigo/10 border border-brand-lavender/30 relative overflow-hidden group">
            {/* Spinning background rays */}
            <div className="absolute inset-0 bg-gradient-to-tr from-brand-pink/5 via-transparent to-brand-indigo/5 animate-spin-slow" />
            
            <div className="relative z-10 flex items-center justify-center">
              <Scissors className="w-12 h-12 text-brand-indigo animate-snip" />
              <Sparkles className="absolute -top-1 -right-1 w-5 h-5 text-brand-pink animate-float" />
              <Wind className="absolute -bottom-2 -left-2 w-6 h-6 text-brand-violet opacity-40" />
            </div>
          </div>
          
          {/* Pulsing rings */}
          <div className="absolute inset-0 border-2 border-brand-indigo/10 rounded-[2rem] animate-ping opacity-20" />
          <div className="absolute inset-0 border-2 border-brand-pink/5 rounded-[2rem] animate-pulse opacity-30" />
        </div>

        {/* Text and Progress */}
        <div className="text-center px-4 max-w-xs">
          <h3 className="text-xl font-black tracking-tight mb-1 text-transparent bg-clip-text bg-gradient-brand">
            AstrhoApp
          </h3>
          <p className="text-gray-500 font-bold text-[10px] uppercase tracking-widest animate-pulse-soft">
            {message}
          </p>
          
          {/* Small animated bar */}
          <div className="w-24 h-1 bg-gray-100 rounded-full mt-4 mx-auto overflow-hidden border border-gray-50">
            <div className="h-full bg-gradient-brand w-1/2 rounded-full animate-[shimmer_2s_infinite_linear]" 
                 style={{ 
                   backgroundSize: '200% 100%',
                   backgroundImage: 'linear-gradient(to right, transparent, rgba(255,255,255,0.4), transparent)'
                 }} 
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export function GlobalLoader() {
  const { isLoading, message } = useLoading();
  return <SalonLoader isLoading={isLoading} message={message} isFullPage={true} />;
}

export function SectionLoader() {
  const { isSectionLoading, sectionMessage } = useLoading();
  return <SalonLoader isLoading={isSectionLoading} message={sectionMessage} isFullPage={false} />;
}
