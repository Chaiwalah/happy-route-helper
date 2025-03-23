
import { useState, useCallback, useMemo } from 'react';
import { DeliveryOrder } from '@/utils/csvParser';
import { 
  OrderVerificationState, 
  EditingField, 
  FieldUpdate,
  OrderFieldValue
} from './types';
import { 
  getOrderValidationStatus,
  getFieldValidationStatusAdapter,
  getFieldStatus
} from './statusUtils';
import { validateField } from './validationUtils';
import { useToast } from '@/components/ui/use-toast';
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
  });
  
  const { toast } = useToast();
  
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
  
  // Memoize the list of orders with issues
  const ordersWithIssues = useMemo(() => {
    startPerformanceTracking('useOrderVerification.ordersWithIssues');
    const issues = state.orders.filter(order => orderValidationStatuses[order.id] !== 'valid').map(order => order.id);
    endPerformanceTracking('useOrderVerification.ordersWithIssues', {
      issueCount: issues.length
    });
    return issues;
  }, [state.orders, orderValidationStatuses]);
  
  // Memoize the allOrdersValid flag
  const allOrdersValid = useMemo(() => {
    startPerformanceTracking('useOrderVerification.allOrdersValid');
    const isValid = state.orders.every(order => orderValidationStatuses[order.id] === 'valid');
    endPerformanceTracking('useOrderVerification.allOrdersValid', { isValid });
    return isValid;
  }, [state.orders, orderValidationStatuses]);
  
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
  
  // Handler to start editing a specific field
  const startEdit = useCallback((field: EditingField) => {
    startPerformanceTracking('useOrderVerification.startEdit', { field });
    setState(prevState => {
      const selectedOrder = prevState.orders.find(order => order.id === prevState.selectedOrderId);
      const fieldValue = selectedOrder ? String(selectedOrder[field]) : '';
      
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
    
    // Proceed with saving if the field is valid
    setState(prevState => {
      const updatedOrders = prevState.orders.map(order => {
        if (order.id === prevState.selectedOrderId) {
          return {
            ...order,
            [prevState.editingField]: prevState.fieldValue
          };
        }
        return order;
      });
      
      // Update the state with the new orders and reset editing state
      return {
        ...prevState,
        orders: updatedOrders,
        editingField: 'NONE',
        fieldValue: '',
        validationMessage: null,
        isModified: false
      };
    });
    
    // After state is updated, call the onOrdersUpdated callback
    onOrdersUpdated(state.orders);
    toast({
      title: "Field updated",
      description: `Successfully updated ${state.editingField} for order ${state.selectedOrderId}`,
    });
    endPerformanceTracking('useOrderVerification.saveFieldValue', { success: true });
  }, [state.selectedOrderId, state.editingField, state.fieldValue, state.orders, onOrdersUpdated, toast]);
  
  // Ensure we're using the correct adapter methods for validation
  const dependencies = {
    getOrderValidationStatus,
    getFieldValidationStatus: getFieldValidationStatusAdapter,
    validateField,
    getFieldStatus
  };
  
  return {
    ...state,
    selectOrder,
    startEdit,
    updateFieldValue,
    cancelEdit,
    saveFieldValue,
    ordersWithIssues,
    allOrdersValid,
    dependencies
  };
};
