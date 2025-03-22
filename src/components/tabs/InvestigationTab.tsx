
"use client"

import React, { useState, useEffect } from 'react';
import { DeliveryOrder } from '@/utils/csvParser';
import { DispatcherInvestigation } from '@/components/DispatcherInvestigation';
import { ScrollArea } from '@/components/ui/scroll-area';

interface InvestigationTabProps {
  orders: DeliveryOrder[];
}

export const InvestigationTab: React.FC<InvestigationTabProps> = ({ orders }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [visibleOrders, setVisibleOrders] = useState<DeliveryOrder[]>([]);
  const ORDER_LIMIT = 200; // Maximum number of orders to process at once for performance

  useEffect(() => {
    // Artificial delay to prevent UI freezing on large datasets
    setIsLoading(true);
    
    const timer = setTimeout(() => {
      // Limit orders processed to improve performance
      if (orders.length > ORDER_LIMIT) {
        console.log(`Limiting investigation to ${ORDER_LIMIT} orders for performance (${orders.length} total)`);
        setVisibleOrders(orders.slice(0, ORDER_LIMIT));
      } else {
        setVisibleOrders(orders);
      }
      setIsLoading(false);
    }, 100);
    
    return () => clearTimeout(timer);
  }, [orders]);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-2xl font-semibold tracking-tight">Dispatcher Investigation</h2>
        <p className="text-muted-foreground">
          {isLoading ? 'Loading data...' : (
            orders.length > ORDER_LIMIT 
              ? `Analyzing ${ORDER_LIMIT} of ${orders.length} orders for optimal performance`
              : `Analyzing ${orders.length} delivery orders`
          )}
        </p>
      </div>
      <ScrollArea className="h-[calc(100vh-220px)]">
        {isLoading ? (
          <div className="flex items-center justify-center h-40">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <DispatcherInvestigation orders={visibleOrders} />
        )}
      </ScrollArea>
    </div>
  );
};
