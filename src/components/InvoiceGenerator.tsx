
"use client"

import { DeliveryOrder } from '@/utils/csvParser';
import { InvoiceGeneratorMain } from './invoice/InvoiceGeneratorMain';
import { removeOrdersWithNoiseTrips } from '@/utils/routeOrganizer';
import { toast } from './ui/use-toast';
import { useEffect, useState } from 'react';

interface InvoiceGeneratorProps {
  orders: DeliveryOrder[];
}

export function InvoiceGenerator({ orders }: InvoiceGeneratorProps) {
  const [filteredOrders, setFilteredOrders] = useState<DeliveryOrder[]>(orders);
  
  // Filter out noise/test trip numbers on component mount
  useEffect(() => {
    const cleanedOrders = removeOrdersWithNoiseTrips(orders);
    
    if (cleanedOrders.length < orders.length) {
      const removedCount = orders.length - cleanedOrders.length;
      toast({
        title: "Data Cleaning Complete",
        description: `${removedCount} orders with test/noise trip numbers have been automatically filtered out.`,
        variant: "default",
      });
    }
    
    setFilteredOrders(cleanedOrders);
  }, [orders]);
  
  return <InvoiceGeneratorMain orders={filteredOrders} />;
}
