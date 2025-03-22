
"use client"

import React from 'react';
import { DeliveryOrder } from '@/utils/csvParser';
import { InvoiceGenerator } from '@/components/InvoiceGenerator';
import { ScrollArea } from '@/components/ui/scroll-area';

interface InvoiceTabProps {
  orders: DeliveryOrder[];
}

export const InvoiceTab: React.FC<InvoiceTabProps> = ({ orders }) => {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-2xl font-semibold tracking-tight">Invoice Generation</h2>
        <p className="text-muted-foreground">
          Generate invoice based on delivery orders and rates
        </p>
      </div>
      
      <ScrollArea className="h-[calc(100vh-220px)]">
        <InvoiceGenerator orders={orders} />
      </ScrollArea>
    </div>
  );
};
