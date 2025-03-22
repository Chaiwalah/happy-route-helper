
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
import { AlertTriangle, CheckCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

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
    handleFieldValueChange,
    handleFieldUpdate,
    handleVerificationComplete,
    isSavingField,
    validationMessage,
    suggestedTripNumbers,
    suggestedDrivers,
    getFieldValidationStatus
  } = useOrderVerification(orders, onOrdersVerified);

  const handleOpenChange = (newOpenState: boolean) => {
    if (!newOpenState) {
      // If closing the dialog, make sure to update the parent component
      onOpenChange(false);
    } else {
      onOpenChange(true);
    }
  };

  const anyRemainingIssues = ordersWithTripNumberIssues.length > 0;

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
              onFieldValueChange={handleFieldValueChange}
              onFieldUpdate={handleFieldUpdate}
              ordersWithTripNumberIssues={ordersWithTripNumberIssues}
              isSavingField={isSavingField}
              validationMessage={validationMessage}
              suggestedTripNumbers={suggestedTripNumbers}
              suggestedDrivers={suggestedDrivers}
              getFieldValidationStatus={getFieldValidationStatus}
            />
          </div>
        </div>
        
        {anyRemainingIssues && (
          <Alert variant="warning" className="my-2 border-amber-300">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Validation Required</AlertTitle>
            <AlertDescription>
              {ordersWithTripNumberIssues.length} orders still have missing or invalid trip numbers.
              You can continue, but these orders may not be properly organized into routes.
            </AlertDescription>
          </Alert>
        )}
        
        {!anyRemainingIssues && ordersRequiringVerification.length === 0 && (
          <Alert variant="default" className="my-2 bg-green-50 border-green-300">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <AlertTitle className="text-green-700">All Data Validated</AlertTitle>
            <AlertDescription className="text-green-600">
              All orders have been successfully verified and are ready for processing.
            </AlertDescription>
          </Alert>
        )}
        
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
