
import { useState, useCallback, useMemo, useEffect } from 'react';
import { DeliveryOrder } from '@/utils/csvParser';
import { 
  OrderVerificationState, 
  EditingField, 
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
  
  // Memoize the allOrdersValid flag
  const allOrdersValid = useMemo(() => {
    return state.ordersWithIssues.length === 0;
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
  }, []);
  
  // Handler to update the field value while editing
  const updateFieldValue = useCallback((value: string) => {
    setState(prevState => ({
      ...prevState,
      fieldValue: value,
      isModified: true,
      validationMessage: null
    }));
  }, []);
  
  // Handler to cancel editing
  const cancelEdit = useCallback(() => {
    setState(prevState => ({
      ...prevState,
      editingField: 'NONE',
      fieldValue: '',
      validationMessage: null,
      isModified: false
    }));
  }, []);
  
  // Handler to save the edited field value
  const saveFieldValue = useCallback(async () => {
    if (!state.selectedOrderId) {
      return;
    }
    
    if (state.editingField === 'NONE') {
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
    handleFieldEdit,
    handleFieldValueChange,
    handleFieldUpdate,
    handleOrdersApprove,
    getFieldValidationStatus,
    isSavingField: state.isProcessing
  };
};
