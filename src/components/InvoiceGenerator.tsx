
"use client"

import { DeliveryOrder } from '@/utils/csvParser';
import { InvoiceGeneratorMain } from './invoice/InvoiceGeneratorMain';
import { markOrdersWithNoiseTrips, removeOrdersWithNoiseTrips } from '@/utils/routeOrganizer';
import { toast } from './ui/use-toast';
import { useEffect, useState } from 'react';

interface InvoiceGeneratorProps {
  orders: DeliveryOrder[];
}

export function InvoiceGenerator({ orders }: InvoiceGeneratorProps) {
  const [filteredOrders, setFilteredOrders] = useState<DeliveryOrder[]>(orders);
  
  // Mark noise orders but don't filter them out until invoice generation
  useEffect(() => {
    const markedOrders = markOrdersWithNoiseTrips(orders);
    const noiseCount = markedOrders.filter(order => order.isNoise).length;
    
    if (noiseCount > 0) {
      toast({
        title: "Data Verification Required",
        description: `${noiseCount} orders with test/noise trip numbers have been detected and marked for verification.`,
        variant: "warning",
      });
    }
    
    setFilteredOrders(markedOrders);
  }, [orders]);
  
  return <InvoiceGeneratorMain orders={filteredOrders} />;
}
