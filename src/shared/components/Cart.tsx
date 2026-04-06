import React, { useState } from 'react';
import { X, Plus, Minus, ShoppingBag, CreditCard, Truck, MapPin, Clock } from 'lucide-react';
import { ImageWithFallback } from './figma/ImageWithFallback';

interface CartItem {
  id: number;
  name: string;
  price: number;
  quantity: number;
  image: string;
}

interface CartProps {
  items: CartItem[];
  onClose: () => void;
  onRemoveItem: (id: number) => void;
  onUpdateQuantity: (id: number, quantity: number) => void;
  currentUser: any;
}

export function Cart({ items, onClose, onRemoveItem, onUpdateQuantity, currentUser }: CartProps) {
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [customerInfo, setCustomerInfo] = useState({
    name: currentUser?.name || '',
    email: currentUser?.email || '',
    phone: ''
  });

  const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const shipping = 0; // Pickup only
  const total = subtotal + shipping;

  const handleCheckout = () => {
    setIsCheckingOut(true);
    
    // Simulate order processing
    setTimeout(() => {
      alert('¡Pedido realizado con éxito! Te notificaremos cuando esté listo para recoger en nuestro salón.');
      setIsCheckingOut(false);
      onClose();
    }, 2000);
  };

  if (items.length === 0) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 text-center">
          <div className="w-20 h-20 bg-gradient-to-r from-pink-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <ShoppingBag className="w-10 h-10 text-pink-400" />
          </div>
          <h3 className="text-2xl font-bold text-gray-800 mb-4">
            Tu carrito está vacío
          </h3>
          <p className="text-gray-600 mb-6">
            Explora nuestros productos y agrega los que más te gusten
          </p>
          <button
            onClick={onClose}
            className="bg-gradient-to-r from-pink-400 to-purple-500 text-white px-8 py-3 rounded-xl font-semibold hover:shadow-lg transition-all"
          >
            Seguir Comprando
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-end">
      <div className="bg-white h-full w-full max-w-md shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-pink-400 to-purple-500 p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">Mi Carrito</h2>
              <p className="text-pink-100">{items.length} productos</p>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-4">
            {items.map((item) => (
              <div key={item.id} className="bg-gray-50 rounded-2xl p-4">
                <div className="flex items-center space-x-4">
                  <ImageWithFallback
                    src={item.image}
                    alt={item.name}
                    className="w-16 h-16 object-cover rounded-xl"
                  />
                  
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-800 mb-1">{item.name}</h4>
                    <div className="text-lg font-bold text-pink-600">
                      ${item.price.toLocaleString()}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
                      className="w-8 h-8 bg-white rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors"
                    >
                      <Minus className="w-4 h-4 text-gray-600" />
                    </button>
                    
                    <span className="w-8 text-center font-semibold text-gray-800">
                      {item.quantity}
                    </span>
                    
                    <button
                      onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                      className="w-8 h-8 bg-white rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors"
                    >
                      <Plus className="w-4 h-4 text-gray-600" />
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
                  <button
                    onClick={() => onRemoveItem(item.id)}
                    className="text-red-600 text-sm font-medium hover:text-red-700 transition-colors"
                  >
                    Eliminar
                  </button>
                  <div className="font-bold text-gray-800">
                    ${(item.price * item.quantity).toLocaleString()}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pickup Info */}
          <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-2xl">
            <div className="flex items-center space-x-3 mb-3">
              <Truck className="w-5 h-5 text-blue-600" />
              <h4 className="font-semibold text-blue-800">Recogida en Salón</h4>
            </div>
            <div className="space-y-2 text-sm text-blue-700">
              <div className="flex items-center space-x-2">
                <MapPin className="w-4 h-4 text-blue-600" />
                <span><strong>Dirección:</strong> Cll 55 #42-16, Medellín</span>
              </div>
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4 text-blue-600" />
                <span><strong>Horario:</strong> Lunes a Sábado, 9:00 AM - 7:00 PM</span>
              </div>
              <p className="mt-2">
                <strong>Atendido por:</strong> Astrid Eugenia Hoyos y su equipo profesional
              </p>
              <p className="text-xs text-blue-600 mt-2">
                Te notificaremos por WhatsApp cuando tu pedido esté listo para recoger.
              </p>
            </div>
          </div>

          {/* Customer Info for Checkout */}
          {!currentUser && (
            <div className="mt-6 space-y-4">
              <h4 className="font-bold text-gray-800">Información de Contacto</h4>
              <input
                type="text"
                placeholder="Nombre completo"
                value={customerInfo.name}
                onChange={(e) => setCustomerInfo({...customerInfo, name: e.target.value})}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-pink-300 focus:border-transparent"
              />
              <input
                type="email"
                placeholder="Email"
                value={customerInfo.email}
                onChange={(e) => setCustomerInfo({...customerInfo, email: e.target.value})}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-pink-300 focus:border-transparent"
              />
              <input
                type="tel"
                placeholder="WhatsApp (ej: 304 123 4567)"
                value={customerInfo.phone}
                onChange={(e) => setCustomerInfo({...customerInfo, phone: e.target.value})}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-pink-300 focus:border-transparent"
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-6 bg-white">
          {/* Summary */}
          <div className="space-y-2 mb-6">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal</span>
              <span>${subtotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Recogida en salón</span>
              <span className="text-green-600 font-semibold">Gratis</span>
            </div>
            <div className="flex justify-between text-xl font-bold text-gray-800 pt-2 border-t border-gray-200">
              <span>Total</span>
              <span>${total.toLocaleString()}</span>
            </div>
          </div>

          {/* Checkout Button */}
          <button
            onClick={handleCheckout}
            disabled={isCheckingOut || (!currentUser && (!customerInfo.name || !customerInfo.email || !customerInfo.phone))}
            className="w-full bg-gradient-to-r from-pink-400 to-purple-500 text-white py-4 rounded-xl font-semibold hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center space-x-2"
          >
            {isCheckingOut ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                <span>Procesando...</span>
              </>
            ) : (
              <>
                <CreditCard className="w-5 h-5" />
                <span>Realizar Pedido</span>
              </>
            )}
          </button>

          <p className="text-xs text-gray-500 mt-3 text-center">
            Al realizar el pedido, aceptas nuestros términos y condiciones
          </p>
        </div>
      </div>
    </div>
  );
}