
"use client"

import React, { useEffect, useState } from 'react';
import { DeliveryOrder } from '@/utils/csvParser';
import OrderMap from '@/components/OrderMap';
import { ScrollArea } from '@/components/ui/scroll-area';

interface MapTabProps {
  orders: DeliveryOrder[];
}

export const MapTab: React.FC<MapTabProps> = ({ orders }) => {
  // To prevent performance issues with large datasets, limit the number of orders shown on map
  const [visibleOrders, setVisibleOrders] = useState<DeliveryOrder[]>([]);
  const ORDER_LIMIT = 100; // Maximum number of orders to display on map at once

  useEffect(() => {
    // Limit orders displayed to improve performance
    if (orders.length > ORDER_LIMIT) {
      console.log(`Limiting map display to ${ORDER_LIMIT} orders for performance (${orders.length} total)`);
      setVisibleOrders(orders.slice(0, ORDER_LIMIT));
    } else {
      setVisibleOrders(orders);
    }
  }, [orders]);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-2xl font-semibold tracking-tight">Map Visualization</h2>
        <p className="text-muted-foreground">
          {orders.length > ORDER_LIMIT 
            ? `Displaying ${ORDER_LIMIT} of ${orders.length} orders for optimal performance`
            : `Displaying ${orders.length} delivery locations`}
        </p>
      </div>
      <ScrollArea className="h-[calc(100vh-220px)]">
        <OrderMap orders={visibleOrders} />
      </ScrollArea>
    </div>
  );
};
