
"use client"

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { DeliveryOrder } from '@/utils/csvParser';
import OrderMap from '@/components/OrderMap';
import { ScrollArea } from '@/components/ui/scroll-area';
import { startPerformanceTracking, endPerformanceTracking } from '@/utils/performanceLogger';

interface MapTabProps {
  orders: DeliveryOrder[];
}

export const MapTab: React.FC<MapTabProps> = ({ orders }) => {
  // To prevent performance issues with large datasets, limit the number of orders shown on map
  const [visibleOrders, setVisibleOrders] = useState<DeliveryOrder[]>([]);
  
  // Increased limit, but with memoization for better performance
  const ORDER_LIMIT = 150; // Increased from 100
  
  // Memoize order selection to prevent recalculation on re-renders
  const selectedOrders = useMemo(() => {
    if (orders.length <= ORDER_LIMIT) return orders;
    
    // For larger datasets, prioritize orders with trip numbers and location data
    const prioritizedOrders = [...orders].filter(order => 
      order.tripNumber && 
      order.dropoff &&
      (!order.missingFields || order.missingFields.length === 0)
    );
    
    if (prioritizedOrders.length >= ORDER_LIMIT) {
      return prioritizedOrders.slice(0, ORDER_LIMIT);
    }
    
    // If we still need more orders, add the remaining ones until we hit the limit
    const remainingOrders = orders.filter(order => 
      !prioritizedOrders.includes(order)
    );
    
    return [
      ...prioritizedOrders,
      ...remainingOrders.slice(0, ORDER_LIMIT - prioritizedOrders.length)
    ];
  }, [orders, ORDER_LIMIT]);
  
  // Update visible orders with performance tracking
  useEffect(() => {
    startPerformanceTracking('MapTab.setVisibleOrders', { 
      totalOrders: orders.length,
      visibleCount: selectedOrders.length 
    });
    
    setVisibleOrders(selectedOrders);
    
    endPerformanceTracking('MapTab.setVisibleOrders');
  }, [selectedOrders]);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-2xl font-semibold tracking-tight">Map Visualization</h2>
        <p className="text-muted-foreground">
          {orders.length > ORDER_LIMIT 
            ? `Displaying ${visibleOrders.length} of ${orders.length} orders for optimal performance`
            : `Displaying ${orders.length} delivery locations`}
        </p>
      </div>
      <ScrollArea className="h-[calc(100vh-220px)]">
        <OrderMap orders={visibleOrders} />
      </ScrollArea>
    </div>
  );
};
