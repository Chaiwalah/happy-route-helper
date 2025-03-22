
"use client"

import { useState, useEffect, useCallback } from 'react';
import { DeliveryOrder } from '@/utils/csvParser';
import { toast } from '@/components/ui/use-toast';
import { UseOrderVerificationProps, UseOrderVerificationReturn } from './types';
import { logDebug } from './logUtils';
import { processOrdersForVerification } from './orderProcessing';
import { updateOrder, approveOrders } from './orderUpdates';
import { getOrderValidationStatus, getFieldValidationStatus } from './statusUtils';
import { validateField } from './validationUtils';

// Use 'export type' to re-export the type
export type { FieldValidationStatus } from './types';

export const useOrderVerification = ({ 
  orders, 
  onOrdersVerified 
}: UseOrderVerificationProps): UseOrderVerificationReturn => {
  // Initialize state for managing orders with issues
  const [ordersWithIssues, setOrdersWithIssues] = useState<DeliveryOrder[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [fieldValue, setFieldValue] = useState<string>('');
  const [isSavingField, setIsSavingField] = useState<boolean>(false);
  const [validationMessage, setValidationMessage] = useState<string | null>(null);
  // Store suggested values for autocomplete
  const [suggestedTripNumbers, setSuggestedTripNumbers] = useState<string[]>([]);
  const [suggestedDrivers, setSuggestedDrivers] = useState<string[]>([]);

  // Process orders and identify issues
  useEffect(() => {
    const {
      ordersWithIssues: processedOrdersWithIssues,
      suggestedTripNumbers: processedSuggestedTripNumbers,
      suggestedDrivers: processedSuggestedDrivers
    } = processOrdersForVerification(orders);
    
    setOrdersWithIssues(processedOrdersWithIssues);
    setSuggestedTripNumbers(processedSuggestedTripNumbers);
    setSuggestedDrivers(processedSuggestedDrivers);
    
    // If there are issues and no order is selected, select the first one
    if (processedOrdersWithIssues.length > 0 && !selectedOrderId) {
      setSelectedOrderId(processedOrdersWithIssues[0].id);
      logDebug(`Auto-selecting first issue order: ${processedOrdersWithIssues[0].id}`);
    } else if (processedOrdersWithIssues.length === 0) {
      // Clear selection if no issues left
      setSelectedOrderId(null);
    }
  }, [orders, selectedOrderId]);

  // Get the currently selected order
  const selectedOrder = useCallback(() => {
    if (!selectedOrderId) return null;
    return ordersWithIssues.find(order => order.id === selectedOrderId) || null;
  }, [ordersWithIssues, selectedOrderId])();

  // Handle edit field action
  const handleFieldEdit = useCallback((field: string, value: string) => {
    setEditingField(field);
    setFieldValue(value || ''); // Ensure value is never undefined
    setValidationMessage(null);
  }, []);

  // Handle field value change
  const handleFieldValueChange = useCallback((value: string) => {
    setFieldValue(value || '');
    
    // Optionally add real-time validation here
    validateField(editingField || '', value || '', setValidationMessage);
  }, [editingField]);

  // Handle field update
  const handleFieldUpdate = useCallback(async () => {
    if (!selectedOrderId || editingField === null) return;
    
    setIsSavingField(true);
    try {
      const success = await updateOrder(
        selectedOrderId, 
        editingField as keyof DeliveryOrder, 
        fieldValue, 
        ordersWithIssues, 
        orders, 
        onOrdersVerified,
        setValidationMessage
      );
      
      if (success) {
        // Clear editing state on success
        setEditingField(null);
        
        // Show success message
        setValidationMessage('Field updated successfully');
        
        // Provide user feedback via toast
        toast({
          title: "Field Updated",
          description: `Successfully updated ${editingField} for order ${selectedOrderId}`,
        });
      }
    } finally {
      setIsSavingField(false);
    }
  }, [selectedOrderId, editingField, fieldValue, ordersWithIssues, orders, onOrdersVerified]);

  // Handle approve action to verify all orders
  const handleOrdersApprove = useCallback(() => {
    approveOrders(orders, ordersWithIssues, onOrdersVerified);
  }, [orders, ordersWithIssues, onOrdersVerified]);

  return {
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
    getOrderValidationStatus,
    getFieldValidationStatus,
    updateOrder: async (orderId: string, fieldName: string, value: string) => 
      updateOrder(
        orderId, 
        fieldName as keyof DeliveryOrder, 
        value, 
        ordersWithIssues, 
        orders, 
        onOrdersVerified,
        setValidationMessage
      )
  };
};
