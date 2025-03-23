
"use client"

import React, { useState, useEffect } from 'react';
import { DeliveryOrder } from '@/utils/csvParser';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format } from 'date-fns';
import { MapFilters } from '@/components/map/MapFilters';
import { DriverStatsSummary } from '@/components/map/DriverStatsSummary';
import { useMapData } from '@/hooks/useMapData';
import OrderMap from '@/components/OrderMap';

interface MapTabProps {
  orders: DeliveryOrder[];
}

export const MapTab: React.FC<MapTabProps> = ({ orders }) => {
  // State
  const [visibleOrders, setVisibleOrders] = useState<DeliveryOrder[]>([]);
  const [isMapReady, setIsMapReady] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [sortByDistance, setSortByDistance] = useState<'asc' | 'desc' | null>(null);
  
  // Custom hook for map data
  const { drivers, driverStats } = useMapData(orders, selectedDriver, selectedDate, sortByDistance);

  // Derived state
  const ORDER_LIMIT = 1000;

  // Reset filters
  const resetFilters = () => {
    setSelectedDriver(null);
    setSelectedDate(null);
    setSortByDistance(null);
  };

  // Toggle sort by distance
  const toggleSortByDistance = () => {
    if (sortByDistance === null) {
      setSortByDistance('desc');
    } else if (sortByDistance === 'desc') {
      setSortByDistance('asc');
    } else {
      setSortByDistance(null);
    }
  };

  // Filter orders based on selection
  useEffect(() => {
    let filteredOrders = [...orders];
    
    if (selectedDriver) {
      filteredOrders = filteredOrders.filter(order => order.driver === selectedDriver);
    }
    
    if (selectedDate) {
      const dateString = format(selectedDate, 'yyyy-MM-dd');
      filteredOrders = filteredOrders.filter(order => {
        const orderDate = order.date || 
                         (order.exReadyTime ? order.exReadyTime.split('T')[0] : null) ||
                         (order.exDeliveryTime ? order.exDeliveryTime.split('T')[0] : null);
        
        if (!orderDate) return false;
        return orderDate.startsWith(dateString);
      });
    }
    
    // Apply order limit if needed
    if (filteredOrders.length > ORDER_LIMIT) {
      filteredOrders = filteredOrders.slice(0, ORDER_LIMIT);
    }
    
    setIsMapReady(false);
    
    // Use a small timeout to ensure UI update
    setTimeout(() => {
      setVisibleOrders(filteredOrders);
      setTimeout(() => setIsMapReady(true), 50);
    }, 10);
  }, [orders, selectedDriver, selectedDate, ORDER_LIMIT]);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-2xl font-semibold tracking-tight">Driver Route Visualization</h2>
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

      <MapFilters 
        drivers={drivers}
        selectedDriver={selectedDriver}
        setSelectedDriver={setSelectedDriver}
        selectedDate={selectedDate}
        setSelectedDate={setSelectedDate}
        sortByDistance={sortByDistance}
        toggleSortByDistance={toggleSortByDistance}
        resetFilters={resetFilters}
      />
      
      <DriverStatsSummary driverStats={driverStats} />
      
      <ScrollArea className="h-[calc(100vh-500px)]">
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
