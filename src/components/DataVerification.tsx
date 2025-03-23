
"use client"

import React from 'react';
import { DeliveryOrder } from '@/utils/csvParser';
import { OrderDetails } from './data-verification/OrderDetails';
import { VerificationSidebar } from './data-verification/VerificationSidebar';
import { useOrderVerification } from './data-verification/hooks/useOrderVerification';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { processFieldValue } from './data-verification/hooks/useOrderVerification/statusUtils';

interface DataVerificationProps {
  orders: DeliveryOrder[];
  onOrdersVerified: (updatedOrders: DeliveryOrder[]) => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function DataVerification({
  orders,
  onOrdersVerified,
  open,
  onOpenChange
}: DataVerificationProps) {
  // Initialize the orders before passing to useOrderVerification
  const initializedOrders = orders.map(order => ({
    ...order,
    // Make sure tripNumber is not undefined or null
    tripNumber: order.tripNumber !== undefined && order.tripNumber !== null 
      ? processFieldValue(order.tripNumber) 
      : '',
    // Make sure driver is not undefined or null
    driver: order.driver !== undefined && order.driver !== null 
      ? processFieldValue(order.driver) 
      : 'Unassigned',
    // Ensure missingFields exists
    missingFields: order.missingFields || []
  }));

  const {
    ordersWithIssues,
    selectedOrderId,
    setSelectedOrderId,
    selectedOrder,
    editingField,
    fieldValue,
    validationMessage,
    isSavingField,
    suggestedTripNumbers,
    suggestedDrivers,
    handleFieldEdit,
    handleFieldValueChange,
    handleFieldUpdate,
    handleOrdersApprove,
    getFieldValidationStatus
  } = useOrderVerification({ 
    initialOrders: initializedOrders, 
    onOrdersUpdated: onOrdersVerified 
  });

  // Convert ordersWithIssues (string[]) to an array of DeliveryOrder objects
  const ordersWithIssuesObjects = React.useMemo(() => {
    return initializedOrders.filter(order => ordersWithIssues.includes(order.id));
  }, [initializedOrders, ordersWithIssues]);

  // Add some console logging to check what's happening
  console.log('[DataVerification] Orders with issues:', ordersWithIssues);
  console.log('[DataVerification] Selected order:', selectedOrder);

  // If Dialog props are provided, render in a Dialog
  if (open !== undefined && onOpenChange !== undefined) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-5xl h-[80vh]">
          <DialogHeader>
            <DialogTitle>Data Verification</DialogTitle>
            <DialogDescription>
              Review and correct any issues with trip numbers and driver assignments
            </DialogDescription>
          </DialogHeader>
          <div className="flex h-full flex-col md:flex-row">
            <div className="w-full md:w-1/3 border-r p-4 overflow-auto max-h-[60vh] md:max-h-full">
              <VerificationSidebar
                ordersRequiringVerification={ordersWithIssuesObjects}
                verifiedOrders={initializedOrders}
                selectedOrderId={selectedOrderId}
                onOrderSelect={setSelectedOrderId}
                ordersWithTripNumberIssues={ordersWithIssuesObjects}
              />
            </div>
            <div className="w-full md:w-2/3 p-4 overflow-auto max-h-[60vh] md:max-h-full">
              {selectedOrder && (
                <OrderDetails
                  selectedOrder={selectedOrder}
                  editingField={editingField}
                  fieldValue={fieldValue}
                  onFieldEdit={handleFieldEdit}
                  onFieldValueChange={handleFieldValueChange}
                  onFieldUpdate={handleFieldUpdate}
                  ordersWithTripNumberIssues={ordersWithIssuesObjects}
                  isSavingField={isSavingField}
                  validationMessage={validationMessage}
                  suggestedTripNumbers={suggestedTripNumbers}
                  suggestedDrivers={suggestedDrivers}
                  getFieldValidationStatus={getFieldValidationStatus}
                />
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange?.(false)}>
              Cancel
            </Button>
            <Button onClick={handleOrdersApprove}>
              Apply Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  // Otherwise, render directly without dialog
  return (
    <div className="flex flex-col md:flex-row h-full border rounded-lg">
      <div className="w-full md:w-1/3 border-r p-4 overflow-auto h-[300px] md:h-full">
        <VerificationSidebar
          ordersRequiringVerification={ordersWithIssuesObjects}
          verifiedOrders={initializedOrders}
          selectedOrderId={selectedOrderId}
          onOrderSelect={setSelectedOrderId}
          ordersWithTripNumberIssues={ordersWithIssuesObjects}
        />
      </div>
      <div className="w-full md:w-2/3 p-4 overflow-auto h-[400px] md:h-full">
        {selectedOrder && (
          <OrderDetails
            selectedOrder={selectedOrder}
            editingField={editingField}
            fieldValue={fieldValue}
            onFieldEdit={handleFieldEdit}
            onFieldValueChange={handleFieldValueChange}
            onFieldUpdate={handleFieldUpdate}
            ordersWithTripNumberIssues={ordersWithIssuesObjects}
            isSavingField={isSavingField}
            validationMessage={validationMessage}
            suggestedTripNumbers={suggestedTripNumbers}
            suggestedDrivers={suggestedDrivers}
            getFieldValidationStatus={getFieldValidationStatus}
          />
        )}
      </div>
      <div className="p-4 border-t flex justify-end">
        <Button onClick={handleOrdersApprove}>
          Apply Changes
        </Button>
      </div>
    </div>
  );
}
