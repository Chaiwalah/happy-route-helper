
"use client"

import { useState } from 'react';
import { DeliveryOrder } from '@/utils/csvParser';
import { OrderDetails } from './OrderDetails';
import { VerificationSidebar } from './VerificationSidebar';
import { useOrderVerification } from './hooks/useOrderVerification';

export function DataVerification({
  orders,
  onOrdersUpdate
}: {
  orders: DeliveryOrder[];
  onOrdersUpdate: (updatedOrders: DeliveryOrder[]) => void;
}) {
  const {
    selectedOrder,
    filteredOrders,
    ordersWithTripNumberIssues,
    selectedOrderIndex,
    editingField,
    fieldValue,
    validationMessage,
    isSavingField,
    suggestedTripNumbers,
    suggestedDrivers,
    getFieldValidationStatus,
    setSelectedOrderIndex,
    handleFieldEdit,
    handleFieldValueChange,
    handleFieldUpdate
  } = useOrderVerification(orders, onOrdersUpdate);

  return (
    <div className="flex h-full">
      <div className="w-1/3 border-r p-4 overflow-auto h-full">
        <VerificationSidebar
          orders={filteredOrders}
          selectedOrderIndex={selectedOrderIndex}
          onOrderSelect={setSelectedOrderIndex}
          ordersWithIssues={ordersWithTripNumberIssues}
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
          ordersWithTripNumberIssues={ordersWithTripNumberIssues}
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
