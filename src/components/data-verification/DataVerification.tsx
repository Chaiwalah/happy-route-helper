
"use client"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { DeliveryOrder } from '@/utils/csvParser';
import { useOrderVerification } from './hooks/useOrderVerification';
import { VerificationSidebar } from './VerificationSidebar';
import { OrderDetails } from './OrderDetails';

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
  const {
    verifiedOrders,
    selectedOrderIndex,
    editingField,
    fieldValue,
    ordersRequiringVerification,
    ordersWithTripNumberIssues,
    handleOrderEdit,
    handleFieldEdit,
    handleFieldUpdate,
    handleVerificationComplete,
    setFieldValue
  } = useOrderVerification(orders, onOrdersVerified);

  const handleOpenChange = (newOpenState: boolean) => {
    if (!newOpenState) {
      // If closing the dialog, make sure to update the parent component
      onOpenChange(false);
    } else {
      onOpenChange(true);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Verify Imported Data</DialogTitle>
          <DialogDescription>
            Review and correct data discrepancies, especially for critical fields like Trip Number.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 py-4">
          <VerificationSidebar 
            ordersRequiringVerification={ordersRequiringVerification}
            verifiedOrders={verifiedOrders}
            selectedOrderIndex={selectedOrderIndex}
            onOrderSelect={handleOrderEdit}
            ordersWithTripNumberIssues={ordersWithTripNumberIssues}
          />
          
          <div className="col-span-2 border rounded-lg p-4">
            <OrderDetails
              selectedOrder={selectedOrderIndex !== null ? verifiedOrders[selectedOrderIndex] : null}
              editingField={editingField}
              fieldValue={fieldValue}
              onFieldEdit={handleFieldEdit}
              onFieldValueChange={setFieldValue}
              onFieldUpdate={handleFieldUpdate}
              ordersWithTripNumberIssues={ordersWithTripNumberIssues}
            />
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
