
"use client"

import React from 'react';
import { DeliveryOrder } from '@/utils/csvParser';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Check, X, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface IncompleteDataTabProps {
  orders: DeliveryOrder[];
  onOrdersUpdated: (updatedOrders: DeliveryOrder[]) => void;
  onOpenDataVerification: () => void;
}

export const IncompleteDataTab: React.FC<IncompleteDataTabProps> = ({
  orders,
  onOrdersUpdated,
  onOpenDataVerification
}) => {
  // Filter only incomplete orders
  const incompleteOrders = orders.filter(order => 
    order.missingFields?.length > 0 || 
    !order.tripNumber || 
    order.tripNumber.trim() === '' ||
    !order.driver ||
    order.driver.trim() === ''
  );

  // Count issues by type
  const issuesByType = incompleteOrders.reduce((acc, order) => {
    if (!order.tripNumber || order.tripNumber.trim() === '') {
      acc.missingTripNumbers++;
    }
    if (!order.driver || order.driver.trim() === '') {
      acc.missingDrivers++;
    }
    return acc;
  }, { missingTripNumbers: 0, missingDrivers: 0 });

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-2xl font-semibold tracking-tight">Incomplete Data Review</h2>
        <p className="text-muted-foreground">
          Review and fix orders with missing or incomplete information
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-lg border p-4 bg-amber-50 dark:bg-amber-950/20">
          <div className="flex items-center justify-between">
            <h3 className="font-medium">Orders with Issues</h3>
            <span className="text-2xl font-bold">{incompleteOrders.length}</span>
          </div>
        </div>
        <div className="rounded-lg border p-4 bg-red-50 dark:bg-red-950/20">
          <div className="flex items-center justify-between">
            <h3 className="font-medium">Missing Trip Numbers</h3>
            <span className="text-2xl font-bold">{issuesByType.missingTripNumbers}</span>
          </div>
        </div>
        <div className="rounded-lg border p-4 bg-blue-50 dark:bg-blue-950/20">
          <div className="flex items-center justify-between">
            <h3 className="font-medium">Missing Drivers</h3>
            <span className="text-2xl font-bold">{issuesByType.missingDrivers}</span>
          </div>
        </div>
      </div>

      {incompleteOrders.length > 0 ? (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={onOpenDataVerification} className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              <span>Open Data Verification Tool</span>
            </Button>
          </div>

          <ScrollArea className="h-[calc(100vh-350px)]">
            <Table>
              <TableHeader className="bg-gray-50/80 dark:bg-gray-900/50 backdrop-blur-sm sticky top-0 z-10">
                <TableRow>
                  <TableHead className="w-[80px]">ID</TableHead>
                  <TableHead>Trip Number</TableHead>
                  <TableHead>Driver</TableHead>
                  <TableHead>Pickup</TableHead>
                  <TableHead>Dropoff</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {incompleteOrders.map((order, index) => (
                  <TableRow key={order.id} className={index % 2 === 0 ? 'bg-white/50 dark:bg-gray-950/20' : 'bg-gray-50/50 dark:bg-gray-900/10'}>
                    <TableCell className="font-mono text-xs">{order.id}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {!order.tripNumber || order.tripNumber.trim() === '' ? (
                          <X className="h-4 w-4 text-red-500" />
                        ) : (
                          <Check className="h-4 w-4 text-green-500" />
                        )}
                        <span className={cn(
                          "font-medium",
                          (!order.tripNumber || order.tripNumber.trim() === '') && "text-red-500"
                        )}>
                          {order.tripNumber || "Missing"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {!order.driver || order.driver.trim() === '' ? (
                          <X className="h-4 w-4 text-red-500" />
                        ) : (
                          <Check className="h-4 w-4 text-green-500" />
                        )}
                        <span className={cn(
                          "font-medium",
                          (!order.driver || order.driver.trim() === '') && "text-red-500"
                        )}>
                          {order.driver || "Missing"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">{order.pickup || ""}</TableCell>
                    <TableCell className="max-w-[200px] truncate">{order.dropoff || ""}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => onOpenDataVerification()}>
                        Edit
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Check className="h-12 w-12 text-green-500 mb-4" />
          <h3 className="text-xl font-medium mb-2">All Data is Complete</h3>
          <p className="text-muted-foreground">
            All your orders have complete data. You're good to go!
          </p>
        </div>
      )}
    </div>
  );
};
