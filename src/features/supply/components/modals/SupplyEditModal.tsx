import React, { useState } from 'react';
import { X, Save, AlertCircle, Plus, Trash2, Upload, Image as ImageIcon } from 'lucide-react';
import { type Supply } from '@/shared/data/management';
import { SUPPLY_TYPES, SUPPLY_STATUSES } from '../../data/supplyConstants';

interface SupplyEditModalProps {
  supply: Supply | null;
  onClose: () => void;
  onSave: (supplyData: any) => void;
  suppliers: any[];
}

export function SupplyEditModal({ supply, onClose, onSave, suppliers }: SupplyEditModalProps) {
  // Si es modo edición, usamos el formulario simple
  if (supply) {
    return <SingleSupplyForm supply={supply} onClose={onClose} onSave={onSave} suppliers={suppliers} />;
  }

  // Si es modo creación, usamos el formulario múltiple
  return <MultipleSupplyForm onClose={onClose} onSave={onSave} suppliers={suppliers} />;
}

// Formulario para editar un solo insumo (modo edición)
function SingleSupplyForm({ supply, onClose, onSave, suppliers }) {
  const [formData, setFormData] = useState({
    name: supply?.name || '',
    description: supply?.description || '',
    sku: supply?.sku || '',
    type: supply?.type || 'consumable',
    quantity: supply?.quantity || 0,
    unit: supply?.unit || 'unidades',
    expirationDate: supply?.expirationDate || '',
    status: supply?.status || 'active',
    supplierId: supply?.supplierId || '',
    unitCost: supply?.unitCost || 0,
    minStock: supply?.minStock || 0,
    maxStock: supply?.maxStock || 0,
    notes: supply?.notes || '',
    imageUrl: supply?.imageUrl || ''
  });

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>(supply?.imageUrl || '');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const newErrors: any = {};
    if (!formData.name.trim()) newErrors.name = 'El nombre es requerido';
    if (!formData.description.trim()) newErrors.description = 'La descripción es requerida';
    if (!formData.sku.trim()) newErrors.sku = 'El SKU es requerido';

    if (formData.quantity < 0) newErrors.quantity = 'La cantidad no puede ser negativa';
    if (formData.unitCost < 0) newErrors.unitCost = 'El precio no puede ser negativo';
    if (formData.minStock < 0) newErrors.minStock = 'El stock mínimo no puede ser negativo';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsSaving(true);
    try {
      // Si hay una imagen nueva, incluirla en los datos
      const dataToSave = {
        ...formData,
        imageUrl: imagePreview
      };
      await onSave(dataToSave);
    } finally {
      setIsSaving(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: ['quantity', 'unitCost', 'minStock', 'maxStock'].includes(name)
        ? parseFloat(value) || 0
        : value
    });

    if (errors[name]) {
      const newErrors = { ...errors };
      delete newErrors[name];
      setErrors(newErrors);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header - Fixed at top */}
        <div className="bg-gradient-to-r from-pink-500 to-purple-600 p-5 text-white shrink-0 shadow-md z-20">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm shadow-inner">
                <Edit className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold leading-tight">Editar Insumo</h3>
                <p className="text-pink-100 text-sm">Actualiza la información y el stock del insumo</p>
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
            {Object.keys(errors).length > 0 && (
              <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-xl flex items-center space-x-3 animate-in slide-in-from-left-2 duration-200">
                <AlertCircle className="w-5 h-5 text-red-500" />
                <p className="text-sm text-red-700">Por favor, corrige los errores antes de guardar.</p>
              </div>
            )}

            <div className="grid md:grid-cols-2 gap-6">
              {/* Image Section Card */}
              <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-4">
                <div className="flex items-center space-x-2 text-blue-500">
                  <ImageIcon className="w-4 h-4" />
                  <h4 className="font-bold uppercase text-[10px] tracking-widest">Imagen del Insumo</h4>
                </div>

                <div className="flex flex-col items-center space-y-4">
                  <div className="relative group w-full aspect-square max-w-[200px] rounded-2xl overflow-hidden bg-gray-50 border-2 border-dashed border-gray-200 hover:border-blue-400 transition-all">
                    {imagePreview ? (
                      <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full text-gray-400">
                        <Upload className="w-10 h-10 mb-2" />
                        <span className="text-xs font-medium">Subir Imagen</span>
                      </div>
                    )}
                    <input
                      type="file"
                      className="absolute inset-0 opacity-0 cursor-pointer"
                      accept="image/*"
                      onChange={handleImageChange}
                    />
                    {imagePreview && (
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Upload className="w-8 h-8 text-white" />
                      </div>
                    )}
                  </div>
                  <p className="text-[10px] text-gray-400 text-center px-4">
                    Formatos recomendados: JPG o PNG. Tamaño máximo 5MB.
                  </p>
                </div>
              </div>

              {/* Basic Data Card */}
              <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-5">
                <div className="flex items-center space-x-2 text-purple-500">
                  <Plus className="w-4 h-4" />
                  <h4 className="font-bold uppercase text-[10px] tracking-widest">Datos del Insumo</h4>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">Nombre *</label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      className={`w-full px-4 py-3 bg-gray-50/50 border rounded-xl focus:ring-2 focus:ring-blue-300 focus:border-transparent transition-all font-medium text-gray-700 ${errors.name ? 'border-red-300' : 'border-gray-200'}`}
                      placeholder="Nombre comercial"
                    />
                    {errors.name && <p className="text-[10px] text-red-500 mt-1 ml-1">{errors.name}</p>}
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">SKU / Código *</label>
                    <input
                      type="text"
                      name="sku"
                      value={formData.sku}
                      onChange={handleInputChange}
                      className={`w-full px-4 py-3 bg-gray-50/50 border rounded-xl focus:ring-2 focus:ring-blue-300 focus:border-transparent transition-all font-medium text-gray-700 ${errors.sku ? 'border-red-300' : 'border-gray-200'}`}
                      placeholder="Identificador único"
                    />
                    {errors.sku && <p className="text-[10px] text-red-500 mt-1 ml-1">{errors.sku}</p>}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">Tipo</label>
                      <select
                        name="type"
                        value={formData.type}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 bg-gray-50/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-300 focus:border-transparent transition-all font-medium text-gray-700"
                      >
                        {Object.entries(SUPPLY_TYPES).map(([key, type]) => (
                          <option key={key} value={key}>{type.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">Estado</label>
                      <select
                        name="status"
                        value={formData.status}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 bg-gray-50/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-300 focus:border-transparent transition-all font-medium text-gray-700"
                      >
                        {Object.entries(SUPPLY_STATUSES).map(([key, status]) => (
                          <option key={key} value={key}>{status.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Detailed Info Section */}
            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-6">
              <div className="flex items-center space-x-2 text-pink-500">
                <ImageIcon className="w-4 h-4" />
                <h4 className="font-bold uppercase text-[10px] tracking-widest">Configuración y Stock</h4>
              </div>

              <div className="grid md:grid-cols-3 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">Unidad de Medida</label>
                    <input
                      type="text"
                      name="unit"
                      value={formData.unit}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 bg-gray-50/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-300 focus:border-transparent transition-all font-medium text-gray-700"
                      placeholder="ej: litros, unid."
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">Costo Unitario ($)</label>
                    <input
                      type="number"
                      name="unitCost"
                      value={formData.unitCost}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 bg-gray-50/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-300 focus:border-transparent transition-all font-medium text-gray-700"
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">Stock Mínimo</label>
                    <input
                      type="number"
                      name="minStock"
                      value={formData.minStock}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 bg-gray-50/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-300 focus:border-transparent transition-all font-medium text-gray-700"
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">Stock Máximo</label>
                    <input
                      type="number"
                      name="maxStock"
                      value={formData.maxStock}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 bg-gray-50/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-300 focus:border-transparent transition-all font-medium text-gray-700"
                      placeholder="0"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">Fecha de Vencimiento</label>
                    <input
                      type="date"
                      name="expirationDate"
                      value={formData.expirationDate}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 bg-gray-50/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-300 focus:border-transparent transition-all font-medium text-gray-700"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">Proveedor Asignado</label>
                    <select
                      name="supplierId"
                      value={formData.supplierId}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 bg-gray-50/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-300 focus:border-transparent transition-all font-medium text-gray-700"
                    >
                      <option value="">Seleccionar...</option>
                      {suppliers.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">Descripción Detallada *</label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-3 bg-gray-50/50 border rounded-xl focus:ring-2 focus:ring-blue-300 focus:border-transparent transition-all font-medium text-gray-700 resize-none ${errors.description ? 'border-red-300' : 'border-gray-200'}`}
                    rows={4}
                    placeholder="Describe el uso y características..."
                  />
                  {errors.description && <p className="text-[10px] text-red-500 mt-1 ml-1">{errors.description}</p>}
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">Notas Adicionales</label>
                  <textarea
                    name="notes"
                    value={formData.notes}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-gray-50/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-300 focus:border-transparent transition-all font-medium text-gray-700 resize-none"
                    rows={4}
                    placeholder="Observaciones internas..."
                  />
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
            disabled={isSaving}
            className="px-8 py-2.5 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-xl font-black hover:shadow-lg active:scale-95 transition-all text-sm uppercase tracking-widest shadow-md flex items-center space-x-2"
          >
            {isSaving ? <Plus className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>{isSaving ? 'Guardando...' : 'Actualizar Insumo'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

// Formulario para agregar múltiples insumos (modo creación)
function MultipleSupplyForm({ onClose, onSave, suppliers }) {
  const [supplies, setSupplies] = useState([
    {
      name: '',
      description: '',
      sku: '',
      type: 'consumable',
      supplierId: '',
      unit: 'unidades',
      expirationDate: '',
      status: 'active',
      unitCost: 0,
      minStock: 0,
      maxStock: 0,
      notes: '',
      imageUrl: ''
    }
  ]);

  const [imageFiles, setImageFiles] = useState<{ [key: number]: string }>({});
  const [isSaving, setIsSaving] = useState(false);

  const addSupply = () => {
    setSupplies([...supplies, {
      name: '',
      description: '',
      sku: '',
      type: 'consumable',
      supplierId: '',
      unit: 'unidades',
      expirationDate: '',
      status: 'active',
      unitCost: 0,
      minStock: 0,
      maxStock: 0,
      notes: '',
      imageUrl: ''
    }]);
  };

  const removeSupply = (index) => {
    if (supplies.length === 1) return;
    setSupplies(supplies.filter((_, i) => i !== index));

    // Limpiar imagen del insumo eliminado
    const newImageFiles = { ...imageFiles };
    delete newImageFiles[index];
    setImageFiles(newImageFiles);
  };

  const updateSupply = (index, field, value) => {
    const newSupplies = [...supplies];
    newSupplies[index] = {
      ...newSupplies[index],
      [field]: ['quantity', 'unitCost', 'minStock', 'maxStock'].includes(field)
        ? parseFloat(value) || 0
        : value
    };
    setSupplies(newSupplies);
  };

  const handleImageChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setImageFiles({ ...imageFiles, [index]: base64String });
        updateSupply(index, 'imageUrl', base64String);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validar que todos los insumos tengan datos básicos
    for (let i = 0; i < supplies.length; i++) {
      const supply = supplies[i];
      if (!supply.name.trim() || !supply.description.trim() || !supply.sku.trim()) {
        toast.error(`El insumo ${i + 1} debe tener nombre, descripción y SKU`);
        return;
      }
    }

    setIsSaving(true);
    try {
      // Guardar todos los insumos
      for (const supply of supplies) {
        await onSave(supply);
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header - Fixed at top */}
        <div className="bg-gradient-to-r from-pink-500 to-purple-600 p-5 text-white shrink-0 shadow-md z-20">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm shadow-inner">
                <Plus className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold leading-tight">Registrar Insumos</h3>
                <p className="text-pink-100 text-sm">Agrega uno o varios insumos al inventario</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={addSupply}
                className="flex items-center space-x-2 bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-xl transition-all font-bold text-xs uppercase tracking-widest backdrop-blur-sm shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span>Agregar Otro</span>
              </button>
              <button
                onClick={onClose}
                className="w-9 h-9 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/30 hover:scale-110 active:scale-95 transition-all shadow-sm"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 lg:p-8 bg-gray-50/30 no-scrollbar">
          <style>{`
            .no-scrollbar::-webkit-scrollbar { display: none; }
            .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
          `}</style>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex items-center justify-between px-2">
              <p className="text-xs font-black text-gray-400 uppercase tracking-[0.2em]">
                Lista de nuevos insumos ({supplies.length})
              </p>
            </div>

            <div className="space-y-8">
              {supplies.map((supply, index) => (
                <div key={index} className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden animate-in slide-in-from-bottom-4 duration-300" style={{ animationDelay: `${index * 50}ms` }}>
                  <div className="bg-gray-50/50 px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center font-bold text-sm">
                        {index + 1}
                      </div>
                      <h4 className="font-bold text-gray-700">Insumo #{index + 1}</h4>
                    </div>
                    {supplies.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeSupply(index)}
                        className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                        title="Eliminar de la lista"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    )}
                  </div>

                  <div className="p-6">
                    <div className="grid lg:grid-cols-4 gap-6">
                      {/* Image Preview for Multiple Form */}
                      <div className="lg:col-span-1">
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Imagen</label>
                        <div className="relative group aspect-square rounded-2xl overflow-hidden bg-gray-50 border-2 border-dashed border-gray-200 hover:border-blue-400 transition-all">
                          {imageFiles[index] ? (
                            <img src={imageFiles[index]} alt="Preview" className="w-full h-full object-cover" />
                          ) : (
                            <div className="flex flex-col items-center justify-center h-full text-gray-400">
                              <Upload className="w-6 h-6 mb-1" />
                              <span className="text-[10px] font-medium">Subir</span>
                            </div>
                          )}
                          <input
                            type="file"
                            className="absolute inset-0 opacity-0 cursor-pointer"
                            accept="image/*"
                            onChange={(e) => handleImageChange(index, e)}
                          />
                        </div>
                      </div>

                      <div className="lg:col-span-3 space-y-4">
                        <div className="grid md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">Nombre *</label>
                            <input
                              type="text"
                              value={supply.name}
                              onChange={(e) => updateSupply(index, 'name', e.target.value)}
                              className="w-full px-4 py-2.5 bg-gray-50/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-300 focus:border-transparent transition-all font-medium text-gray-700 text-sm"
                              placeholder="Nombre comercial"
                              required
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">SKU / Código *</label>
                            <input
                              type="text"
                              value={supply.sku}
                              onChange={(e) => updateSupply(index, 'sku', e.target.value)}
                              className="w-full px-4 py-2.5 bg-gray-50/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-300 focus:border-transparent transition-all font-medium text-gray-700 text-sm"
                              placeholder="Identificador"
                              required
                            />
                          </div>
                        </div>

                        <div className="grid md:grid-cols-3 gap-4">
                          <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">Tipo</label>
                            <select
                              value={supply.type}
                              onChange={(e) => updateSupply(index, 'type', e.target.value)}
                              className="w-full px-4 py-2.5 bg-gray-50/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-300 focus:border-transparent transition-all font-medium text-gray-700 text-sm"
                            >
                              {Object.entries(SUPPLY_TYPES).map(([key, type]) => (
                                <option key={key} value={key}>{type.label}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">Proveedor</label>
                            <select
                              value={supply.supplierId}
                              onChange={(e) => updateSupply(index, 'supplierId', e.target.value)}
                              className="w-full px-4 py-2.5 bg-gray-50/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-300 focus:border-transparent transition-all font-medium text-gray-700 text-sm"
                            >
                              <option value="">Seleccionar...</option>
                              {suppliers.map(s => (
                                <option key={s.id} value={s.id}>{s.name}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">Costo Unit.</label>
                            <input
                              type="number"
                              value={supply.unitCost}
                              onChange={(e) => updateSupply(index, 'unitCost', e.target.value)}
                              className="w-full px-4 py-2.5 bg-gray-50/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-300 focus:border-transparent transition-all font-medium text-gray-700 text-sm"
                              placeholder="0.00"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">Descripción *</label>
                          <textarea
                            value={supply.description}
                            onChange={(e) => updateSupply(index, 'description', e.target.value)}
                            rows={2}
                            className="w-full px-4 py-2.5 bg-gray-50/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-300 focus:border-transparent transition-all font-medium text-gray-700 text-sm resize-none"
                            placeholder="Breve descripción del insumo..."
                            required
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
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
            disabled={isSaving}
            className="px-8 py-2.5 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-xl font-black hover:shadow-lg active:scale-95 transition-all text-sm uppercase tracking-widest shadow-md flex items-center space-x-2"
          >
            {isSaving ? <Plus className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>{isSaving ? 'Guardando...' : `Registrar ${supplies.length} Insumos`}</span>
          </button>
        </div>
      </div>
    </div>
  );
}