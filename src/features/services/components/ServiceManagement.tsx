import React, { useState, useEffect } from 'react';
import {
  Scissors, Plus, Edit, Trash2, Eye, Search, Filter, Clock, DollarSign,
  Package, X, Save, AlertCircle, TrendingUp, Calendar, Tag, Star, Users,
  Image as ImageIcon, CheckCircle, FileText, RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';
import { serviceService, type Service as APIService } from '../services/serviceService';
import { SimplePagination } from '@/shared/components/ui/simple-pagination';

const API_ORIGIN = 'http://www.astrhoapp.somee.com';
const DEFAULT_SERVICE_IMAGE = 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=400&h=300&fit=crop';

// Helper for image retry logic
const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
  const target = e.target as HTMLImageElement;
  const currentSrc = target.src;

  if (target.dataset.triedAll === 'true') return;

  console.log(`SuperMapper: Image load fail for ${currentSrc}, attempting recovery chain...`);

  // Extraer el nombre del archivo
  const parts = currentSrc.split('/');
  const filename = parts[parts.length - 1];

  switch (target.dataset.retryCount) {
    case undefined:
    case '0':
      target.dataset.retryCount = '1';
      target.src = `${API_ORIGIN}/imagenes/${filename}`;
      break;
    case '1':
      target.dataset.retryCount = '2';
      // Algunas veces en IIS subdirectorios, puede estar bajo /api/imagenes/
      target.src = `${API_ORIGIN}/api/imagenes/${filename}`;
      break;
    case '2':
      target.dataset.retryCount = '3';
      // Fallback a wwwroot explicito si está mal configurado el router
      target.src = `${API_ORIGIN}/wwwroot/imagenes/${filename}`;
      break;
    case '3':
      target.dataset.retryCount = '4';
      target.src = `${API_ORIGIN}/api/wwwroot/imagenes/${filename}`;
      break;
    default:
      // Fallback final si nada funcionó
      target.src = DEFAULT_SERVICE_IMAGE;
      target.dataset.triedAll = 'true';
      break;
  }
};

export function ServiceManagement({ hasPermission }: ServiceManagementProps) {
  const [services, setServices] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedService, setSelectedService] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(5);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [showSuccessAlert, setShowSuccessAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorModalMessage, setErrorModalMessage] = useState('');

  // Helper avanzado para procesar cualquier formato de imagen del backend
  const processImageSource = (raw: any): string => {
    if (!raw) {
      console.log('SuperMapper: Raw input is empty/null');
      return '';
    }

    console.log('SuperMapper Debug [Input]:', typeof raw === 'string' && raw.length > 100 ? `${raw.substring(0, 50)}... [length: ${raw.length}]` : raw);

    const PLACEHOLDER = DEFAULT_SERVICE_IMAGE;

    if (raw && typeof raw === 'object' && raw.type !== 'Buffer' && !Array.isArray(raw)) {
      console.log('SuperMapper: Detected unknown object type in image field:', Object.keys(raw));
    }

    // Caso 1: Objeto con Buffer
    if (raw && typeof raw === 'object' && raw.type === 'Buffer' && Array.isArray(raw.data)) {
      raw = raw.data;
    }

    // Caso 2: Array de bytes (byte[])
    if (Array.isArray(raw)) {
      try {
        const uint8Array = new Uint8Array(raw);
        let binary = '';
        const chunk = 8192;
        for (let i = 0; i < uint8Array.length; i += chunk) {
          const sub = uint8Array.subarray(i, i + chunk);
          binary += String.fromCharCode.apply(null, Array.from(sub));
        }
        return `data:image/png;base64,${btoa(binary)}`;
      } catch (e) {
        console.error('SuperMapper: Error en Byte Array:', e);
        return PLACEHOLDER;
      }
    }

    if (typeof raw !== 'string') return '';

    let str = raw.trim();
    if (!str) return '';

    // Caso 3: URL Completa
    if (str.startsWith('http')) return str;

    // Caso 4: Data URI ya formado
    if (str.startsWith('data:')) return str;

    // Caso 5: Ruta de Disco Local (Filtro y Rescate)
    if (str.match(/^[a-zA-Z]:\\/) || str.includes('\\')) {
      const parts = str.split(/[\\/]/);
      const fileName = parts[parts.length - 1];
      if (fileName && fileName.includes('.')) {
        return `${API_ORIGIN}/uploads/${fileName}`;
      }
      return PLACEHOLDER;
    }

    // Caso 6: Cadena HEXADECIMAL (0xFFD8...)
    if (/^(0x)?[0-9a-fA-F]{100,}$/.test(str)) {
      try {
        const cleanHex = str.startsWith('0x') ? str.substring(2) : str;
        const binary = cleanHex.match(/.{1,2}/g)?.map(byte => parseInt(byte, 16));
        if (binary) {
          const uint8 = new Uint8Array(binary);
          let binStr = '';
          for (let i = 0; i < uint8.length; i++) binStr += String.fromCharCode(uint8[i]);
          const b64 = btoa(binStr);
          let mime = 'image/png';
          if (cleanHex.toLowerCase().startsWith('ffd8')) mime = 'image/jpeg';
          return `data:${mime};base64,${b64}`;
        }
      } catch (e) {
        console.error('SuperMapper: Error en Hex conversion:', e);
      }
    }

    // Caso 7: Ruta relativa o solo nombre de archivo
    if (str.length < 500 && (str.includes('.') || str.includes('/') || str.includes('\\'))) {
      // Normalizar backslashes a forward slashes
      const normalizedStr = str.replace(/\\/g, '/');
      const path = normalizedStr.startsWith('/') ? normalizedStr : `/${normalizedStr}`;

      // SIEMPRE priorizar /imagenes/ ya que el usuario confirmó que es donde se alojan
      if (!path.includes('/imagenes/') && !path.includes('/uploads/') && !path.includes('/api/') && !path.includes('/Images/')) {
        return `${API_ORIGIN}/imagenes${path}`;
      }
      return `${API_ORIGIN}${path}`;
    }

    // Caso 8: Base64 crudo
    const cleanB64 = str.replace(/[\s\n\r"']/g, '');
    if (cleanB64.length > 50) {
      let mimeType = 'image/png';
      if (cleanB64.startsWith('/9j/') || cleanB64.startsWith('/9J/')) mimeType = 'image/jpeg';
      else if (cleanB64.startsWith('iVBORw0KGgo')) mimeType = 'image/png';
      else if (cleanB64.startsWith('R0lGOD')) mimeType = 'image/gif';
      else if (cleanB64.startsWith('UklGR')) mimeType = 'image/webp';

      return `data:${mimeType};base64,${cleanB64}`;
    }

    return PLACEHOLDER;
  };

  // Map API Service to UI model
  const mapServiceToUI = (service: any) => {
    // INTROSPECCIÓN DESESPERADA: Log de todas las llaves para encontrar el campo oculto
    console.log(`SuperMapper: Keys for service ${service.nombre || service.Nombre || '?'}:`, Object.keys(service).join(', '));

    const rawImage =
      service.imagen || service.Imagen ||
      service.foto || service.Foto ||
      service.image || service.Image ||
      service.imageUrl || service.image_url ||
      service.urlImagen || service.UrlImagen ||
      service.rutaImagen || service.RutaImagen ||
      service.pathImagen || service.PathImagen ||
      service.linkImagen || service.LinkImagen ||
      service.archivo || service.Archivo ||
      service.icono || service.Icono ||
      service.imagenPrincipal || service.ImagenPrincipal;

    const imageUrl = processImageSource(rawImage);

    console.log(`SuperMapper Debug [Result] for ${service.nombre || service.Nombre || 'unknown'}:`,
      imageUrl ? (imageUrl.startsWith('data:') ? 'base64 data...' : imageUrl) : 'No image produced - Check keys above!');

    return {
      id: service.servicioId || service.ServicioId || service.id,
      name: service.nombre || service.Nombre || 'Sin nombre',
      description: service.descripcion || service.Descripcion || '',
      price: service.precio || service.Precio || 0,
      duration: service.duracion || service.Duracion || 0,
      status: (service.estado !== undefined ? service.estado : (service.Estado !== undefined ? service.Estado : (service.activo !== undefined ? service.activo : service.Activo))) ? 'active' : 'inactive',
      updatedAt: (service.fechaActualizacion || service.FechaActualizacion || service.fechaCreacion || service.FechaCreacion || '').split('T')[0] || new Date().toISOString().split('T')[0],
      image: imageUrl || DEFAULT_SERVICE_IMAGE
    };
  };

  const fetchServices = async () => {
    setIsLoading(true);
    try {
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
    }
  };

  useEffect(() => {
    fetchServices();
  }, [currentPage, searchTerm]); // Se ejecuta cuando cambia la página o el término de búsqueda

  // Reset page when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  // Auto-hide success alert after 4 seconds
  useEffect(() => {
    if (showSuccessAlert) {
      const timer = setTimeout(() => {
        setShowSuccessAlert(false);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [showSuccessAlert]);

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
      setIsLoading(true);
      const fullService = await serviceService.getServiceById(service.id);
      setSelectedService(mapServiceToUI(fullService));
      setShowDetailModal(true);
    } catch (error) {
      console.error('Error fetching service detail:', error);
      toast.error('No se pudo cargar el detalle del servicio');
    } finally {
      setIsLoading(false);
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
      await serviceService.deleteService(selectedService.id);
      setServices(services.filter(s => s.id !== selectedService.id));
      setShowDeleteModal(false);
      setSelectedService(null);
      setAlertMessage(`Servicio "${selectedService.name}" eliminado exitosamente`);
      setShowSuccessAlert(true);
    } catch (error) {
      console.error('Error deleting service:', error);
      setErrorModalMessage('No se pudo eliminar el servicio. Es posible que existan dependencias.');
      setShowErrorModal(true);
    }
  };

  const handleToggleServiceStatus = async (serviceId: number) => {
    const service = services.find(s => s.id === serviceId);
    if (!service) return;

    try {
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

      setAlertMessage(`Estado de "${service.name}" actualizado a ${updatedStatus ? 'Activo' : 'Inactivo'}`);
      setShowSuccessAlert(true);
    } catch (error) {
      console.error('Error toggling service status:', error);
      setErrorModalMessage('Error al cambiar el estado del servicio. Verifique su conexión.');
      setShowErrorModal(true);
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

    // Manejar imagen - El usuario dice que ahora es una columna directa
    const fieldName = 'Imagen'; // O 'imagen'
    const fieldNameSecondary = 'imagen';

    if (uiData.imageFile instanceof File) {
      formData.append(fieldName, uiData.imageFile);
      formData.append(fieldNameSecondary, uiData.imageFile);
    } else if (typeof uiData.image === 'string' && uiData.image.includes('base64,')) {
      const base64Content = uiData.image.split('base64,')[1];
      formData.append(fieldName, base64Content);
      formData.append(fieldNameSecondary, base64Content);
    } else if (typeof uiData.image === 'string' && !uiData.image.includes('placeholder')) {
      formData.append(fieldName, uiData.image);
      formData.append(fieldNameSecondary, uiData.image);
    }

    return formData;
  };

  const handleSaveService = async (serviceData: any) => {
    try {
      if (selectedService) {
        // Edit existing service
        const formData = mapUIToFormData(serviceData, selectedService.id);
        const result = await serviceService.updateService(selectedService.id, formData);

        setServices(services.map(s =>
          s.id === selectedService.id
            ? mapServiceToUI(result)
            : s
        ));
        setAlertMessage(`Servicio "${serviceData.name}" actualizado exitosamente`);
      } else {
        // Create new service
        const formData = mapUIToFormData(serviceData);
        const result = await serviceService.createService(formData);

        setServices([mapServiceToUI(result), ...services]);
        setAlertMessage(`Servicio "${serviceData.name}" creado exitosamente`);
      }
      setShowEditModal(false);
      setShowSuccessAlert(true);
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
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-pink-300 focus:border-transparent"
              />
            </div>

            <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
            <button
              onClick={fetchServices}
              className="p-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors flex items-center justify-center"
              title="Recargar datos"
            >
              <RefreshCw className="w-5 h-5" />
            </button>

            {hasPermission('manage_services') && (
              <button
                onClick={handleCreateService}
                className="w-full md:w-auto bg-gradient-to-r from-pink-400 to-purple-500 text-white px-6 py-3 rounded-xl font-semibold hover:shadow-lg transition-all flex items-center justify-center space-x-2 whitespace-nowrap"
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
                {paginatedServices.map((service) => (
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
                          <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-pink-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-pink-400 peer-checked:to-purple-500"></div>
                          <span className={`ml-3 text-sm font-medium ${service.status === 'active' ? 'text-green-600' : 'text-red-600'
                            }`}>
                            {service.status === 'active' ? 'Activo' : 'Inactivo'}
                          </span>
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
                              className="p-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
                              title="Editar"
                            >
                              <Edit className="w-4 h-4" />
                            </button>

                            <button
                              onClick={() => handleDeleteService(service)}
                              className="p-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
                              title="Eliminar"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
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

      {/* Success Alert positioned absolutely at the root level to circumvent stacking bounds */}
      {showSuccessAlert && (
        <div className="fixed bottom-4 right-4 z-[2147483647] animate-in slide-in-from-bottom-5 duration-300">
          <div className="bg-gradient-to-r from-pink-400 to-purple-500 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center space-x-4 min-w-[320px]">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-white" />
              </div>
            </div>
            <div className="flex-1">
              <p className="font-semibold">{alertMessage}</p>
            </div>
            <button
              onClick={() => setShowSuccessAlert(false)}
              className="flex-shrink-0 w-8 h-8 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Success Alert */}
      {showSuccessAlert && (
        <div className="fixed bottom-4 right-4 z-[9999] animate-in slide-in-from-bottom-5 duration-300">
          <div className="bg-gradient-to-r from-pink-400 to-purple-500 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center space-x-4 min-w-[320px]">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-white" />
              </div>
            </div>
            <div className="flex-1">
              <p className="font-semibold">{alertMessage}</p>
            </div>
            <button
              onClick={() => setShowSuccessAlert(false)}
              className="flex-shrink-0 w-8 h-8 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </React.Fragment>
  );
}

// Error Modal Component
function ErrorModal({ message, onClose }: { message: string, onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[3000] flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md animate-in zoom-in-95 duration-200">
        <div className="p-8 text-center">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-10 h-10 text-red-500" />
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
        <div className="bg-gradient-to-r from-pink-500 to-purple-600 p-5 text-white shrink-0 shadow-md z-20">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <Scissors className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold leading-tight">Detalle del Servicio</h3>
                <p className="text-pink-50 text-[10px] font-black uppercase tracking-widest mt-0.5">ID: {service.id}</p>
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
            {/* Centered Large Image */}
            <div className="flex justify-center">
              <div className="bg-white rounded-3xl p-2 border border-gray-100 shadow-lg overflow-hidden w-full max-w-2xl h-64 md:h-80 transition-transform hover:scale-[1.02] duration-300">
                <img 
                  src={service.image} 
                  alt={service.name} 
                  className="w-full h-full object-cover rounded-2xl"
                  onError={handleImageError}
                />
              </div>
            </div>

            {/* Info & Description Grid */}
            <div className="grid md:grid-cols-3 gap-4 pb-4">
              {/* Column 1: General Info */}
              <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex flex-col h-full">
                <div className="flex items-center space-x-2 text-purple-500 mb-3">
                  <Tag className="w-4 h-4" />
                  <h4 className="font-bold uppercase text-[10px] tracking-widest">General</h4>
                </div>
                <p className="font-bold text-gray-800 text-lg mb-2 truncate">
                  {service.name}
                </p>
                <div className="mt-auto">
                  <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                    service.status === 'active' 
                      ? 'bg-green-100 text-green-700 border border-green-200 shadow-sm' 
                      : 'bg-red-100 text-red-700 border border-red-200 shadow-sm'
                  }`}>
                    {service.status === 'active' ? 'Servicio Activo' : 'Servicio Inactivo'}
                  </span>
                </div>
              </div>

              {/* Column 2: Pricing & Time Card */}
              <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex flex-col h-full">
                <div className="flex items-center space-x-2 text-pink-500 mb-3">
                  <Clock className="w-4 h-4" />
                  <h4 className="font-bold uppercase text-[10px] tracking-widest">Detalles</h4>
                </div>
                <div className="space-y-4 mt-2">
                  <div className="flex justify-between items-center pb-2 border-b border-gray-50">
                    <span className="text-gray-400 text-[10px] font-bold uppercase tracking-tight">Duración:</span>
                    <span className="font-bold text-gray-700">{service.duration} min</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400 text-[10px] font-bold uppercase tracking-tight">Precio:</span>
                    <span className="font-bold text-green-600 text-lg">${service.price.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Column 3: Description Section */}
              <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex flex-col h-full">
                <div className="flex items-center space-x-2 text-blue-500 mb-3">
                  <FileText className="w-4 h-4" />
                  <h4 className="font-bold uppercase text-[10px] tracking-widest">Descripción</h4>
                </div>
                <div className="flex-1 overflow-y-auto no-scrollbar max-h-[120px]">
                  <p className="text-gray-600 text-xs leading-relaxed italic">
                    {service.description || 'Sin descripción adicional.'}
                  </p>
                </div>
              </div>
            </div>

            {/* Resumen Card */}
            <div className="bg-gradient-to-br from-pink-50 to-purple-50 rounded-3xl p-6 border border-pink-100 shadow-sm">
                <div className="flex items-center space-x-3 mb-3">
                  <Star className="w-5 h-5 text-pink-400" />
                  <h4 className="font-black text-[10px] uppercase tracking-[0.2em] text-gray-700">Resumen del Servicio</h4>
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
            className="px-8 py-2.5 rounded-xl font-black text-gray-500 hover:bg-gray-200 hover:text-gray-800 active:scale-95 transition-all text-sm uppercase tracking-widest shadow-sm"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}

// Service Edit Modal Component
function ServiceEditModal({ service, onClose, onSave }) {
  const [formData, setFormData] = useState({
    name: service?.name || '',
    description: service?.description || '',
    duration: service?.duration || 30,
    price: service?.price || 0,
    status: service?.status || 'active',
    image: service?.image || 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=400&h=300&fit=crop',
    imageFile: null,
    images: service?.images || []
  });

  const [errors, setErrors] = useState({});
  const [imagePreview, setImagePreview] = useState(service?.image || null);
  const [isSaving, setIsSaving] = useState(false);

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
        setFormData({
          ...formData,
          image: reader.result as string,
          imageFile: file
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setImagePreview(null);
    setFormData({
      ...formData,
      image: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=400&h=300&fit=crop',
      imageFile: null
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const newErrors = {};
    if (!formData.name.trim()) newErrors.name = 'El nombre es requerido';
    if (!formData.description.trim()) newErrors.description = 'La descripción es requerida';
    if (formData.duration <= 0) newErrors.duration = 'La duración debe ser mayor a 0';
    if (formData.price <= 0) newErrors.price = 'El precio debe ser mayor a 0';

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
    setFormData({
      ...formData,
      [name]: ['duration', 'price'].includes(name) ? parseFloat(value) || 0 : value
    });

    if (errors[name]) {
      setErrors({ ...errors, [name]: '' });
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header - Fixed at top */}
        <div className="bg-gradient-to-r from-pink-500 to-purple-600 p-5 text-white shrink-0 shadow-md z-20">
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

          <div className="max-w-4xl mx-auto space-y-6">
            {/* Errors Notification */}
            {Object.keys(errors).length > 0 && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-2xl flex items-center space-x-3 animate-in fade-in duration-300">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <p className="font-semibold text-sm">Por favor corrija los errores en el formulario</p>
              </div>
            )}

            <div className="grid md:grid-cols-2 gap-6">
              {/* Basic Info Section */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-6 py-4 bg-gray-50/50 border-b border-gray-100 flex items-center space-x-2">
                  <Tag className="w-4 h-4 text-pink-500" />
                  <h4 className="font-bold text-gray-700 text-sm uppercase tracking-wider">Información Básica</h4>
                </div>
                <div className="p-6 space-y-4">
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">Nombre del Servicio</label>
                    <div className="relative">
                      <Scissors className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        className={`w-full pl-10 pr-4 py-3 bg-gray-50 border rounded-xl focus:ring-2 focus:ring-pink-300 focus:border-transparent transition-all outline-none ${
                          errors.name ? 'border-red-300 ring-1 ring-red-100' : 'border-gray-200'
                        }`}
                        placeholder="Ej: Corte y Peinado"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">Duración (Minutos)</label>
                      <div className="relative">
                        <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <input
                          type="number"
                          name="duration"
                          value={formData.duration}
                          onChange={handleInputChange}
                          className={`w-full pl-10 pr-4 py-3 bg-gray-50 border rounded-xl focus:ring-2 focus:ring-pink-300 focus:border-transparent transition-all outline-none ${
                            errors.duration ? 'border-red-300 ring-1 ring-red-100' : 'border-gray-200'
                          }`}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">Precio (COP)</label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <input
                          type="number"
                          name="price"
                          value={formData.price}
                          onChange={handleInputChange}
                          className={`w-full pl-10 pr-4 py-3 bg-gray-50 border rounded-xl focus:ring-2 focus:ring-pink-300 focus:border-transparent transition-all outline-none ${
                            errors.price ? 'border-red-300 ring-1 ring-red-100' : 'border-gray-200'
                          }`}
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">Descripción del Servicio</label>
                    <div className="relative">
                      <FileText className="absolute left-3 top-3 text-gray-400 w-4 h-4" />
                      <textarea
                        name="description"
                        value={formData.description}
                        onChange={handleInputChange}
                        rows={3}
                        className={`w-full pl-10 pr-4 py-3 bg-gray-50 border rounded-xl focus:ring-2 focus:ring-pink-300 focus:border-transparent transition-all outline-none ${
                          errors.description ? 'border-red-300 ring-1 ring-red-100' : 'border-gray-200'
                        }`}
                        placeholder="Describa el servicio..."
                      />
                    </div>
                  </div>

                  {service && (
                    <div className="pt-2">
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Estado del Servicio</label>
                      <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.status === 'active'}
                            onChange={(e) => setFormData({ ...formData, status: e.target.checked ? 'active' : 'inactive' })}
                            className="sr-only peer"
                          />
                          <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-pink-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-pink-400 peer-checked:to-purple-500"></div>
                          <span className={`ml-3 text-sm font-bold ${formData.status === 'active' ? 'text-green-600' : 'text-red-600'}`}>
                            {formData.status === 'active' ? 'ACTIVO' : 'INACTIVO'}
                          </span>
                        </label>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Image Section */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-6 py-4 bg-gray-50/50 border-b border-gray-100 flex items-center space-x-2">
                  <ImageIcon className="w-4 h-4 text-purple-500" />
                  <h4 className="font-bold text-gray-700 text-sm uppercase tracking-wider">Imagen Representativa</h4>
                </div>
                <div className="p-6">
                  {imagePreview ? (
                    <div className="relative group">
                      <img
                        src={imagePreview}
                        alt="Preview"
                        className="w-full h-64 object-cover rounded-2xl border border-gray-200 shadow-inner"
                        onError={handleImageError}
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl flex items-center justify-center space-x-2">
                        <label htmlFor="image-upload-change" className="p-3 bg-white text-pink-500 rounded-full cursor-pointer hover:scale-110 transition-transform shadow-lg">
                          <ImageIcon className="w-6 h-6" />
                        </label>
                        <button
                          type="button"
                          onClick={handleRemoveImage}
                          className="p-3 bg-white text-red-500 rounded-full hover:scale-110 transition-transform shadow-lg"
                        >
                          <Trash2 className="w-6 h-6" />
                        </button>
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                        id="image-upload-change"
                      />
                    </div>
                  ) : (
                    <div className="border-2 border-dashed border-gray-200 rounded-2xl p-12 text-center hover:border-pink-300 hover:bg-pink-50/30 transition-all">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                        id="image-upload-new"
                      />
                      <label htmlFor="image-upload-new" className="cursor-pointer">
                        <div className="w-16 h-16 bg-pink-100 rounded-2xl flex items-center justify-center mx-auto mb-4 text-pink-500">
                          <Plus className="w-8 h-8" />
                        </div>
                        <p className="text-sm font-bold text-gray-600">Subir Imagen</p>
                        <p className="text-xs text-gray-400 mt-1">PNG, JPG o WEBP (máx. 5MB)</p>
                      </label>
                    </div>
                  )}

                  <div className="mt-6 p-4 bg-purple-50 rounded-2xl border border-purple-100">
                    <div className="flex items-start space-x-3">
                      <Star className="w-5 h-5 text-purple-500 mt-0.5" />
                      <div>
                        <p className="text-xs font-bold text-purple-700 uppercase tracking-widest mb-1">Consejo Asthro</p>
                        <p className="text-[11px] text-purple-600 leading-relaxed italic">
                          Una buena imagen ayuda a tus clientes a visualizar el resultado del servicio.
                        </p>
                      </div>
                    </div>
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
            className="px-8 py-2.5 rounded-xl font-black text-gray-500 hover:bg-gray-200 hover:text-gray-800 active:scale-95 transition-all text-sm uppercase tracking-widest shadow-sm"
            disabled={isSaving}
          >
            Cancelar
          </button>
          <button
            form="service-form"
            type="submit"
            disabled={isSaving}
            className="px-8 py-2.5 rounded-xl font-black text-white bg-gradient-to-r from-pink-500 to-purple-600 active:scale-95 transition-all text-sm uppercase tracking-widest shadow-lg hover:shadow-pink-200 disabled:opacity-50 flex items-center space-x-2"
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
            <div className="w-20 h-20 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-red-100 rotate-3">
              <AlertCircle className="w-10 h-10 text-red-500 -rotate-3" />
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
                <Scissors className="w-6 h-6 text-pink-500" />
              </div>
              <div className="text-left">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Servicio a eliminar</p>
                <p className="font-bold text-gray-700 line-clamp-1">{service.name}</p>
                <p className="text-[10px] text-gray-400 uppercase">Duración: {service.duration} min | ${service.price.toLocaleString()}</p>
              </div>
            </div>
          </div>

          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="flex-1 px-6 py-3 rounded-xl font-black text-gray-500 hover:bg-gray-100 transition-all text-[10px] uppercase tracking-widest"
            >
              Cancelar
            </button>
            <button
              onClick={onConfirm}
              className="flex-1 bg-gradient-to-r from-red-500 to-red-600 text-white px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:shadow-lg hover:scale-105 active:scale-95 transition-all flex items-center justify-center space-x-2"
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