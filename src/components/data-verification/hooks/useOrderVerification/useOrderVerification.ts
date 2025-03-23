
import { useState, useCallback, useMemo, useEffect } from 'react';
import { DeliveryOrder } from '@/utils/csvParser';
import { 
  OrderVerificationState, 
  EditingField, 
  FieldUpdate,
  OrderFieldValue,
  FieldValidationStatus
} from './types';
import { 
  getOrderValidationStatus,
  getFieldValidationStatusAdapter,
  getFieldStatus
} from './statusUtils';
import { validateField } from './validationUtils';
import { useToast } from '@/components/ui/use-toast';
import { processOrdersForVerification } from './orderProcessing';
import {
  startPerformanceTracking,
  endPerformanceTracking,
  logInfo,
  logError
} from '@/utils/performanceLogger';

interface UseOrderVerificationProps {
  initialOrders: DeliveryOrder[];
  onOrdersUpdated: (orders: DeliveryOrder[]) => void;
}

export const useOrderVerification = ({ initialOrders, onOrdersUpdated }: UseOrderVerificationProps) => {
  const [state, setState] = useState<OrderVerificationState>({
    orders: initialOrders,
    selectedOrderId: null,
    editingField: 'NONE',
    fieldValue: '',
    validationMessage: null,
    isModified: false,
    isProcessing: false,
    processingProgress: 0,
    ordersWithIssues: [],
    allOrdersValid: false,
    suggestedTripNumbers: [],
    suggestedDrivers: []
  });
  
  const { toast } = useToast();
  
  // Process orders on initial load to identify issues
  useEffect(() => {
    console.log("Processing initial orders:", initialOrders.length);
    const { ordersWithIssues, suggestedTripNumbers, suggestedDrivers } = processOrdersForVerification(initialOrders);
    
    console.log("Orders with issues after processing:", ordersWithIssues.length);
    
    setState(prev => ({
      ...prev,
      ordersWithIssues,
      suggestedTripNumbers,
      suggestedDrivers
    }));
  }, [initialOrders]);
  
  // Memoize order validation statuses for performance
  const orderValidationStatuses = useMemo(() => {
    startPerformanceTracking('useOrderVerification.orderValidationStatuses');
    const statuses = state.orders.reduce((acc: { [orderId: string]: 'valid' | 'warning' | 'error' }, order) => {
      acc[order.id] = getOrderValidationStatus(order);
      return acc;
    }, {});
    endPerformanceTracking('useOrderVerification.orderValidationStatuses', {
      orderCount: state.orders.length
    });
    return statuses;
  }, [state.orders]);
  
  // Memoize the allOrdersValid flag
  const allOrdersValid = useMemo(() => {
    startPerformanceTracking('useOrderVerification.allOrdersValid');
    const isValid = state.ordersWithIssues.length === 0;
    endPerformanceTracking('useOrderVerification.allOrdersValid', { isValid });
    return isValid;
  }, [state.ordersWithIssues]);
  
  // Find the selected order object for use in UI
  const selectedOrder = useMemo(() => {
    return state.selectedOrderId ? state.orders.find(order => order.id === state.selectedOrderId) : null;
  }, [state.selectedOrderId, state.orders]);

  // Handler to select an order for editing
  const selectOrder = useCallback((orderId: string) => {
    startPerformanceTracking('useOrderVerification.selectOrder', { orderId });
    const selectedOrder = state.orders.find(order => order.id === orderId);
    
    if (selectedOrder) {
      setState(prevState => ({
        ...prevState,
        selectedOrderId: orderId,
        editingField: 'NONE',
        fieldValue: '',
        validationMessage: null,
        isModified: false
      }));
    }
    endPerformanceTracking('useOrderVerification.selectOrder', { success: !!selectedOrder });
  }, [state.orders]);
  
  // Helper function to set selected order ID
  const setSelectedOrderId = useCallback((orderId: string) => {
    selectOrder(orderId);
  }, [selectOrder]);
  
  // Handler to start editing a specific field
  const startEdit = useCallback((field: EditingField) => {
    startPerformanceTracking('useOrderVerification.startEdit', { field });
    setState(prevState => {
      const selectedOrder = prevState.orders.find(order => order.id === prevState.selectedOrderId);
      const fieldValue = selectedOrder ? String(selectedOrder[field] || '') : '';
      
      return {
        ...prevState,
        editingField: field,
        fieldValue: fieldValue,
        validationMessage: null,
        isModified: false
      };
    });
    endPerformanceTracking('useOrderVerification.startEdit', { success: true });
  }, []);
  
  // Handler to update the field value while editing
  const updateFieldValue = useCallback((value: string) => {
    startPerformanceTracking('useOrderVerification.updateFieldValue', { value });
    setState(prevState => ({
      ...prevState,
      fieldValue: value,
      isModified: true,
      validationMessage: null
    }));
    endPerformanceTracking('useOrderVerification.updateFieldValue', { success: true });
  }, []);
  
  // Handler to cancel editing
  const cancelEdit = useCallback(() => {
    startPerformanceTracking('useOrderVerification.cancelEdit');
    setState(prevState => ({
      ...prevState,
      editingField: 'NONE',
      fieldValue: '',
      validationMessage: null,
      isModified: false
    }));
    endPerformanceTracking('useOrderVerification.cancelEdit', { success: true });
  }, []);
  
  // Handler to save the edited field value
  const saveFieldValue = useCallback(async () => {
    startPerformanceTracking('useOrderVerification.saveFieldValue');
    
    if (!state.selectedOrderId) {
      logError('No order selected for saving');
      endPerformanceTracking('useOrderVerification.saveFieldValue', { success: false, reason: 'no order selected' });
      return;
    }
    
    if (state.editingField === 'NONE') {
      logError('No field is being edited');
      endPerformanceTracking('useOrderVerification.saveFieldValue', { success: false, reason: 'no field being edited' });
      return;
    }
    
    const setValidationMessage = (message: string | null) => {
      setState(prevState => ({
        ...prevState,
        validationMessage: message
      }));
    };
    
    const isValid = validateField(state.editingField, state.fieldValue, setValidationMessage);
    
    if (!isValid) {
      logInfo('Field validation failed', { 
        field: state.editingField, 
        value: state.fieldValue, 
        message: state.validationMessage 
      });
      endPerformanceTracking('useOrderVerification.saveFieldValue', { success: false, reason: 'field validation failed' });
      return;
    }
    
    // Set processing state while we update
    setState(prev => ({
      ...prev,
      isProcessing: true
    }));
    
    try {
      // Update the order with the new field value
      const updatedOrders = state.orders.map(order => {
        if (order.id === state.selectedOrderId) {
          const updatedOrder = {
            ...order,
            [state.editingField]: state.fieldValue,
            // Remove this field from missingFields if it was present
            missingFields: order.missingFields
              ? order.missingFields.filter(field => field !== state.editingField)
              : []
          };
          return updatedOrder;
        }
        return order;
      });
      
      // Reprocess all orders to update validation status
      const { ordersWithIssues, suggestedTripNumbers, suggestedDrivers } = 
        processOrdersForVerification(updatedOrders);
      
      // Update the state with the new orders and validation results
      setState(prevState => ({
        ...prevState,
        orders: updatedOrders,
        ordersWithIssues,
        suggestedTripNumbers,
        suggestedDrivers,
        editingField: 'NONE',
        fieldValue: '',
        validationMessage: null,
        isModified: false,
        isProcessing: false
      }));
      
      // Call the callback with the updated orders
      onOrdersUpdated(updatedOrders);
      
      toast({
        title: "Field updated",
        description: `Successfully updated ${state.editingField} for order ${state.selectedOrderId}`,
      });
    } catch (error) {
      console.error("Error updating field:", error);
      toast({
        title: "Update failed",
        description: "An error occurred while updating the field",
        variant: "destructive"
      });
      
      setState(prev => ({
        ...prev,
        isProcessing: false
      }));
    }
    
    endPerformanceTracking('useOrderVerification.saveFieldValue', { success: true });
  }, [state, onOrdersUpdated, toast]);
  
  // Function to get validation status for a field
  const getFieldValidationStatus = useCallback((fieldName: string, value: string | null): FieldValidationStatus => {
    return getFieldValidationStatusAdapter(fieldName, value);
  }, []);
  
  // Handle field edit - adapter for the DataVerification component
  const handleFieldEdit = useCallback((field: string, value: string) => {
    startEdit(field as EditingField);
  }, [startEdit]);
  
  // Handle field value change - adapter for the DataVerification component
  const handleFieldValueChange = useCallback((value: string) => {
    updateFieldValue(value);
  }, [updateFieldValue]);
  
  // Handle field update - adapter for the DataVerification component
  const handleFieldUpdate = useCallback(() => {
    saveFieldValue();
  }, [saveFieldValue]);
  
  // Function to mark all orders as verified and approved
  const handleOrdersApprove = useCallback(() => {
    onOrdersUpdated(state.orders);
    toast({
      title: "Changes applied",
      description: `Successfully updated all orders`,
    });
  }, [state.orders, onOrdersUpdated, toast]);
  
  // Add isSavingField as a derived state
  const isSavingField = state.isProcessing;
  
  // Ensure we're using the correct adapter methods for validation
  const dependencies = {
    getOrderValidationStatus,
    getFieldValidationStatus: getFieldValidationStatusAdapter,
    validateField,
    getFieldStatus
  };
  
  return {
    ...state,
    selectedOrder,
    selectOrder,
    setSelectedOrderId,
    startEdit,
    updateFieldValue,
    cancelEdit,
    saveFieldValue,
    allOrdersValid,
    dependencies,
    handleFieldEdit,
    handleFieldValueChange,
    handleFieldUpdate,
    handleOrdersApprove,
    getFieldValidationStatus,
    isSavingField
  };
};
