
"use client"

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "@/components/ui/use-toast";
import { Badge } from "@/components/ui/badge";
import { DeliveryOrder } from '@/utils/csvParser';
import { AlertCircle, CheckCircle, Edit } from 'lucide-react';

interface DataVerificationProps {
  orders: DeliveryOrder[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOrdersVerified: (verifiedOrders: DeliveryOrder[]) => void;
}

export function DataVerification({ 
  orders, 
  open, 
  onOpenChange,
  onOrdersVerified
}: DataVerificationProps) {
  const [verifiedOrders, setVerifiedOrders] = useState<DeliveryOrder[]>(orders);
  const [selectedOrderIndex, setSelectedOrderIndex] = useState<number | null>(null);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [fieldValue, setFieldValue] = useState<string>("");
  
  // Filter orders with missing or potentially problematic data
  const ordersRequiringVerification = verifiedOrders.filter(order => 
    order.missingFields.length > 0 || !order.tripNumber
  );
  
  // Focus on Trip Number field issues specifically
  const ordersWithTripNumberIssues = verifiedOrders.filter(order => 
    !order.tripNumber || order.missingFields.includes('tripNumber')
  );
  
  const handleOrderEdit = (index: number) => {
    setSelectedOrderIndex(index);
    setEditingField(null);
  };
  
  const handleFieldEdit = (field: string, value: string) => {
    setEditingField(field);
    setFieldValue(value || "");
  };
  
  const handleFieldUpdate = () => {
    if (selectedOrderIndex === null || !editingField) return;
    
    const updatedOrders = [...verifiedOrders];
    const orderToUpdate = { ...updatedOrders[selectedOrderIndex] };
    
    // Update the field
    (orderToUpdate as any)[editingField] = fieldValue;
    
    // If we're updating a field that was missing, remove it from missingFields
    if (orderToUpdate.missingFields.includes(editingField)) {
      orderToUpdate.missingFields = orderToUpdate.missingFields.filter(f => f !== editingField);
    }
    
    updatedOrders[selectedOrderIndex] = orderToUpdate;
    setVerifiedOrders(updatedOrders);
    
    // Reset editing state
    setEditingField(null);
    setFieldValue("");
    
    toast({
      title: "Field updated",
      description: `${editingField} for order ${orderToUpdate.id} updated successfully.`,
    });
  };
  
  const handleVerificationComplete = () => {
    onOrdersVerified(verifiedOrders);
    onOpenChange(false);
    
    toast({
      title: "Data verification complete",
      description: `${verifiedOrders.length} orders have been verified and updated.`,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Verify Imported Data</DialogTitle>
          <DialogDescription>
            Review and correct data discrepancies, especially for critical fields like Trip Number.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 py-4">
          <div className="col-span-1 border rounded-lg p-3 bg-muted/20">
            <h3 className="text-sm font-medium mb-2">Orders Requiring Verification</h3>
            <ScrollArea className="h-[300px]">
              <div className="space-y-2">
                {ordersRequiringVerification.length > 0 ? (
                  ordersRequiringVerification.map((order, index) => (
                    <div 
                      key={order.id} 
                      className={`p-2 border rounded-md cursor-pointer transition-colors ${
                        selectedOrderIndex === index ? 'bg-primary/10 border-primary' : 'hover:bg-muted'
                      }`}
                      onClick={() => handleOrderEdit(verifiedOrders.findIndex(o => o.id === order.id))}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{order.id}</span>
                        {order.missingFields.includes('tripNumber') || !order.tripNumber ? (
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
          
          <div className="col-span-2 border rounded-lg p-4">
            {selectedOrderIndex !== null ? (
              <div className="space-y-4">
                <h3 className="text-lg font-medium">
                  Order Details: {verifiedOrders[selectedOrderIndex].id}
                </h3>
                
                <div className="space-y-3">
                  {/* Trip Number field - highlighted as critical */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="tripNumber" className="font-medium flex items-center">
                        Trip Number
                        <Badge variant="secondary" className="ml-2">Critical</Badge>
                      </Label>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleFieldEdit('tripNumber', verifiedOrders[selectedOrderIndex].tripNumber || '')}
                        className="h-6 w-6 p-0"
                      >
                        <Edit className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    
                    {editingField === 'tripNumber' ? (
                      <div className="flex space-x-2">
                        <Input
                          id="tripNumber"
                          value={fieldValue}
                          onChange={(e) => setFieldValue(e.target.value)}
                          className="h-8"
                          autoFocus
                        />
                        <Button size="sm" onClick={handleFieldUpdate}>Save</Button>
                      </div>
                    ) : (
                      <div className={`p-2 bg-muted/20 rounded text-sm ${
                        !verifiedOrders[selectedOrderIndex].tripNumber ? 'text-red-500 italic' : ''
                      }`}>
                        {verifiedOrders[selectedOrderIndex].tripNumber || 'Not specified'}
                      </div>
                    )}
                  </div>
                  
                  {/* Driver field */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="driver" className="font-medium">Driver</Label>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleFieldEdit('driver', verifiedOrders[selectedOrderIndex].driver || '')}
                        className="h-6 w-6 p-0"
                      >
                        <Edit className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    
                    {editingField === 'driver' ? (
                      <div className="flex space-x-2">
                        <Input
                          id="driver"
                          value={fieldValue}
                          onChange={(e) => setFieldValue(e.target.value)}
                          className="h-8"
                          autoFocus
                        />
                        <Button size="sm" onClick={handleFieldUpdate}>Save</Button>
                      </div>
                    ) : (
                      <div className="p-2 bg-muted/20 rounded text-sm">
                        {verifiedOrders[selectedOrderIndex].driver || 'Unassigned'}
                      </div>
                    )}
                  </div>
                  
                  {/* Pickup and Dropoff addresses */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="pickup" className="font-medium">Pickup Address</Label>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleFieldEdit('pickup', verifiedOrders[selectedOrderIndex].pickup || '')}
                          className="h-6 w-6 p-0"
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                      
                      {editingField === 'pickup' ? (
                        <div className="flex space-x-2">
                          <Input
                            id="pickup"
                            value={fieldValue}
                            onChange={(e) => setFieldValue(e.target.value)}
                            className="h-8"
                            autoFocus
                          />
                          <Button size="sm" onClick={handleFieldUpdate}>Save</Button>
                        </div>
                      ) : (
                        <div className={`p-2 bg-muted/20 rounded text-sm ${
                          !verifiedOrders[selectedOrderIndex].pickup ? 'text-red-500 italic' : ''
                        }`}>
                          {verifiedOrders[selectedOrderIndex].pickup || 'Not specified'}
                        </div>
                      )}
                    </div>
                    
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="dropoff" className="font-medium">Dropoff Address</Label>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleFieldEdit('dropoff', verifiedOrders[selectedOrderIndex].dropoff || '')}
                          className="h-6 w-6 p-0"
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                      
                      {editingField === 'dropoff' ? (
                        <div className="flex space-x-2">
                          <Input
                            id="dropoff"
                            value={fieldValue}
                            onChange={(e) => setFieldValue(e.target.value)}
                            className="h-8"
                            autoFocus
                          />
                          <Button size="sm" onClick={handleFieldUpdate}>Save</Button>
                        </div>
                      ) : (
                        <div className={`p-2 bg-muted/20 rounded text-sm ${
                          !verifiedOrders[selectedOrderIndex].dropoff ? 'text-red-500 italic' : ''
                        }`}>
                          {verifiedOrders[selectedOrderIndex].dropoff || 'Not specified'}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Time windows */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="exReadyTime" className="font-medium">Ready Time</Label>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleFieldEdit('exReadyTime', verifiedOrders[selectedOrderIndex].exReadyTime || '')}
                          className="h-6 w-6 p-0"
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                      
                      {editingField === 'exReadyTime' ? (
                        <div className="flex space-x-2">
                          <Input
                            id="exReadyTime"
                            value={fieldValue}
                            onChange={(e) => setFieldValue(e.target.value)}
                            className="h-8"
                            autoFocus
                          />
                          <Button size="sm" onClick={handleFieldUpdate}>Save</Button>
                        </div>
                      ) : (
                        <div className="p-2 bg-muted/20 rounded text-sm">
                          {verifiedOrders[selectedOrderIndex].exReadyTime || 'Not specified'}
                        </div>
                      )}
                    </div>
                    
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="exDeliveryTime" className="font-medium">Delivery Time</Label>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleFieldEdit('exDeliveryTime', verifiedOrders[selectedOrderIndex].exDeliveryTime || '')}
                          className="h-6 w-6 p-0"
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                      
                      {editingField === 'exDeliveryTime' ? (
                        <div className="flex space-x-2">
                          <Input
                            id="exDeliveryTime"
                            value={fieldValue}
                            onChange={(e) => setFieldValue(e.target.value)}
                            className="h-8"
                            autoFocus
                          />
                          <Button size="sm" onClick={handleFieldUpdate}>Save</Button>
                        </div>
                      ) : (
                        <div className="p-2 bg-muted/20 rounded text-sm">
                          {verifiedOrders[selectedOrderIndex].exDeliveryTime || 'Not specified'}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center py-10">
                <div className="text-muted-foreground mb-2">
                  Select an order from the list to view and edit its details
                </div>
                {ordersWithTripNumberIssues.length > 0 && (
                  <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-md text-sm max-w-md">
                    <div className="font-medium text-amber-700 dark:text-amber-400 mb-1 flex items-center">
                      <AlertCircle className="h-4 w-4 mr-1" />
                      Trip Number Verification Required
                    </div>
                    <p className="text-amber-600 dark:text-amber-300">
                      {ordersWithTripNumberIssues.length} orders have missing or invalid Trip Numbers. 
                      Please review and correct them to ensure proper route organization.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleVerificationComplete}>
            Confirm Verification
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
