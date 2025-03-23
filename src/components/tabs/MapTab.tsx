
"use client"

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { DeliveryOrder } from '@/utils/csvParser';
import OrderMap from '@/components/OrderMap';
import { ScrollArea } from '@/components/ui/scroll-area';
import { startPerformanceTracking, endPerformanceTracking, logPerformance } from '@/utils/performanceLogger';

interface MapTabProps {
  orders: DeliveryOrder[];
}

export const MapTab: React.FC<MapTabProps> = ({ orders }) => {
  // To prevent performance issues with large datasets, limit the number of orders shown on map
  const [visibleOrders, setVisibleOrders] = useState<DeliveryOrder[]>([]);
  const [isMapReady, setIsMapReady] = useState(false);
  
  // Increased limit, but with memoization for better performance
  const ORDER_LIMIT = 200; // Increased from 150 for better visualization
  
  // OPTIMIZATION: Memoize order selection with better prioritization logic
  const selectedOrders = useMemo(() => {
    startPerformanceTracking('MapTab.selectOrders', { orderCount: orders.length });
    
    if (orders.length <= ORDER_LIMIT) {
      endPerformanceTracking('MapTab.selectOrders', { 
        selectionType: 'all', 
        count: orders.length 
      });
      return orders;
    }
    
    // IMPROVED PRIORITIZATION ALGORITHM:
    // 1. First prioritize orders with both coordinates and trip numbers
    // 2. Then orders with coordinates but no trip numbers
    // 3. Finally, fill with any other orders up to the limit
    
    // First priority: Orders with valid dropoff coordinates and trip numbers
    // These are the most valuable for map visualization and are grouped by trip
    const ordersWithLocationAndTrip = orders.filter(order => 
      order.dropoff && 
      order.tripNumber && 
      order.tripNumber.trim() !== '' &&
      (!order.missingFields || !order.missingFields.includes('tripNumber'))
    );
    
    // Second priority: Orders with valid dropoff coordinates only
    // These are still valuable for visualization but not grouped
    const ordersWithLocationOnly = orders.filter(order => 
      order.dropoff && 
      (!order.tripNumber || 
       order.tripNumber.trim() === '' || 
       (order.missingFields && order.missingFields.includes('tripNumber'))) &&
      !ordersWithLocationAndTrip.includes(order)
    );
    
    // Combine and limit
    const combinedOrders = [...ordersWithLocationAndTrip];
    
    // If we have room, add location-only orders
    if (combinedOrders.length < ORDER_LIMIT) {
      const remainingSlots = ORDER_LIMIT - combinedOrders.length;
      combinedOrders.push(...ordersWithLocationOnly.slice(0, remainingSlots));
    }
    
    // If we still haven't reached the limit, add any other orders
    if (combinedOrders.length < ORDER_LIMIT) {
      const remainingSlots = ORDER_LIMIT - combinedOrders.length;
      
      // Get orders not already included
      const otherOrders = orders.filter(order => 
        !combinedOrders.includes(order)
      );
      
      // Add remaining orders
      combinedOrders.push(...otherOrders.slice(0, remainingSlots));
    }
    
    logPerformance('Map order selection', {
      totalOrders: orders.length,
      ordersWithLocationAndTrip: ordersWithLocationAndTrip.length,
      ordersWithLocationOnly: ordersWithLocationOnly.length,
      selectedTotal: combinedOrders.length
    });
    
    endPerformanceTracking('MapTab.selectOrders', { 
      selectionType: 'prioritized', 
      withLocationAndTrip: ordersWithLocationAndTrip.length,
      withLocationOnly: ordersWithLocationOnly.length,
      total: combinedOrders.length
    });
    
    return combinedOrders;
  }, [orders, ORDER_LIMIT]);
  
  // Update visible orders with performance tracking
  useEffect(() => {
    startPerformanceTracking('MapTab.setVisibleOrders', { 
      totalOrders: orders.length,
      visibleCount: selectedOrders.length 
    });
    
    // OPTIMIZATION: Use requestAnimationFrame for better UI responsiveness
    requestAnimationFrame(() => {
      setIsMapReady(false); // Hide map while updating
      
      // Short timeout to ensure UI update
      setTimeout(() => {
        setVisibleOrders(selectedOrders);
        
        // Give the map a moment to prepare with the new data
        setTimeout(() => {
          setIsMapReady(true);
          
          endPerformanceTracking('MapTab.setVisibleOrders', {
            visibleOrdersSet: true
          });
        }, 50);
      }, 10);
    });
  }, [selectedOrders]);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-2xl font-semibold tracking-tight">Map Visualization</h2>
        <p className="text-muted-foreground">
          {!isMapReady ? 'Loading map...' : (
            orders.length > ORDER_LIMIT 
              ? `Displaying ${visibleOrders.length} of ${orders.length} orders for optimal performance`
              : `Displaying ${orders.length} delivery locations`
          )}
        </p>
      </div>
      <ScrollArea className="h-[calc(100vh-220px)]">
        {!isMapReady ? (
          <div className="flex items-center justify-center h-80">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <OrderMap orders={visibleOrders} />
        )}
      </ScrollArea>
    </div>
  );
};
