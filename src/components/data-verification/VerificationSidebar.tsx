
"use client"

import { DeliveryOrder } from '@/utils/csvParser';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle, FileX, Truck } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VerificationSidebarProps {
  ordersRequiringVerification: DeliveryOrder[];
  verifiedOrders: DeliveryOrder[];
  selectedOrderId: string | null;
  onOrderSelect: (id: string) => void;
  ordersWithTripNumberIssues: DeliveryOrder[];
}

export function VerificationSidebar({
  ordersRequiringVerification,
  verifiedOrders,
  selectedOrderId,
  onOrderSelect,
  ordersWithTripNumberIssues
}: VerificationSidebarProps) {
  // Improved function to determine if an order has issues with its trip number
  const hasTripNumberIssue = (order: DeliveryOrder) => {
    // Check if trip number is missing from missingFields array
    const isMissingTripNumber = order.missingFields.includes('tripNumber');
    
    // Check if trip number is null, undefined, empty string or 'N/A'
    const isEmptyOrNA = !order.tripNumber || 
                         order.tripNumber.trim() === '' || 
                         order.tripNumber.trim().toLowerCase() === 'n/a';
    
    // Log the trip number status for debugging
    console.log(`Trip number check for ${order.id}: value="${order.tripNumber || 'undefined'}", isMissing=${isMissingTripNumber}, isEmpty=${isEmptyOrNA}`);
    
    return isMissingTripNumber || isEmptyOrNA;
  };
  
  // Improved function to determine if an order has issues with its driver assignment
  const hasDriverIssue = (order: DeliveryOrder) => {
    // Check if driver is missing from missingFields array
    const isMissingDriver = order.missingFields.includes('driver');
    
    // Check if driver is null, undefined, empty string or 'Unassigned'
    const isEmptyOrUnassigned = !order.driver || 
                                order.driver.trim() === '' || 
                                order.driver.trim() === 'Unassigned';
    
    // Log the driver status for debugging
    console.log(`Driver check for ${order.id}: value="${order.driver || 'undefined'}", isMissing=${isMissingDriver}, isEmpty=${isEmptyOrUnassigned}`);
    
    return isMissingDriver || isEmptyOrUnassigned;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-lg">Orders Requiring Verification</h3>
        <span className="text-sm text-muted-foreground">
          {ordersRequiringVerification.length} {ordersRequiringVerification.length === 1 ? 'order' : 'orders'}
        </span>
      </div>
      
      {ordersWithTripNumberIssues.length > 0 && (
        <div className="text-sm bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 p-3 rounded-md">
          <div className="flex items-center mb-1 font-medium">
            <AlertCircle className="h-4 w-4 mr-1" />
            Missing Trip Numbers
          </div>
          <p>
            {ordersWithTripNumberIssues.length} {ordersWithTripNumberIssues.length === 1 ? 'order needs' : 'orders need'} trip number verification.
          </p>
        </div>
      )}
      
      {ordersRequiringVerification.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground text-sm">
          <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
          <p>All orders have been verified</p>
        </div>
      ) : (
        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-2">
            {ordersRequiringVerification.map((order) => {
              // Debug info
              console.log(`Rendering order ${order.id} in sidebar:`, {
                tripNumber: order.tripNumber || 'missing',
                driver: order.driver || 'missing',
                hasTripIssue: hasTripNumberIssue(order),
                hasDriverIssue: hasDriverIssue(order)
              });
              
              return (
                <div
                  key={order.id}
                  className={cn(
                    "border rounded-md p-3 cursor-pointer transition-colors",
                    selectedOrderId === order.id
                      ? "bg-primary/10 border-primary/50"
                      : "hover:bg-muted"
                  )}
                  onClick={() => onOrderSelect(order.id)}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="font-medium">{order.id}</div>
                    <div className="flex space-x-1">
                      {hasTripNumberIssue(order) && (
                        <Badge variant="outline" className="text-amber-500 border-amber-500 bg-amber-50 dark:bg-amber-950/30">
                          Trip #
                        </Badge>
                      )}
                      {hasDriverIssue(order) && (
                        <Badge variant="outline" className="text-blue-500 border-blue-500 bg-blue-50 dark:bg-blue-950/30">
                          Driver
                        </Badge>
                      )}
                    </div>
                  </div>
                  
                  <div className="text-sm">
                    <div className="flex items-center text-muted-foreground">
                      <Truck className="h-3 w-3 mr-1" />
                      {order.driver && order.driver.trim() !== '' && order.driver !== 'Unassigned' ? (
                        order.driver
                      ) : (
                        <span className="italic">Driver Unassigned</span>
                      )}
                    </div>
                    <div className="flex items-start mt-1">
                      <div className="flex-1 truncate text-muted-foreground">
                        {order.dropoff || <span className="italic">No dropoff address</span>}
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-1 text-xs">
                      <div>
                        {order.tripNumber && order.tripNumber.trim() !== '' && order.tripNumber.toLowerCase() !== 'n/a' ? (
                          <span className="font-mono">{order.tripNumber}</span>
                        ) : (
                          <span className="italic text-amber-500">Missing Trip Number</span>
                        )}
                      </div>
                      <div className="text-muted-foreground">
                        {order.exDeliveryTime || ''}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
