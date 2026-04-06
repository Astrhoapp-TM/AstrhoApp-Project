import React, { useState, useEffect } from 'react';
import {
  FolderTree, Plus, Edit, Trash2, Search, AlertCircle, X, Save,
  Eye, CheckCircle, Star, RefreshCw
} from 'lucide-react';
import { mockProducts } from '@/shared/data/management';
import { SimplePagination } from '@/shared/components/ui/simple-pagination';
import { supplyCategoryService, type Category as APICategory } from '../services/supplyCategoryService';

// Helper: ASP.NET with ReferenceHandler.Preserve wraps arrays in { $values: [...] }
function unwrapValues(obj: any): any {
  if (obj == null) return obj;
  if (Array.isArray(obj)) return obj.map(unwrapValues);
  if (typeof obj === 'object') {
    if (Array.isArray(obj.$values)) {
      return obj.$values.map(unwrapValues);
    }
    const result: any = {};
    for (const key of Object.keys(obj)) {
      if (key === '$id' || key === '$ref') continue;
      result[key] = unwrapValues(obj[key]);
    }
    return result;
  }
  return obj;
}

interface CategoryManagementProps {
  hasPermission: (permission: string) => boolean;
}

export function CategoryManagement({ hasPermission }: CategoryManagementProps) {
  const [categories, setCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
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

  // Map API category to UI category
  const mapCategoryToUI = (apiCat: APICategory) => ({
    id: apiCat.categoriaId,
    name: apiCat.nombre,
    description: apiCat.descripcion,
    status: apiCat.estado ? 'active' : 'inactive',
    productCount: apiCat.cantidadProductos || 0,
    createdAt: apiCat.fechaCreacion || new Date().toISOString().split('T')[0],
    updatedAt: apiCat.fechaActualizacion || new Date().toISOString().split('T')[0],
    type: 'product' // Default type as per requirement
  });

  // Map UI category to API category
  const mapCategoryToAPI = (uiCat: any): Omit<APICategory, 'categoriaId'> => ({
    nombre: uiCat.name,
    descripcion: uiCat.description,
    estado: uiCat.status === 'active'
  });

  // Auto-hide success alert after 4 seconds
  useEffect(() => {
    if (showSuccessAlert) {
      const timer = setTimeout(() => {
        setShowSuccessAlert(false);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [showSuccessAlert]);

  const fetchCategories = async () => {
    setIsLoading(true);
    try {
      const response = await supplyCategoryService.getCategories({
        page: currentPage,
        pageSize: itemsPerPage,
        search: searchTerm
      });

      const data = response.data || [];
      setTotalCount(response.totalCount || 0);
      setTotalPages(response.totalPages || 0);

      setCategories(unwrapValues(data).map(mapCategoryToUI));
      setError(null);
    } catch (err) {
      console.error('Error fetching categories:', err);
      setError('No se pudieron cargar las categorías. Por favor, intente de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, [currentPage, searchTerm]);

  // Reset page when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  // Ya no filtramos en el cliente, usamos lo que viene de la API
  const paginatedCategories = categories;

  const handleViewDetail = async (category: any) => {
    try {
      setIsLoading(true);
      const fullCategory = await supplyCategoryService.getCategoryById(category.id);
      setSelectedCategory(mapCategoryToUI(fullCategory));
      setShowDetailModal(true);
    } catch (error) {
      console.error('Error fetching category detail:', error);
      // Fallback
      setSelectedCategory(category);
      setShowDetailModal(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditCategory = (category: any) => {
    setSelectedCategory(category);
    setShowEditModal(true);
  };

  const handleDeleteCategory = (category: any) => {
    setSelectedCategory(category);
    setShowDeleteModal(true);
  };

  const confirmDeleteCategory = async () => {
    const hasProducts = getProductsByCategory(selectedCategory.id).length > 0;

    if (hasProducts) {
      setErrorModalMessage('No se puede eliminar una categoría que tiene insumos asociados. Por favor, reasigne o elimine los insumos primero.');
      setShowErrorModal(true);
      return;
    }

    const categoryName = selectedCategory.name;
    try {
      await supplyCategoryService.deleteCategory(selectedCategory.id);
      setCategories(categories.filter((c: any) => c.id !== selectedCategory.id));
      setShowDeleteModal(false);
      setSelectedCategory(null);

      // Mostrar alerta de eliminación exitosa
      setShowSuccessAlert(true);
      setAlertMessage(`Categoría "${categoryName}" eliminada correctamente`);
    } catch (err) {
      console.error('Error deleting category:', err);
      setErrorModalMessage('No se pudo eliminar la categoría. Es posible que existan dependencias en el sistema.');
      setShowErrorModal(true);
    }
  };

  const handleToggleCategoryStatus = async (categoryId: number) => {
    const category = categories.find((c: any) => c.id === categoryId);
    if (!category) return;

    try {
      const newStatus = category.status === 'active' ? 'inactive' : 'active';
      const categoryToUpdate = { ...category, status: newStatus };
      const apiData = mapCategoryToAPI(categoryToUpdate);

      const updatedAPICategory = await supplyCategoryService.updateCategory(categoryId, apiData);

      setCategories(categories.map((c: any) =>
        c.id === categoryId
          ? mapCategoryToUI(updatedAPICategory)
          : c
      ));

      setAlertMessage(`Estado de "${category.name}" actualizado a ${newStatus === 'active' ? 'Activo' : 'Inactivo'}`);
      setShowSuccessAlert(true);
    } catch (err) {
      console.error('Error toggling category status:', err);
      setErrorModalMessage('No se pudo actualizar el estado de la categoría. Verifique su conexión e intente de nuevo.');
      setShowErrorModal(true);
    }
  };

  // Pagination handlers
  const goToPage = (page: number) => {
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

  const handleSaveCategory = async (categoryData: any) => {
    try {
      if (selectedCategory) {
        // Edit existing category - merge to ensure we have all fields
        const updatedData = { ...selectedCategory, ...categoryData };
        const updatedAPI = await supplyCategoryService.updateCategory(
          (selectedCategory as any).id,
          mapCategoryToAPI(updatedData)
        );

        setCategories(categories.map((c: any) =>
          c.id === (selectedCategory as any).id
            ? mapCategoryToUI(updatedAPI)
            : c
        ));
        setAlertMessage(`Categoría "${categoryData.name}" actualizada correctamente`);
      } else {
        // Create new category
        const createdAPI = await supplyCategoryService.createCategory(mapCategoryToAPI(categoryData) as APICategory);
        setCategories([...categories, mapCategoryToUI(createdAPI)]);
        setAlertMessage(`Categoría "${categoryData.name}" creada correctamente`);
      }
      setShowSuccessAlert(true);
      setShowEditModal(false);
    } catch (err: any) {
      console.error('Error saving category:', err);
      const isDuplicate = err.message?.toLowerCase().includes('ya existe') ||
        err.message?.toLowerCase().includes('already') ||
        err.message?.includes('400') ||
        err.message?.toLowerCase().includes('duplicate');

      setErrorModalMessage(isDuplicate
        ? 'Este registro ya existe. por favor ingrese otro diferente'
        : 'Error al guardar la categoría. Por favor, verifique que todos los campos sean válidos e intente de nuevo.');
      setShowErrorModal(true);
    }
  };

  const handleCreateCategory = () => {
    setSelectedCategory(null);
    setShowEditModal(true);
  };

  const getProductsByCategory = (categoryId: number) => {
    const category = categories.find(c => c.id === categoryId);
    return mockProducts.filter(product => product.category === category?.name) || [];
  };

  const getCategoryMetrics = (category: any) => {
    const products = getProductsByCategory(category.id);
    const productCount = products.length;
    const totalValue = products.reduce((sum, p) => sum + (p.stock * p.price), 0);
    const lowStockCount = products.filter(p => p.stock <= p.minStock).length;

    return {
      productCount,
      totalValue,
      lowStockCount
    };
  };

  // Calculate totals
  const totalCategories = categories.length;
  const activeCategories = categories.filter(c => c.status === 'active');

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-bold text-gray-800">Categoría de Insumos</h2>
          <p className="text-gray-600">
            Organiza insumos por categorías para mejor gestión del inventario
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
              placeholder="Buscar categorías por nombre o descripción..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-pink-300 focus:border-transparent"
            />
          </div>

          <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
            <button
              onClick={fetchCategories}
              className="p-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors flex items-center justify-center"
              title="Recargar datos"
            >
              <RefreshCw className="w-5 h-5" />
            </button>

            {hasPermission('manage_categories') && (
              <button
                onClick={handleCreateCategory}
                className="w-full md:w-auto bg-gradient-to-r from-pink-400 to-purple-500 text-white px-6 py-3 rounded-xl font-semibold hover:shadow-lg transition-all flex items-center justify-center space-x-2 whitespace-nowrap"
              >
                <Plus className="w-5 h-5" />
                <span>Registrar Categoría</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Categories List */}
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-pink-50 to-purple-50">
              <tr>
                <th className="px-6 py-4 text-left font-semibold text-gray-800">Nombre</th>
                <th className="px-6 py-4 text-left font-semibold text-gray-800">Descripción</th>
                <th className="px-6 py-4 text-left font-semibold text-gray-800">Estado</th>
                <th className="px-6 py-4 text-left font-semibold text-gray-800">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center justify-center space-y-4">
                      <div className="w-12 h-12 border-4 border-pink-200 border-t-pink-500 rounded-full animate-spin"></div>
                      <p className="text-gray-500 font-medium">Cargando categorías...</p>
                    </div>
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center justify-center space-y-4 text-red-500">
                      <AlertCircle className="w-12 h-12" />
                      <p className="font-medium">{error}</p>
                      <button
                        onClick={fetchCategories}
                        className="text-pink-600 hover:text-pink-700 font-semibold underline"
                      >
                        Reintentar
                      </button>
                    </div>
                  </td>
                </tr>
              ) : paginatedCategories.map((category) => {
                return (
                  <tr key={category.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-gray-800">{category.name}</div>
                    </td>

                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-600 max-w-md">{category.description}</div>
                    </td>

                    <td className="px-6 py-4">
                      {hasPermission('manage_categories') ? (
                        <div className="flex items-center space-x-3">
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={category.status === 'active'}
                              onChange={() => handleToggleCategoryStatus(category.id)}
                              className="sr-only peer"
                            />
                            <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-pink-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-pink-400 peer-checked:to-purple-500"></div>
                            <span className={`ml-3 text-sm font-medium ${category.status === 'active' ? 'text-green-600' : 'text-red-600'
                              }`}>
                              {category.status === 'active' ? 'Activo' : 'Inactivo'}
                            </span>
                          </label>
                        </div>
                      ) : (
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${category.status === 'active'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                          }`}>
                          {category.status === 'active' ? 'Activo' : 'Inactivo'}
                        </span>
                      )}
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => {
                            setSelectedCategory(category);
                            setShowDetailModal(true);
                          }}
                          className="p-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                          title="Ver Detalle"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {hasPermission('manage_categories') && (
                          <>
                            <button
                              onClick={() => handleEditCategory(category)}
                              className="p-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
                              title="Editar"
                            >
                              <Edit className="w-4 h-4" />
                            </button>

                            <button
                              onClick={() => handleDeleteCategory(category)}
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
                );
              })}
            </tbody>
          </table>

          {paginatedCategories.length === 0 && (
            <div className="text-center py-20 bg-gray-50/50">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <FolderTree className="w-10 h-10 text-gray-300" />
              </div>
              <h3 className="text-xl font-bold text-gray-800">No se encontraron categorías</h3>
              <p className="text-gray-500">Ajusta tu búsqueda o crea una nueva categoría.</p>
            </div>
          )}
        </div>

        {/* Pagination */}
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

      {/* Category Edit Modal */}
      {showEditModal && (
        <CategoryEditModal
          category={selectedCategory}
          onClose={() => setShowEditModal(false)}
          onSave={handleSaveCategory}
        />
      )}

      {/* Category Detail Modal */}
      {showDetailModal && (
        <CategoryDetailModal
          category={selectedCategory}
          onClose={() => setShowDetailModal(false)}
          getProductsByCategory={getProductsByCategory}
        />
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <DeleteConfirmationModal
          category={selectedCategory}
          onClose={() => setShowDeleteModal(false)}
          onConfirm={confirmDeleteCategory}
        />
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

      {/* Error Modal */}
      {showErrorModal && (
        <ErrorModal
          message={errorModalMessage}
          onClose={() => setShowErrorModal(false)}
        />
      )}
    </div>
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

// Category Edit Modal Component
function CategoryEditModal({ category, onClose, onSave }) {
  const [formData, setFormData] = useState({
    name: category?.name || '',
    description: category?.description || '',
    status: category?.status || 'active'
  });

  const [errors, setErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const newErrors = {};
    if (!formData.name.trim()) newErrors.name = 'El nombre es requerido';
    if (!formData.description.trim()) newErrors.description = 'La descripción es requerida';

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
      [name]: value
    });

    if (errors[name]) {
      setErrors({ ...errors, [name]: '' });
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header - Fixed at top */}
        <div className="bg-gradient-to-r from-pink-500 to-purple-600 p-5 text-white shrink-0 shadow-md z-20">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <FolderTree className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold leading-tight">
                  {category ? 'Editar Categoría' : 'Registrar Nueva Categoría'}
                </h3>
                <p className="text-pink-100 text-sm">
                  {category ? `Actualizando ${category.name}` : 'Complete la información para la nueva categoría'}
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
        <form onSubmit={handleSubmit} id="category-form" className="flex-1 overflow-y-auto p-6 lg:p-8 bg-gray-50/30 no-scrollbar">
          <style>{`
            .no-scrollbar::-webkit-scrollbar { display: none; }
            .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
          `}</style>

          <div className="max-w-2xl mx-auto space-y-6">
            {/* Errors Notification */}
            {Object.keys(errors).length > 0 && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-2xl flex items-center space-x-3 animate-in fade-in duration-300">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <p className="font-semibold text-sm">Por favor corrija los errores en el formulario</p>
              </div>
            )}

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-6 py-4 bg-gray-50/50 border-b border-gray-100 flex items-center space-x-2">
                <FolderTree className="w-4 h-4 text-pink-500" />
                <h4 className="font-bold text-gray-700 text-sm uppercase tracking-wider">Detalles de la Categoría</h4>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">Nombre de la Categoría</label>
                  <div className="relative">
                    <FolderTree className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      className={`w-full pl-10 pr-4 py-3 bg-gray-50 border rounded-xl focus:ring-2 focus:ring-pink-300 focus:border-transparent transition-all outline-none ${errors.name ? 'border-red-300 ring-1 ring-red-100' : 'border-gray-200'
                        }`}
                      placeholder="Ej: Cuidado Capilar, Tratamientos..."
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">Descripción</label>
                  <div className="relative">
                    <AlertCircle className="absolute left-3 top-3 text-gray-400 w-4 h-4" />
                    <textarea
                      name="description"
                      value={formData.description}
                      onChange={handleInputChange}
                      rows={3}
                      className={`w-full pl-10 pr-4 py-3 bg-gray-50 border rounded-xl focus:ring-2 focus:ring-pink-300 focus:border-transparent transition-all outline-none ${errors.description ? 'border-red-300 ring-1 ring-red-100' : 'border-gray-200'
                        }`}
                      placeholder="Describa qué incluye esta categoría..."
                    />
                  </div>
                </div>

                {category && (
                  <div className="pt-2">
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Estado de la Categoría</label>
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
            form="category-form"
            type="submit"
            disabled={isSaving}
            className="px-8 py-2.5 rounded-xl font-black text-white bg-gradient-to-r from-pink-500 to-purple-600 active:scale-95 transition-all text-sm uppercase tracking-widest shadow-lg hover:shadow-pink-200 disabled:opacity-50 flex items-center space-x-2"
          >
            {isSaving ? <CheckCircle className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>{category ? 'Actualizar' : 'Registrar'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

// Category Detail Modal Component
function CategoryDetailModal({ category, onClose, getProductsByCategory }) {
  const products = getProductsByCategory(category.id);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header - Fixed at top */}
        <div className="bg-gradient-to-r from-pink-500 to-purple-600 p-5 text-white shrink-0 shadow-md z-20">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <FolderTree className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold leading-tight">Detalles de la Categoría</h3>
                <p className="text-pink-100 text-sm">{category.name}</p>
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

          <div className="max-w-2xl mx-auto space-y-6">
            {/* Main Info Card */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-6 py-4 bg-gray-50/50 border-b border-gray-100 flex items-center space-x-2">
                <FolderTree className="w-4 h-4 text-purple-500" />
                <h4 className="font-bold text-gray-700 text-sm uppercase tracking-wider">Información General</h4>
              </div>
              <div className="p-6 space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Nombre</span>
                    <p className="font-bold text-gray-800 text-lg">{category.name}</p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Estado</span>
                    <div className="mt-1">
                      {category.status === 'active' ? (
                        <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-green-100 text-green-700 border border-green-200">
                          Activa
                        </span>
                      ) : (
                        <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-gray-100 text-gray-600 border border-gray-200">
                          Inactiva
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Descripción Detallada</span>
                  <p className="text-gray-700 italic">{category.description || 'Sin descripción disponible'}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center space-x-3 p-3 bg-blue-50/50 rounded-xl border border-blue-100">
                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center text-blue-500">
                      <CheckCircle className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-[9px] font-black text-blue-400 uppercase tracking-widest block">Insumos Asociados</span>
                      <span className="font-bold text-blue-700">{products.length} productos</span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3 p-3 bg-pink-50/50 rounded-xl border border-pink-100">
                    <div className="w-8 h-8 bg-pink-100 rounded-lg flex items-center justify-center text-pink-500">
                      <FolderTree className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-[9px] font-black text-pink-400 uppercase tracking-widest block">Tipo Categoría</span>
                      <span className="font-bold text-pink-700">Insumos/Productos</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Resumen Card */}
            <div className="bg-gradient-to-br from-pink-50 to-purple-50 rounded-3xl p-6 border border-pink-100 shadow-sm">
              <div className="flex items-center space-x-3 mb-3">
                <Star className="w-5 h-5 text-pink-400" />
                <h4 className="font-black text-[10px] uppercase tracking-[0.2em] text-gray-700">Resumen Asthro</h4>
              </div>
              <p className="text-sm text-gray-600 italic leading-relaxed">
                Las categorías permiten organizar el inventario para facilitar el control de stock y auditorías periódicas.
              </p>
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

// Delete Confirmation Modal Component
function DeleteConfirmationModal({ category, onConfirm, onClose }) {
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
              ¿Eliminar categoría "{category.name}"?
            </h4>
            <p className="text-sm text-gray-500 leading-relaxed mb-6">
              Estás a punto de eliminar esta categoría de forma permanente.
              Esta acción no se puede deshacer y puede afectar los registros asociados.
            </p>

            <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 flex items-center space-x-4">
              <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center">
                <FolderTree className="w-6 h-6 text-pink-500" />
              </div>
              <div className="text-left">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Categoría a eliminar</p>
                <p className="font-bold text-gray-700">{category.name}</p>
                <p className="text-[10px] text-gray-400 uppercase">{category.productCount} productos asociados</p>
              </div>
            </div>
          </div>

          <div className="flex space-x-3">
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
          </div>
        </div>
      </div>
    </div>
  );
}