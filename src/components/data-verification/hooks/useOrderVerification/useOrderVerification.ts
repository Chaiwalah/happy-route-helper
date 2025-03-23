"use client"

import { useState, useEffect, useCallback } from 'react';
import { DeliveryOrder } from '@/utils/csvParser';
import { toast } from '@/components/ui/use-toast';
import { UseOrderVerificationProps, UseOrderVerificationReturn } from './types';
import { logDebug } from './logUtils';
import { processOrdersForVerification } from './orderProcessing';
import { updateOrder, approveOrders } from './orderUpdates';
import { getOrderValidationStatus, getFieldValidationStatusAdapter } from './statusUtils';
import { validateField } from './validationUtils';
import {
  startPerformanceTracking,
  endPerformanceTracking,
  logPerformance
} from '@/utils/performanceLogger';

// Use 'export type' to re-export the type
export type { FieldValidationStatus } from './types';

export const useOrderVerification = ({ 
  orders, 
  onOrdersVerified 
}: UseOrderVerificationProps): UseOrderVerificationReturn => {
  startPerformanceTracking('useOrderVerification.init', { orderCount: orders?.length });
  
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
    startPerformanceTracking('useOrderVerification.processOrders', { orderCount: orders?.length });
    
    const {
      ordersWithIssues: processedOrdersWithIssues,
      suggestedTripNumbers: processedSuggestedTripNumbers,
      suggestedDrivers: processedSuggestedDrivers
    } = processOrdersForVerification(orders);
    
    logPerformance('Order verification processed orders', {
      totalOrders: orders?.length || 0,
      ordersWithIssues: processedOrdersWithIssues.length,
      tripNumberSuggestions: processedSuggestedTripNumbers.length,
      driverSuggestions: processedSuggestedDrivers.length
    });
    
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
    
    endPerformanceTracking('useOrderVerification.processOrders', {
      ordersWithIssues: processedOrdersWithIssues.length
    });
  }, [orders, selectedOrderId]);

  // Get the currently selected order
  const selectedOrder = useCallback(() => {
    startPerformanceTracking('useOrderVerification.getSelectedOrder');
    
    if (!selectedOrderId) {
      endPerformanceTracking('useOrderVerification.getSelectedOrder', { result: null });
      return null;
    }
    
    const order = ordersWithIssues.find(order => order.id === selectedOrderId) || null;
    
    endPerformanceTracking('useOrderVerification.getSelectedOrder', { 
      found: !!order,
      orderId: selectedOrderId
    });
    
    return order;
  }, [ordersWithIssues, selectedOrderId])();

  // Handle edit field action
  const handleFieldEdit = useCallback((field: string, value: string) => {
    startPerformanceTracking('useOrderVerification.handleFieldEdit', { field, valueLength: value?.length });
    
    setEditingField(field);
    setFieldValue(value || ''); // Ensure value is never undefined
    setValidationMessage(null);
    
    endPerformanceTracking('useOrderVerification.handleFieldEdit');
  }, []);

  // Handle field value change
  const handleFieldValueChange = useCallback((value: string) => {
    startPerformanceTracking('useOrderVerification.handleFieldValueChange', { editingField, valueLength: value?.length });
    
    setFieldValue(value || '');
    
    // Get the order ID for validation message
    const orderId = selectedOrderId || 'unknown';
    
    // Optionally add real-time validation here
    validateField(editingField || '', value || '', setValidationMessage, orderId);
    
    endPerformanceTracking('useOrderVerification.handleFieldValueChange');
  }, [editingField, selectedOrderId]);

  // Handle field update
  const handleFieldUpdate = useCallback(async () => {
    if (!selectedOrderId || editingField === null) return;
    
    startPerformanceTracking('useOrderVerification.handleFieldUpdate', { 
      orderId: selectedOrderId, 
      field: editingField 
    });
    
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
        
        endPerformanceTracking('useOrderVerification.handleFieldUpdate', { 
          success: true,
          field: editingField
        });
      } else {
        endPerformanceTracking('useOrderVerification.handleFieldUpdate', { 
          success: false,
          field: editingField,
          reason: 'updateOrder returned false'
        });
      }
    } catch (error) {
      endPerformanceTracking('useOrderVerification.handleFieldUpdate', { 
        success: false,
        field: editingField,
        error: error instanceof Error ? error.message : String(error)
      });
    } finally {
      setIsSavingField(false);
    }
  }, [selectedOrderId, editingField, fieldValue, ordersWithIssues, orders, onOrdersVerified]);

  // Handle approve action to verify all orders
  const handleOrdersApprove = useCallback(() => {
    startPerformanceTracking('useOrderVerification.handleOrdersApprove', { 
      ordersWithIssuesCount: ordersWithIssues.length
    });
    
    approveOrders(orders, ordersWithIssues, onOrdersVerified);
    
    endPerformanceTracking('useOrderVerification.handleOrdersApprove');
  }, [orders, ordersWithIssues, onOrdersVerified]);

  endPerformanceTracking('useOrderVerification.init');

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
    getFieldValidationStatus: getFieldValidationStatusAdapter,
    updateOrder: async (orderId: string, fieldName: string, value: string) => {
      startPerformanceTracking(`useOrderVerification.updateOrder.${orderId}.${fieldName}`, { valueLength: value?.length });
      
      const result = await updateOrder(
        orderId, 
        fieldName as keyof DeliveryOrder, 
        value, 
        ordersWithIssues, 
        orders, 
        onOrdersVerified,
        setValidationMessage
      );
      
      endPerformanceTracking(`useOrderVerification.updateOrder.${orderId}.${fieldName}`, { success: result });
      
      return result;
    }
  };
};
