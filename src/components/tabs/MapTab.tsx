"use client"

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { DeliveryOrder } from '@/utils/csvParser';
import OrderMap from '@/components/OrderMap';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Label } from '@/components/ui/label';
import { format } from 'date-fns';
import { CalendarIcon, XCircle } from 'lucide-react';
import { startPerformanceTracking, endPerformanceTracking, logPerformance } from '@/utils/performanceLogger';

interface MapTabProps {
  orders: DeliveryOrder[];
}

export const MapTab: React.FC<MapTabProps> = ({ orders }) => {
  // To prevent performance issues with large datasets, limit the number of orders shown on map
  const [visibleOrders, setVisibleOrders] = useState<DeliveryOrder[]>([]);
  const [isMapReady, setIsMapReady] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  
  // Get unique drivers from orders
  const drivers = useMemo(() => {
    const driverSet = new Set<string>();
    orders.forEach(order => {
      if (order.driver && order.driver.trim()) {
        driverSet.add(order.driver);
      }
    });
    return Array.from(driverSet).sort();
  }, [orders]);

  // Get unique dates from orders
  const dates = useMemo(() => {
    const dateSet = new Set<string>();
    orders.forEach(order => {
      // Try to get date from either the date field or exReadyTime/exDeliveryTime
      let dateStr = order.date ? order.date.split('T')[0] : null;
      
      // If no explicit date, try to extract from time fields
      if (!dateStr && order.exReadyTime) {
        dateStr = order.exReadyTime.split('T')[0];
      } else if (!dateStr && order.exDeliveryTime) {
        dateStr = order.exDeliveryTime.split('T')[0];
      }
      
      if (dateStr) {
        dateSet.add(dateStr);
      }
    });
    return Array.from(dateSet).sort();
  }, [orders]);

  // Increased limit, but with memoization for better performance
  const ORDER_LIMIT = 1000; // Increased to handle multiple routes for visualization
  
  // OPTIMIZATION: Memoize order selection with better prioritization logic
  const selectedOrders = useMemo(() => {
    startPerformanceTracking('MapTab.selectOrders', { orderCount: orders.length });
    
    // Filter orders by selected driver and/or date
    let filteredOrders = [...orders];
    
    if (selectedDriver) {
      filteredOrders = filteredOrders.filter(order => order.driver === selectedDriver);
    }
    
    if (selectedDate) {
      const dateString = format(selectedDate, 'yyyy-MM-dd');
      filteredOrders = filteredOrders.filter(order => {
        // Check all possible date fields
        const orderDate = order.date || 
                         (order.exReadyTime ? order.exReadyTime.split('T')[0] : null) ||
                         (order.exDeliveryTime ? order.exDeliveryTime.split('T')[0] : null);
        
        if (!orderDate) return false;
        return orderDate.startsWith(dateString);
      });
    }
    
    if (filteredOrders.length === 0) {
      endPerformanceTracking('MapTab.selectOrders', { 
        selectionType: 'filtered', 
        count: 0 
      });
      return [];
    }
    
    if (filteredOrders.length <= ORDER_LIMIT) {
      endPerformanceTracking('MapTab.selectOrders', { 
        selectionType: 'filtered_all', 
        count: filteredOrders.length 
      });
      return filteredOrders;
    }
    
    // PRIORITIZATION ALGORITHM:
    // 1. First prioritize orders with both coordinates and trip numbers
    // 2. Then orders with coordinates but no trip numbers
    // 3. Finally, fill with any other orders up to the limit
    
    // First priority: Orders with valid dropoff coordinates and trip numbers
    const ordersWithLocationAndTrip = filteredOrders.filter(order => 
      order.dropoff && 
      order.tripNumber && 
      order.tripNumber.trim() !== '' &&
      (!order.missingFields || !order.missingFields.includes('tripNumber'))
    );
    
    // Second priority: Orders with valid dropoff coordinates only
    const ordersWithLocationOnly = filteredOrders.filter(order => 
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
      const otherOrders = filteredOrders.filter(order => 
        !combinedOrders.includes(order)
      );
      
      // Add remaining orders
      combinedOrders.push(...otherOrders.slice(0, remainingSlots));
    }
    
    logPerformance('Map order selection', {
      totalOrders: orders.length,
      filteredOrders: filteredOrders.length,
      selectedTotal: combinedOrders.length
    });
    
    endPerformanceTracking('MapTab.selectOrders', { 
      selectionType: 'filtered_prioritized', 
      total: combinedOrders.length
    });
    
    return combinedOrders;
  }, [orders, selectedDriver, selectedDate, ORDER_LIMIT]);
  
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

  const resetFilters = () => {
    setSelectedDriver(null);
    setSelectedDate(null);
  };

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-2xl font-semibold tracking-tight">Map Visualization</h2>
        <p className="text-muted-foreground">
          {!isMapReady ? 'Loading map...' : (
            orders.length > ORDER_LIMIT && !selectedDriver && !selectedDate
              ? `Displaying ${visibleOrders.length} of ${orders.length} orders for optimal performance`
              : selectedDriver || selectedDate 
                ? `Displaying ${visibleOrders.length} orders for ${selectedDriver ? `driver: ${selectedDriver}` : ''}${selectedDriver && selectedDate ? ' on ' : ''}${selectedDate ? format(selectedDate, 'PPP') : ''}`
                : `Displaying ${orders.length} delivery locations`
          )}
        </p>
      </div>

      <div className="flex flex-wrap gap-4 items-end">
        <div className="space-y-2">
          <Label htmlFor="driver-select">Filter by Driver</Label>
          <Select
            value={selectedDriver || ""}
            onValueChange={(value) => setSelectedDriver(value || null)}
          >
            <SelectTrigger id="driver-select" className="w-[200px]">
              <SelectValue placeholder="All Drivers" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Drivers</SelectItem>
              {drivers.map(driver => (
                <SelectItem key={driver} value={driver}>{driver}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="date-select">Filter by Date</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                id="date-select"
                variant="outline"
                className={`w-[200px] justify-start text-left font-normal ${
                  !selectedDate && "text-muted-foreground"
                }`}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {selectedDate ? format(selectedDate, 'PPP') : "Select date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        {(selectedDriver || selectedDate) && (
          <Button 
            variant="outline" 
            onClick={resetFilters}
            className="flex items-center gap-1"
          >
            <XCircle className="h-4 w-4" />
            Reset Filters
          </Button>
        )}
      </div>
      
      <ScrollArea className="h-[calc(100vh-280px)]">
        {!isMapReady ? (
          <div className="flex items-center justify-center h-80">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <OrderMap 
            orders={visibleOrders} 
            showRoutes={true}
            selectedDriver={selectedDriver}
            selectedDate={selectedDate ? format(selectedDate, 'yyyy-MM-dd') : null}
          />
        )}
      </ScrollArea>
    </div>
  );
};
