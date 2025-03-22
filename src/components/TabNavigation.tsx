
"use client"

import React from 'react';
import { TabsList, TabsTrigger } from '@/components/ui/tabs';

interface TabNavigationProps {
  activeTab: string;
  ordersCount: number;
  issuesCount: number;
  onTabChange: (value: string) => void;
}

export const TabNavigation: React.FC<TabNavigationProps> = ({
  activeTab,
  ordersCount,
  issuesCount,
  onTabChange
}) => {
  return (
    <div className="backdrop-blur-sm sticky top-0 z-10 pb-4 pt-1 bg-background/95 supports-[backdrop-filter]:bg-background/60">
      <TabsList className="grid w-full grid-cols-6 h-12">
        <TabsTrigger 
          value="upload" 
          onClick={() => onTabChange('upload')}
          data-state={activeTab === 'upload' ? 'active' : ''}
        >
          1. Upload CSV
        </TabsTrigger>
        <TabsTrigger 
          value="orders" 
          onClick={() => onTabChange('orders')}
          disabled={ordersCount === 0}
          data-state={activeTab === 'orders' ? 'active' : ''}
        >
          2. Review Orders
        </TabsTrigger>
        <TabsTrigger 
          value="map" 
          onClick={() => onTabChange('map')}
          disabled={ordersCount === 0}
          data-state={activeTab === 'map' ? 'active' : ''}
        >
          3. Map View
        </TabsTrigger>
        <TabsTrigger 
          value="invoice" 
          onClick={() => onTabChange('invoice')}
          disabled={ordersCount === 0}
          data-state={activeTab === 'invoice' ? 'active' : ''}
        >
          4. Generate Invoice
        </TabsTrigger>
        <TabsTrigger 
          value="investigation" 
          onClick={() => onTabChange('investigation')}
          disabled={ordersCount === 0}
          data-state={activeTab === 'investigation' ? 'active' : ''}
        >
          5. Investigate
        </TabsTrigger>
        <TabsTrigger 
          value="issues" 
          onClick={() => onTabChange('issues')}
          disabled={ordersCount === 0}
          className={issuesCount > 0 ? "text-orange-500 font-medium" : ""}
          data-state={activeTab === 'issues' ? 'active' : ''}
        >
          Issues {issuesCount > 0 && `(${issuesCount})`}
        </TabsTrigger>
      </TabsList>
    </div>
  );
};
