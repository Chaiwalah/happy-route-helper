
"use client"

import { useState, useEffect, useCallback } from 'react';
import { DeliveryOrder } from '@/utils/csvParser';
import { isNoiseOrTestTripNumber } from '@/utils/routeOrganizer';
import { toast } from '@/components/ui/use-toast';

// Define the validation status type for field-level validation
export type FieldValidationStatus = 'valid' | 'warning' | 'error' | 'success' | 'info' | 'none';

// Interface for the order verification hook
export interface UseOrderVerificationProps {
  orders: DeliveryOrder[];
  onOrdersVerified: (verifiedOrders: DeliveryOrder[]) => void;
}

// Interface for the order verification hook return value
export interface UseOrderVerificationReturn {
  ordersWithIssues: DeliveryOrder[];
  selectedOrderId: string | null;
  setSelectedOrderId: (id: string | null) => void;
  selectedOrder: DeliveryOrder | null;
  editingField: string | null;
  fieldValue: string;
  isSavingField: boolean;
  validationMessage: string | null;
  suggestedTripNumbers: string[];
  suggestedDrivers: string[];
  handleFieldEdit: (field: string, value: string) => void;
  handleFieldValueChange: (value: string) => void;
  handleFieldUpdate: () => void;
  handleOrdersApprove: () => void;
  getOrderValidationStatus: (order: DeliveryOrder) => 'valid' | 'warning' | 'error';
  getFieldValidationStatus: (fieldName: string, value: string) => FieldValidationStatus;
  updateOrder: (orderId: string, fieldName: string, value: string) => Promise<boolean>;
}

export const useOrderVerification = ({ orders, onOrdersVerified }: UseOrderVerificationProps): UseOrderVerificationReturn => {
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

  // Enhanced utility to check if a value is effectively empty
  const isEmptyValue = (value: string | undefined | null): boolean => {
    if (value === undefined || value === null) return true;
    return value.trim() === '' || 
           value.toLowerCase() === 'n/a' || 
           value.toLowerCase() === 'na' || 
           value.toLowerCase() === 'none' || 
           value.trim() === '-' ||
           value === 'Unassigned';
  };

  // Logger for debugging
  const logDebug = (message: string, data?: any) => {
    console.log(`[OrderVerification] ${message}`, data || '');
  };

  // Process orders and identify issues
  useEffect(() => {
    if (!orders || orders.length === 0) {
      logDebug("No orders to process for verification");
      setOrdersWithIssues([]);
      return;
    }
    
    // Deep clone orders to avoid mutating original array
    const processedOrders = orders.map(order => {
      // Log raw order state for debugging
      if (order.id === 'order-17' || order.id === 'order-22' || order.id === 'order-23' || order.id === 'order-24') {
        logDebug(`Raw Order ${order.id}:`, { 
          tripNumber: order.tripNumber || 'MISSING', 
          driver: order.driver || 'MISSING',
          missingFields: order.missingFields || []
        });
      }
      
      // Create a deep clone to avoid mutations
      return {...order};
    });
    
    // Enhanced processing to identify orders with issues
    const ordersWithTripNumberIssues = processedOrders.filter(order => {
      // Ensure missingFields exists and is an array
      if (!order.missingFields) {
        order.missingFields = [];
      }
      
      // First, ensure we handle trip number validation correctly
      const hasTripNumber = !isEmptyValue(order.tripNumber);
      const isTripNumberNoise = hasTripNumber && isNoiseOrTestTripNumber(order.tripNumber!);
      
      // Log trip number validation for problematic orders
      if (order.id === 'order-17' || order.id === 'order-22' || order.id === 'order-23' || order.id === 'order-24') {
        logDebug(`Trip Number Validation for ${order.id}:`, {
          rawValue: order.tripNumber,
          hasTripNumber,
          isTripNumberNoise,
          isEmptyValue: isEmptyValue(order.tripNumber),
          inMissingFields: order.missingFields.includes('tripNumber')
        });
      }
      
      if (hasTripNumber && !isTripNumberNoise) {
        // Trip number exists and is valid - remove from missing fields if present
        if (order.missingFields.includes('tripNumber')) {
          order.missingFields = order.missingFields.filter(field => field !== 'tripNumber');
          logDebug(`Fixed false positive: Order ${order.id} has valid Trip Number "${order.tripNumber}" but was incorrectly marked as missing`);
        }
      } else {
        // Trip number is missing or noise - add to missing fields if not already there
        if (!order.missingFields.includes('tripNumber')) {
          order.missingFields.push('tripNumber');
          logDebug(`Added missing field flag: Order ${order.id} has ${hasTripNumber ? 'noise' : 'missing'} Trip Number "${order.tripNumber || 'undefined'}"`);
        }
      }
      
      // Similar enhanced check for driver
      const hasValidDriver = !isEmptyValue(order.driver);
      
      // Log driver validation for problematic orders
      if (order.id === 'order-17' || order.id === 'order-22' || order.id === 'order-23' || order.id === 'order-24') {
        logDebug(`Driver Validation for ${order.id}:`, {
          rawValue: order.driver,
          hasValidDriver,
          isEmptyValue: isEmptyValue(order.driver),
          inMissingFields: order.missingFields.includes('driver')
        });
      }
      
      if (hasValidDriver) {
        // Remove from missing fields if present
        if (order.missingFields.includes('driver')) {
          order.missingFields = order.missingFields.filter(field => field !== 'driver');
          logDebug(`Fixed false positive: Order ${order.id} has valid Driver "${order.driver}" but was incorrectly marked as missing`);
        }
      } else {
        // Add to missing fields if not already there
        if (!order.missingFields.includes('driver')) {
          order.missingFields.push('driver');
          logDebug(`Added missing field flag: Order ${order.id} has missing Driver "${order.driver || 'undefined'}"`);
        }
      }
      
      // Return true if order has issues with trip number or driver
      return !hasTripNumber || isTripNumberNoise || !hasValidDriver;
    });
    
    // Find all unique trip numbers for suggestions (excluding noise values)
    const allTripNumbers = processedOrders
      .map(o => o.tripNumber)
      .filter((value): value is string => 
        !isEmptyValue(value) && 
        !isNoiseOrTestTripNumber(value)
      );
    
    // Find all unique drivers for suggestions
    const allDrivers = processedOrders
      .map(o => o.driver)
      .filter((value): value is string => 
        !isEmptyValue(value)
      );
    
    // Set unique suggested values for autocomplete
    setSuggestedTripNumbers([...new Set(allTripNumbers)].sort());
    setSuggestedDrivers([...new Set(allDrivers)].sort());
    
    logDebug(`Orders updated, count: ${processedOrders.length}, issues: ${ordersWithTripNumberIssues.length}`);
    logDebug(`Orders with issues: ${ordersWithTripNumberIssues.map(o => o.id).join(', ')}`);
    
    setOrdersWithIssues(ordersWithTripNumberIssues);
    
    // If there are issues and no order is selected, select the first one
    if (ordersWithTripNumberIssues.length > 0 && !selectedOrderId) {
      setSelectedOrderId(ordersWithTripNumberIssues[0].id);
      logDebug(`Auto-selecting first issue order: ${ordersWithTripNumberIssues[0].id}`);
    } else if (ordersWithTripNumberIssues.length === 0) {
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
  const handleFieldEdit = (field: string, value: string) => {
    setEditingField(field);
    setFieldValue(value || ''); // Ensure value is never undefined
    setValidationMessage(null);
  };

  // Handle field value change
  const handleFieldValueChange = (value: string) => {
    setFieldValue(value || '');
    
    // Optionally add real-time validation here
    validateField(editingField || '', value || '');
  };

  // Validate field based on field name and value
  const validateField = (fieldName: string, value: string): boolean => {
    // Reset validation message
    setValidationMessage(null);
    
    if (isEmptyValue(value)) {
      if (fieldName === 'tripNumber') {
        setValidationMessage('Trip Number cannot be empty');
        return false;
      }
      
      if (fieldName === 'driver') {
        setValidationMessage('Driver cannot be empty');
        return false;
      }
    }
    
    if (fieldName === 'tripNumber') {
      // Check for noise/test values
      if (isNoiseOrTestTripNumber(value)) {
        setValidationMessage('Warning: This appears to be a test/noise value');
        return false;
      }
      
      // Check for N/A values
      if (['n/a', 'na', 'none'].includes(value.toLowerCase())) {
        setValidationMessage('Trip Number cannot be N/A or None');
        return false;
      }
      
      // Validate proper trip number format (e.g. TR-123456)
      const tripNumberPattern = /^([A-Za-z]{1,3}[\-\s]?\d{3,8}|\d{3,8})$/;
      if (!tripNumberPattern.test(value.trim()) && value.trim() !== '') {
        setValidationMessage('Warning: Trip Number format may be incorrect. Expected format: TR-123456 or 123456');
        // Still allow it but with a warning
      }
    }
    
    return true;
  };

  // Update the order with the new field value
  const updateOrder = async (orderId: string, fieldName: keyof DeliveryOrder, value: string): Promise<boolean> => {
    try {
      logDebug(`Attempting to update ${fieldName} for order ${orderId} to "${value}"`);
      
      // Simple validation
      if (!validateField(fieldName, value)) {
        return false;
      }
      
      // Find the order to update
      const orderIndex = ordersWithIssues.findIndex(order => order.id === orderId);
      if (orderIndex === -1) {
        logDebug(`Error: Order with ID ${orderId} not found in ordersWithIssues`);
        return false;
      }
      
      // Create a new array with the updated order
      const updatedOrders = [...ordersWithIssues];
      const updatedOrder = { ...updatedOrders[orderIndex] };
      
      // Ensure missingFields exists
      if (!updatedOrder.missingFields) {
        updatedOrder.missingFields = [];
      }
      
      // Update the field
      if (fieldName === 'tripNumber') {
        // Store previous value for logging
        const previousValue = updatedOrder.tripNumber;
        
        // Set the new value
        updatedOrder.tripNumber = value;
        
        // Update missingFields based on new value
        const isEmpty = isEmptyValue(value);
        const isNoise = !isEmpty && isNoiseOrTestTripNumber(value);
        
        if (!isEmpty && !isNoise) {
          // Valid trip number - remove from missing fields
          updatedOrder.missingFields = updatedOrder.missingFields.filter(field => field !== 'tripNumber');
          logDebug(`Removed tripNumber from missingFields for ${orderId}`);
        } else {
          // Missing or invalid - add to missing fields
          if (!updatedOrder.missingFields.includes('tripNumber')) {
            updatedOrder.missingFields.push('tripNumber');
            logDebug(`Added tripNumber to missingFields for ${orderId}`);
          }
        }
        
        logDebug(`Updated tripNumber: ${previousValue} -> ${value}, isEmpty: ${isEmpty}, isNoise: ${isNoise}`);
        
      } else if (fieldName === 'driver') {
        // Store previous value for logging
        const previousValue = updatedOrder.driver;
        
        // Set the new value
        updatedOrder.driver = value;
        
        // Update missingFields based on new value
        const isEmpty = isEmptyValue(value);
        
        if (!isEmpty) {
          // Valid driver - remove from missing fields
          updatedOrder.missingFields = updatedOrder.missingFields.filter(field => field !== 'driver');
          logDebug(`Removed driver from missingFields for ${orderId}`);
        } else {
          // Missing or invalid - add to missing fields
          if (!updatedOrder.missingFields.includes('driver')) {
            updatedOrder.missingFields.push('driver');
            logDebug(`Added driver to missingFields for ${orderId}`);
          }
        }
        
        logDebug(`Updated driver: ${previousValue} -> ${value}, isEmpty: ${isEmpty}`);
        
      } else {
        // For other fields, simply update the value
        (updatedOrder as any)[fieldName] = value;
        
        // If the field was in missingFields and now has a value, remove it
        if (!isEmptyValue(value)) {
          updatedOrder.missingFields = updatedOrder.missingFields.filter(field => field !== fieldName);
        }
      }
      
      // Update the orders array
      updatedOrders[orderIndex] = updatedOrder;
      setOrdersWithIssues(updatedOrders);
      
      // Find the corresponding order in the original orders array
      const originalOrderIndex = orders.findIndex(order => order.id === updatedOrder.id);
      
      if (originalOrderIndex !== -1) {
        // Create a new array with all orders
        const allOrdersUpdated = [...orders];
        
        // Update the specific order
        allOrdersUpdated[originalOrderIndex] = {
          ...allOrdersUpdated[originalOrderIndex],
          ...updatedOrder
        };
        
        // Call onOrdersVerified to update the parent component state
        onOrdersVerified(allOrdersUpdated);
        
        logDebug(`Successfully updated ${fieldName} for order ${orderId} and propagated changes to parent`);
      } else {
        logDebug(`Warning: Could not find order ${orderId} in original orders array for syncing`);
      }
      
      // Show success message
      setValidationMessage('Field updated successfully');
      return true;
    } catch (error) {
      console.error('Error updating order:', error);
      setValidationMessage('Error updating field');
      return false;
    }
  };

  // Handle field update
  const handleFieldUpdate = useCallback(async () => {
    if (!selectedOrderId || editingField === null) return;
    
    setIsSavingField(true);
    try {
      const success = await updateOrder(selectedOrderId, editingField as keyof DeliveryOrder, fieldValue);
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
  }, [selectedOrderId, editingField, fieldValue]);

  // Get validation status for an order
  const getOrderValidationStatus = useCallback((order: DeliveryOrder): 'valid' | 'warning' | 'error' => {
    // Check for trip number issues - most critical
    if (isEmptyValue(order.tripNumber) || isNoiseOrTestTripNumber(order.tripNumber || '')) {
      return 'error';
    }
    
    // Check for driver issues
    if (isEmptyValue(order.driver)) {
      return 'warning';
    }
    
    // Check for other missing fields - less critical
    if (order.missingFields && order.missingFields.length > 0) {
      // Missing address is an error
      if (order.missingFields.includes('address') || order.missingFields.includes('pickupLocation')) {
        return 'error';
      }
      
      // Other missing fields are warnings
      return 'warning';
    }
    
    return 'valid';
  }, []);

  // Get validation status for a specific field
  const getFieldValidationStatus = useCallback((fieldName: string, value: string): FieldValidationStatus => {
    if (isEmptyValue(value)) {
      // Critical fields
      if (fieldName === 'tripNumber' || 
          fieldName === 'driver' || 
          fieldName === 'pickup' || 
          fieldName === 'dropoff') {
        return 'error';
      }
      
      // Optional fields
      return 'warning';
    }
    
    // Check for trip number specific validation
    if (fieldName === 'tripNumber') {
      // 'N/A' values should be treated as missing (error)
      if (value.toLowerCase() === 'n/a' || value.toLowerCase() === 'na' || value.toLowerCase() === 'none') {
        return 'error';
      }
      
      // Check for noise/test values
      if (isNoiseOrTestTripNumber(value)) {
        return 'error';
      }
      
      // Validate proper trip number format (e.g. TR-123456)
      const tripNumberPattern = /^([A-Za-z]{1,3}[\-\s]?\d{3,8}|\d{3,8})$/;
      if (!tripNumberPattern.test(value.trim())) {
        return 'warning';
      }
    }
    
    // Driver should not be "Unassigned"
    if (fieldName === 'driver' && value === 'Unassigned') {
      return 'warning';
    }
    
    return 'valid';
  }, []);

  // Handle approve action to verify all orders
  const handleOrdersApprove = useCallback(() => {
    // Create a map of all orders
    const allOrdersMap = new Map(orders.map(order => [order.id, order]));
    
    // Update orders with the corrected values from ordersWithIssues
    ordersWithIssues.forEach(updatedOrder => {
      allOrdersMap.set(updatedOrder.id, updatedOrder);
    });
    
    // Convert map back to array
    const finalOrders = Array.from(allOrdersMap.values());
    
    // Call the onOrdersVerified callback with the final orders
    onOrdersVerified(finalOrders);
    
    logDebug(`Applied verification changes to ${ordersWithIssues.length} orders`);
    
    // Provide user feedback
    toast({
      title: "Changes Applied",
      description: `Successfully updated ${ordersWithIssues.length} orders`,
    });
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
    updateOrder
  };
};
