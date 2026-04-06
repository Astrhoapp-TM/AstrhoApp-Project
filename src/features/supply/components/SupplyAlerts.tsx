import React from 'react';
import { AlertTriangle, AlertCircle, Calendar } from 'lucide-react';
import { type Supply } from '@/shared/data/management';
import { isExpired, isExpiringSoon } from '../utils/supplyUtils';

interface SupplyAlertsProps {
  supplies: Supply[];
}

export function SupplyAlerts({ supplies }: SupplyAlertsProps) {
  const lowStockSupplies = supplies.filter(s => s.quantity <= s.minStock);
  const expiredSupplies = supplies.filter(s => isExpired(s.expirationDate));
  const expiringSoonSupplies = supplies.filter(s => isExpiringSoon(s.expirationDate));

  if (lowStockSupplies.length === 0 && expiredSupplies.length === 0 && expiringSoonSupplies.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
      <h3 className="text-xl font-bold text-gray-800 mb-4">Alertas de Inventario</h3>
      
      <div className="grid md:grid-cols-3 gap-6">
        {lowStockSupplies.length > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
            <div className="flex items-center space-x-2 mb-3">
              <AlertTriangle className="w-5 h-5 text-yellow-600" />
              <h4 className="font-semibold text-yellow-800">Stock Bajo ({lowStockSupplies.length})</h4>
            </div>
            <div className="space-y-2">
              {lowStockSupplies.slice(0, 3).map(supply => (
                <div key={supply.id} className="flex justify-between text-sm">
                  <span className="text-yellow-700">{supply.name}</span>
                  <span className="text-yellow-600 font-semibold">{supply.quantity} {supply.unit}</span>
                </div>
              ))}
              {lowStockSupplies.length > 3 && (
                <div className="text-xs text-yellow-600">+{lowStockSupplies.length - 3} más</div>
              )}
            </div>
          </div>
        )}
        
        {expiredSupplies.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <div className="flex items-center space-x-2 mb-3">
              <AlertCircle className="w-5 h-5 text-red-600" />
              <h4 className="font-semibold text-red-800">Vencidos ({expiredSupplies.length})</h4>
            </div>
            <div className="space-y-2">
              {expiredSupplies.slice(0, 3).map(supply => (
                <div key={supply.id} className="flex justify-between text-sm">
                  <span className="text-red-700">{supply.name}</span>
                  <span className="text-red-600 font-semibold">{supply.expirationDate}</span>
                </div>
              ))}
              {expiredSupplies.length > 3 && (
                <div className="text-xs text-red-600">+{expiredSupplies.length - 3} más</div>
              )}
            </div>
          </div>
        )}
        
        {expiringSoonSupplies.length > 0 && (
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
            <div className="flex items-center space-x-2 mb-3">
              <Calendar className="w-5 h-5 text-orange-600" />
              <h4 className="font-semibold text-orange-800">Por Vencer ({expiringSoonSupplies.length})</h4>
            </div>
            <div className="space-y-2">
              {expiringSoonSupplies.slice(0, 3).map(supply => (
                <div key={supply.id} className="flex justify-between text-sm">
                  <span className="text-orange-700">{supply.name}</span>
                  <span className="text-orange-600 font-semibold">{supply.expirationDate}</span>
                </div>
              ))}
              {expiringSoonSupplies.length > 3 && (
                <div className="text-xs text-orange-600">+{expiringSoonSupplies.length - 3} más</div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}