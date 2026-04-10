import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { ADMIN_MENU_ITEMS, getMenuItemsByCategory } from '@/shared/data/adminConstants';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/shared/components/ui/tooltip';

import { DashboardOverview } from '@/features/dashboard/components/DashboardOverview';
import { UserManagement } from '@/features/users/components/UserManagement';
import { PersonManagement } from '@/features/persons/components/PersonManagement';
import { ScheduleManagement } from '@/features/schedule/components/ScheduleManagement';
import { ServiceManagement } from '@/features/services/components/ServiceManagement';
import { ProductManagement } from '@/features/products/components/ProductManagement';
import { SuppliesList } from '@/features/supply/components/SuppliesList';
import { PurchaseManagement } from '@/features/purchases/components/PurchaseManagement';
import { SupplierManagement } from '@/features/suppliers/components/SupplierManagement';
import { CategoryManagement } from '@/features/categories/components/CategoryManagement';
import { RoleManagement } from '@/features/roles/components/RoleManagement';
import { SupplyDeliveryManagement } from '@/features/supply/components/SupplyDeliveryManagement';
import { SalesManagement } from '@/features/sales/components/SalesManagement';
import { AppointmentManagement } from '@/features/appointments/components/AppointmentManagement';

interface AdminPanelProps {
  currentUser: any;
  hasPermission: (permission: string) => boolean;
}

export function AdminPanel({ currentUser, hasPermission }: AdminPanelProps) {
  // Use 'dashboard' as default tab for everyone
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const menuCategories = getMenuItemsByCategory(ADMIN_MENU_ITEMS, hasPermission, currentUser?.role);

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardOverview currentUser={currentUser} hasPermission={hasPermission} />;
      case 'users':
        return <UserManagement hasPermission={hasPermission} />;
      case 'roles':
        return <RoleManagement hasPermission={hasPermission} />;
      case 'persons':
        return <PersonManagement hasPermission={hasPermission} />;
      case 'appointments':
        return <AppointmentManagement hasPermission={hasPermission} currentUser={currentUser} />;
      case 'schedules':
        return <ScheduleManagement hasPermission={hasPermission} currentUser={currentUser} />;
      case 'services':
        return <ServiceManagement hasPermission={hasPermission} />;
      case 'products':
        return <ProductManagement hasPermission={hasPermission} />;
      case 'categories':
        return <CategoryManagement hasPermission={hasPermission} />;
      case 'sales':
        return <SalesManagement hasPermission={hasPermission} currentUser={currentUser} />;
      case 'purchases':
        return <PurchaseManagement hasPermission={hasPermission} />;
      case 'suppliers':
        return <SupplierManagement hasPermission={hasPermission} />;
      case 'deliveries':
        return <SupplyDeliveryManagement hasPermission={hasPermission} />;
      default:
        return <DashboardOverview currentUser={currentUser} hasPermission={hasPermission} />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50">
      <div className="flex">
        {/* Sidebar */}
        <div className={`${isSidebarCollapsed ? 'w-16' : 'w-64'} bg-white shadow-xl border-r border-gray-200 min-h-screen transition-all duration-300`}>
          <div className={`${isSidebarCollapsed ? 'p-3' : 'p-6'} border-b border-gray-100 flex items-center justify-between`}>
            {!isSidebarCollapsed && (
              <div>
                <h2 className="text-2xl font-bold bg-gradient-to-r from-pink-500 to-purple-600 bg-clip-text text-transparent">
                  Panel Admin
                </h2>
                <p className="text-gray-600 text-sm mt-1">AsthroApp</p>
              </div>
            )}
            <button
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              {isSidebarCollapsed ? (
                <ChevronRight className="w-4 h-4 text-gray-600" />
              ) : (
                <ChevronLeft className="w-4 h-4 text-gray-600" />
              )}
            </button>
          </div>

          <TooltipProvider delayDuration={0}>
            <nav className="p-4">
              <ul className="space-y-4">
                {menuCategories.map((category, index) => (
                  <li key={category.name || `category-${index}`}>
                    {/* Category Title - only show if category name exists and sidebar is not collapsed */}
                    {category.name && !isSidebarCollapsed && (
                      <h3 className="text-xs font-bold text-gray-500 uppercase mb-2 px-2">{category.name}</h3>
                    )}
                    {/* Category Divider when collapsed - show a line if not first category */}
                    {category.name && isSidebarCollapsed && index > 0 && (
                      <div className="border-t border-gray-200 mb-2 pt-2"></div>
                    )}
                    <ul className="space-y-1">
                      {category.items.map((item) => {
                        const Icon = item.icon;
                        const button = (
                          <button
                            onClick={() => setActiveTab(item.id)}
                            className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center' : 'space-x-3'} px-4 py-3 rounded-xl text-left transition-all duration-200 ${activeTab === item.id
                                ? 'bg-gradient-to-r from-pink-400 to-purple-500 text-white shadow-lg'
                                : 'text-gray-900 hover:bg-pink-50 hover:text-pink-600'
                              }`}
                          >
                            <Icon className={`w-5 h-5 flex-shrink-0 ${activeTab === item.id ? 'text-white stroke-white' : 'text-gray-900 stroke-gray-900'}`} />
                            {!isSidebarCollapsed && <span className="font-medium">{item.label}</span>}
                          </button>
                        );

                        return (
                          <li key={item.id}>
                            {isSidebarCollapsed ? (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  {button}
                                </TooltipTrigger>
                                <TooltipContent side="right" className="bg-gradient-to-r from-pink-500 to-purple-600 text-white border-none">
                                  <p>{item.label}</p>
                                </TooltipContent>
                              </Tooltip>
                            ) : (
                              button
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  </li>
                ))}
              </ul>
            </nav>
          </TooltipProvider>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-auto">
          {renderContent()}
        </div>
      </div>
    </div>
  );
}