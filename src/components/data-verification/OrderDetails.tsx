
"use client"

import { DeliveryOrder } from '@/utils/csvParser';
import { AlertCircle, CheckCircle, Info } from 'lucide-react';
import { OrderDetailField } from './OrderDetailField';
import { isNoiseOrTestTripNumber } from '@/utils/routeOrganizer';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { FieldValidationStatus } from './hooks/useOrderVerification';

interface OrderDetailsProps {
  selectedOrder: DeliveryOrder | null;
  editingField: string | null;
  fieldValue: string;
  onFieldEdit: (field: string, value: string) => void;
  onFieldValueChange: (value: string) => void;
  onFieldUpdate: () => void;
  ordersWithTripNumberIssues: DeliveryOrder[];
  isSavingField: boolean;
  validationMessage: string | null;
  suggestedTripNumbers: string[];
  suggestedDrivers: string[];
  getFieldValidationStatus: (fieldName: string, value: string) => FieldValidationStatus;
}

export function OrderDetails({
  selectedOrder,
  editingField,
  fieldValue,
  onFieldEdit,
  onFieldValueChange,
  onFieldUpdate,
  ordersWithTripNumberIssues,
  isSavingField,
  validationMessage,
  suggestedTripNumbers,
  suggestedDrivers,
  getFieldValidationStatus
}: OrderDetailsProps) {
  // Display a message if no order is selected
  if (!selectedOrder) {
    return (
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
    );
  }

  // Check if trip number is a noise/test trip number
  const isTripNumberNoise = selectedOrder.tripNumber ? 
    isNoiseOrTestTripNumber(selectedOrder.tripNumber) : false;
    
  // Get safe string values for display, ensuring they're never undefined
  const tripNumberValue = selectedOrder.tripNumber || '';
  const driverValue = selectedOrder.driver || '';
  const pickupValue = selectedOrder.pickup || '';
  const dropoffValue = selectedOrder.dropoff || '';
  const readyTimeValue = selectedOrder.exReadyTime || '';
  const deliveryTimeValue = selectedOrder.exDeliveryTime || '';
  
  // Debug the field values
  console.log(`OrderDetails rendering for ${selectedOrder.id}:`, {
    tripNumber: tripNumberValue || 'EMPTY',
    driver: driverValue || 'EMPTY',
    editingField: editingField || 'NONE',
    fieldValue: fieldValue || 'EMPTY'
  });
  
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">
        Order Details: {selectedOrder.id}
      </h3>
      
      {validationMessage && (
        <Alert variant={validationMessage.includes('success') ? 'default' : 'destructive'} className="py-2">
          <AlertDescription>{validationMessage}</AlertDescription>
        </Alert>
      )}
      
      <div className="space-y-3">
        {/* Trip Number field - highlighted as critical */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="w-full">
                <OrderDetailField
                  label="Trip Number"
                  fieldName="tripNumber"
                  value={editingField === 'tripNumber' ? fieldValue : tripNumberValue}
                  isEditing={editingField === 'tripNumber'}
                  isError={!tripNumberValue || tripNumberValue.trim() === ''}
                  isNoise={isTripNumberNoise}
                  isSaving={isSavingField}
                  suggestedValues={suggestedTripNumbers}
                  validationStatus={getFieldValidationStatus('tripNumber', editingField === 'tripNumber' ? fieldValue : tripNumberValue)}
                  validationMessage="Trip Numbers are critical for route organization"
                  onEdit={onFieldEdit}
                  onValueChange={onFieldValueChange}
                  onSave={onFieldUpdate}
                />
              </div>
            </TooltipTrigger>
            <TooltipContent side="right" className="max-w-xs">
              <p>Trip Numbers are critical for route organization. They should follow the format TR-[number] or be a clear identifier. 
              Values like "TEST", "N/A", or single numbers may be filtered out as noise.</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        
        {/* Driver field */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="w-full">
                <OrderDetailField
                  label="Driver"
                  fieldName="driver"
                  value={editingField === 'driver' ? fieldValue : driverValue}
                  isEditing={editingField === 'driver'}
                  isSaving={isSavingField}
                  suggestedValues={suggestedDrivers}
                  validationStatus={getFieldValidationStatus('driver', editingField === 'driver' ? fieldValue : driverValue)}
                  validationMessage="Driver names should be consistent"
                  onEdit={onFieldEdit}
                  onValueChange={onFieldValueChange}
                  onSave={onFieldUpdate}
                />
              </div>
            </TooltipTrigger>
            <TooltipContent side="right" className="max-w-xs">
              <p>Driver names should be consistent across orders to properly attribute deliveries. 
              Ensure names follow the same format (e.g., "John Smith" vs "Smith, John").</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        
        {/* Pickup and Dropoff addresses */}
        <div className="grid grid-cols-2 gap-3">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="w-full">
                  <OrderDetailField
                    label="Pickup Address"
                    fieldName="pickup"
                    value={editingField === 'pickup' ? fieldValue : pickupValue}
                    isEditing={editingField === 'pickup'}
                    isError={!pickupValue}
                    isSaving={isSavingField}
                    validationStatus={getFieldValidationStatus('pickup', editingField === 'pickup' ? fieldValue : pickupValue)}
                    validationMessage="Enter a complete pickup address"
                    onEdit={onFieldEdit}
                    onValueChange={onFieldValueChange}
                    onSave={onFieldUpdate}
                  />
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-xs">
                <p>Enter a complete pickup address including street number, name, and city for accurate routing.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="w-full">
                  <OrderDetailField
                    label="Dropoff Address"
                    fieldName="dropoff"
                    value={editingField === 'dropoff' ? fieldValue : dropoffValue}
                    isEditing={editingField === 'dropoff'}
                    isError={!dropoffValue}
                    isSaving={isSavingField}
                    validationStatus={getFieldValidationStatus('dropoff', editingField === 'dropoff' ? fieldValue : dropoffValue)}
                    validationMessage="Enter a complete delivery address"
                    onEdit={onFieldEdit}
                    onValueChange={onFieldValueChange}
                    onSave={onFieldUpdate}
                  />
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-xs">
                <p>Enter a complete delivery address including street number, name, and city for accurate routing and reporting.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        
        {/* Time windows */}
        <div className="grid grid-cols-2 gap-3">
          <OrderDetailField
            label="Ready Time"
            fieldName="exReadyTime"
            value={editingField === 'exReadyTime' ? fieldValue : readyTimeValue}
            isEditing={editingField === 'exReadyTime'}
            isSaving={isSavingField}
            validationStatus={getFieldValidationStatus('exReadyTime', editingField === 'exReadyTime' ? fieldValue : readyTimeValue)}
            onEdit={onFieldEdit}
            onValueChange={onFieldValueChange}
            onSave={onFieldUpdate}
          />
          
          <OrderDetailField
            label="Delivery Time"
            fieldName="exDeliveryTime"
            value={editingField === 'exDeliveryTime' ? fieldValue : deliveryTimeValue}
            isEditing={editingField === 'exDeliveryTime'}
            isSaving={isSavingField}
            validationStatus={getFieldValidationStatus('exDeliveryTime', editingField === 'exDeliveryTime' ? fieldValue : deliveryTimeValue)}
            onEdit={onFieldEdit}
            onValueChange={onFieldValueChange}
            onSave={onFieldUpdate}
          />
        </div>
      </div>
    </div>
  );
}
