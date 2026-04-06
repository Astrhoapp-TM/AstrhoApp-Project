import React, { useState } from 'react';
import { ShoppingCart, Star, Heart, Filter, Search } from 'lucide-react';
import { ImageWithFallback } from '@/shared/components/figma/ImageWithFallback';

const products = [
  {
    id: 1,
    name: 'Shampoo Hidratante Premium',
    description: 'Fórmula con keratina y aceites naturales para cabello seco',
    price: 25000,
    originalPrice: 32000,
    rating: 4.8,
    reviews: 124,
    image: 'https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=400&h=400&fit=crop',
    category: 'Cuidado Capilar',
    inStock: true,
    badge: 'Bestseller'
  },
  {
    id: 2,
    name: 'Acondicionador Reparador',
    description: 'Repara y fortalece el cabello dañado desde la raíz',
    price: 22000,
    originalPrice: null,
    rating: 4.9,
    reviews: 89,
    image: 'https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=400&h=400&fit=crop',
    category: 'Cuidado Capilar',
    inStock: true,
    badge: null
  },
  {
    id: 3,
    name: 'Mascarilla Nutritiva Intensiva',
    description: 'Tratamiento profundo con colágeno y vitamina E',
    price: 35000,
    originalPrice: 42000,
    rating: 5.0,
    reviews: 156,
    image: 'https://images.unsplash.com/photo-1598300042247-d088f8ab3a91?w=400&h=400&fit=crop',
    category: 'Tratamientos',
    inStock: true,
    badge: 'Nuevo'
  },
  {
    id: 4,
    name: 'Serum Anti-Frizz',
    description: 'Control instantáneo del frizz con protección térmica',
    price: 28000,
    originalPrice: null,
    rating: 4.7,
    reviews: 67,
    image: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=400&h=400&fit=crop',
    category: 'Styling',
    inStock: false,
    badge: null
  },
  {
    id: 5,
    name: 'Aceite Capilar Orgánico',
    description: 'Mezcla de aceites de argán, coco y jojoba',
    price: 38000,
    originalPrice: null,
    rating: 4.9,
    reviews: 203,
    image: 'https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?w=400&h=400&fit=crop',
    category: 'Tratamientos',
    inStock: true,
    badge: 'Orgánico'
  },
  {
    id: 6,
    name: 'Protector Térmico UV',
    description: 'Protección contra el calor y rayos UV',
    price: 26000,
    originalPrice: 30000,
    rating: 4.6,
    reviews: 91,
    image: 'https://images.unsplash.com/photo-1596755389378-c31d21fd1273?w=400&h=400&fit=crop',
    category: 'Protección',
    inStock: true,
    badge: null
  },
  {
    id: 7,
    name: 'Kit Coloración Natural',
    description: 'Tinte sin amoníaco con extractos vegetales',
    price: 45000,
    originalPrice: 55000,
    rating: 4.8,
    reviews: 78,
    image: 'https://images.unsplash.com/photo-1522338242992-e1a54906a8da?w=400&h=400&fit=crop',
    category: 'Coloración',
    inStock: true,
    badge: 'Sin Amoníaco'
  },
  {
    id: 8,
    name: 'Spray Texturizante',
    description: 'Aporta volumen y textura natural al cabello',
    price: 24000,
    originalPrice: null,
    rating: 4.5,
    reviews: 45,
    image: 'https://images.unsplash.com/photo-1535585209827-a15fcdbc4c2d?w=400&h=400&fit=crop',
    category: 'Styling',
    inStock: true,
    badge: null
  }
];

const categories = ['Todos', 'Cuidado Capilar', 'Tratamientos', 'Styling', 'Protección', 'Coloración'];

interface ProductsProps {
  addToCart: (product: any) => void;
  limit?: number;
}

export function Products({ addToCart, limit }: ProductsProps) {
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const [searchTerm, setSearchTerm] = useState('');
  const [favorites, setFavorites] = useState<number[]>([]);

  const filteredProducts = products
    .filter(product => 
      selectedCategory === 'Todos' || product.category === selectedCategory
    )
    .filter(product =>
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.description.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .slice(0, limit || products.length);

  const toggleFavorite = (productId: number) => {
    setFavorites(prev => 
      prev.includes(productId) 
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  };

  return (
    <section className="py-20 bg-gradient-to-br from-pink-50/30 to-purple-50/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-gray-800 mb-4">
            Productos Premium
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Descubre nuestra selección de productos profesionales para el cuidado capilar
          </p>
        </div>

        {!limit && (
          <>
            {/* Search and Filters */}
            <div className="mb-8">
              <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
                {/* Search */}
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Buscar productos..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-pink-200 rounded-xl focus:ring-2 focus:ring-pink-300 focus:border-transparent"
                  />
                </div>

                {/* Category Filters */}
                <div className="flex items-center space-x-2 overflow-x-auto">
                  <Filter className="w-5 h-5 text-gray-500 flex-shrink-0" />
                  {categories.map((category) => (
                    <button
                      key={category}
                      onClick={() => setSelectedCategory(category)}
                      className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-200 ${
                        selectedCategory === category
                          ? 'bg-gradient-to-r from-pink-400 to-purple-500 text-white shadow-md'
                          : 'bg-white text-gray-700 hover:bg-pink-50 border border-pink-200'
                      }`}
                    >
                      {category}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}

        {/* Products Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredProducts.map((product) => (
            <div
              key={product.id}
              className="group bg-white rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden border border-pink-100"
            >
              {/* Image */}
              <div className="relative overflow-hidden">
                <ImageWithFallback
                  src={product.image}
                  alt={product.name}
                  className="w-full h-48 object-cover group-hover:scale-110 transition-transform duration-500"
                />
                
                {/* Badge */}
                {product.badge && (
                  <div className="absolute top-3 left-3 bg-gradient-to-r from-pink-400 to-purple-500 text-white px-3 py-1 rounded-full text-xs font-semibold">
                    {product.badge}
                  </div>
                )}

                {/* Favorite Button */}
                <button
                  onClick={() => toggleFavorite(product.id)}
                  className="absolute top-3 right-3 w-8 h-8 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white transition-colors"
                >
                  <Heart 
                    className={`w-4 h-4 ${
                      favorites.includes(product.id) 
                        ? 'text-pink-500 fill-current' 
                        : 'text-gray-400'
                    }`} 
                  />
                </button>

                {/* Stock Status */}
                {!product.inStock && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <span className="text-white font-semibold">Agotado</span>
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="p-5">
                <div className="mb-2">
                  <span className="text-xs text-purple-600 font-semibold uppercase tracking-wide">
                    {product.category}
                  </span>
                </div>

                <h3 className="font-bold text-gray-800 mb-2 line-clamp-1">
                  {product.name}
                </h3>
                
                <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                  {product.description}
                </p>

                {/* Price */}
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <span className="text-xl font-bold text-pink-600">
                      ${product.price.toLocaleString()}
                    </span>
                    {product.originalPrice && (
                      <span className="text-sm text-gray-500 line-through ml-2">
                        ${product.originalPrice.toLocaleString()}
                      </span>
                    )}
                  </div>
                  {product.originalPrice && (
                    <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full font-semibold">
                      -{Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)}%
                    </span>
                  )}
                </div>

                {/* Add to Cart Button */}
                <button
                  onClick={() => addToCart(product)}
                  disabled={!product.inStock}
                  className={`w-full py-3 rounded-xl font-semibold transition-all duration-300 flex items-center justify-center space-x-2 ${
                    product.inStock
                      ? 'bg-gradient-to-r from-pink-400 to-purple-500 text-white hover:shadow-lg transform hover:-translate-y-0.5'
                      : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  <ShoppingCart className="w-4 h-4" />
                  <span>{product.inStock ? 'Agregar al Carrito' : 'No Disponible'}</span>
                </button>
              </div>
            </div>
          ))}
        </div>

        {limit && (
          <div className="text-center mt-12">
            <button className="bg-gradient-to-r from-pink-400 to-purple-500 text-white px-8 py-3 rounded-xl font-semibold hover:shadow-lg transition-all duration-300">
              Ver Todos los Productos
            </button>
          </div>
        )}
      </div>
    </section>
  );
}