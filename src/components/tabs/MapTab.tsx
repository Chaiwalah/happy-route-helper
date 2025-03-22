
"use client"

import React from 'react';
import { DeliveryOrder } from '@/utils/csvParser';
import OrderMap from '@/components/OrderMap';
import { ScrollArea } from '@/components/ui/scroll-area';

interface MapTabProps {
  orders: DeliveryOrder[];
}

export const MapTab: React.FC<MapTabProps> = ({ orders }) => {
  return (
    <div className="space-y-6">
      <ScrollArea className="h-[calc(100vh-220px)]">
        <OrderMap orders={orders} />
      </ScrollArea>
    </div>
  );
};
