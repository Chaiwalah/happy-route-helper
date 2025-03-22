"use client"

import { DeliveryOrder } from '@/utils/csvParser';
import { AlertCircle, CheckCircle, Info } from 'lucide-react';
import { OrderDetailField } from './OrderDetailField';
import { isNoiseOrTestTripNumber } from '@/utils/routeOrganizer';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { FieldValidationStatus } from './hooks/useOrderVerification';
import { normalizeFieldValue, isEmptyValue, isUnassignedDriver } from './hooks/useOrderVerification/validationUtils';

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
  getFieldValidationStatus: (fieldName: string, value: string | null) => FieldValidationStatus;
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

  // Safely extract and process field values, properly handling null values
  // For nulls, we'll display "Missing" in the UI but keep them as null in the data
  
  // Process Trip Number - may be null, object, or string
  const tripNumberValue = selectedOrder.tripNumber === null 
    ? "Missing" 
    : normalizeFieldValue(selectedOrder.tripNumber);
  
  // Process Driver - may be null, object, string, or "Unassigned"
  const rawDriverValue = selectedOrder.driver;
  const driverValue = rawDriverValue === null 
    ? "Missing" 
    : normalizeFieldValue(rawDriverValue);
  
  // Process other fields with standard normalization
  const pickupValue = selectedOrder.pickup === null 
    ? "Missing" 
    : normalizeFieldValue(selectedOrder.pickup);
    
  const dropoffValue = selectedOrder.dropoff === null 
    ? "Missing" 
    : normalizeFieldValue(selectedOrder.dropoff);
    
  const readyTimeValue = selectedOrder.exReadyTime === null 
    ? "Missing" 
    : normalizeFieldValue(selectedOrder.exReadyTime);
    
  const deliveryTimeValue = selectedOrder.exDeliveryTime === null 
    ? "Missing" 
    : normalizeFieldValue(selectedOrder.exDeliveryTime);
  
  // Validation checks using our unified validation approach
  const isTripNumberNull = selectedOrder.tripNumber === null;
  const isTripNumberEmpty = !isTripNumberNull && isEmptyValue(selectedOrder.tripNumber);
  const isTripNumberNoise = !isTripNumberNull && !isTripNumberEmpty && 
    isNoiseOrTestTripNumber(normalizeFieldValue(selectedOrder.tripNumber));
  const isTripNumberNA = !isTripNumberNull && !isTripNumberEmpty && 
    ['n/a', 'na', 'none'].includes(normalizeFieldValue(selectedOrder.tripNumber).toLowerCase());
  
  // Driver validation checks
  const isDriverNull = selectedOrder.driver === null;
  const isDriverEmpty = !isDriverNull && isEmptyValue(selectedOrder.driver);
  const isDriverUnassigned = !isDriverNull && !isDriverEmpty && 
    isUnassignedDriver(selectedOrder.driver);
  
  // Safe access to missingFields with default empty array
  const missingFields = selectedOrder.missingFields || [];
  
  // Enhanced debug information with structured data
  console.log(`OrderDetails rendering for ${selectedOrder.id}:`, {
    tripNumber: {
      value: tripNumberValue,
      raw: selectedOrder.tripNumber,
      isNull: isTripNumberNull,
      isEmpty: isTripNumberEmpty,
      isNoise: isTripNumberNoise,
      isNA: isTripNumberNA,
      isMissing: missingFields.includes('tripNumber')
    },
    driver: {
      value: driverValue,
      raw: selectedOrder.driver,
      isNull: isDriverNull,
      isEmpty: isDriverEmpty,
      isUnassigned: isDriverUnassigned,
      isMissing: missingFields.includes('driver')
    },
    editingField: editingField || 'NONE',
    fieldValue: fieldValue || 'EMPTY',
    missingFields: missingFields
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
                  isError={isTripNumberNull || 
                           isTripNumberEmpty || 
                           isTripNumberNA ||
                           missingFields.includes('tripNumber')}
                  isNoise={isTripNumberNoise}
                  isSaving={isSavingField}
                  suggestedValues={suggestedTripNumbers}
                  validationStatus={getFieldValidationStatus('tripNumber', 
                    editingField === 'tripNumber' ? fieldValue : selectedOrder.tripNumber)}
                  validationMessage="Trip Numbers are critical for route organization"
                  onEdit={onFieldEdit}
                  onValueChange={onFieldValueChange}
                  onSave={onFieldUpdate}
                />
              </div>
            </TooltipTrigger>
            <TooltipContent side="right" className="max-w-xs">
              <p>Trip Numbers are critical for route organization. They should follow the format TR-[number] or be a clear identifier. 
              Values like "TEST", "N/A", or single numbers may be flagged as requiring verification.</p>
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
                  isError={isDriverNull || 
                           isDriverEmpty ||
                           missingFields.includes('driver')}
                  isWarning={isDriverUnassigned}
                  isSaving={isSavingField}
                  suggestedValues={suggestedDrivers}
                  validationStatus={getFieldValidationStatus('driver', 
                    editingField === 'driver' ? fieldValue : selectedOrder.driver)}
                  validationMessage={isDriverUnassigned ? 
                    "Driver should not be 'Unassigned'" : 
                    "Driver names should be consistent"}
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
                    isError={selectedOrder.pickup === null || isEmptyValue(selectedOrder.pickup)}
                    isSaving={isSavingField}
                    validationStatus={getFieldValidationStatus('pickup', 
                      editingField === 'pickup' ? fieldValue : selectedOrder.pickup)}
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
                    isError={selectedOrder.dropoff === null || isEmptyValue(selectedOrder.dropoff)}
                    isSaving={isSavingField}
                    validationStatus={getFieldValidationStatus('dropoff', 
                      editingField === 'dropoff' ? fieldValue : selectedOrder.dropoff)}
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
            validationStatus={getFieldValidationStatus('exReadyTime', 
              editingField === 'exReadyTime' ? fieldValue : selectedOrder.exReadyTime)}
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
            validationStatus={getFieldValidationStatus('exDeliveryTime', 
              editingField === 'exDeliveryTime' ? fieldValue : selectedOrder.exDeliveryTime)}
            onEdit={onFieldEdit}
            onValueChange={onFieldValueChange}
            onSave={onFieldUpdate}
          />
        </div>
      </div>
    </div>
  );
}
