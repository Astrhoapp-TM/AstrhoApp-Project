import React, { useState, useEffect, useRef } from 'react';
import {
  Package, Plus, Edit, Trash2, Search, AlertCircle, X, Save,
  Eye, CheckCircle, TrendingUp, FileText, Star, Loader2, ChevronsUpDown, FolderTree, RefreshCw
} from 'lucide-react';
import { mockProducts } from '@/shared/data/management';
import { SimplePagination } from '@/shared/components/ui/simple-pagination';
import { cn } from '@/shared/components/ui/utils';
import { supplyCategoryService, type Category as APICategory } from '@/features/categories/services/supplyCategoryService';
import { supplyService, type Supply as APISupply } from '@/features/supply/services/supplyService';
import { toast } from 'sonner';

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

interface Product {
  id: number;
  name: string;
  description: string;
  sku: string;
  category: string;
  categoryId: number;
  status: 'active' | 'inactive';
  quantity: number;
}

interface ProductManagementProps {
  hasPermission: (permission: string) => boolean;
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'active': return 'bg-green-100 text-green-800';
    case 'inactive': return 'bg-red-100 text-red-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

const getStatusLabel = (status: string) => {
  switch (status) {
    case 'active': return 'Activo';
    case 'inactive': return 'Inactivo';
    default: return status;
  }
};

export function ProductManagement({ hasPermission }: ProductManagementProps) {

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<APICategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorModalMessage, setErrorModalMessage] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showProductModal, setShowProductModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(5);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [showSuccessAlert, setShowSuccessAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');

  // Map API Supply to UI model
  const mapSupplyToUI = (supply: APISupply, fallbackCategory?: string): Product => ({
    id: supply.insumoId,
    name: supply.nombre,
    description: supply.descripcion || '',
    sku: supply.sku,
    category: supply.categoriaNombre || fallbackCategory || 'Sin categoría',
    categoryId: supply.categoriaId,
    status: supply.estado ? 'active' : 'inactive',
    quantity: supply.stock || 0
  });

  const fetchInitialData = async () => {
    setIsLoading(true);
    try {
      const response = await supplyCategoryService.getCategories({ pageSize: 100 });
      const categoriesData = response.data || [];
      setCategories(unwrapValues(categoriesData));
      await fetchProducts();
    } catch (error: any) {
      console.error('Error fetching categories:', error);
      setErrorModalMessage(error.message || 'No se pudieron cargar las categorías.');
      setShowErrorModal(true);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchProducts = async () => {
    setIsLoading(true);
    try {
      const response = await supplyService.getSupplies({
        page: currentPage,
        pageSize: itemsPerPage,
        search: debouncedSearchTerm
      });

      console.log('Supplies data received:', response);

      const suppliesArray = response.data || [];
      setTotalCount(response.totalCount || 0);
      setTotalPages(response.totalPages || 0);

      setProducts(unwrapValues(suppliesArray).map((supply: APISupply) => mapSupplyToUI(supply)));
    } catch (error: any) {
      console.error('Error fetching products:', error);
      setErrorModalMessage(error.message || 'No se pudieron cargar los insumos.');
      setShowErrorModal(true);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [currentPage, debouncedSearchTerm]);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchTerm]);

  // Debounce effect for search
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500); // 500ms delay

    return () => {
      clearTimeout(handler);
    };
  }, [searchTerm]);

  // Ya no filtramos en el cliente, usamos lo que viene de la API
  const paginatedProducts = products;

  // Pagination totalPages se obtiene de la API
  // const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);

  const handleViewDetail = async (product: any) => {
    try {
      setIsLoading(true);
      const fullSupply = await supplyService.getSupplyById(product.id);
      setSelectedProduct(mapSupplyToUI(fullSupply));
      setShowDetailModal(true);
    } catch (error) {
      console.error('Error fetching supply detail:', error);
      toast.error('No se pudo cargar el detalle del insumo');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteProduct = (product: Product) => {
    setProductToDelete(product);
    setShowDeleteModal(true);
  };

  const handleCreateProduct = () => {
    setSelectedProduct(null);
    setShowProductModal(true);
  };

  const handleEditProduct = (product: Product) => {
    setSelectedProduct(product);
    setShowProductModal(true);
  };

  const confirmDeleteProduct = async () => {
    if (!productToDelete) return;

    const productName = productToDelete.name;
    const productId = productToDelete.id;

    try {
      await supplyService.deleteSupply(productId);
      setProducts(products.filter(p => p.id !== productId));
      setAlertMessage(`Insumo "${productName}" eliminado correctamente`);
      setShowSuccessAlert(true);
    } catch (error) {
      console.error('Error deleting supply:', error);
      setErrorModalMessage('No se pudo eliminar el insumo. Por favor, intente de nuevo.');
      setShowErrorModal(true);
    } finally {
      setShowDeleteModal(false);
      setProductToDelete(null);
    }
  };

  const mapUIToSupply = (uiData: any, id?: number): APISupply => {
    return {
      insumoId: id || 0,
      sku: uiData.sku,
      nombre: uiData.name,
      descripcion: uiData.description || '',
      categoriaId: Number(uiData.categoryId) || 0,
      estado: uiData.status === 'active',
      stock: Number(uiData.quantity) || 0
    } as APISupply;
  };

  // Toggle status directly from listing
  const handleToggleStatus = async (product: Product) => {
    const newStatus = product.status === 'active' ? 'inactive' : 'active';
    // Optimistic update immediately in UI
    const optimisticProduct: Product = { ...product, status: newStatus };
    setProducts(prev => prev.map(p => p.id === product.id ? optimisticProduct : p));
    try {
      const apiData = mapUIToSupply({ ...product, status: newStatus }, product.id);
      const updatedSupply = await supplyService.updateSupply(product.id, apiData);
      // Sync with API response, preserving category name if API doesn't return it
      setProducts(prev => prev.map(p =>
        p.id === product.id ? mapSupplyToUI(updatedSupply, product.category) : p
      ));
      setAlertMessage(`Estado de "${product.name}" cambiado a ${newStatus === 'active' ? 'Activo' : 'Inactivo'}`);
      setShowSuccessAlert(true);
    } catch (error) {
      // Revert optimistic update on failure
      setProducts(prev => prev.map(p => p.id === product.id ? product : p));
      console.error('Error toggling status:', error);
      setErrorModalMessage('No se pudo cambiar el estado. Por favor, intente de nuevo.');
      setShowErrorModal(true);
    }
  };

  const handleSaveProduct = async (productData: any) => {
    try {
      if (selectedProduct) {
        const apiData = mapUIToSupply(productData, selectedProduct.id);
        const updatedSupply = await supplyService.updateSupply(selectedProduct.id, apiData);
        // Find the category name from the loaded categories list
        const categoryName = categories.find(
          (c) => c.categoriaId === Number(productData.categoryId)
        )?.nombre || selectedProduct.category;
        setProducts(prev => prev.map(p =>
          p.id === selectedProduct.id ? mapSupplyToUI(updatedSupply, categoryName) : p
        ));
        setAlertMessage(`Insumo "${productData.name}" actualizado correctamente`);
        setShowSuccessAlert(true);
      } else {
        const apiData = mapUIToSupply(productData);
        // Omit insumoId for creation if the service expects Omit<Supply, 'insumoId'>
        const { insumoId, ...createData } = apiData;
        const newSupply = await supplyService.createSupply(createData);
        // Find the category name from the loaded categories list
        const categoryName = categories.find(
          (c) => c.categoriaId === Number(productData.categoryId)
        )?.nombre || 'Sin categoría';
        setProducts(prev => [mapSupplyToUI(newSupply, categoryName), ...prev]);
        setAlertMessage(`Insumo "${productData.name}" registrado correctamente`);
        setShowSuccessAlert(true);
      }
      setShowProductModal(false);
    } catch (error: any) {
      console.error('Error saving supply:', error);
      const isDuplicate = error.message?.toLowerCase().includes('ya existe') ||
        error.message?.toLowerCase().includes('already') ||
        error.message?.includes('400') ||
        error.message?.toLowerCase().includes('duplicate');

      setErrorModalMessage(isDuplicate
        ? 'Este registro ya existe. por favor ingrese otro diferente'
        : 'Error al guardar el insumo. Por favor, verifique que todos los campos sean válidos e intente de nuevo.');
      setShowErrorModal(true);
    }
  };





  return (
    <div className="p-8">

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-bold text-gray-800">Gestión de Insumos</h2>
          <p className="text-gray-600">
            Control completo del inventario y características de insumos
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 translate-y-10">
          <div className="w-16 h-16 border-4 border-pink-200 border-t-pink-500 rounded-full animate-spin mb-4"></div>
          <p className="text-gray-500 font-medium animate-pulse">Cargando insumos...</p>
        </div>
      ) : (
        <>
          {/* Search and Register */}
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="w-full md:max-w-md relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Buscar por nombre o SKU..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-pink-300 focus:border-transparent"
                />
              </div>

              <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
                <button
                  onClick={fetchInitialData}
                  className="p-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors flex items-center justify-center"
                  title="Recargar datos"
                >
                  <RefreshCw className="w-5 h-5" />
                </button>

                {hasPermission('manage_products') && (
                  <button
                    onClick={handleCreateProduct}
                    className="w-full md:w-auto bg-gradient-to-r from-pink-400 to-purple-500 text-white px-6 py-3 rounded-xl font-semibold hover:shadow-lg transition-all flex items-center justify-center space-x-2 whitespace-nowrap"
                  >
                    <Plus className="w-5 h-5" />
                    <span>Registrar Insumo</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-6 border-b border-gray-100">
              <h3 className="text-xl font-bold text-gray-800">Lista de Insumos</h3>
              <p className="text-gray-600">
                {totalCount} insumo{totalCount !== 1 ? 's' : ''} encontrado{totalCount !== 1 ? 's' : ''}
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-pink-50 to-purple-50">
                  <tr>
                    <th className="px-6 py-4 text-left font-semibold text-gray-800">Nombre</th>
                    <th className="px-6 py-4 text-left font-semibold text-gray-800">SKU</th>
                    <th className="px-6 py-4 text-left font-semibold text-gray-800">Categoría</th>
                    <th className="px-6 py-4 text-left font-semibold text-gray-800">Stock</th>
                    <th className="px-6 py-4 text-left font-semibold text-gray-800">Estado</th>
                    <th className="px-6 py-4 text-left font-semibold text-gray-800">Acciones</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100">
                  {paginatedProducts.map(product => {
                    return (
                      <tr key={product.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 font-semibold text-gray-800">{product.name}</td>
                        <td className="px-6 py-4 text-gray-700">{product.sku}</td>
                        <td className="px-6 py-4 text-gray-700">{product.category}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded-md text-sm font-bold ${product.quantity <= 0 ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                            }`}>
                            {product.quantity} uds
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-3">
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                checked={product.status === 'active'}
                                onChange={() => handleToggleStatus(product)}
                                className="sr-only peer"
                                disabled={!hasPermission('manage_products')}
                              />
                              <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-pink-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-pink-400 peer-checked:to-purple-500"></div>
                              <span className={`ml-3 text-sm font-medium ${product.status === 'active' ? 'text-green-600' : 'text-red-600'
                                }`}>
                                {product.status === 'active' ? 'Activo' : 'Inactivo'}
                              </span>
                            </label>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleViewDetail(product)}
                              className="p-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200"
                            >
                              <Eye className="w-4 h-4" />
                            </button>

                            {hasPermission('manage_products') && (
                              <>
                                <button
                                  onClick={() => handleEditProduct(product)}
                                  className="p-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteProduct(product)}
                                  className="p-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200"
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
        </>
      )}

      {/* Modales */}
      {showProductModal && (
        <ProductModal
          product={selectedProduct}
          onClose={() => setShowProductModal(false)}
          onSave={handleSaveProduct}
          categories={categories}
        />
      )}

      {showDetailModal && selectedProduct && (
        <ProductDetailModal
          product={selectedProduct}
          onClose={() => setShowDetailModal(false)}
        />
      )}

      {showDeleteModal && productToDelete && (
        <DeleteConfirmModal
          productName={productToDelete.name}
          onConfirm={confirmDeleteProduct}
          onCancel={() => {
            setShowDeleteModal(false);
            setProductToDelete(null);
          }}
        />
      )}

      {showErrorModal && (
        <ErrorModal
          message={errorModalMessage}
          onClose={() => setShowErrorModal(false)}
        />
      )}

      {/* Success Alert - rendered at root level for highest z-index */}
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

    </div>
  );
}

// Error Modal Component
function ErrorModal({ message, onClose }: { message: string, onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" style={{ zIndex: 99999 }}>
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

// ══════════════════════════════════════════
// Reusable Search Select Component for Categories
// ══════════════════════════════════════════

function CategorySearchSelect({ onSelect, selectedId, error, disabled, initialData = [] }: any) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<any>(null);

  useEffect(() => {
    const fetchSelected = async () => {
      if (selectedId && !selectedCategory) {
        // First try to find in initialData
        const found = (initialData || []).find((cat: any) => String(cat.categoriaId) === String(selectedId));
        if (found) {
          setSelectedCategory(found);
          return;
        }

        try {
          const category = await supplyCategoryService.getCategoryById(parseInt(selectedId));
          setSelectedCategory(unwrapValues(category));
        } catch (e) {
          console.warn('Error fetching selected category:', e);
        }
      } else if (!selectedId) {
        setSelectedCategory(null);
      }
    };
    fetchSelected();
  }, [selectedId, selectedCategory, initialData]);

  useEffect(() => {
    const fetchCategories = async () => {
      // If searchTerm is empty, show initialData (all categories)
      if (!searchTerm.trim()) {
        setSearchResults(initialData || []);
        return;
      }

      setLoading(true);
      try {
        const res = await supplyCategoryService.getCategories({ search: searchTerm, pageSize: 20 });
        const data = Array.isArray(res) ? res : (res?.data || []);
        setSearchResults(unwrapValues(data));
      } catch (err) {
        console.error('Error searching categories:', err);
      } finally {
        setLoading(false);
      }
    };

    const timer = setTimeout(fetchCategories, searchTerm ? 300 : 0);
    return () => clearTimeout(timer);
  }, [searchTerm, initialData]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={`relative ${isOpen ? 'z-50' : ''}`} ref={dropdownRef}>
      <div
        className={cn(
          "w-full px-4 py-3 min-h-[48px] border rounded-xl flex items-center justify-between cursor-pointer bg-white transition-all",
          error ? 'border-red-300' : 'border-gray-300',
          isOpen && 'ring-2 ring-pink-100 border-pink-300',
          disabled && 'bg-gray-100 cursor-not-allowed opacity-100'
        )}
        onClick={() => !disabled && setIsOpen(true)}
      >
        {!isOpen && !selectedCategory ? (
          <div className="flex items-center gap-2">
            <FolderTree className="w-4 h-4 text-pink-400" />
            <span className="text-gray-500 text-sm">Seleccionar categoría...</span>
          </div>
        ) : !isOpen && selectedCategory ? (
          <div className="flex items-center gap-2">
            <FolderTree className="w-4 h-4 text-pink-400" />
            <span className="text-gray-800 font-medium text-sm">{selectedCategory.nombre}</span>
          </div>
        ) : (
          <div className="flex-1 flex items-center">
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin text-pink-400" /> : <Search className="text-gray-400 w-4 h-4 mr-2" />}
            <input
              type="text"
              className="w-full bg-transparent text-sm focus:outline-none"
              placeholder="Escribe para buscar..."
              value={searchTerm}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
              autoFocus
              onClick={(e: React.MouseEvent) => e.stopPropagation()}
            />
          </div>
        )}
        <ChevronsUpDown className={cn(
          "w-4 h-4 text-gray-500 transition-transform",
          isOpen && 'rotate-180'
        )} />
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-xl shadow-2xl overflow-hidden z-[100] animate-in fade-in zoom-in-95 duration-200">
          <div className="max-h-60 overflow-y-auto py-1">
            {loading && searchResults.length === 0 ? (
              <div className="p-4 text-sm text-gray-500 text-center">Buscando...</div>
            ) : searchResults.length === 0 ? (
              <div className="p-4 text-sm text-gray-500 text-center">
                {searchTerm ? 'No se encontraron categorías' : 'No hay categorías registradas'}
              </div>
            ) : (
              searchResults.map((cat: any) => (
                <div
                  key={cat.categoriaId}
                  className={cn(
                    "px-4 py-3 hover:bg-pink-50 cursor-pointer text-sm flex justify-between items-center transition-colors",
                    String(cat.categoriaId) === String(selectedId) ? 'bg-pink-100 text-pink-700 font-semibold' : 'text-gray-800'
                  )}
                  onClick={(e: React.MouseEvent) => {
                    e.stopPropagation();
                    onSelect(cat);
                    setSelectedCategory(cat);
                    setIsOpen(false);
                    setSearchTerm('');
                  }}
                >
                  <div className="flex items-center gap-3">
                    <CheckCircle
                      className={cn(
                        "h-4 w-4 text-pink-500",
                        String(cat.categoriaId) === String(selectedId) ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <div className="flex flex-col">
                      <span className="font-medium">{cat.nombre}</span>
                      {cat.descripcion && <span className="text-[10px] text-gray-500 italic">{cat.descripcion}</span>}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Modal para crear/editar insumo
interface ProductModalProps {
  product: any;
  onClose: () => void;
  onSave: (data: any) => void;
  categories: APICategory[];
}

function ProductModal({ product, onClose, onSave, categories }: ProductModalProps) {
  const [formData, setFormData] = useState({
    name: product?.name || '',
    sku: product?.sku || '',
    categoryId: product?.categoryId || '',
    status: product?.status || 'active',
    description: product?.description || ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const newErrors: any = {};
    if (!formData.name.trim()) newErrors.name = 'El nombre es requerido';
    if (!formData.sku.trim()) newErrors.sku = 'El SKU es requerido';
    if (!formData.categoryId) newErrors.categoryId = 'La categoría es requerida';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsSaving(true);
    try {
      // Incluimos quantity: 0 para nuevos insumos si el backend lo requiere, 
      // o mantenemos el valor actual si es edición.
      await onSave({
        ...formData,
        quantity: product?.quantity || 0
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
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
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header - Fixed at top */}
        <div className="bg-gradient-to-r from-pink-500 to-purple-600 p-5 text-white shrink-0 shadow-md z-20">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <Package className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold leading-tight">
                  {product ? 'Editar Insumo' : 'Registrar Nuevo Insumo'}
                </h3>
                <p className="text-pink-100 text-sm">
                  {product ? `Actualizando ${product.name}` : 'Complete la información para el inventario'}
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
        <form onSubmit={handleSubmit} id="product-form" className="flex-1 overflow-y-auto p-6 lg:p-8 bg-gray-50/30 no-scrollbar">
          <style>{`
            .no-scrollbar::-webkit-scrollbar { display: none; }
            .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
          `}</style>

          <div className="max-w-4xl mx-auto space-y-6">
            {/* Errors Notification */}
            {Object.keys(errors).length > 0 && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-2xl flex items-center space-x-3 animate-in fade-in duration-300">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <p className="font-semibold text-sm">Por favor corrija los errores marcados en el formulario</p>
              </div>
            )}

            <div className="grid md:grid-cols-2 gap-6">
              {/* Main Data Section */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
                <div className="px-6 py-4 bg-gray-50/50 border-b border-gray-100 flex items-center space-x-2">
                  <Package className="w-4 h-4 text-pink-500" />
                  <h4 className="font-bold text-gray-700 text-sm uppercase tracking-wider">Datos del Insumo</h4>
                </div>
                <div className="p-6 space-y-4">
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">Nombre del Insumo</label>
                    <div className="relative">
                      <Package className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        className={`w-full pl-10 pr-4 py-3 bg-gray-50 border rounded-xl focus:ring-2 focus:ring-pink-300 focus:border-transparent transition-all outline-none ${
                          errors.name ? 'border-red-300 ring-1 ring-red-100' : 'border-gray-200'
                        }`}
                        placeholder="Ej: Shampoo Keratina"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">SKU / Referencia</label>
                    <div className="relative">
                      <FileText className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <input
                        type="text"
                        name="sku"
                        value={formData.sku}
                        onChange={handleInputChange}
                        className={`w-full pl-10 pr-4 py-3 bg-gray-50 border rounded-xl focus:ring-2 focus:ring-pink-300 focus:border-transparent transition-all outline-none ${
                          errors.sku ? 'border-red-300 ring-1 ring-red-100' : 'border-gray-200'
                        }`}
                        placeholder="Ej: SHP-KER-001"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">CATEGORÍA</label>
                    <CategorySearchSelect
                      selectedId={formData.categoryId}
                      onSelect={(cat: any) => setFormData({ ...formData, categoryId: cat.categoriaId })}
                      error={!!errors.categoryId}
                      initialData={categories}
                    />
                  </div>
                </div>
              </div>

              {/* Inventory and Status Section */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
                <div className="px-6 py-4 bg-gray-50/50 border-b border-gray-100 flex items-center space-x-2">
                  <TrendingUp className="w-4 h-4 text-purple-500" />
                  <h4 className="font-bold text-gray-700 text-sm uppercase tracking-wider">Estado y Descripción</h4>
                </div>
                <div className="p-6 space-y-4">
                  <div className="pt-2">
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Estado del Insumo</label>
                    <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.status === 'active'}
                          onChange={() => setFormData({ ...formData, status: formData.status === 'active' ? 'inactive' : 'active' })}
                          className="sr-only peer"
                        />
                        <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-pink-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-pink-400 peer-checked:to-purple-500"></div>
                        <span className={`ml-3 text-sm font-bold ${formData.status === 'active' ? 'text-green-600' : 'text-red-600'}`}>
                          {formData.status === 'active' ? 'ACTIVO' : 'INACTIVO'}
                        </span>
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">Descripción (Opcional)</label>
                    <div className="relative">
                      <FileText className="absolute left-3 top-3 text-gray-400 w-4 h-4" />
                      <textarea
                        name="description"
                        value={formData.description}
                        onChange={handleInputChange}
                        rows={3}
                        className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-300 focus:border-transparent transition-all outline-none"
                        placeholder="Describa el uso o notas del insumo..."
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Summary Card */}
            <div className="bg-gradient-to-br from-pink-50 to-purple-50 rounded-3xl p-6 border border-pink-100 shadow-sm">
                <div className="flex items-center space-x-3 mb-3">
                  <Star className="w-5 h-5 text-pink-400" />
                  <h4 className="font-black text-[10px] uppercase tracking-[0.2em] text-gray-700">Aviso Asthro</h4>
                </div>
                <p className="text-sm text-gray-600 italic leading-relaxed">
                  El stock de los insumos se gestiona automáticamente a través del módulo de **Compras** y **Consumos**. No es necesario asignar stock manualmente al registrar.
                </p>
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
            form="product-form"
            type="submit"
            disabled={isSaving}
            className="px-8 py-2.5 rounded-xl font-black text-white bg-gradient-to-r from-pink-500 to-purple-600 active:scale-95 transition-all text-sm uppercase tracking-widest shadow-lg hover:shadow-pink-200 disabled:opacity-50 flex items-center space-x-2"
          >
            {isSaving ? <CheckCircle className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>{product ? 'Actualizar' : 'Registrar'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

// Modal de detalles del insumo
function ProductDetailModal({ product, onClose }: any) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header - Fixed at top */}
        <div className="bg-gradient-to-r from-pink-500 to-purple-600 p-5 text-white shrink-0 shadow-md z-20">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <Package className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold leading-tight">Detalles del Insumo</h3>
                <p className="text-pink-100 text-sm">{product.name}</p>
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
              {/* Product Info Card */}
              <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                <div className="flex items-center space-x-2 text-purple-500 mb-3">
                  <FileText className="w-4 h-4" />
                  <h4 className="font-bold uppercase text-[10px] tracking-widest">Información Básica</h4>
                </div>
                <div className="mb-1">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">Nombre del Insumo:</span>
                  <p className="font-bold text-gray-800 text-lg mb-1 truncate">{product.name}</p>
                </div>
                <div className="flex items-center space-x-2 text-gray-500">
                  <span className="text-xs font-mono bg-gray-100 px-2 py-0.5 rounded-md">SKU: {product.sku}</span>
                </div>
              </div>

              {/* Stock Card */}
              <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                <div className="flex items-center space-x-2 text-pink-500 mb-3">
                  <TrendingUp className="w-4 h-4" />
                  <h4 className="font-bold uppercase text-[10px] tracking-widest">Inventario y Categoría</h4>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Stock Actual:</span>
                    <span className={`font-bold ${product.quantity <= 5 ? 'text-red-500' : 'text-blue-600'}`}>
                      {product.quantity} unidades
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Categoría:</span>
                    <span className="font-bold text-gray-700">{product.category}</span>
                  </div>
                </div>
              </div>

              {/* Status Card */}
              <div className={`rounded-2xl p-5 border shadow-sm flex flex-col items-center justify-center ${
                product.status === 'active' 
                ? 'bg-green-50/50 border-green-100 text-green-600' 
                : 'bg-red-50/50 border-red-100 text-red-600'
              }`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center mb-2 ${
                  product.status === 'active' ? 'bg-green-100' : 'bg-red-100'
                }`}>
                  <CheckCircle className="w-5 h-5" />
                </div>
                <span className="font-black uppercase text-[10px] tracking-[0.2em]">
                  {product.status === 'active' ? 'Estado Activo' : 'Estado Inactivo'}
                </span>
              </div>
            </div>

            {/* Description Section */}
            {product.description && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-6 py-4 bg-gray-50/50 border-b border-gray-100">
                  <h4 className="font-bold text-gray-700 text-sm flex items-center space-x-2">
                    <FileText className="w-4 h-4 text-purple-400" />
                    <span>Descripción del Insumo</span>
                  </h4>
                </div>
                <div className="p-6">
                  <p className="text-gray-700 italic leading-relaxed">
                    "{product.description}"
                  </p>
                </div>
              </div>
            )}
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

// Modal de confirmación de eliminación
function DeleteConfirmModal({ productName, onConfirm, onCancel }: any) {
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
              onClick={onCancel}
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
              ¿Eliminar insumo "{productName}"?
            </h4>
            <p className="text-sm text-gray-500 leading-relaxed mb-6">
              Estás a punto de eliminar este insumo de forma permanente. 
              Esta acción afectará los registros históricos y el inventario actual.
            </p>
            
            <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 flex items-center space-x-4">
              <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center">
                <Package className="w-6 h-6 text-pink-500" />
              </div>
              <div className="text-left">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Insumo a eliminar</p>
                <p className="font-bold text-gray-700">{productName}</p>
              </div>
            </div>
          </div>

          <div className="flex space-x-3">
            <button
              onClick={onCancel}
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
