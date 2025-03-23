
"use client"

import React, { useState } from 'react';
import { DeliveryOrder } from '@/utils/csvParser';
import { DataTable } from '@/components/DataTable';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { AlertCircle, Trash2, Eye, EyeOff } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

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
  const [showIncompleteData, setShowIncompleteData] = useState(false);
  
  // Filter orders to hide incomplete data if toggle is off
  const filteredOrders = showIncompleteData 
    ? orders 
    : orders.filter(order => 
        (!order.missingFields || order.missingFields.length === 0) && 
        order.tripNumber && 
        order.tripNumber.trim() !== '' &&
        order.driver &&
        order.driver.trim() !== ''
      );

  const incompleteOrdersCount = orders.length - filteredOrders.length;
  
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
          <div className="flex gap-4 items-center">
            <div className="flex items-center space-x-2">
              <Switch 
                id="show-incomplete" 
                checked={showIncompleteData}
                onCheckedChange={setShowIncompleteData}
              />
              <Label htmlFor="show-incomplete" className="cursor-pointer flex items-center gap-1">
                {showIncompleteData ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                <span>
                  {showIncompleteData 
                    ? "Showing all orders" 
                    : `Hiding incomplete orders (${incompleteOrdersCount})`}
                </span>
              </Label>
            </div>
            
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
                variant={incompleteOrdersCount > 0 ? "default" : "outline"}
                className="flex items-center gap-2"
              >
                <AlertCircle className="h-4 w-4" />
                <span>Manual Review {incompleteOrdersCount > 0 ? `(${incompleteOrdersCount})` : ""}</span>
              </Button>
            </div>
          </div>
        )}
      </div>
      
      <ScrollArea className="h-[calc(100vh-220px)]">
        <DataTable data={filteredOrders} onOrdersUpdated={onOrdersUpdated} />
      </ScrollArea>
    </div>
  );
};
