"use client"

import { DeliveryOrder } from '@/utils/csvParser';
import { OrderDetails } from './OrderDetails';
import { VerificationSidebar } from './VerificationSidebar';
import { useOrderVerification } from './hooks/useOrderVerification';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

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
    orders, 
    onOrdersVerified: onOrdersVerified 
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
