
"use client"

import React, { useState, useEffect, useMemo } from 'react';
import { DeliveryOrder } from '@/utils/csvParser';
import { DispatcherInvestigation } from '@/components/DispatcherInvestigation';
import { ScrollArea } from '@/components/ui/scroll-area';
import { startPerformanceTracking, endPerformanceTracking, logPerformance } from '@/utils/performanceLogger';

interface InvestigationTabProps {
  orders: DeliveryOrder[];
}

export const InvestigationTab: React.FC<InvestigationTabProps> = ({ orders }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [visibleOrders, setVisibleOrders] = useState<DeliveryOrder[]>([]);
  const ORDER_LIMIT = 300; // Increased from 250 for better analysis coverage
  
  // Memoize order selection for better performance
  const selectedOrders = useMemo(() => {
    startPerformanceTracking('InvestigationTab.selectOrders', { orderCount: orders.length });
    
    // If under limit, use all orders
    if (orders.length <= ORDER_LIMIT) {
      endPerformanceTracking('InvestigationTab.selectOrders', { 
        selectionType: 'all', 
        count: orders.length 
      });
      return orders;
    }
    
    // Use a new, optimized prioritization algorithm for better investigation results
    
    // First, prioritize orders with missing fields or issues
    // These are the most important for investigation
    const ordersWithIssues = orders.filter(order => 
      order.missingFields && order.missingFields.length > 0
    );
    
    // Then prioritize orders with trip numbers
    // These are important for dispatcher grouping
    const ordersWithTripNumbers = orders.filter(order => 
      order.tripNumber && 
      (!order.missingFields || !order.missingFields.includes('tripNumber')) &&
      !ordersWithIssues.includes(order)
    );
    
    // Then prioritize orders with specified drivers (not "Unassigned")
    const ordersWithDrivers = orders.filter(order => 
      order.driver && 
      order.driver !== 'Unassigned' &&
      (!order.missingFields || !order.missingFields.includes('driver')) &&
      !ordersWithIssues.includes(order) &&
      !ordersWithTripNumbers.includes(order)
    );
    
    // Combine prioritized orders
    const prioritizedOrders = [
      ...ordersWithIssues,
      ...ordersWithTripNumbers,
      ...ordersWithDrivers
    ];
    
    // Deduplicate and limit
    const uniquePrioritizedOrders = Array.from(new Set(prioritizedOrders));
    const limitedPrioritizedOrders = uniquePrioritizedOrders.slice(0, ORDER_LIMIT);
    
    // If we still need more orders to reach the limit, add remaining orders
    if (limitedPrioritizedOrders.length < ORDER_LIMIT) {
      // Add remaining orders not included yet
      const remainingOrders = orders.filter(order => 
        !limitedPrioritizedOrders.includes(order)
      );
      
      // Add remaining orders up to limit
      const result = [
        ...limitedPrioritizedOrders,
        ...remainingOrders.slice(0, ORDER_LIMIT - limitedPrioritizedOrders.length)
      ];
      
      endPerformanceTracking('InvestigationTab.selectOrders', { 
        selectionType: 'prioritized+remaining', 
        withIssues: ordersWithIssues.length,
        withTripNumbers: ordersWithTripNumbers.length,
        withDrivers: ordersWithDrivers.length,
        remaining: result.length - limitedPrioritizedOrders.length,
        total: result.length
      });
      
      return result;
    }
    
    endPerformanceTracking('InvestigationTab.selectOrders', { 
      selectionType: 'prioritized', 
      withIssues: ordersWithIssues.length,
      withTripNumbers: ordersWithTripNumbers.length,
      withDrivers: ordersWithDrivers.length,
      total: limitedPrioritizedOrders.length
    });
    
    return limitedPrioritizedOrders;
  }, [orders, ORDER_LIMIT]);

  useEffect(() => {
    startPerformanceTracking('InvestigationTab.processOrders', { orderCount: orders.length });
    
    // Set loading state
    setIsLoading(true);
    
    // Use an efficient chunking approach with requestAnimationFrame
    // This prevents UI freezing on large datasets
    const processInChunks = () => {
      requestAnimationFrame(() => {
        // Set the orders
        setVisibleOrders(selectedOrders);
        
        // Short delay before removing loading state to allow rendering
        setTimeout(() => {
          setIsLoading(false);
          
          endPerformanceTracking('InvestigationTab.processOrders', {
            selectedCount: selectedOrders.length
          });
          
          logPerformance('Investigation tab rendered', {
            totalOrders: orders.length,
            visibleOrders: selectedOrders.length,
            percentageShown: Math.round((selectedOrders.length / orders.length) * 100)
          });
        }, 10);
      });
    };
    
    processInChunks();
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
