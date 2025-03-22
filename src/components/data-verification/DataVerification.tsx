"use client"

import { useState } from 'react';
import { DeliveryOrder } from '@/utils/csvParser';
import { OrderDetails } from './OrderDetails';
import { VerificationSidebar } from './VerificationSidebar';
import { useOrderVerification } from './hooks/useOrderVerification';
import { Dialog, DialogContent } from '@/components/ui/dialog';

interface DataVerificationProps {
  orders: DeliveryOrder[];
  onOrdersUpdate: (updatedOrders: DeliveryOrder[]) => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function DataVerification({
  orders,
  onOrdersUpdate,
  open,
  onOpenChange
}: DataVerificationProps) {
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
    getFieldValidationStatus
  } = useOrderVerification({ 
    orders, 
    onOrdersVerified: onOrdersUpdate 
  });

  // If Dialog props are provided, render in a Dialog
  if (open !== undefined && onOpenChange !== undefined) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-5xl h-[80vh]">
          <div className="flex h-full">
            <div className="w-1/3 border-r p-4 overflow-auto h-full">
              <VerificationSidebar
                ordersRequiringVerification={ordersWithIssues}
                verifiedOrders={orders}
                selectedOrderIndex={selectedOrderId ? orders.findIndex(o => o.id === selectedOrderId) : null}
                onOrderSelect={(index) => {
                  const order = orders[index];
                  if (order) {
                    setSelectedOrderId(order.id);
                  }
                }}
                ordersWithTripNumberIssues={ordersWithIssues}
              />
            </div>
            <div className="w-2/3 p-4 overflow-auto h-full">
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
        </DialogContent>
      </Dialog>
    );
  }

  // Otherwise, render directly
  return (
    <div className="flex h-full">
      <div className="w-1/3 border-r p-4 overflow-auto h-full">
        <VerificationSidebar
          ordersRequiringVerification={ordersWithIssues}
          verifiedOrders={orders}
          selectedOrderIndex={selectedOrderId ? orders.findIndex(o => o.id === selectedOrderId) : null}
          onOrderSelect={(index) => {
            const order = orders[index];
            if (order) {
              setSelectedOrderId(order.id);
            }
          }}
          ordersWithTripNumberIssues={ordersWithIssues}
        />
      </div>
      <div className="w-2/3 p-4 overflow-auto h-full">
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
  );
}
