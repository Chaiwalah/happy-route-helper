
"use client"

import { useState } from 'react';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { DeliveryOrder } from '@/utils/csvParser';
import { AlertCircle, CheckCircle } from 'lucide-react';
import { isNoiseOrTestTripNumber } from '@/utils/routeOrganizer';

interface VerificationSidebarProps {
  ordersRequiringVerification: DeliveryOrder[];
  verifiedOrders: DeliveryOrder[];
  selectedOrderIndex: number | null;
  onOrderSelect: (index: number) => void;
  ordersWithTripNumberIssues: DeliveryOrder[];
}

export function VerificationSidebar({
  ordersRequiringVerification,
  verifiedOrders,
  selectedOrderIndex,
  onOrderSelect,
  ordersWithTripNumberIssues
}: VerificationSidebarProps) {
  return (
    <div className="col-span-1 border rounded-lg p-3 bg-muted/20">
      <h3 className="text-sm font-medium mb-2">Orders Requiring Verification</h3>
      <ScrollArea className="h-[300px]">
        <div className="space-y-2">
          {ordersRequiringVerification.length > 0 ? (
            ordersRequiringVerification.map((order, index) => (
              <div 
                key={order.id} 
                className={`p-2 border rounded-md cursor-pointer transition-colors ${
                  selectedOrderIndex === verifiedOrders.findIndex(o => o.id === order.id) 
                    ? 'bg-primary/10 border-primary' 
                    : 'hover:bg-muted'
                }`}
                onClick={() => onOrderSelect(verifiedOrders.findIndex(o => o.id === order.id))}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">{order.id}</span>
                  {order.missingFields.includes('tripNumber') || !order.tripNumber || order.tripNumber.trim() === '' ? (
                    <Badge variant="destructive" className="ml-2">
                      <AlertCircle className="h-3 w-3 mr-1" />
                      Missing Trip #
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="ml-2">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Trip #{order.tripNumber}
                    </Badge>
                  )}
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  Driver: {order.driver || 'Unassigned'}
                </div>
                {order.missingFields.length > 0 && (
                  <div className="mt-1 text-xs text-red-500">
                    Missing: {order.missingFields.join(', ')}
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle className="mx-auto h-8 w-8 mb-2 text-green-500" />
              All orders have complete data
            </div>
          )}
        </div>
      </ScrollArea>
      
      <div className="mt-3">
        <div className="text-xs text-muted-foreground mb-1">Verification summary:</div>
        <div className="flex justify-between text-sm">
          <span>Total orders:</span>
          <span className="font-medium">{verifiedOrders.length}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span>Missing trip numbers:</span>
          <span className="font-medium">{ordersWithTripNumberIssues.length}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span>Requiring verification:</span>
          <span className="font-medium">{ordersRequiringVerification.length}</span>
        </div>
      </div>
    </div>
  );
}
