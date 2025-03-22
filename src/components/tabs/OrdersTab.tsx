
"use client"

import React from 'react';
import { DeliveryOrder } from '@/utils/csvParser';
import { DataTable } from '@/components/DataTable';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { AlertCircle, Trash2 } from 'lucide-react';

interface OrdersTabProps {
  orders: DeliveryOrder[];
  onOrdersUpdated: (updatedOrders: DeliveryOrder[]) => void;
  onRemoveOrdersWithMissingTripNumbers: () => void;
  onOpenDataVerification: () => void;
}

export const OrdersTab: React.FC<OrdersTabProps> = ({ 
  orders,
  onOrdersUpdated,
  onRemoveOrdersWithMissingTripNumbers,
  onOpenDataVerification
}) => {
  return (
    <div className="space-y-6">
      <div className="space-y-1 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Review Orders</h2>
          <p className="text-muted-foreground">
            Review and edit order details before generating invoices
          </p>
        </div>
        
        {orders.length > 0 && (
          <div className="flex gap-2">
            <Button 
              onClick={onRemoveOrdersWithMissingTripNumbers}
              variant="destructive"
              className="flex items-center gap-2"
            >
              <Trash2 className="h-4 w-4" />
              <span>Remove Orders with Missing Trip Numbers</span>
            </Button>
            <Button 
              onClick={onOpenDataVerification}
              variant="outline"
              className="flex items-center gap-2"
            >
              <AlertCircle className="h-4 w-4" />
              <span>Verify Trip Numbers</span>
            </Button>
          </div>
        )}
      </div>
      
      <ScrollArea className="h-[calc(100vh-220px)]">
        <DataTable data={orders} onOrdersUpdated={onOrdersUpdated} />
      </ScrollArea>
    </div>
  );
};
