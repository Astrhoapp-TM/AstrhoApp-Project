import React, { createContext, useContext, useState, useCallback } from 'react';

interface LoadingContextType {
  isLoading: boolean;
  message: string;
  showLoading: (message?: string) => void;
  hideLoading: () => void;
  
  // Section-specific loading
  isSectionLoading: boolean;
  sectionMessage: string;
  showSectionLoading: (message?: string) => void;
  hideSectionLoading: () => void;
}

const LoadingContext = createContext<LoadingContextType | undefined>(undefined);

export function LoadingProvider({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('Transformando tu estilo...');
  
  const [isSectionLoading, setIsSectionLoading] = useState(false);
  const [sectionMessage, setSectionMessage] = useState('Cargando sección...');

  const showLoading = useCallback((msg?: string) => {
    if (msg) setMessage(msg);
    setIsLoading(true);
  }, []);

  const hideLoading = useCallback(() => {
    setIsLoading(false);
  }, []);

  const showSectionLoading = useCallback((msg?: string) => {
    if (msg) setSectionMessage(msg);
    setIsSectionLoading(true);
  }, []);

  const hideSectionLoading = useCallback(() => {
    setIsSectionLoading(false);
  }, []);

  return (
    <LoadingContext.Provider value={{ 
      isLoading, 
      message, 
      showLoading, 
      hideLoading,
      isSectionLoading,
      sectionMessage,
      showSectionLoading,
      hideSectionLoading
    }}>
      {children}
    </LoadingContext.Provider>
  );
}

export function useLoading() {
  const context = useContext(LoadingContext);
  if (context === undefined) {
    throw new Error('useLoading must be used within a LoadingProvider');
  }
  return context;
}
