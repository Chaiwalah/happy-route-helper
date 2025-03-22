
"use client"

import { DeliveryOrder } from '@/utils/csvParser';
import { AlertCircle } from 'lucide-react';
import { OrderDetailField } from './OrderDetailField';
import { isNoiseOrTestTripNumber } from '@/utils/routeOrganizer';

interface OrderDetailsProps {
  selectedOrder: DeliveryOrder | null;
  editingField: string | null;
  fieldValue: string;
  onFieldEdit: (field: string, value: string) => void;
  onFieldValueChange: (value: string) => void;
  onFieldUpdate: () => void;
  ordersWithTripNumberIssues: DeliveryOrder[];
}

export function OrderDetails({
  selectedOrder,
  editingField,
  fieldValue,
  onFieldEdit,
  onFieldValueChange,
  onFieldUpdate,
  ordersWithTripNumberIssues
}: OrderDetailsProps) {
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

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">
        Order Details: {selectedOrder.id}
      </h3>
      
      <div className="space-y-3">
        {/* Trip Number field - highlighted as critical */}
        <OrderDetailField
          label="Trip Number"
          fieldName="tripNumber"
          value={selectedOrder.tripNumber || ''}
          isCritical={true}
          isEditing={editingField === 'tripNumber'}
          editingValue={fieldValue}
          onEditStart={onFieldEdit}
          onEditChange={onFieldValueChange}
          onEditSave={onFieldUpdate}
          isError={!selectedOrder.tripNumber || selectedOrder.tripNumber.trim() === ''}
          isNoise={isTripNumberNoise}
        />
        
        {/* Driver field */}
        <OrderDetailField
          label="Driver"
          fieldName="driver"
          value={selectedOrder.driver || ''}
          isEditing={editingField === 'driver'}
          editingValue={fieldValue}
          onEditStart={onFieldEdit}
          onEditChange={onFieldValueChange}
          onEditSave={onFieldUpdate}
        />
        
        {/* Pickup and Dropoff addresses */}
        <div className="grid grid-cols-2 gap-3">
          <OrderDetailField
            label="Pickup Address"
            fieldName="pickup"
            value={selectedOrder.pickup || ''}
            isEditing={editingField === 'pickup'}
            editingValue={fieldValue}
            onEditStart={onFieldEdit}
            onEditChange={onFieldValueChange}
            onEditSave={onFieldUpdate}
            isError={!selectedOrder.pickup}
          />
          
          <OrderDetailField
            label="Dropoff Address"
            fieldName="dropoff"
            value={selectedOrder.dropoff || ''}
            isEditing={editingField === 'dropoff'}
            editingValue={fieldValue}
            onEditStart={onFieldEdit}
            onEditChange={onFieldValueChange}
            onEditSave={onFieldUpdate}
            isError={!selectedOrder.dropoff}
          />
        </div>
        
        {/* Time windows */}
        <div className="grid grid-cols-2 gap-3">
          <OrderDetailField
            label="Ready Time"
            fieldName="exReadyTime"
            value={selectedOrder.exReadyTime || ''}
            isEditing={editingField === 'exReadyTime'}
            editingValue={fieldValue}
            onEditStart={onFieldEdit}
            onEditChange={onFieldValueChange}
            onEditSave={onFieldUpdate}
          />
          
          <OrderDetailField
            label="Delivery Time"
            fieldName="exDeliveryTime"
            value={selectedOrder.exDeliveryTime || ''}
            isEditing={editingField === 'exDeliveryTime'}
            editingValue={fieldValue}
            onEditStart={onFieldEdit}
            onEditChange={onFieldValueChange}
            onEditSave={onFieldUpdate}
          />
        </div>
      </div>
    </div>
  );
}
