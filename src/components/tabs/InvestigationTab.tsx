
"use client"

import React from 'react';
import { DeliveryOrder } from '@/utils/csvParser';
import { DispatcherInvestigation } from '@/components/DispatcherInvestigation';
import { ScrollArea } from '@/components/ui/scroll-area';

interface InvestigationTabProps {
  orders: DeliveryOrder[];
}

export const InvestigationTab: React.FC<InvestigationTabProps> = ({ orders }) => {
  return (
    <div className="space-y-6">
      <ScrollArea className="h-[calc(100vh-220px)]">
        <DispatcherInvestigation orders={orders} />
      </ScrollArea>
    </div>
  );
};
