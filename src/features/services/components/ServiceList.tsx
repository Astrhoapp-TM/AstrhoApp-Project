import React, { useState, useEffect } from 'react';
import {
  Scissors, Droplets, Sparkles, Heart, Clock, Search,
  Eye, ChevronLeft, ChevronRight, Filter, Calendar, X,
  Star, FileText, CheckCircle, DollarSign
} from 'lucide-react';

import { toast } from 'sonner';
import { serviceService, Service as APIService } from '../services/serviceService';

const categories = ['Todos', 'Cortes', 'Tratamientos', 'Coloración', 'Peinados', 'Cuidado Corporal', 'Tratamientos Faciales', 'Extensiones'];

interface ServicesProps {
  onBookAppointment: (selectedService?: any) => void;
}

export function ServiceList({ onBookAppointment }: ServicesProps) {
  const [services, setServices] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('Todos');
  const [selectedService, setSelectedService] = useState<any>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [favorites, setFavorites] = useState<number[]>([]);

  // Paginación
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(3); // Cambiado de 6 a 3 para forzar la paginación si hay pocos servicios
  const [totalRecords, setTotalRecords] = useState(0);

  const mapAPIServiceToUI = (service: any) => {
    return {
      id: service.servicioId || service.ServicioId || service.id,
      name: service.nombre || service.Nombre || 'Sin nombre',
      description: service.descripcion || service.Descripcion || '',
      price: service.precio || service.Precio || 0,
      duration: service.duracion || service.Duracion || 0,
      rating: 5.0, // Default rating
      reviews: Math.floor(Math.random() * 50) + 10,
      icon: Scissors,
      color: 'from-pink-400 to-rose-500',
      category: service.categoriaNombre || service.CategoriaNombre || 'General',
      isActive: (service.estado !== undefined ? service.estado : (service.Estado !== undefined ? service.Estado : (service.activo !== undefined ? service.activo : service.Activo)))
    };
  };

  const fetchServices = async () => {
    setIsLoading(true);
    try {
      // Usar los parámetros de paginación de la API
      const data = await serviceService.getServices({
        page: currentPage,
        pageSize: itemsPerPage,
        search: searchTerm || undefined
      });

      console.log('Raw API Data:', data);

      let servicesArray = [];
      let total = 0;

      if (Array.isArray(data)) {
        servicesArray = data;
        total = data.length;
      } else if (data && typeof data === 'object') {
        // Soporte para PaginatedResponse { data, totalCount, pageNumber, totalPages }
        servicesArray = (data as any).data || (data as any).$values || [];
        total = (data as any).totalCount || (data as any).total || servicesArray.length;
      }

      console.log('Services API Data (Processed):', servicesArray, 'Total:', total);
      setServices(servicesArray.map(mapAPIServiceToUI));
      setTotalRecords(total);
    } catch (error) {
      console.error('Error fetching services:', error);
      toast.error('Error al cargar servicios');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchServices();
  }, [currentPage, searchTerm, filterCategory]);

  // Resetear la página a 1 cuando cambien los filtros
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterCategory]);

  // Filter services (Client-side secondary filter if needed, but primarily using API)
  const filteredServices = services.filter(service => {
    const matchesCategory = filterCategory === 'Todos' || service.category === filterCategory;

    // Robust isActive check
    const isActive = service.isActive === true ||
      service.isActive === 1 ||
      service.isActive === '1' ||
      service.isActive === 'Activo' ||
      service.isActive === 'activo' ||
      service.isActive === undefined;

    return matchesCategory && isActive;
  });

  // Paginación lógica (Ahora usamos directamente los servicios devueltos por la API)
  const totalPages = Math.ceil(totalRecords / itemsPerPage);
  // NOTA: No filtramos de nuevo paginatedServices aquí porque ya vienen paginados de la API
  // pero si el usuario tiene menos servicios que itemsPerPage, totalPages será 1 y la paginación no se verá.
  // Forzamos al menos 2 páginas para testear si hay datos suficientes o ajustamos itemsPerPage
  const paginatedServices = services;

  const handleServiceBooking = (service: any) => {
    onBookAppointment(service);
  };

  const handleViewDetails = (service: any) => {
    setSelectedService(service);
    setShowDetailModal(true);
  };

  const toggleFavorite = (serviceId: number) => {
    setFavorites((prev: number[]) =>
      prev.includes(serviceId)
        ? prev.filter(id => id !== serviceId)
        : [...prev, serviceId]
    );
  };

  return (
    <section id="services-section" className="py-20 bg-gradient-to-br from-pink-50/30 to-purple-50/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-gray-800 mb-4">
            Nuestros Servicios
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Ofrecemos una amplia gama de servicios de belleza profesionales
            con los mejores productos y técnicas del mercado
          </p>
        </div>

        {/* Services Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16 relative min-h-[400px]">
          {isLoading && (
            <div className="col-span-full py-20 flex justify-center items-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500"></div>
            </div>
          )}

          {!isLoading && paginatedServices.length > 0 ? (
            paginatedServices.map((service) => {
              // Determinar icono dinámicamente: tijeras para cortes/peinados, destellos/estrellas para uñas
              const nameLower = (service.name || '').toLowerCase();
              const categoryLower = (service.category || '').toLowerCase();
              const isCut = categoryLower.includes('corte') || 
                            categoryLower.includes('peinado') || 
                            categoryLower.includes('color') ||
                            nameLower.includes('corte') || 
                            nameLower.includes('tinte') || 
                            nameLower.includes('peinado') || 
                            nameLower.includes('barba');
              
              const MainIcon = isCut ? Scissors : Sparkles;
              const TopRightIcon = isCut ? Scissors : Sparkles;

              return (
                <div
                  key={service.id}
                  className="bg-white rounded-2xl shadow-md border-2 border-brand-pink/60 p-5 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 flex flex-col justify-between min-h-[190px] relative"
                >
                  <div>
                    {/* Header Row: Left Icon Box + Text/Category, Right: TopRightIcon */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        {/* Rounded Box with main icon */}
                        <div className="w-14 h-14 bg-pink-50 rounded-2xl flex items-center justify-center shrink-0 border border-pink-100/50 shadow-sm">
                          <MainIcon className="w-7 h-7 text-brand-pink" />
                        </div>
                        {/* Title and Category */}
                        <div>
                          <h3 className="font-extrabold text-gray-800 text-base leading-tight mb-1.5">
                            {service.name}
                          </h3>
                          <span className="text-[10px] font-bold px-2.5 py-0.5 bg-purple-50 text-purple-700 rounded-full uppercase tracking-wider">
                            {service.category}
                          </span>
                        </div>
                      </div>
                      
                      {/* Decorative top-right icon */}
                      <div className="text-brand-pink/70 pt-1">
                        <TopRightIcon className="w-5 h-5" />
                      </div>
                    </div>
                  </div>

                  {/* Price and Duration Row */}
                  <div>
                    <div className="border-t border-gray-100 pt-3 mb-3 flex items-center justify-between">
                      <div className="flex items-center space-x-1.5 text-gray-500">
                        <Clock className="w-4 h-4 text-brand-indigo" />
                        <span className="text-xs font-semibold">{service.duration} min</span>
                      </div>
                      <div className="font-black text-brand-indigo text-base">
                        ${service.price.toLocaleString()}
                      </div>
                    </div>

                    {/* Buttons */}
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleViewDetails(service)}
                        className="flex-1 py-2.5 border border-brand-periwinkle text-brand-indigo rounded-lg font-bold hover:bg-gray-50 transition-all flex items-center justify-center space-x-1.5 active:scale-95 text-xs"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Ver Más</span>
                      </button>
                      <button
                        onClick={() => handleServiceBooking(service)}
                        className={`flex-1 py-2.5 bg-gradient-to-r ${service.color} text-white rounded-lg font-bold hover:shadow-md transition-all flex items-center justify-center space-x-1.5 active:scale-95 text-xs`}
                      >
                        <Calendar className="w-3.5 h-3.5" />
                        <span>Agendar</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="col-span-full text-center py-20">
              <div className="bg-white/50 backdrop-blur-sm rounded-3xl p-12 border border-gray-200">
                <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Scissors className="w-10 h-10 text-brand-pink" />
                </div>
                <h3 className="text-2xl font-bold text-gray-800 mb-4">
                  No se encontraron servicios
                </h3>
                <p className="text-gray-600 mb-8 max-w-md mx-auto">
                  Actualmente no hay servicios disponibles en esta categoría o que coincidan con tu búsqueda.
                </p>
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setFilterCategory('Todos');
                  }}
                  className="bg-gradient-brand text-white px-8 py-3 rounded-xl font-semibold hover:shadow-lg transition-all"
                >
                  Ver Todos los Servicios
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Paginación Mejorada para Landing */}
        {!isLoading && totalPages > 1 && (
          <div className="flex justify-center items-center space-x-2 mb-16">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className={`flex items-center space-x-1 px-4 py-2 rounded-xl border-2 transition-all duration-300 ${currentPage === 1
                ? 'border-gray-100 text-gray-300 cursor-not-allowed bg-gray-50/50'
                : 'border-brand-periwinkle text-brand-pink hover:bg-pink-500 hover:text-white hover:border-pink-500 active:scale-95 shadow-sm hover:shadow-pink-200'
                }`}
            >
              <ChevronLeft className="w-5 h-5" />
              <span className="hidden sm:inline font-bold text-sm">Anterior</span>
            </button>

            <div className="flex items-center bg-white p-1.5 rounded-2xl border-2 border-pink-50 shadow-inner space-x-1">
              {Array.from({ length: totalPages }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentPage(i + 1)}
                  className={`min-w-[40px] h-10 px-3 rounded-xl font-black text-sm transition-all duration-300 flex items-center justify-center ${currentPage === i + 1
                    ? 'bg-gradient-brand text-white shadow-lg shadow-pink-200 scale-105'
                    : 'text-gray-500 hover:bg-gray-100 hover:text-brand-indigo hover:scale-110 active:scale-90'
                    }`}
                >
                  {i + 1}
                </button>
              ))}
            </div>

            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className={`flex items-center space-x-1 px-4 py-2 rounded-xl border-2 transition-all duration-300 ${currentPage === totalPages
                ? 'border-gray-100 text-gray-300 cursor-not-allowed bg-gray-50/50'
                : 'border-brand-periwinkle text-brand-pink hover:bg-pink-500 hover:text-white hover:border-pink-500 active:scale-95 shadow-sm hover:shadow-pink-200'
                }`}
            >
              <span className="hidden sm:inline font-bold text-sm">Siguiente</span>
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        )}



      </div>

      {/* Service Detail Modal */}
      {showDetailModal && selectedService && (
        <ServiceDetailModal
          service={selectedService}
          onClose={() => setShowDetailModal(false)}
          onBookAppointment={handleServiceBooking}
        />
      )}
    </section>
  );
}

// Service Detail Modal Component
interface ServiceDetailModalProps {
  service: any;
  onClose: () => void;
  onBookAppointment: (service: any) => void;
}

function ServiceDetailModal({ service, onClose, onBookAppointment }: any) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header - Fixed at top */}
        <div className={`bg-gradient-to-r ${service.color} p-5 text-white shrink-0 shadow-md z-20`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                {React.createElement(service.icon, { className: "w-6 h-6 text-white" })}
              </div>
              <div>
                <h3 className="text-xl font-bold leading-tight">Detalle del Servicio</h3>
                <p className="text-white/80 text-sm">{service.name}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-9 h-9 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/30 hover:scale-110 active:scale-95 transition-all shadow-sm"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 lg:p-8 bg-gray-50/30 no-scrollbar">
          <style>{`
            .no-scrollbar::-webkit-scrollbar { display: none; }
            .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
          `}</style>

          <div className="max-w-4xl mx-auto space-y-6">
            {/* Info Cards Row */}
            <div className="grid md:grid-cols-3 gap-4">
              {/* Service Info Card */}
              <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                <div className="flex items-center space-x-2 text-brand-violet mb-3">
                  <Scissors className="w-4 h-4" />
                  <h4 className="font-bold uppercase text-[10px] tracking-widest">Información del Servicio</h4>
                </div>
                <div className="mb-1">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">Nombre:</span>
                  <p className="font-bold text-gray-800 text-lg mb-1 truncate">{service.name}</p>
                </div>
                <div className="flex items-center space-x-2 text-gray-500">
                  <span className="text-xs font-mono bg-gray-100 px-2 py-0.5 rounded-md">{service.category}</span>
                </div>
              </div>

              {/* Pricing Card */}
              <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                <div className="flex items-center space-x-2 text-brand-pink mb-3">
                  <Search className="w-4 h-4" />
                  <h4 className="font-bold uppercase text-[10px] tracking-widest">Inversión y Tiempo</h4>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Precio:</span>
                    <span className="font-bold text-green-600 text-lg">${service.price.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Duración:</span>
                    <span className="font-bold text-blue-600">{service.duration}</span>
                  </div>
                </div>
              </div>

              {/* Status/Rating Card */}
              <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex flex-col items-center justify-center">
                <div className="flex items-center space-x-1 mb-2">
                  <Sparkles className="w-4 h-4 text-yellow-400" />
                  <Sparkles className="w-4 h-4 text-yellow-400" />
                  <Sparkles className="w-4 h-4 text-yellow-400" />
                  <Sparkles className="w-4 h-4 text-yellow-400" />
                  <Sparkles className="w-4 h-4 text-gray-200" />
                </div>
                <span className="font-black uppercase text-[10px] tracking-[0.2em] text-gray-500">
                  Popularidad: Alta
                </span>
              </div>
            </div>

            {/* Description Section */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-6 py-4 bg-gray-50/50 border-b border-gray-100">
                <h4 className="font-bold text-gray-700 text-sm flex items-center space-x-2">
                  <Scissors className="w-4 h-4 text-purple-400" />
                  <span>Descripción del Servicio</span>
                </h4>
              </div>
              <div className="p-6">
                <p className="text-gray-700 italic leading-relaxed">
                  "{service.description}"
                </p>
              </div>
            </div>

            {/* Benefits Section */}
            <div className="bg-gradient-to-r from-pink-50 to-purple-50 rounded-2xl p-6 border border-gray-200 shadow-sm">
              <h4 className="font-bold text-gray-800 mb-4 flex items-center text-sm">
                <Heart className="w-4 h-4 mr-2 text-brand-pink" />
                ¿Qué incluye este servicio?
              </h4>
              <ul className="grid md:grid-cols-2 gap-3">
                {['Atención personalizada', 'Productos de alta calidad', 'Ambiente relajante', 'Garantía de satisfacción'].map((benefit, i) => (
                  <li key={i} className="flex items-center space-x-2 text-sm text-gray-600">
                    <Sparkles className="w-4 h-4 text-green-500" />
                    <span>{benefit}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Footer - Fixed at bottom */}
        <div className="p-5 bg-white border-t border-gray-100 flex flex-wrap gap-3 justify-end shrink-0 z-20">
          <button
            onClick={onClose}
            className="px-8 py-2.5 rounded-xl font-black text-gray-500 hover:bg-gray-200 hover:text-gray-800 active:scale-95 transition-all text-sm uppercase tracking-widest shadow-sm"
          >
            Cerrar
          </button>
          <button
            onClick={() => {
              onBookAppointment(service);
              onClose();
            }}
            className={`px-8 py-2.5 bg-gradient-to-r ${service.color} text-white rounded-xl font-black hover:shadow-lg hover:scale-105 active:scale-95 transition-all text-sm uppercase tracking-widest flex items-center space-x-2 shadow-sm`}
          >
            <Calendar className="w-5 h-5" />
            <span>Agendar Ahora</span>
          </button>
        </div>
      </div>
    </div>
  );
}