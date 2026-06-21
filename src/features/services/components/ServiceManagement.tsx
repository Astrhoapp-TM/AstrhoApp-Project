import React, { useState, useEffect } from 'react';
import {
  Scissors, Plus, Edit, Trash2, Eye, Search, Filter, Clock, DollarSign,
  Package, X, Save, AlertCircle, TrendingUp, Calendar, Tag, Star, Users,
  CheckCircle, FileText, RefreshCw, Loader2, Info
} from 'lucide-react';
import { toast } from 'sonner';
import { serviceService, type Service as APIService } from '../services/serviceService';
import { SimplePagination } from '@/shared/components/ui/simple-pagination';
import { cn } from '@/shared/components/ui/utils';
import { useLoading } from '@/shared/contexts/LoadingContext';
import { SectionLoader } from '@/shared/components/GlobalLoader';

export function ServiceManagement({ hasPermission }: ServiceManagementProps) {
  const [services, setServices] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { showSectionLoading, hideSectionLoading } = useLoading();
  const [selectedService, setSelectedService] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(5);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [alert, setAlert] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  const showAlert = (type: 'success' | 'error' | 'info', message: string) => {
    setAlert({ type, message });
    setTimeout(() => setAlert(null), 4000);
  };

  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorModalMessage, setErrorModalMessage] = useState('');

  // Map API Service to UI model
  const mapServiceToUI = (service: any) => {
    return {
      id: service.servicioId || service.ServicioId || service.id,
      name: service.nombre || service.Nombre || 'Sin nombre',
      description: service.descripcion || service.Descripcion || '',
      price: service.precio || service.Precio || 0,
      duration: service.duracion || service.Duracion || 0,
      status: (service.estado !== undefined ? service.estado : (service.Estado !== undefined ? service.Estado : (service.activo !== undefined ? service.activo : service.Activo))) ? 'active' : 'inactive',
      updatedAt: (service.fechaActualizacion || service.FechaActualizacion || service.fechaCreacion || service.FechaCreacion || '').split('T')[0] || new Date().toISOString().split('T')[0]
    };
  };

  const fetchServices = async () => {
    setIsLoading(true);
    try {
      showSectionLoading("Obteniendo catálogo de servicios...");
      const response = await serviceService.getServices({
        page: currentPage,
        pageSize: itemsPerPage,
        search: searchTerm
      });

      console.log('Services API Data Raw:', response);

      // El backend ahora devuelve un objeto PaginatedResponse
      const servicesArray = response.data || [];
      setTotalCount(response.totalCount || 0);
      setTotalPages(response.totalPages || 0);

      setServices(servicesArray.map(mapServiceToUI));
    } catch (error) {
      console.error('Error fetching services:', error);
      setErrorModalMessage('Error al cargar la lista de servicios. Por favor, intente de nuevo.');
      setShowErrorModal(true);
    } finally {
      setIsLoading(false);
      hideSectionLoading();
    }
  };

  useEffect(() => {
    fetchServices();
  }, [currentPage, searchTerm]); // Se ejecuta cuando cambia la página o el término de búsqueda

  // Auto-hide success alert after 4 seconds
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  // Ya no filtramos en el cliente, usamos lo que viene de la API
  const paginatedServices = services;

  const goToPreviousPage = () => {
    setCurrentPage(prev => Math.max(prev - 1, 1));
  };

  const goToNextPage = () => {
    setCurrentPage(prev => Math.min(prev + 1, totalPages));
  };

  const handleViewDetail = async (service: any) => {
    try {
      showSectionLoading("Cargando detalle del servicio...");
      setIsLoading(true);
      const fullService = await serviceService.getServiceById(service.id);
      setSelectedService(mapServiceToUI(fullService));
      setShowDetailModal(true);
    } catch (error) {
      console.error('Error fetching service detail:', error);
      toast.error('No se pudo cargar el detalle del servicio');
    } finally {
      setIsLoading(false);
      hideSectionLoading();
    }
  };

  const handleEditService = (service: any) => {
    setSelectedService(service);
    setShowEditModal(true);
  };

  const handleDeleteService = (service: any) => {
    setSelectedService(service);
    setShowDeleteModal(true);
  };

  const confirmDeleteService = async () => {
    try {
      showSectionLoading("Eliminando servicio...");
      await serviceService.deleteService(selectedService.id);
      setServices(services.filter(s => s.id !== selectedService.id));
      setShowDeleteModal(false);
      setSelectedService(null);
      showAlert('success', `Servicio "${selectedService.name}" eliminado exitosamente`);
    } catch (error) {
      console.error('Error deleting service:', error);
      setErrorModalMessage('No se pudo eliminar el servicio. Es posible que existan dependencias.');
      setShowErrorModal(true);
    } finally {
      hideSectionLoading();
    }
  };

  const handleToggleServiceStatus = async (serviceId: number) => {
    const service = services.find(s => s.id === serviceId);
    if (!service) return;

    try {
      showSectionLoading("Cambiando estado...");
      const updatedStatus = service.status === 'active' ? false : true;

      // Usar mapUIToFormData en lugar de JSON para asegurar compatibilidad con el backend
      const updatedUiData = {
        ...service,
        status: updatedStatus ? 'active' : 'inactive'
      };

      const formData = mapUIToFormData(updatedUiData, serviceId);

      console.log('Sending status update payload via FormData');
      const result = await serviceService.updateService(serviceId, formData);

      setServices(services.map(s =>
        s.id === serviceId
          ? mapServiceToUI(result)
          : s
      ));

      showAlert('success', `Estado de "${service.name}" actualizado a $`);
    } catch (error) {
      console.error('Error toggling service status:', error);
      setErrorModalMessage('Error al cambiar el estado del servicio. Verifique su conexión.');
      setShowErrorModal(true);
    } finally {
      hideSectionLoading();
    }
  };

  const mapUIToFormData = (uiData: any, id?: number): FormData => {
    const formData = new FormData();

    // Usar PascalCase para compatibilidad con backend .NET (Somee)
    formData.append('Nombre', uiData.name || '');
    formData.append('nombre', uiData.name || '');
    formData.append('Descripcion', uiData.description || '');
    formData.append('descripcion', uiData.description || '');
    formData.append('Precio', String(uiData.price || 0));
    formData.append('precio', String(uiData.price || 0));
    formData.append('Duracion', String(uiData.duration || 0));
    formData.append('duracion', String(uiData.duration || 0));

    const isStatusActive = uiData.status === 'active' || uiData.status === true;
    formData.append('Estado', String(isStatusActive));
    formData.append('estado', String(isStatusActive));
    formData.append('Activo', String(isStatusActive));
    formData.append('activo', String(isStatusActive));

    // Incluir ID (requerido para PUT)
    if (id !== undefined) {
      formData.append('ServicioId', String(id));
      formData.append('servicioId', String(id));
      formData.append('Id', String(id));
    }

    return formData;
  };

  const handleSaveService = async (serviceData: any) => {
    try {
      showSectionLoading("Guardando cambios...");
      if (selectedService) {
        // Edit existing service
        const formData = mapUIToFormData(serviceData, selectedService.id);
        const result = await serviceService.updateService(selectedService.id, formData);

        setServices(services.map(s =>
          s.id === selectedService.id
            ? mapServiceToUI(result)
            : s
        ));
        showAlert('success', `Servicio "${serviceData.name}" actualizado exitosamente`);
      } else {
        // Create new service
        const formData = mapUIToFormData(serviceData);
        const result = await serviceService.createService(formData);

        setServices([mapServiceToUI(result), ...services]);
        showAlert('success', `Servicio "${serviceData.name}" creado exitosamente`);
      }
      setShowEditModal(false);
    } catch (error: any) {
      console.error('Error saving service:', error);
      const isDuplicate = error.message?.toLowerCase().includes('ya existe') ||
        error.message?.toLowerCase().includes('already') ||
        error.message?.includes('400') ||
        error.message?.toLowerCase().includes('duplicate');

      setErrorModalMessage(isDuplicate
        ? 'Este registro ya existe. por favor ingrese otro diferente'
        : (error.message || 'Error al guardar el servicio. Verifique los datos.'));
      setShowErrorModal(true);
    } finally {
      hideSectionLoading();
    }
  };

  const handleCreateService = () => {
    setSelectedService(null);
    setShowEditModal(true);
  };



  // Calculate stats
  const totalServices = services.length;
  const activeServices = services.filter(s => s.status === 'active').length;


  return (
    <React.Fragment>
      {/* Notification Banner */}
      {alert && (
        <div className="fixed bottom-6 right-6 z-[9999] animate-in slide-in-from-right-5 duration-300">
          <div className={cn(
            "text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center space-x-4 min-w-[320px] bg-gradient-to-r",
            alert.type === 'success' ? "from-pink-400 to-purple-500" :
              alert.type === 'error' ? "from-red-500 to-pink-600" :
                "from-blue-400 to-indigo-500"
          )}>
            <div className="flex-shrink-0">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                {alert.type === 'success' && <CheckCircle className="w-6 h-6 text-white" />}
                {alert.type === 'error' && <AlertCircle className="w-6 h-6 text-white" />}
                {alert.type === 'info' && <Info className="w-6 h-6 text-white" />}
              </div>
            </div>
            <div className="flex-1">
              <p className="font-semibold">{alert.message}</p>
            </div>
            <button
              onClick={() => setAlert(null)}
              className="flex-shrink-0 w-8 h-8 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      <div className="p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl font-bold text-gray-800">Gestión de Servicios</h2>
            <p className="text-gray-600">
              Administra todos los servicios ofrecidos en el salón
            </p>
          </div>
        </div>

        {/* Search and Register */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="w-full md:max-w-md relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Buscar servicios por nombre o descripción..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-periwinkle/300 focus:border-transparent"
              />
            </div>

            <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
              <button
                onClick={fetchServices}
                disabled={isLoading}
                className="p-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors flex items-center justify-center disabled:opacity-50"
                title="Recargar datos"
              >
                <RefreshCw className={cn("w-5 h-5", isLoading && "animate-spin")} />
              </button>

              {hasPermission('manage_services') && (
                <button
                  onClick={handleCreateService}
                  className="w-full md:w-auto bg-gradient-brand text-white px-6 py-3 rounded-xl font-semibold hover:shadow-lg transition-all flex items-center justify-center space-x-2 whitespace-nowrap"
                >
                  <Plus className="w-5 h-5" />
                  <span>Registrar Servicio</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Services Table */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-6 border-b border-gray-100">
            <h3 className="text-xl font-bold text-gray-800">Lista de Servicios</h3>
            <p className="text-gray-600">
              {totalCount} servicio{totalCount !== 1 ? 's' : ''} encontrado{totalCount !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left font-semibold text-gray-800">Servicio</th>
                  <th className="px-6 py-4 text-left font-semibold text-gray-800">Duración</th>
                  <th className="px-6 py-4 text-left font-semibold text-gray-800">Precio</th>
                  <th className="px-6 py-4 text-left font-semibold text-gray-800">Estado</th>
                  <th className="px-6 py-4 text-left font-semibold text-gray-800">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paginatedServices.length === 0 && !isLoading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-16 text-center">
                      <div className="flex flex-col items-center">
                        <Scissors className="w-16 h-16 text-gray-300 mb-4" />
                        <p className="text-gray-600 font-semibold text-lg">No hay servicios registrados</p>
                        <p className="text-gray-400 text-sm mt-2">Comienza a registrar servicios para verlos aquí</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedServices.map((service) => (
                    <tr key={service.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-800">{service.name}</div>
                        <div className="text-sm text-gray-600">{service.updatedAt}</div>
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-2">
                          <Clock className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-800">{service.duration} min</span>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <div className="font-bold text-green-600">
                          ${service.price.toLocaleString()}
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-3">
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={service.status === 'active'}
                              onChange={() => handleToggleServiceStatus(service.id)}
                              className="sr-only peer"
                              disabled={!hasPermission('manage_services')}
                            />
                            <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-brand-periwinkle/300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-pink-400 peer-checked:to-purple-500"></div>

                          </label>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleViewDetail(service)}
                            className="p-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                            title="Ver detalle"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {hasPermission('manage_services') && (
                            <>
                              <button
                                onClick={() => handleEditService(service)}
                                disabled={service.status === 'inactive'}
                                className={cn(
                                  "p-2 rounded-lg transition-colors",
                                  service.status === 'inactive'
                                    ? "bg-gray-100 text-gray-400 cursor-not-allowed opacity-50"
                                    : "bg-green-100 text-green-700 hover:bg-green-200"
                                )}
                                title={service.status === 'inactive' ? "No se puede editar un servicio inactivo" : "Editar"}
                              >
                                <Edit className="w-4 h-4" />
                              </button>

                              <button
                                onClick={() => handleDeleteService(service)}
                                disabled={service.status === 'inactive'}
                                className={cn(
                                  "p-2 rounded-lg transition-colors",
                                  service.status === 'inactive'
                                    ? "bg-gray-100 text-gray-400 cursor-not-allowed opacity-50"
                                    : "bg-gray-100 text-brand-pink hover:bg-red-200"
                                )}
                                title={service.status === 'inactive' ? "No se puede eliminar un servicio inactivo" : "Eliminar"}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50">
            <SimplePagination
              totalPages={totalPages}
              currentPage={currentPage}
              onPageChange={setCurrentPage}
              totalRecords={totalCount}
              recordsPerPage={itemsPerPage}
            />
          </div>
        </div>

        {/* Modals */}
        {showDetailModal && (
          <ServiceDetailModal
            service={selectedService}
            onClose={() => setShowDetailModal(false)}
          />
        )}

        {showEditModal && (
          <ServiceEditModal
            service={selectedService}
            onClose={() => setShowEditModal(false)}
            onSave={handleSaveService}
          />
        )}

        {showDeleteModal && (
          <DeleteConfirmationModal
            service={selectedService}
            onClose={() => setShowDeleteModal(false)}
            onConfirm={confirmDeleteService}
          />
        )}



        {/* Error Modal */}
        {showErrorModal && (
          <ErrorModal
            message={errorModalMessage}
            onClose={() => setShowErrorModal(false)}
          />
        )}
      </div>
    </React.Fragment>
  );
}

// Error Modal Component
function ErrorModal({ message, onClose }: { message: string, onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[3000] flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md animate-in zoom-in-95 duration-200">
        <div className="p-8 text-center">
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-10 h-10 text-brand-pink" />
          </div>
          <h3 className="text-2xl font-bold text-gray-800 mb-2">¡Ups! Algo salió mal</h3>
          <p className="text-gray-600 mb-8">{message}</p>
          <button
            onClick={onClose}
            className="w-full bg-gradient-to-r from-red-400 to-red-500 text-white px-6 py-4 rounded-xl font-bold shadow-lg hover:shadow-xl transition-all"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
}

// Service Detail Modal Component
function ServiceDetailModal({ service, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header - Fixed at top */}
        <div className="bg-gradient-brand p-5 text-white shrink-0 shadow-md z-20">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <Scissors className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold leading-tight">Detalle del Servicio</h3>
                <p className="text-pink-50 text-[10px] font-black tracking-widest mt-0.5">ID: {service.id}</p>
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


            {/* Info & Description Grid */}
            <div className="grid md:grid-cols-3 gap-4 pb-4">
              {/* Column 1: General Info */}
              <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex flex-col h-full">
                <div className="flex items-center space-x-2 text-brand-violet mb-3">
                  <Tag className="w-4 h-4" />
                  <h4 className="font-bold text-[10px] tracking-widest">General</h4>
                </div>
                <p className="font-bold text-gray-800 text-lg mb-2 truncate">
                  {service.name}
                </p>
                <div className="mt-auto">

                </div>
              </div>

              {/* Column 2: Pricing & Time Card */}
              <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex flex-col h-full">
                <div className="flex items-center space-x-2 text-brand-pink mb-3">
                  <Clock className="w-4 h-4" />
                  <h4 className="font-bold text-[10px] tracking-widest">Detalles</h4>
                </div>
                <div className="space-y-4 mt-2">
                  <div className="flex justify-between items-center pb-2 border-b border-gray-50">
                    <span className="text-gray-400 text-[10px] font-bold tracking-tight">Duración:</span>
                    <span className="font-bold text-gray-700">{service.duration} min</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400 text-[10px] font-bold tracking-tight">Precio:</span>
                    <span className="font-bold text-green-600 text-lg">${service.price.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Column 3: Description Section */}
              <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex flex-col h-full">
                <div className="flex items-center space-x-2 text-blue-500 mb-3">
                  <FileText className="w-4 h-4" />
                  <h4 className="font-bold text-[10px] tracking-widest">Descripción</h4>
                </div>
                <div className="flex-1 overflow-y-auto no-scrollbar max-h-[120px]">
                  <p className="text-gray-600 text-xs leading-relaxed italic">
                    {service.description || 'Sin descripción adicional.'}
                  </p>
                </div>
              </div>
            </div>

            {/* Resumen Card */}
            <div className="bg-gradient-to-br from-pink-50 to-purple-50 rounded-3xl p-6 border border-gray-200 shadow-sm">
              <div className="flex items-center space-x-3 mb-3">
                <Star className="w-5 h-5 text-brand-pink" />
                <h4 className="font-black text-[10px] tracking-[0.2em] text-gray-700">Resumen del Servicio</h4>
              </div>
              <p className="text-sm text-gray-600 italic leading-relaxed">
                Este servicio forma parte del catálogo oficial de AsthroApp. Los precios y duraciones son aproximados y pueden variar según la complejidad.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-5 bg-white border-t border-gray-100 flex justify-end shrink-0 z-20">
          <button
            onClick={onClose}
            className="px-8 py-2.5 rounded-xl font-black text-gray-500 hover:bg-gray-200 hover:text-gray-800 active:scale-95 transition-all text-sm tracking-widest shadow-sm"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}

const handlePriceChange = (value: string): number => {
  // Eliminar todo lo que no sea dígito
  let cleanValue = value.replace(/\D/g, '');
  
  // Eliminar ceros iniciales
  cleanValue = cleanValue.replace(/^0+/, '');
  
  // Limitar a 6 dígitos
  if (cleanValue.length > 6) {
    cleanValue = cleanValue.slice(0, 6);
  }
  
  return parseInt(cleanValue, 10) || 0;
};

// Service Edit Modal Component
function ServiceEditModal({ service, onClose, onSave }) {
  const [formData, setFormData] = useState({
    name: service?.name || '',
    description: service?.description || '',
    duration: service?.duration || 30,
    price: service?.price || 0,
    status: service?.status || 'active'
  });

  const [errors, setErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);

  // Función de validación por campo
  const validateField = (name: string, value: any): string => {
    switch (name) {
      case 'name':
        if (!value.trim()) return 'El nombre es requerido';
        return '';
      case 'description':
        if (!value.trim()) return 'La descripción es requerida';
        return '';
      case 'duration':
        if (value <= 0) return 'La duración debe ser mayor a 0';
        return '';
      case 'price':
        if (value <= 0) return 'El precio debe ser mayor a 0';
        if (value.toString().length > 6) return 'El precio no puede exceder los 6 caracteres';
        return '';
      default:
        return '';
    }
  };

  // Handle Blur para validar al perder el foco
  const handleBlur = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    const error = validateField(name, ['duration', 'price'].includes(name) ? parseFloat(value) || 0 : value);
    if (error) {
      setErrors(prev => ({ ...prev, [name]: error }));
    }
  };

  // Handle Key Down para restricciones de entrada
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const { name } = e.currentTarget;
    
    // Permitir teclas de control
    if (['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) {
      return;
    }
    
    // Permitir Ctrl+A, Ctrl+C, etc.
    if ((e.ctrlKey || e.metaKey) && ['a', 'c', 'v', 'x'].includes(e.key.toLowerCase())) {
      return;
    }
    
    // Para duration y price solo números y punto decimal (o enteros para price)
    if (['duration', 'price'].includes(name)) {
      if (name === 'price') {
        if (!/^[0-9]$/.test(e.key)) {
          e.preventDefault();
          return;
        }
        if (e.currentTarget.value.replace(/\D/g, '').length >= 6) {
          const selectionStart = e.currentTarget.selectionStart;
          const selectionEnd = e.currentTarget.selectionEnd;
          if (selectionStart === null || selectionEnd === null || selectionStart === selectionEnd) {
            e.preventDefault();
          }
        }
      } else {
        if (!/^[0-9.]$/.test(e.key)) {
          e.preventDefault();
          return;
        }
        // No permitir más de un punto decimal
        if (e.key === '.' && e.currentTarget.value.includes('.')) {
          e.preventDefault();
          return;
        }
      }
    }
  };

  // Handle Paste para sanitizar
  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const { name } = e.currentTarget;
    
    if (name === 'price') {
      e.preventDefault();
      const pastedText = e.clipboardData.getData('text');
      const sanitized = pastedText.replace(/\D/g, '');
      
      const currentValue = e.currentTarget.value;
      const selectionStart = e.currentTarget.selectionStart ?? 0;
      const selectionEnd = e.currentTarget.selectionEnd ?? 0;
      
      let newValue = currentValue.substring(0, selectionStart) + sanitized + currentValue.substring(selectionEnd);
      newValue = newValue.replace(/\D/g, '').slice(0, 6);
      const parsedValue = parseInt(newValue, 10) || 0;
      
      setFormData(prev => ({
        ...prev,
        price: parsedValue
      }));
      
      const error = validateField(name, parsedValue);
      setErrors(prev => ({ ...prev, [name]: error }));
    } else if (name === 'duration') {
      e.preventDefault();
      const pastedText = e.clipboardData.getData('text');
      const sanitized = pastedText.replace(/[^0-9.]/g, '');
      const dotIndex = sanitized.indexOf('.');
      let finalValue = sanitized;
      if (dotIndex !== -1) {
        finalValue = sanitized.substring(0, dotIndex + 1) + sanitized.substring(dotIndex + 1).replace(/\./g, '');
      }
      const currentValue = e.currentTarget.value;
      const newValue = currentValue + finalValue;
      
      const error = validateField(name, parseFloat(newValue) || 0);
      setErrors(prev => ({ ...prev, [name]: error }));
      handleInputChange({ target: { name, value: newValue } });
    }
  };



  const handleSubmit = async (e) => {
    e.preventDefault();

    const newErrors: Record<string, string> = {};
    const nameErr = validateField('name', formData.name);
    if (nameErr) newErrors.name = nameErr;
    const descErr = validateField('description', formData.description);
    if (descErr) newErrors.description = descErr;
    const durationErr = validateField('duration', formData.duration);
    if (durationErr) newErrors.duration = durationErr;
    const priceErr = validateField('price', formData.price);
    if (priceErr) newErrors.price = priceErr;

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsSaving(true);
    try {
      await onSave(formData);
    } finally {
      setIsSaving(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    let processedValue = value;
    
    // Limitar caracteres
    if (['name', 'description'].includes(name)) {
      processedValue = value.slice(0, 100);
    } else if (['duration', 'price'].includes(name)) {
      if (name === 'price') {
        processedValue = handlePriceChange(value);
      } else {
        processedValue = parseFloat(value) || 0;
      }
    }
    
    setFormData({
      ...formData,
      [name]: processedValue
    });

    // Validación en tiempo real
    const error = validateField(name, processedValue);
    if (error) {
      setErrors(prev => ({ ...prev, [name]: error }));
    } else if (errors[name]) {
      setFormData(prev => ({ ...prev, [name]: processedValue })); // Just in case, ensuring value is set
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header - Fixed at top */}
        <div className="bg-gradient-brand p-5 text-white shrink-0 shadow-md z-20">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <Scissors className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold leading-tight">
                  {service ? 'Editar Servicio' : 'Registrar Nuevo Servicio'}
                </h3>
                <p className="text-pink-100 text-sm">
                  {service ? `Actualizando ${service.name}` : 'Complete la información del servicio'}
                </p>
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
        <form onSubmit={handleSubmit} id="service-form" className="flex-1 overflow-y-auto p-6 lg:p-8 bg-gray-50/30 no-scrollbar">
          <style>{`
            .no-scrollbar::-webkit-scrollbar { display: none; }
            .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
          `}</style>

          <div className="max-w-2xl mx-auto space-y-6">
            {/* Errors Notification */}
            {Object.keys(errors).length > 0 && (
              <div className="bg-gray-50 border border-red-200 text-brand-pink px-6 py-4 rounded-2xl flex items-center space-x-3 animate-in fade-in duration-300">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <p className="font-semibold text-sm">Por favor corrija los errores en el formulario</p>
              </div>
            )}

            {/* Basic Info Section */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-6 py-4 bg-gray-50/50 border-b border-gray-100 flex items-center space-x-2">
                <Tag className="w-4 h-4 text-brand-pink" />
                <h4 className="font-bold text-gray-700 text-sm tracking-wider">Información Básica</h4>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 tracking-widest mb-1 ml-1">Nombre del Servicio *</label>
                  <div className="relative">
                    <Scissors className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      onBlur={handleBlur}
                      className={`w-full pl-10 pr-4 py-3 bg-gray-50 border rounded-xl focus:ring-2 focus:ring-brand-periwinkle/300 focus:border-transparent transition-all outline-none ${errors.name ? 'border-red-300 ring-1 ring-red-100' : 'border-gray-200'
                        }`}
                      placeholder="Ej: Corte y Peinado"
                    />
                    {errors.name && (
                      <p className="text-[10px] text-brand-pink mt-1 ml-1">{errors.name}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 tracking-widest mb-1 ml-1">Duración (Minutos) *</label>
                    <div className="relative">
                      <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <input
                        type="number"
                        name="duration"
                        value={formData.duration}
                        onChange={handleInputChange}
                        onBlur={handleBlur}
                        onKeyDown={handleKeyDown}
                        onPaste={handlePaste}
                        className={`w-full pl-10 pr-4 py-3 bg-gray-50 border rounded-xl focus:ring-2 focus:ring-brand-periwinkle/300 focus:border-transparent transition-all outline-none ${errors.duration ? 'border-red-300 ring-1 ring-red-100' : 'border-gray-200'
                          }`}
                      />
                      {errors.duration && (
                        <p className="text-[10px] text-brand-pink mt-1 ml-1">{errors.duration}</p>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 tracking-widest mb-1 ml-1">Precio (COP) *</label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <input
                        type="text"
                        inputMode="numeric"
                        name="price"
                        value={formData.price === 0 ? '' : formData.price}
                        onChange={handleInputChange}
                        onBlur={handleBlur}
                        onKeyDown={handleKeyDown}
                        onPaste={handlePaste}
                        placeholder="0"
                        className={`w-full pl-10 pr-4 py-3 bg-gray-50 border rounded-xl focus:ring-2 focus:ring-brand-periwinkle/300 focus:border-transparent transition-all outline-none ${errors.price ? 'border-red-300 ring-1 ring-red-100' : 'border-gray-200'
                          }`}
                      />
                      {errors.price && (
                        <p className="text-[10px] text-brand-pink mt-1 ml-1">{errors.price}</p>
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-gray-400 tracking-widest mb-1 ml-1">Descripción del Servicio</label>
                  <div className="relative">
                    <FileText className="absolute left-3 top-3 text-gray-400 w-4 h-4" />
                    <textarea
                      name="description"
                      value={formData.description}
                      onChange={handleInputChange}
                      onBlur={handleBlur}
                      rows={3}
                      className={`w-full pl-10 pr-4 py-3 bg-gray-50 border rounded-xl focus:ring-2 focus:ring-brand-periwinkle/300 focus:border-transparent transition-all outline-none ${errors.description ? 'border-red-300 ring-1 ring-red-100' : 'border-gray-200'
                        }`}
                      placeholder="Describa el servicio..."
                    />
                    {errors.description && (
                      <p className="text-[10px] text-brand-pink mt-1 ml-1">{errors.description}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </form>

        {/* Footer - Fixed at bottom */}
        <div className="p-5 bg-white border-t border-gray-100 flex flex-wrap gap-3 justify-end shrink-0 z-20">
          <button
            type="button"
            onClick={onClose}
            className="px-8 py-2.5 rounded-xl font-black text-gray-500 hover:bg-gray-200 hover:text-gray-800 active:scale-95 transition-all text-sm tracking-widest shadow-sm"
            disabled={isSaving}
          >
            Cancelar
          </button>
          <button
            form="service-form"
            type="submit"
            disabled={isSaving}
            className="px-8 py-2.5 rounded-xl font-black text-white bg-gradient-brand active:scale-95 transition-all text-sm tracking-widest shadow-lg hover:shadow-pink-200 disabled:opacity-50 flex items-center space-x-2"
          >
            {isSaving ? <Clock className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>{service ? 'Actualizar' : 'Registrar'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

// Delete Confirmation Modal Component
function DeleteConfirmationModal({ service, onClose, onConfirm }) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-red-500 to-pink-600 p-5 text-white shrink-0 shadow-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm shadow-inner">
                <Trash2 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold leading-tight">Confirmar Eliminación</h3>
                <p className="text-red-100 text-xs font-medium">Esta acción no se puede deshacer</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-9 h-9 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/30 hover:scale-110 active:scale-95 transition-all shadow-sm"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>

        <div className="p-8">
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-red-100 rotate-3">
              <AlertCircle className="w-10 h-10 text-brand-pink -rotate-3" />
            </div>
            <h4 className="text-lg font-bold text-gray-800 mb-2">
              ¿Eliminar servicio "{service.name}"?
            </h4>
            <p className="text-sm text-gray-500 leading-relaxed mb-6">
              Estás a punto de eliminar este servicio de forma permanente.
              Esta acción afectará los registros históricos y la disponibilidad del servicio.
            </p>

            <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 flex items-center space-x-4">
              <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center">
                <Scissors className="w-6 h-6 text-brand-pink" />
              </div>
              <div className="text-left">
                <p className="text-[10px] font-black text-gray-400 tracking-widest">Servicio a eliminar</p>
                <p className="font-bold text-gray-700 line-clamp-1">{service.name}</p>
                <p className="text-[10px] text-gray-400">Duración: {service.duration} min | ${service.price.toLocaleString()}</p>
              </div>
            </div>
          </div>

          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="flex-1 px-6 py-3 rounded-xl font-black text-gray-500 hover:bg-gray-100 transition-all text-[10px] tracking-widest"
            >
              Cancelar
            </button>
            <button
              onClick={onConfirm}
              className="flex-1 bg-gradient-to-r from-red-500 to-red-600 text-white px-6 py-3 rounded-xl font-black text-[10px] tracking-widest hover:shadow-lg hover:scale-105 active:scale-95 transition-all flex items-center justify-center space-x-2"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Eliminar</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}