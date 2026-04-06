import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface SimplePaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  totalRecords?: number;
  recordsPerPage?: number;
  className?: string;
}

export function SimplePagination({ 
  currentPage, 
  totalPages, 
  onPageChange, 
  totalRecords,
  recordsPerPage,
  className = '' 
}: SimplePaginationProps) {
  const getVisiblePages = () => {
    const pages = [];
    const showPages = 5; // Show 5 page numbers at most
    
    if (totalPages <= showPages) {
      // Show all pages if total is small
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Show pages around current page
      let start = Math.max(1, currentPage - 2);
      let end = Math.min(totalPages, currentPage + 2);
      
      // Adjust if we're near the beginning
      if (currentPage <= 3) {
        end = Math.min(totalPages, 5);
      }
      
      // Adjust if we're near the end
      if (currentPage > totalPages - 3) {
        start = Math.max(1, totalPages - 4);
      }
      
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
    }
    
    return pages;
  };

  const visiblePages = getVisiblePages();

  // Calculate record range if provided
  const showRecordInfo = totalRecords !== undefined && recordsPerPage !== undefined;
  const startRecord = showRecordInfo && totalRecords > 0 ? (currentPage - 1) * recordsPerPage + 1 : 0;
  const endRecord = showRecordInfo ? Math.min(currentPage * recordsPerPage, totalRecords) : 0;

  // If showing record info, wrap in container. Otherwise, just show controls
  if (showRecordInfo) {
    return (
      <div className={`px-6 py-4 border-t border-gray-100 flex items-center justify-between ${className}`}>
        {/* Left side - Record count text */}
        <div className="text-sm text-gray-700">
          Mostrando {startRecord} - {endRecord} de {totalRecords} registros
        </div>

        {/* Right side - Pagination controls */}
        <div className="flex items-center gap-2">
        {/* Previous Button */}
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className={`w-8 h-8 flex items-center justify-center rounded-lg border transition-all ${
            currentPage === 1
              ? 'border-gray-200 bg-gray-50 text-gray-300 cursor-not-allowed'
              : 'border-gray-300 bg-white text-gray-600 hover:bg-gray-50 hover:border-gray-400'
          }`}
          aria-label="Página anterior"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {/* Page Numbers */}
        {visiblePages.map((page) => (
          <button
            key={page}
            onClick={() => onPageChange(page)}
            className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm font-medium transition-all ${
              page === currentPage
                ? 'bg-pink-500 text-white shadow-sm'
                : 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-400'
            }`}
            aria-label={`Página ${page}`}
            aria-current={page === currentPage ? 'page' : undefined}
          >
            {page}
          </button>
        ))}

          {/* Next Button */}
          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage >= totalPages}
            className={`w-8 h-8 flex items-center justify-center rounded-lg border transition-all ${
              currentPage >= totalPages
                ? 'border-gray-200 bg-gray-50 text-gray-300 cursor-not-allowed'
                : 'border-gray-300 bg-white text-gray-600 hover:bg-gray-50 hover:border-gray-400'
            }`}
            aria-label="Página siguiente"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  // Without record info, just show the controls centered
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Previous Button */}
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className={`w-8 h-8 flex items-center justify-center rounded-lg border transition-all ${
          currentPage === 1
            ? 'border-gray-200 bg-gray-50 text-gray-300 cursor-not-allowed'
            : 'border-gray-300 bg-white text-gray-600 hover:bg-gray-50 hover:border-gray-400'
        }`}
        aria-label="Página anterior"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>

      {/* Page Numbers */}
      {visiblePages.map((page) => (
        <button
          key={page}
          onClick={() => onPageChange(page)}
          className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm font-medium transition-all ${
            page === currentPage
              ? 'bg-pink-500 text-white shadow-sm'
              : 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-400'
          }`}
          aria-label={`Página ${page}`}
          aria-current={page === currentPage ? 'page' : undefined}
        >
          {page}
        </button>
      ))}

      {/* Next Button */}
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage >= totalPages}
        className={`w-8 h-8 flex items-center justify-center rounded-lg border transition-all ${
          currentPage >= totalPages
            ? 'border-gray-200 bg-gray-50 text-gray-300 cursor-not-allowed'
            : 'border-gray-300 bg-white text-gray-600 hover:bg-gray-50 hover:border-gray-400'
        }`}
        aria-label="Página siguiente"
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}
