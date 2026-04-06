import React from 'react';
import { Calendar, Star, Sparkles, Heart, MapPin } from 'lucide-react';
import { ImageWithFallback } from './figma/ImageWithFallback';

interface HeroProps {
  onBookAppointment: (selectedService?: any) => void;
}

export function Hero({ onBookAppointment }: HeroProps) {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-pink-50 via-purple-50 to-pink-100 py-20">
      {/* Decorative Background Elements */}
      <div className="absolute inset-0">
        <div className="absolute top-10 left-10 w-20 h-20 bg-pink-200/30 rounded-full blur-xl"></div>
        <div className="absolute top-32 right-20 w-32 h-32 bg-purple-200/30 rounded-full blur-xl"></div>
        <div className="absolute bottom-20 left-1/4 w-24 h-24 bg-pink-300/20 rounded-full blur-xl"></div>
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <div className="text-center lg:text-left">
            <h1 className="text-5xl lg:text-6xl font-bold mb-6">
              <span className="block text-gray-800">Bienvenida a</span>
              <span className="block bg-gradient-to-r from-pink-500 to-purple-600 bg-clip-text text-transparent">
                AsthroApp
              </span>
            </h1>
            
            <p className="text-xl text-gray-600 mb-4 leading-relaxed">
              Tu salón de belleza de confianza en Medellín. Dirigido por 
              <span className="font-semibold text-pink-600"> Astrid Eugenia Hoyos</span>, 
              especialista en cuidado capilar y tratamientos de belleza.
            </p>

            <div className="flex items-center justify-center lg:justify-start space-x-2 mb-8 text-gray-600">
              <MapPin className="w-5 h-5 text-pink-500" />
              <span>Cll 55 #42-16, Medellín, Antioquia</span>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start mb-12">
              <button 
                onClick={() => onBookAppointment()}
                className="bg-gradient-to-r from-pink-400 to-purple-500 text-white px-8 py-4 rounded-xl font-semibold hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300 flex items-center justify-center space-x-2"
              >
                <Calendar className="w-5 h-5" />
                <span>Agendar Cita</span>
              </button>
              <button 
                onClick={() => {
                  const servicesSection = document.getElementById('services-section');
                  if (servicesSection) {
                    servicesSection.scrollIntoView({ behavior: 'smooth' });
                  }
                }}
                className="border-2 border-pink-300 text-pink-600 px-8 py-4 rounded-xl font-semibold hover:bg-pink-50 transition-all duration-300 flex items-center justify-center space-x-2"
              >
                <Sparkles className="w-5 h-5" />
                <span>Ver Servicios</span>
              </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-8 text-center">
              <div>
                <div className="text-3xl font-bold text-pink-600 mb-2">500+</div>
                <div className="text-sm text-gray-600">Clientes Felices</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-purple-600 mb-2">8+</div>
                <div className="text-sm text-gray-600">Años de Experiencia</div>
              </div>
              <div>
                <div className="flex items-center justify-center space-x-1 mb-2">
                  <span className="text-3xl font-bold text-pink-600">4.9</span>
                  <Star className="w-6 h-6 text-yellow-400 fill-current" />
                </div>
                <div className="text-sm text-gray-600">Calificación</div>
              </div>
            </div>
          </div>

          {/* Right Content - Image */}
          <div className="relative">
            <div className="relative z-10 bg-white/80 backdrop-blur rounded-3xl p-8 shadow-2xl">
              <ImageWithFallback
                src="https://images.unsplash.com/photo-1560066984-138dadb4c035?w=500&h=600&fit=crop&crop=center"
                alt="AsthroApp - Salón de belleza en Medellín"
                className="w-full h-96 object-cover rounded-2xl"
              />
              
              {/* Floating Cards */}
              <div className="absolute -top-4 -right-4 bg-white rounded-2xl p-4 shadow-lg">
                <div className="flex items-center space-x-2">
                  <Heart className="w-5 h-5 text-pink-500" />
                  <span className="text-sm font-semibold text-gray-700">Cuidado Premium</span>
                </div>
              </div>
              
              <div className="absolute -bottom-4 -left-4 bg-gradient-to-r from-pink-400 to-purple-500 text-white rounded-2xl p-4 shadow-lg">
                <div className="text-sm font-semibold">Astrid Eugenia Hoyos</div>
                <div className="text-xs opacity-90">Especialista en Belleza</div>
              </div>
            </div>

            {/* Background Decoration */}
            <div className="absolute inset-0 bg-gradient-to-r from-pink-300/20 to-purple-300/20 rounded-3xl transform rotate-3"></div>
          </div>
        </div>
      </div>
    </section>
  );
}