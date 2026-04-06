import React, { useState } from 'react';
import { Star, Heart, MessageCircle, ThumbsUp, User } from 'lucide-react';
import { ImageWithFallback } from './figma/ImageWithFallback';

const reviews = [
  {
    id: 1,
    name: 'María González',
    avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b3ba?w=100&h=100&fit=crop&crop=face',
    rating: 5,
    date: '2024-01-10',
    service: 'Corte y Peinado',
    review: 'Excelente servicio! El resultado superó mis expectativas. La atención fue muy profesional y el ambiente del salón es muy acogedor. Definitivamente volveré.',
    likes: 12,
    helpful: true
  },
  {
    id: 2,
    name: 'Ana Rodríguez',
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face',
    rating: 5,
    date: '2024-01-08',
    service: 'Tratamiento Capilar',
    review: 'Mi cabello quedó increíblemente suave y brillante después del tratamiento. Las estilistas son muy conocedoras y te hacen sentir como en casa.',
    likes: 18,
    helpful: true
  },
  {
    id: 3,
    name: 'Carolina Jiménez',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&h=100&fit=crop&crop=face',
    rating: 4,
    date: '2024-01-05',
    service: 'Coloración',
    review: 'Muy contenta con el color que logró la estilista. El proceso fue relajante y el resultado final fue justo lo que esperaba. Recomendado!',
    likes: 9,
    helpful: false
  },
  {
    id: 4,
    name: 'Isabella Torres',
    avatar: 'https://images.unsplash.com/photo-1508214714350-5c425656c908?w=100&h=100&fit=crop&crop=face',
    rating: 5,
    date: '2024-01-03',
    service: 'Peinado Especial',
    review: 'Para mi boda necesitaba un peinado perfecto y lo conseguí aquí. La atención al detalle fue increíble. Muchas gracias por hacer mi día especial aún más hermoso.',
    likes: 25,
    helpful: true
  },
  {
    id: 5,
    name: 'Valentina López',
    avatar: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=100&h=100&fit=crop&crop=face',
    rating: 5,
    date: '2024-01-01',
    service: 'Manicure & Pedicure',
    review: 'Servicio completo y muy profesional. El lugar es limpio, moderno y las técnicas son expertas. Los productos que utilizan son de muy buena calidad.',
    likes: 14,
    helpful: true
  },
  {
    id: 6,
    name: 'Sofía Martínez',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=face',
    rating: 4,
    date: '2023-12-28',
    service: 'Alisado Brasileño',
    review: 'El alisado duró mucho más de lo esperado y mi cabello se ve saludable. El proceso fue largo pero valió la pena completamente.',
    likes: 11,
    helpful: false
  }
];

const services = [
  'Todos',
  'Corte y Peinado',
  'Tratamiento Capilar',
  'Coloración',
  'Peinado Especial',
  'Alisado Brasileño',
  'Manicure & Pedicure'
];

export function Reviews() {
  const [selectedService, setSelectedService] = useState('Todos');
  const [helpfulReviews, setHelpfulReviews] = useState<number[]>([]);

  const filteredReviews = reviews.filter(review => 
    selectedService === 'Todos' || review.service === selectedService
  );

  const averageRating = reviews.reduce((acc, review) => acc + review.rating, 0) / reviews.length;

  const ratingCounts = [5, 4, 3, 2, 1].map(rating => 
    reviews.filter(review => review.rating === rating).length
  );

  const toggleHelpful = (reviewId: number) => {
    setHelpfulReviews(prev => 
      prev.includes(reviewId) 
        ? prev.filter(id => id !== reviewId)
        : [...prev, reviewId]
    );
  };

  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-800 mb-4">
            Reseñas de Nuestros Clientes
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Descubre lo que dicen nuestros clientes sobre nuestros servicios
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Sidebar - Rating Summary */}
          <div className="lg:col-span-1">
            <div className="bg-gradient-to-br from-pink-50 to-purple-50 rounded-3xl p-8 sticky top-8">
              <div className="text-center mb-8">
                <div className="text-5xl font-bold text-gray-800 mb-2">
                  {averageRating.toFixed(1)}
                </div>
                <div className="flex items-center justify-center space-x-1 mb-2">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`w-6 h-6 ${
                        i < Math.floor(averageRating)
                          ? 'text-yellow-400 fill-current'
                          : 'text-gray-300'
                      }`}
                    />
                  ))}
                </div>
                <div className="text-gray-600">
                  Basado en {reviews.length} reseñas
                </div>
              </div>

              {/* Rating Breakdown */}
              <div className="space-y-3 mb-8">
                {[5, 4, 3, 2, 1].map((rating, index) => (
                  <div key={rating} className="flex items-center space-x-3">
                    <span className="text-sm font-medium text-gray-700 w-6">
                      {rating}
                    </span>
                    <Star className="w-4 h-4 text-yellow-400 fill-current" />
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-yellow-400 to-orange-400 h-2 rounded-full"
                        style={{ 
                          width: `${(ratingCounts[index] / reviews.length) * 100}%` 
                        }}
                      ></div>
                    </div>
                    <span className="text-sm text-gray-600 w-8">
                      {ratingCounts[index]}
                    </span>
                  </div>
                ))}
              </div>

              {/* Service Filter */}
              <div>
                <h3 className="font-bold text-gray-800 mb-4">Filtrar por Servicio</h3>
                <div className="space-y-2">
                  {services.map((service) => (
                    <button
                      key={service}
                      onClick={() => setSelectedService(service)}
                      className={`w-full text-left px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                        selectedService === service
                          ? 'bg-gradient-to-r from-pink-400 to-purple-500 text-white'
                          : 'text-gray-700 hover:bg-pink-50'
                      }`}
                    >
                      {service}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Right Content - Reviews */}
          <div className="lg:col-span-2">
            <div className="space-y-6">
              {filteredReviews.map((review) => (
                <div
                  key={review.id}
                  className="bg-white rounded-2xl shadow-md hover:shadow-lg transition-shadow duration-300 p-6 border border-gray-100"
                >
                  {/* Review Header */}
                  <div className="flex items-start space-x-4 mb-4">
                    <ImageWithFallback
                      src={review.avatar}
                      alt={review.name}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="font-bold text-gray-800">{review.name}</h4>
                        <span className="text-sm text-gray-500">{review.date}</span>
                      </div>
                      <div className="flex items-center space-x-2 mb-2">
                        <div className="flex items-center space-x-1">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`w-4 h-4 ${
                                i < review.rating
                                  ? 'text-yellow-400 fill-current'
                                  : 'text-gray-300'
                              }`}
                            />
                          ))}
                        </div>
                        <span className="text-sm text-purple-600 font-semibold">
                          {review.service}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Review Content */}
                  <p className="text-gray-700 leading-relaxed mb-4">
                    {review.review}
                  </p>

                  {/* Review Actions */}
                  <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                    <div className="flex items-center space-x-4">
                      <button
                        onClick={() => toggleHelpful(review.id)}
                        className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                          helpfulReviews.includes(review.id)
                            ? 'bg-gradient-to-r from-pink-400 to-purple-500 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        <ThumbsUp className="w-4 h-4" />
                        <span>Útil</span>
                      </button>
                      <button className="flex items-center space-x-2 text-gray-500 hover:text-gray-700 transition-colors">
                        <MessageCircle className="w-4 h-4" />
                        <span className="text-sm">Responder</span>
                      </button>
                    </div>
                    <div className="flex items-center space-x-2 text-gray-500">
                      <Heart className="w-4 h-4" />
                      <span className="text-sm">{review.likes} personas les gustó</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Write Review CTA */}
            <div className="mt-12 bg-gradient-to-r from-pink-50 to-purple-50 rounded-3xl p-8 text-center">
              <h3 className="text-2xl font-bold text-gray-800 mb-4">
                ¿Ya probaste nuestros servicios?
              </h3>
              <p className="text-gray-600 mb-6">
                Comparte tu experiencia y ayuda a otros clientes a conocer nuestro trabajo
              </p>
              <button className="bg-gradient-to-r from-pink-400 to-purple-500 text-white px-8 py-3 rounded-xl font-semibold hover:shadow-lg transition-all duration-300 flex items-center space-x-2 mx-auto">
                <Star className="w-5 h-5" />
                <span>Escribir Reseña</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}