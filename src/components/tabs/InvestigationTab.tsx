
"use client"

import React, { useState, useEffect, useMemo } from 'react';
import { DeliveryOrder } from '@/utils/csvParser';
import { DispatcherInvestigation } from '@/components/DispatcherInvestigation';
import { ScrollArea } from '@/components/ui/scroll-area';
import { startPerformanceTracking, endPerformanceTracking } from '@/utils/performanceLogger';

interface InvestigationTabProps {
  orders: DeliveryOrder[];
}

export const InvestigationTab: React.FC<InvestigationTabProps> = ({ orders }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [visibleOrders, setVisibleOrders] = useState<DeliveryOrder[]>([]);
  const ORDER_LIMIT = 250; // Increased from 200 for improved analysis

  // Memoize order selection for better performance
  const selectedOrders = useMemo(() => {
    // If under limit, use all orders
    if (orders.length <= ORDER_LIMIT) return orders;
    
    // Prioritize orders with issues for investigation
    const prioritizedOrders = [...orders].filter(order => 
      order.missingFields && order.missingFields.length > 0
    );
    
    // Add orders with trip numbers next (for proper grouping)
    const ordersWithTripNumbers = orders.filter(order => 
      order.tripNumber && 
      (!order.missingFields || !order.missingFields.includes('tripNumber')) &&
      !prioritizedOrders.includes(order)
    );
    
    // Combine and limit
    const combinedOrders = [
      ...prioritizedOrders,
      ...ordersWithTripNumbers
    ].slice(0, ORDER_LIMIT);
    
    return combinedOrders.length < ORDER_LIMIT 
      ? [...combinedOrders, ...orders.filter(o => 
          !combinedOrders.includes(o)
        ).slice(0, ORDER_LIMIT - combinedOrders.length)]
      : combinedOrders;
  }, [orders, ORDER_LIMIT]);

  useEffect(() => {
    startPerformanceTracking('InvestigationTab.processOrders', { orderCount: orders.length });
    
    // Set loading state
    setIsLoading(true);
    
    // Use a more efficient approach by chunking the work
    const processInChunks = async () => {
      // Small delay to let UI render loading state
      await new Promise(r => setTimeout(r, 50));
      
      // Set the orders
      setVisibleOrders(selectedOrders);
      
      // Small delay before removing loading state
      await new Promise(r => setTimeout(r, 50));
      setIsLoading(false);
    };
    
    processInChunks().then(() => {
      endPerformanceTracking('InvestigationTab.processOrders', {
        selectedCount: selectedOrders.length
      });
    });
  }, [selectedOrders]);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-2xl font-semibold tracking-tight">Dispatcher Investigation</h2>
        <p className="text-muted-foreground">
          {isLoading ? 'Loading data...' : (
            orders.length > ORDER_LIMIT 
              ? `Analyzing ${visibleOrders.length} of ${orders.length} orders for optimal performance`
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
