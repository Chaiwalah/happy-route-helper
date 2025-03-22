
"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { DeliveryOrder } from '@/utils/csvParser';
import { useState, useEffect } from 'react';
import { OrderDetails } from './data-verification/OrderDetails';
import { VerificationSidebar } from './data-verification/VerificationSidebar';
import { useOrderVerification } from './data-verification/hooks/useOrderVerification';
import { markOrdersWithNoiseTrips } from '@/utils/routeOrganizer';

interface DataVerificationProps {
  orders: DeliveryOrder[];
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onOrdersVerified: (updatedOrders: DeliveryOrder[]) => void;
}

export function DataVerification({
  orders,
  open,
  onOpenChange,
  onOrdersVerified
}: DataVerificationProps) {
  // Mark orders with noise trip numbers but don't filter them
  const initialOrders = markOrdersWithNoiseTrips(orders);
  
  const {
    ordersWithIssues,
    selectedOrderId,
    setSelectedOrderId,
    selectedOrder,
    editingField,
    fieldValue,
    isSavingField,
    validationMessage,
    suggestedTripNumbers,
    suggestedDrivers,
    handleFieldEdit,
    handleFieldValueChange,
    handleFieldUpdate,
    handleOrdersApprove,
    getFieldValidationStatus
  } = useOrderVerification({ 
    orders: initialOrders, 
    onOrdersVerified
  });

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
                ordersRequiringVerification={ordersWithIssues}
                verifiedOrders={orders}
                selectedOrderId={selectedOrderId}
                onOrderSelect={setSelectedOrderId}
                ordersWithTripNumberIssues={ordersWithIssues}
              />
            </div>
            <div className="w-full md:w-2/3 p-4 overflow-auto max-h-[60vh] md:max-h-full">
              <OrderDetails
                selectedOrder={selectedOrder}
                editingField={editingField}
                fieldValue={fieldValue}
                onFieldEdit={handleFieldEdit}
                onFieldValueChange={handleFieldValueChange}
                onFieldUpdate={handleFieldUpdate}
                ordersWithTripNumberIssues={ordersWithIssues}
                isSavingField={isSavingField}
                validationMessage={validationMessage}
                suggestedTripNumbers={suggestedTripNumbers}
                suggestedDrivers={suggestedDrivers}
                getFieldValidationStatus={getFieldValidationStatus}
              />
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
          ordersRequiringVerification={ordersWithIssues}
          verifiedOrders={orders}
          selectedOrderId={selectedOrderId}
          onOrderSelect={setSelectedOrderId}
          ordersWithTripNumberIssues={ordersWithIssues}
        />
      </div>
      <div className="w-full md:w-2/3 p-4 overflow-auto h-[400px] md:h-full">
        <OrderDetails
          selectedOrder={selectedOrder}
          editingField={editingField}
          fieldValue={fieldValue}
          onFieldEdit={handleFieldEdit}
          onFieldValueChange={handleFieldValueChange}
          onFieldUpdate={handleFieldUpdate}
          ordersWithTripNumberIssues={ordersWithIssues}
          isSavingField={isSavingField}
          validationMessage={validationMessage}
          suggestedTripNumbers={suggestedTripNumbers}
          suggestedDrivers={suggestedDrivers}
          getFieldValidationStatus={getFieldValidationStatus}
        />
      </div>
      <div className="p-4 border-t flex justify-end">
        <Button onClick={handleOrdersApprove}>
          Apply Changes
        </Button>
      </div>
    </div>
  );
}
