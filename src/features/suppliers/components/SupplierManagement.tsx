import React, { useState, useEffect } from 'react';
import {
  Truck, Plus, Edit, Trash2, Eye, Search, Phone, Mail,
  MapPin, Package, X, Save, AlertCircle, CheckCircle, Loader2, AlertTriangle, RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';
import { supplierService } from '../services/supplierService';
import { purchaseService } from '@/features/purchases/services/purchaseService';
import { SimplePagination } from '@/shared/components/ui/simple-pagination';

const mapApiToFrontend = (rawApiData: any) => {
  if (!rawApiData) return null;
  
  // Unwrap if the data is nested (common in single-item API responses like getById)
  // Check for .data or .result, ignoring paginated or array wrappers
  const apiData = (rawApiData.data && typeof rawApiData.data === 'object' && !Array.isArray(rawApiData.data)) 
    ? rawApiData.data 
    : (rawApiData.result && typeof rawApiData.result === 'object' && !Array.isArray(rawApiData.result))
    ? rawApiData.result
    : rawApiData;

  return {
    id: apiData.proveedorId || apiData.ProveedorId || Math.floor(Math.random() * 10000),
    supplierType: (apiData.tipoProveedor || apiData.TipoProveedor) === 'Juridico' ? 'juridica' : 'natural',
    name: apiData.nombre || apiData.Nombre || '',
    documentType: apiData.tipoDocumento || apiData.TipoDocumento || ((apiData.tipoProveedor || apiData.TipoProveedor) === 'Juridico' ? 'NIT' : 'CC'),
    taxId: apiData.documento || apiData.Documento || '',
    contactPerson: apiData.personaContacto || apiData.PersonaContacto || apiData.persona_Contacto || apiData.Persona_Contacto || apiData.nombre || apiData.Nombre || '',
    email: apiData.correo || apiData.Correo || '',
    phone: apiData.telefono || apiData.Telefono || '',
    address: apiData.direccion || apiData.Direccion || '',
    department: apiData.departamento || apiData.Departamento || '',
    city: apiData.ciudad || apiData.Ciudad || '',
    status: (apiData.estado !== undefined ? apiData.estado : apiData.Estado) === false ? 'inactive' : 'active',
    totalOrders: 0,
    rating: 0,
    products: []
  };
};

const mapFrontendToApi = (frontendData: any, isPost = false) => ({
  ...(isPost ? {} : { proveedorId: frontendData.id }),
  tipoProveedor: frontendData.supplierType === 'juridica' ? 'Juridico' : 'Natural',
  nombre: frontendData.name,
  tipoDocumento: frontendData.documentType || (frontendData.supplierType === 'juridica' ? 'NIT' : 'CC'),
  documento: frontendData.taxId,
  persona_Contacto: frontendData.contactPerson || frontendData.name,
  correo: frontendData.email,
  telefono: frontendData.phone,
  direccion: frontendData.address,
  departamento: frontendData.department,
  ciudad: frontendData.city,
  estado: frontendData.status === 'active' || frontendData.status === true
});

interface SupplierManagementProps {
  hasPermission: (permission: string) => boolean;
}

export function SupplierManagement({ hasPermission }: SupplierManagementProps) {
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [selectedSupplier, setSelectedSupplier] = useState<any>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(5); // 3x3 grid removed for standardization
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [checkingPurchases, setCheckingPurchases] = useState(false);
  const [supplierHasPurchases, setSupplierHasPurchases] = useState(false);

  const loadSuppliers = async () => {
    try {
      setIsLoading(true);
      const response = await supplierService.getAll({
        page: currentPage,
        pageSize: itemsPerPage,
        search: searchTerm
      });
      console.log('Loaded suppliers API response:', response);

      const items = response.data || [];
      setTotalCount(response.totalCount || 0);
      setTotalPages(response.totalPages || 0);

      // Load ALL suppliers (active + inactive) — soft-deleted ones are shown on reload
      setSuppliers(items.map(mapApiToFrontend).filter(Boolean));
    } catch (error) {
      console.error('Error loading suppliers:', error);
      toast.error('Error al cargar proveedores');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSuppliers();
  }, [currentPage, searchTerm]);

  // Reset page when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  // Ya no filtramos en el cliente, usamos lo que viene de la API
  const currentSuppliers = suppliers;

  const handleViewDetail = async (supplier) => {
    try {
      setIsLoading(true);
      const fullSupplier = await supplierService.getById(supplier.id);
      setSelectedSupplier(mapApiToFrontend(fullSupplier));
      setShowDetailModal(true);
    } catch (error) {
      console.error('Error fetching supplier detail:', error);
      toast.error('No se pudo cargar el detalle del proveedor');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditSupplier = (supplier) => {
    setSelectedSupplier(supplier);
    setShowEditModal(true);
  };

  const handleDeleteSupplier = async (supplier) => {
    setSelectedSupplier(supplier);
    setCheckingPurchases(true);
    setSupplierHasPurchases(false);
    setShowDeleteModal(true);

    try {
      // Fetch real purchases from API to check association
      const raw = await purchaseService.getAll();
      let purchases: any[] = [];
      if (Array.isArray(raw)) {
        purchases = raw;
      } else if (raw && Array.isArray(raw.$values)) {
        purchases = raw.$values;
      } else if (raw && Array.isArray(raw.data)) {
        purchases = raw.data;
      } else if (raw && Array.isArray(raw.result)) {
        purchases = raw.result;
      }

      // Check if any active purchase references this supplier
      const hasActivePurchases = purchases.some(
        (p: any) => p.proveedorId === supplier.id && p.estado !== false
      );
      setSupplierHasPurchases(hasActivePurchases);
    } catch (err) {
      console.error('Error checking purchases for supplier:', err);
      // On error, allow deletion (don't block based on failed check)
      setSupplierHasPurchases(false);
    } finally {
      setCheckingPurchases(false);
    }
  };

  const confirmDeleteSupplier = async () => {
    if (!selectedSupplier) return;
    const supplierName = selectedSupplier.name;
    const supplierId = selectedSupplier.id;

    // Close modal immediately for responsiveness
    setShowDeleteModal(false);
    setSelectedSupplier(null);

    try {
      await supplierService.delete(supplierId);
      // Remove from local state immediately after successful API call
      setSuppliers(prev => prev.filter(s => s.id !== supplierId));
      toast.success(`Proveedor "${supplierName}" eliminado correctamente`);
    } catch (error) {
      console.error('Error deleting supplier:', error);
      toast.error(`No se pudo eliminar a "${supplierName}". Es posible que tenga registros asociados (ej. Compras) en la base de datos.`);
      // Re-sync from API to restore consistent state
      await loadSuppliers();
    }
  };

  const handleToggleSupplierStatus = async (supplierId: number) => {
    const supplier = suppliers.find(s => s.id === supplierId);
    if (!supplier) return;
    const newStatus = supplier.status === 'active' ? 'inactive' : 'active';

    try {
      const apiPayload = mapFrontendToApi({ ...supplier, status: newStatus }, false);
      await supplierService.update(supplier.id, apiPayload);

      setSuppliers(suppliers.map(s =>
        s.id === supplierId
          ? { ...s, status: newStatus, updatedAt: new Date().toISOString().split('T')[0] }
          : s
      ));

      if (newStatus === 'active') {
        toast.success(`Proveedor "${supplier.name}" activado correctamente`);
      } else {
        toast.info(`Proveedor "${supplier.name}" inactivado correctamente`);
      }
    } catch (error) {
      console.error('Error updating supplier status:', error);
      toast.error('Error al cambiar el estado del proveedor');
    }
  };

  const handleSaveSupplier = async (supplierData: any) => {
    try {
      if (selectedSupplier) {
        // Edit existing supplier
        const apiPayload = mapFrontendToApi({ ...selectedSupplier, ...supplierData }, false);
        await supplierService.update(selectedSupplier.id, apiPayload);

        setSuppliers(suppliers.map(s =>
          s.id === selectedSupplier.id
            ? { ...s, ...supplierData, updatedAt: new Date().toISOString().split('T')[0] }
            : s
        ));
        toast.success(`Proveedor "${supplierData.name}" actualizado correctamente`);
      } else {
        // Create new supplier
        const apiPayload = mapFrontendToApi({ ...supplierData, status: 'active' }, true);
        const createdApiData = await supplierService.create(apiPayload);
        console.log('Created supplier response:', createdApiData);

        let apiItem = createdApiData;
        if (createdApiData && createdApiData.data) apiItem = createdApiData.data;
        else if (createdApiData && createdApiData.result) apiItem = createdApiData.result;

        // If apiItem is a string or empty, fallback to the requested payload to update view optimistically
        if (!apiItem || typeof apiItem !== 'object') {
          apiItem = apiPayload;
          apiItem.proveedorId = Math.floor(Math.random() * 10000); // optimistic ID
        }

        const newSupplier = mapApiToFrontend(apiItem);
        if (newSupplier) {
          const mergedSupplier = {
            ...newSupplier,
            id: newSupplier.id || Math.max(...(suppliers.map(s => s?.id || 0)), 0) + 1,
            createdAt: new Date().toISOString().split('T')[0],
            updatedAt: new Date().toISOString().split('T')[0]
          };

          setSuppliers([...suppliers, mergedSupplier]);
          toast.success(`Proveedor "${supplierData.name}" registrado correctamente`);
        }

        // Fully sync from server to ensure correct DB ID
        loadSuppliers();
      }
      setShowEditModal(false);
    } catch (error) {
      console.error('Error saving supplier:', error);
      toast.error('Error al guardar el proveedor. Verifica los datos o conexión.');
      throw error; // Rethrow to let the modal know it failed
    }
  };

  const handleCreateSupplier = () => {
    setSelectedSupplier(null);
    setShowEditModal(true);
  };

  // Pagination handlers
  const goToPage = (page) => {
    setCurrentPage(page);
  };

  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const goToPreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'inactive': return 'bg-gray-100 text-gray-800';
      case 'blacklisted': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'active': return 'Activo';
      case 'inactive': return 'Inactivo';
      case 'blacklisted': return 'Lista Negra';
      default: return status;
    }
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-bold text-gray-800">Gestión de Proveedores</h2>
          <p className="text-gray-600">
            Administra la información de proveedores y sus productos
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
              placeholder="Buscar proveedores por nombre o contacto..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-pink-300 focus:border-transparent"
            />
          </div>

          <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
            <button
              onClick={loadSuppliers}
              className="p-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors flex items-center justify-center"
              title="Recargar datos"
            >
              <RefreshCw className="w-5 h-5" />
            </button>

            {hasPermission('manage_suppliers') && (
              <button
                onClick={handleCreateSupplier}
                className="w-full md:w-auto bg-gradient-to-r from-pink-400 to-purple-500 text-white px-6 py-3 rounded-xl font-semibold hover:shadow-lg transition-all flex items-center justify-center space-x-2 whitespace-nowrap"
              >
                <Plus className="w-5 h-5" />
                <span>Registrar Proveedor</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Suppliers List */}
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden relative min-h-[400px]">
        {isLoading && currentSuppliers.length > 0 && (
          <div className="absolute inset-0 bg-white/60 backdrop-blur-sm z-10 flex flex-col items-center justify-center">
            <Loader2 className="w-8 h-8 text-pink-500 animate-spin mb-2" />
            <span className="text-sm font-medium text-gray-500">Cargando...</span>
          </div>
        )}
        <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-6 border-b border-gray-100">
          <h3 className="text-xl font-bold text-gray-800">Lista de Proveedores</h3>
          <p className="text-gray-600">
            {totalCount} proveedor{totalCount !== 1 ? 'es' : ''} encontrado{totalCount !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-pink-50 to-purple-50">
              <tr>
                <th className="px-6 py-4 text-left font-semibold text-gray-800">Documento</th>
                <th className="px-6 py-4 text-left font-semibold text-gray-800">Nombre</th>
                <th className="px-6 py-4 text-left font-semibold text-gray-800">Teléfono</th>
                <th className="px-6 py-4 text-left font-semibold text-gray-800">Tipo de proveedor</th>
                <th className="px-6 py-4 text-left font-semibold text-gray-800">Estado</th>
                <th className="px-6 py-4 text-left font-semibold text-gray-800">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {currentSuppliers.map((supplier) => (
                <tr key={supplier.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-700">{supplier.taxId}</div>
                  </td>

                  <td className="px-6 py-4">
                    <div className="font-semibold text-gray-800">{supplier.name}</div>
                  </td>

                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-700">{supplier.phone}</div>
                  </td>

                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${supplier.supplierType === 'juridica'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-green-100 text-green-800'
                      }`}>
                      {supplier.supplierType === 'juridica' ? 'Jurídica' : 'Natural'}
                    </span>
                  </td>

                  <td className="px-6 py-4">
                    {hasPermission('manage_suppliers') ? (
                      <div className="flex items-center space-x-3">
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={supplier.status === 'active'}
                            onChange={() => handleToggleSupplierStatus(supplier.id)}
                            className="sr-only peer"
                          />
                          <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-pink-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-pink-400 peer-checked:to-purple-500"></div>
                          <span className={`ml-3 text-sm font-medium ${supplier.status === 'active' ? 'text-green-600' : 'text-red-600'
                            }`}>
                            {supplier.status === 'active' ? 'Activo' : 'Inactivo'}
                          </span>
                        </label>
                      </div>
                    ) : (
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(supplier.status)}`}>
                        {getStatusLabel(supplier.status)}
                      </span>
                    )}
                  </td>

                  <td className="px-6 py-4">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleViewDetail(supplier)}
                        className="p-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                        title="Ver Detalle"
                      >
                        <Eye className="w-4 h-4" />
                      </button>

                      {hasPermission('manage_suppliers') && (
                        <>
                          <button
                            onClick={() => handleEditSupplier(supplier)}
                            className="p-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
                            title="Editar"
                          >
                            <Edit className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => handleDeleteSupplier(supplier)}
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

          {currentSuppliers.length === 0 && (
            <div className="p-8 text-center text-gray-500">
              <Truck className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>No se encontraron proveedores que coincidan con los filtros.</p>
            </div>
          )}
        </div>

        {/* Pagination - Always visible */}
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50">
          <SimplePagination
            totalPages={totalPages}
            currentPage={currentPage}
            onPageChange={goToPage}
            totalRecords={totalCount}
            recordsPerPage={itemsPerPage}
          />
        </div>
      </div>

      {/* Supplier Detail Modal */}
      {showDetailModal && selectedSupplier && (
        <SupplierDetailModal
          supplier={selectedSupplier}
          onClose={() => setShowDetailModal(false)}
        />
      )}

      {/* Supplier Edit Modal */}
      {showEditModal && (
        <SupplierEditModal
          supplier={selectedSupplier}
          existingSuppliers={suppliers}
          onClose={() => setShowEditModal(false)}
          onSave={handleSaveSupplier}
        />
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <DeleteConfirmationModal
          supplier={selectedSupplier}
          hasPurchases={supplierHasPurchases}
          isChecking={checkingPurchases}
          onClose={() => setShowDeleteModal(false)}
          onConfirm={confirmDeleteSupplier}
        />
      )}
    </div>
  );
}

// Supplier Detail Modal Component
function SupplierDetailModal({ supplier, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header - Fixed at top */}
        <div className="bg-gradient-to-r from-pink-500 to-purple-600 p-5 text-white shrink-0 shadow-md z-20">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <Truck className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold leading-tight">Detalle de Proveedor</h3>
                <p className="text-pink-100 text-sm">{supplier.name}</p>
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
            <div className="grid md:grid-cols-2 gap-4">
              
              {/* Commercial Status Card */}
              <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                <div className="flex items-center space-x-2 text-purple-500 mb-4">
                  <Package className="w-4 h-4" />
                  <h4 className="font-bold uppercase text-[10px] tracking-widest">Información Comercial</h4>
                </div>
                
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">Tipo de Proveedor:</span>
                      <div className="mt-1">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${supplier.supplierType === 'juridica'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-green-100 text-green-800'
                          }`}>
                          {supplier.supplierType === 'juridica' ? 'Persona Jurídica' : 'Persona Natural'}
                        </span>
                      </div>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">Estado:</span>
                      <div className="mt-1">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${supplier.status === 'active'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                          }`}>
                          {supplier.status === 'active' ? 'Activo' : 'Inactivo'}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">
                      {supplier.supplierType === 'juridica' ? 'NIT:' : 'Cédula:'}
                    </span>
                    <p className="font-mono text-gray-800 font-semibold">{supplier.taxId}</p>
                  </div>
                  
                  <div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">Persona de Contacto / Rep. Legal:</span>
                    <p className="text-gray-800 font-semibold">{supplier.supplierType === 'juridica' ? supplier.contactPerson : supplier.name}</p>
                  </div>
                </div>
              </div>

              {/* Contact Information Card */}
              <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                <div className="flex items-center space-x-2 text-pink-500 mb-4">
                  <Phone className="w-4 h-4" />
                  <h4 className="font-bold uppercase text-[10px] tracking-widest">Información de Contacto</h4>
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded-lg transition-colors">
                    <Phone className="w-5 h-5 text-gray-400 flex-shrink-0" />
                    <div>
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tight block">Teléfono</span>
                      <span className="text-gray-800 font-medium">{supplier.phone}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded-lg transition-colors">
                    <Mail className="w-5 h-5 text-gray-400 flex-shrink-0" />
                    <div>
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tight block">Correo Electrónico</span>
                      <span className="text-gray-800 font-medium break-all">{supplier.email}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3 p-2 hover:bg-gray-50 rounded-lg transition-colors">
                    <MapPin className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tight block">Ubicación</span>
                      <div className="text-gray-800 font-medium">{supplier.address}</div>
                      <div className="text-gray-500 text-sm mt-0.5">{supplier.city}, {supplier.department || 'N/A'}</div>
                    </div>
                  </div>
                </div>
              </div>
              
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
        </div>
      </div>
    </div>
  );
}

// Supplier Edit Modal Component (sin campo productos suministrados)
function SupplierEditModal({ supplier, existingSuppliers = [], onClose, onSave }) {
  const [formData, setFormData] = useState({
    supplierType: supplier?.supplierType || 'juridica',
    documentType: supplier?.documentType || 'NIT',
    name: supplier?.name || '',
    contactPerson: supplier?.contactPerson || '',
    taxId: supplier?.taxId || '',
    phone: supplier?.phone || '',
    email: supplier?.email || '',
    address: supplier?.address || '',
    department: supplier?.department || 'Antioquia',
    city: supplier?.city || 'Medellín',
    status: supplier?.status || 'active',
    image: supplier?.image || ''
  });

  // Estado para errores de validación por campo
  const [errors, setErrors] = useState<Record<string, string>>({});

  // ── Regex de validación ──
  const ONLY_LETTERS_REGEX = /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]+$/;
  const PHONE_REGEX = /^\d{10}$/;

  const REQUIRED_MSG = 'Este campo es obligatorio';

  // ── Funciones de validación individuales ──
  const validateName = (value: string): string | null => {
    if (!value.trim()) return REQUIRED_MSG;
    if (!ONLY_LETTERS_REGEX.test(value)) {
      return 'El campo Nombre solo permite letras';
    }
    return null;
  };

  const validateContactPerson = (value: string): string | null => {
    if (!value.trim()) return REQUIRED_MSG;
    if (!ONLY_LETTERS_REGEX.test(value)) {
      return 'El campo Persona de contacto solo permite letras';
    }
    return null;
  };

  const validatePhone = (value: string): string | null => {
    if (!value.trim()) return REQUIRED_MSG;
    if (!PHONE_REGEX.test(value)) {
      return 'El teléfono debe contener exactamente 10 dígitos numéricos';
    }
    return null;
  };

  const validateTaxId = (value: string): string | null => {
    if (!value.trim()) return REQUIRED_MSG;
    // Verificar unicidad contra proveedores existentes (excluir el proveedor actual si se está editando)
    const isDuplicate = existingSuppliers.some(
      (s) => s.taxId === value && (!supplier || s.id !== supplier.id)
    );
    if (isDuplicate) {
      return 'El número de documento ya se encuentra registrado';
    }
    return null;
  };

  const validateEmail = (value: string): string | null => {
    if (!value.trim()) return REQUIRED_MSG;
    // Verificar unicidad contra proveedores existentes (excluir el proveedor actual si se está editando)
    const isDuplicate = existingSuppliers.some(
      (s) => s.email?.toLowerCase() === value.trim().toLowerCase() && (!supplier || s.id !== supplier.id)
    );
    if (isDuplicate) {
      return 'El email ya se encuentra registrado';
    }
    return null;
  };

  const validateAddress = (value: string): string | null => {
    if (!value.trim()) return REQUIRED_MSG;
    return null;
  };

  // ── Validación completa del formulario ──
  const validateAll = (): boolean => {
    const newErrors: Record<string, string> = {};

    const taxIdErr = validateTaxId(formData.taxId);
    if (taxIdErr) newErrors.taxId = taxIdErr;

    const nameErr = validateName(formData.name);
    if (nameErr) newErrors.name = nameErr;

    if (formData.supplierType === 'juridica') {
      const contactErr = validateContactPerson(formData.contactPerson);
      if (contactErr) newErrors.contactPerson = contactErr;
    }

    const emailErr = validateEmail(formData.email);
    if (emailErr) newErrors.email = emailErr;

    const phoneErr = validatePhone(formData.phone);
    if (phoneErr) newErrors.phone = phoneErr;

    const addressErr = validateAddress(formData.address);
    if (addressErr) newErrors.address = addressErr;

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Departamentos de Colombia
  const departments = [
    'Amazonas', 'Antioquia', 'Arauca', 'Atlántico', 'Bolívar', 'Boyacá', 'Caldas',
    'Caquetá', 'Casanare', 'Cauca', 'Cesar', 'Chocó', 'Córdoba', 'Cundinamarca',
    'Guainía', 'Guaviare', 'Huila', 'La Guajira', 'Magdalena', 'Meta', 'Nariño',
    'Norte de Santander', 'Putumayo', 'Quindío', 'Risaralda', 'San Andrés y Providencia',
    'Santander', 'Sucre', 'Tolima', 'Valle del Cauca', 'Vaupés', 'Vichada'
  ];

  // Ciudades principales por departamento
  const citiesByDepartment = {
    'Antioquia': ['Medellín', 'Bello', 'Envigado', 'Itagüí', 'Rionegro', 'Sabaneta', 'La Estrella', 'Caldas'],
    'Atlántico': ['Barranquilla', 'Soledad', 'Malambo', 'Sabanalarga', 'Puerto Colombia'],
    'Bogotá D.C.': ['Bogotá'],
    'Bolívar': ['Cartagena', 'Magangué', 'Turbaco', 'Arjona'],
    'Boyacá': ['Tunja', 'Duitama', 'Sogamoso', 'Chiquinquirá'],
    'Caldas': ['Manizales', 'La Dorada', 'Chinchiná', 'Villamaría'],
    'Caquetá': ['Florencia', 'San Vicente del Caguán'],
    'Cauca': ['Popayán', 'Santander de Quilichao', 'Puerto Tejada'],
    'Cesar': ['Valledupar', 'Aguachica', 'Bosconia'],
    'Córdoba': ['Montería', 'Cereté', 'Lorica', 'Sahagún'],
    'Cundinamarca': ['Soacha', 'Fusagasugá', 'Chía', 'Zipaquirá', 'Facatativá', 'Girardot'],
    'Huila': ['Neiva', 'Pitalito', 'Garzón', 'La Plata'],
    'La Guajira': ['Riohacha', 'Maicao', 'Uribia'],
    'Magdalena': ['Santa Marta', 'Ciénaga', 'Fundación'],
    'Meta': ['Villavicencio', 'Acacías', 'Granada'],
    'Nariño': ['Pasto', 'Tumaco', 'Ipiales'],
    'Norte de Santander': ['Cúcuta', 'Ocaña', 'Pamplona', 'Villa del Rosario'],
    'Quindío': ['Armenia', 'Calarcá', 'La Tebaida', 'Montenegro'],
    'Risaralda': ['Pereira', 'Dosquebradas', 'Santa Rosa de Cabal', 'La Virginia'],
    'Santander': ['Bucaramanga', 'Floridablanca', 'Girón', 'Piedecuesta', 'Barrancabermeja'],
    'Sucre': ['Sincelejo', 'Corozal', 'San Marcos'],
    'Tolima': ['Ibagué', 'Espinal', 'Melgar', 'Honda'],
    'Valle del Cauca': ['Cali', 'Palmira', 'Buenaventura', 'Tuluá', 'Cartago', 'Buga', 'Jamundí', 'Yumbo']
  };

  // Obtener ciudades según el departamento seleccionado
  const availableCities = citiesByDepartment[formData.department] || ['Otra'];

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Ejecutar todas las validaciones antes del envío
    if (!validateAll()) {
      toast.error('Por favor corrige los errores en el formulario antes de continuar.');
      return;
    }

    // Si es tipo natural, asegurar que contactPerson esté vacío o sea igual al nombre
    const dataToSave = {
      ...formData,
      contactPerson: formData.supplierType === 'natural' ? formData.name : formData.contactPerson
    };

    try {
      setIsSubmitting(true);
      await onSave(dataToSave);
    } catch (err) {
      // Error handled by parent toast, keep modal open
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    const updatedData = {
      ...formData,
      [name]: value
    };

    // Si cambia a tipo natural, limpiar el campo de persona de contacto
    if (name === 'supplierType' && value === 'natural') {
      updatedData.contactPerson = '';
    }

    // Si cambia el departamento, resetear la ciudad a la primera del departamento
    if (name === 'department') {
      const newCities = citiesByDepartment[value] || ['Otra'];
      updatedData.city = newCities[0];
    }

    setFormData(updatedData);

    // Validación en tiempo real: limpiar error del campo al escribir
    const newErrors = { ...errors };

    if (name === 'name') {
      const err = validateName(value);
      if (err) newErrors.name = err; else delete newErrors.name;
    }
    if (name === 'contactPerson') {
      const err = validateContactPerson(value);
      if (err) newErrors.contactPerson = err; else delete newErrors.contactPerson;
    }
    if (name === 'phone') {
      const err = validatePhone(value);
      if (err) newErrors.phone = err; else delete newErrors.phone;
    }
    if (name === 'taxId') {
      const err = validateTaxId(value);
      if (err) newErrors.taxId = err; else delete newErrors.taxId;
    }
    if (name === 'email') {
      const err = validateEmail(value);
      if (err) newErrors.email = err; else delete newErrors.email;
    }
    if (name === 'address') {
      const err = validateAddress(value);
      if (err) newErrors.address = err; else delete newErrors.address;
    }

    setErrors(newErrors);
  };

  // Helper para clases de input con error
  const inputClass = (field: string) =>
    `w-full px-4 py-3 border ${errors[field] ? 'border-red-400 ring-2 ring-red-200' : 'border-gray-300'
    } rounded-xl focus:ring-2 focus:ring-pink-300 focus:border-transparent`;

  // Comprobar si el formulario tiene errores activos
  const hasErrors = Object.keys(errors).length > 0;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header - Fixed at top */}
        <div className="bg-gradient-to-r from-pink-500 to-purple-600 p-5 text-white shrink-0 shadow-md z-20">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm shadow-inner">
                <Truck className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold leading-tight">
                  {supplier ? 'Editar Proveedor' : 'Registrar Nuevo Proveedor'}
                </h3>
                <p className="text-pink-100 text-sm">
                  {supplier ? 'Actualiza los datos comerciales y de contacto' : 'Ingresa la información para el nuevo aliado comercial'}
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
        <div className="flex-1 overflow-y-auto p-6 lg:p-8 bg-gray-50/30 no-scrollbar">
          <style>{`
            .no-scrollbar::-webkit-scrollbar { display: none; }
            .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
          `}</style>

          <form onSubmit={handleSubmit} className="max-w-4xl mx-auto space-y-6">
            {/* Form Alert */}
            {hasErrors && (
              <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-xl flex items-center space-x-3 animate-in slide-in-from-left-2 duration-200">
                <AlertCircle className="w-5 h-5 text-red-500" />
                <p className="text-sm text-red-700">Por favor, completa los campos obligatorios y corrige los errores.</p>
              </div>
            )}

            <div className="grid md:grid-cols-2 gap-6">
              {/* Basic Info Card */}
              <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-5">
                <div className="flex items-center space-x-2 text-purple-500">
                  <Package className="w-4 h-4" />
                  <h4 className="font-bold uppercase text-[10px] tracking-widest">Información Básica</h4>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">Tipo de Proveedor *</label>
                      <select
                        name="supplierType"
                        value={formData.supplierType}
                        onChange={handleInputChange}
                        disabled={supplier !== null}
                        className="w-full px-4 py-3 bg-gray-50/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-300 focus:border-transparent transition-all font-medium text-gray-700 disabled:opacity-50"
                      >
                        <option value="juridica">Persona Jurídica</option>
                        <option value="natural">Persona Natural</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">Documento / NIT *</label>
                      <input
                        type="text"
                        name="taxId"
                        value={formData.taxId}
                        onChange={handleInputChange}
                        className={`w-full px-4 py-3 bg-gray-50/50 border rounded-xl focus:ring-2 focus:ring-pink-300 focus:border-transparent transition-all font-medium text-gray-700 ${errors.taxId ? 'border-red-300' : 'border-gray-200'}`}
                        placeholder="Ej: 900.123.456-7"
                      />
                      {errors.taxId && <p className="text-[10px] text-red-500 mt-1 ml-1">{errors.taxId}</p>}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">
                      {formData.supplierType === 'juridica' ? 'Razón Social / Empresa *' : 'Nombre Completo *'}
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      className={`w-full px-4 py-3 bg-gray-50/50 border rounded-xl focus:ring-2 focus:ring-pink-300 focus:border-transparent transition-all font-medium text-gray-700 ${errors.name ? 'border-red-300' : 'border-gray-200'}`}
                      placeholder="Nombre comercial"
                    />
                    {errors.name && <p className="text-[10px] text-red-500 mt-1 ml-1">{errors.name}</p>}
                  </div>

                  {formData.supplierType === 'juridica' && (
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">Persona de Contacto *</label>
                      <input
                        type="text"
                        name="contactPerson"
                        value={formData.contactPerson}
                        onChange={handleInputChange}
                        className={`w-full px-4 py-3 bg-gray-50/50 border rounded-xl focus:ring-2 focus:ring-pink-300 focus:border-transparent transition-all font-medium text-gray-700 ${errors.contactPerson ? 'border-red-300' : 'border-gray-200'}`}
                        placeholder="Nombre del representante"
                      />
                      {errors.contactPerson && <p className="text-[10px] text-red-500 mt-1 ml-1">{errors.contactPerson}</p>}
                    </div>
                  )}

                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">Estado</label>
                    <select
                      name="status"
                      value={formData.status}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 bg-gray-50/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-300 focus:border-transparent transition-all font-medium text-gray-700"
                    >
                      <option value="active">Activo</option>
                      <option value="inactive">Inactivo</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Contact Info Card */}
              <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-5">
                <div className="flex items-center space-x-2 text-pink-500">
                  <Phone className="w-4 h-4" />
                  <h4 className="font-bold uppercase text-[10px] tracking-widest">Datos de Contacto</h4>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">Correo Electrónico *</label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      className={`w-full px-4 py-3 bg-gray-50/50 border rounded-xl focus:ring-2 focus:ring-pink-300 focus:border-transparent transition-all font-medium text-gray-700 ${errors.email ? 'border-red-300' : 'border-gray-200'}`}
                      placeholder="ejemplo@proveedor.com"
                    />
                    {errors.email && <p className="text-[10px] text-red-500 mt-1 ml-1">{errors.email}</p>}
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">Teléfono de Contacto *</label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      className={`w-full px-4 py-3 bg-gray-50/50 border rounded-xl focus:ring-2 focus:ring-pink-300 focus:border-transparent transition-all font-medium text-gray-700 ${errors.phone ? 'border-red-300' : 'border-gray-200'}`}
                      placeholder="Número de 10 dígitos"
                    />
                    {errors.phone && <p className="text-[10px] text-red-500 mt-1 ml-1">{errors.phone}</p>}
                  </div>

                  <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 flex items-center space-x-3">
                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm shrink-0">
                      <Truck className="w-5 h-5 text-pink-400" />
                    </div>
                    <p className="text-[10px] text-gray-500 font-medium leading-tight">
                      Asegúrate de que los datos de contacto sean correctos para el envío de órdenes de compra.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Location Card */}
            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-5">
              <div className="flex items-center space-x-2 text-blue-500">
                <MapPin className="w-4 h-4" />
                <h4 className="font-bold uppercase text-[10px] tracking-widest">Ubicación y Dirección</h4>
              </div>

              <div className="grid md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">Departamento *</label>
                  <select
                    name="department"
                    value={formData.department}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-gray-50/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-300 focus:border-transparent transition-all font-medium text-gray-700"
                  >
                    {departments.map(dept => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">Ciudad *</label>
                  <select
                    name="city"
                    value={formData.city}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-gray-50/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-300 focus:border-transparent transition-all font-medium text-gray-700"
                  >
                    {availableCities.map(city => (
                      <option key={city} value={city}>{city}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">Dirección *</label>
                  <input
                    type="text"
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-3 bg-gray-50/50 border rounded-xl focus:ring-2 focus:ring-pink-300 focus:border-transparent transition-all font-medium text-gray-700 ${errors.address ? 'border-red-300' : 'border-gray-200'}`}
                    placeholder="Calle, Carrera, Barrio..."
                  />
                  {errors.address && <p className="text-[10px] text-red-500 mt-1 ml-1">{errors.address}</p>}
                </div>
              </div>
            </div>
          </form>
        </div>

        {/* Footer - Fixed at bottom */}
        <div className="p-5 bg-white border-t border-gray-100 flex flex-wrap gap-3 justify-end shrink-0 z-20">
          <button
            type="button"
            onClick={onClose}
            className="px-8 py-2.5 rounded-xl font-black text-gray-500 hover:bg-gray-200 hover:text-gray-800 active:scale-95 transition-all text-sm uppercase tracking-widest shadow-sm"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || hasErrors}
            className="px-8 py-2.5 bg-gradient-to-r from-pink-400 to-purple-500 text-white rounded-xl font-black hover:shadow-lg active:scale-95 transition-all text-sm uppercase tracking-widest shadow-md flex items-center space-x-2"
          >
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>{supplier ? 'Actualizar Proveedor' : 'Registrar Proveedor'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

// Delete Confirmation Modal Component
function DeleteConfirmationModal({ supplier, hasPurchases, isChecking, onClose, onConfirm }) {
  const isDanger = !hasPurchases;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Standardized Header */}
        <div className={`bg-gradient-to-r ${isDanger ? 'from-red-500 to-pink-600' : 'from-orange-500 to-amber-600'} p-5 text-white shrink-0 shadow-md`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm shadow-inner">
                {isChecking ? (
                  <Loader2 className="w-6 h-6 text-white animate-spin" />
                ) : hasPurchases ? (
                  <AlertTriangle className="w-6 h-6 text-white" />
                ) : (
                  <AlertCircle className="w-6 h-6 text-white" />
                )}
              </div>
              <div>
                <h3 className="text-xl font-bold leading-tight">
                  {isChecking ? 'Verificando...' : hasPurchases ? 'Atención' : 'Confirmar Eliminación'}
                </h3>
                <p className={`${isDanger ? 'text-red-100' : 'text-orange-100'} text-xs font-medium`}>
                  {isChecking ? 'Comprobando datos' : hasPurchases ? 'Existen registros vinculados' : 'Esta acción no se puede deshacer'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              disabled={isChecking}
              className="w-9 h-9 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/30 hover:scale-110 active:scale-95 transition-all shadow-sm disabled:opacity-50"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>

        <div className="p-8">
          <div className="text-center mb-8">
            <div className={`w-20 h-20 ${isDanger ? 'bg-red-50 border-red-100' : 'bg-orange-50 border-orange-100'} rounded-2xl flex items-center justify-center mx-auto mb-4 border rotate-3`}>
              {isChecking ? (
                <Loader2 className={`w-10 h-10 ${isDanger ? 'text-red-500' : 'text-orange-500'} -rotate-3 animate-spin`} />
              ) : hasPurchases ? (
                <AlertTriangle className={`w-10 h-10 ${isDanger ? 'text-red-500' : 'text-orange-500'} -rotate-3`} />
              ) : (
                <AlertCircle className={`w-10 h-10 ${isDanger ? 'text-red-500' : 'text-orange-500'} -rotate-3`} />
              )}
            </div>
            
            <h4 className="text-lg font-bold text-gray-800 mb-2">
              {isChecking ? 'Verificando compras asociadas' : hasPurchases ? 'Proveedor en uso' : `¿Eliminar a ${supplier.name}?`}
            </h4>
            
            <p className="text-sm text-gray-500 leading-relaxed mb-6">
              {isChecking ? (
                'Por favor espera un momento mientras validamos el historial del proveedor.'
              ) : hasPurchases ? (
                <>Este proveedor tiene <span className="font-bold text-gray-800">órdenes de compra registradas</span> en el sistema. Por seguridad e integridad contable, no puede ser eliminado.</>
              ) : (
                'Estás a punto de eliminar este proveedor de forma permanente. Todos sus datos de contacto comerciales serán borrados.'
              )}
            </p>

            <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 flex flex-col space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Documento:</span>
                <span className="font-bold text-gray-700">{supplier.taxId}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Nombre:</span>
                <span className="font-bold text-gray-700">{supplier.name}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Tipo:</span>
                <span className="font-bold text-gray-700">{supplier.supplierType === 'juridica' ? 'Persona Jurídica' : 'Persona Natural'}</span>
              </div>
            </div>
          </div>

          <div className="flex space-x-3">
             {hasPurchases || isChecking ? (
               <button
                 onClick={onClose}
                 disabled={isChecking}
                 className="w-full bg-gray-100 text-gray-500 px-6 py-3 rounded-xl font-black hover:bg-gray-200 transition-all text-[10px] uppercase tracking-widest shadow-sm disabled:opacity-50"
               >
                 Entendido
               </button>
             ) : (
               <>
                 <button
                   onClick={onClose}
                   className="flex-1 px-6 py-3 rounded-xl font-black text-gray-400 hover:bg-gray-100 transition-all text-[10px] uppercase tracking-widest"
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
               </>
             )}
          </div>
        </div>
      </div>
    </div>
  );
}