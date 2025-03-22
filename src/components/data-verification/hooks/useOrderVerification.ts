
"use client"

import { useState, useEffect, useCallback } from 'react';
import { DeliveryOrder } from '@/utils/csvParser';
import { isNoiseOrTestTripNumber } from '@/utils/routeOrganizer';

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

  // Process orders and identify issues
  useEffect(() => {
    if (!orders || orders.length === 0) {
      console.log("No orders to process for verification");
      setOrdersWithIssues([]);
      return;
    }
    
    // Deep clone orders to avoid mutating original array
    const processedOrders = orders.map(order => ({...order}));
    
    // Enhanced processing to identify orders with issues
    const ordersWithTripNumberIssues = processedOrders.filter(order => {
      // Ensure missingFields exists and is an array
      if (!order.missingFields) {
        order.missingFields = [];
      }
      
      // First, ensure we handle trip number validation correctly
      if (order.tripNumber && order.tripNumber.trim() !== '') {
        // If trip number exists and is flagged as missing (false positive), fix it
        if (order.missingFields.includes('tripNumber')) {
          // This fixes the case where trip number exists but was marked as missing
          order.missingFields = order.missingFields.filter(field => field !== 'tripNumber');
          console.log(`Fixed false positive: Order ${order.id} has Trip Number "${order.tripNumber}" but was incorrectly marked as missing`);
        }
        
        // Check if it's a noise/test value
        if (isNoiseOrTestTripNumber(order.tripNumber)) {
          if (!order.missingFields.includes('tripNumber')) {
            order.missingFields.push('tripNumber');
            console.log(`Added missing field flag: Order ${order.id} has noise Trip Number "${order.tripNumber}"`);
          }
        }
      } else {
        // If trip number is missing, ensure it's flagged
        if (!order.missingFields.includes('tripNumber')) {
          order.missingFields.push('tripNumber');
          console.log(`Added missing field flag: Order ${order.id} has missing Trip Number`);
        }
      }
      
      // Similar check for driver - preserve actual driver values
      if (order.driver && order.driver.trim() !== '' && 
          order.driver !== 'Unassigned' &&
          order.missingFields.includes('driver')) {
        // If we have a non-empty driver but it's flagged as missing, remove it from missingFields
        order.missingFields = order.missingFields.filter(field => field !== 'driver');
        console.log(`Fixed false positive: Order ${order.id} has Driver "${order.driver}" but was incorrectly marked as missing`);
      } else if ((!order.driver || order.driver.trim() === '' || order.driver === 'Unassigned') &&
                !order.missingFields.includes('driver')) {
        // If driver is missing but not flagged, add the flag
        order.missingFields.push('driver');
        console.log(`Added missing field flag: Order ${order.id} has missing Driver`);
      }
      
      // Additional check for "N/A" as a trip number - mark as missing or noise
      if (order.tripNumber && (
          order.tripNumber.toLowerCase() === 'n/a' || 
          order.tripNumber.toLowerCase() === 'na' ||
          order.tripNumber.toLowerCase() === 'none' ||
          order.tripNumber.trim() === '-'
      )) {
        // Don't let "N/A" be a valid trip number - mark as missing unless already marked
        if (!order.missingFields.includes('tripNumber')) {
          order.missingFields.push('tripNumber');
          console.log(`Marked Order ${order.id} with Trip Number "${order.tripNumber}" as missing trip number`);
        }
      }
      
      // Return true if order has missing trip number or has trip number marked as missing field
      return !order.tripNumber || 
             order.tripNumber.trim() === '' || 
             order.missingFields.includes('tripNumber');
    });
    
    // Find all unique trip numbers and drivers for suggestions (excluding noise values)
    const allTripNumbers = processedOrders
      .map(o => o.tripNumber)
      .filter((value): value is string => 
        !!value && 
        value.trim() !== '' && 
        !isNoiseOrTestTripNumber(value) &&
        !['n/a', 'na', 'none', '-'].includes(value.toLowerCase())
      );
    
    const allDrivers = processedOrders
      .map(o => o.driver)
      .filter((value): value is string => 
        !!value && 
        value.trim() !== '' && 
        value !== 'Unassigned'
      );
    
    // Set unique suggested values for autocomplete
    setSuggestedTripNumbers([...new Set(allTripNumbers)].sort());
    setSuggestedDrivers([...new Set(allDrivers)].sort());
    
    console.log(`DataVerification: Orders updated, count: ${processedOrders.length}, issues: ${ordersWithTripNumberIssues.length}`);
    
    setOrdersWithIssues(ordersWithTripNumberIssues);
    
    // If there are issues and no order is selected, select the first one
    if (ordersWithTripNumberIssues.length > 0 && !selectedOrderId) {
      setSelectedOrderId(ordersWithTripNumberIssues[0].id);
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
    
    if (!value.trim()) {
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
      if (!tripNumberPattern.test(value) && value.trim() !== '') {
        setValidationMessage('Warning: Trip Number format may be incorrect. Expected format: TR-123456 or 123456');
        // Still allow it but with a warning
      }
    }
    
    return true;
  };

  // Update the order with the new field value
  const updateOrder = async (orderId: string, fieldName: keyof DeliveryOrder, value: string): Promise<boolean> => {
    try {
      // Simple validation
      if (!validateField(fieldName, value)) {
        return false;
      }
      
      // Find the order to update
      const orderIndex = ordersWithIssues.findIndex(order => order.id === orderId);
      if (orderIndex === -1) return false;
      
      // Create a new array with the updated order
      const updatedOrders = [...ordersWithIssues];
      const updatedOrder = { ...updatedOrders[orderIndex] };
      
      // Ensure missingFields exists
      if (!updatedOrder.missingFields) {
        updatedOrder.missingFields = [];
      }
      
      // Update the field
      if (fieldName === 'tripNumber') {
        updatedOrder.tripNumber = value;
        
        // If tripNumber was in missingFields, remove it
        if (value && value.trim() !== '' && 
            !isNoiseOrTestTripNumber(value) && 
            !['n/a', 'na', 'none'].includes(value.toLowerCase())) {
          updatedOrder.missingFields = updatedOrder.missingFields.filter(field => field !== 'tripNumber');
        } else {
          // Add it back if it's missing or invalid
          if (!updatedOrder.missingFields.includes('tripNumber')) {
            updatedOrder.missingFields.push('tripNumber');
          }
        }
      } else if (fieldName === 'driver') {
        updatedOrder.driver = value;
        
        // If driver is not empty or "Unassigned", remove from missingFields
        if (value && value.trim() !== '' && value !== 'Unassigned') {
          updatedOrder.missingFields = updatedOrder.missingFields.filter(field => field !== 'driver');
        } else {
          // Add it back if it's missing
          if (!updatedOrder.missingFields.includes('driver')) {
            updatedOrder.missingFields.push('driver');
          }
        }
      } else {
        // For other fields, simply update the value
        (updatedOrder as any)[fieldName] = value;
        
        // If the field was in missingFields and now has a value, remove it
        if (value && value.trim() !== '') {
          updatedOrder.missingFields = updatedOrder.missingFields.filter(field => field !== fieldName);
        }
      }
      
      // Update the orders array
      updatedOrders[orderIndex] = updatedOrder;
      setOrdersWithIssues(updatedOrders);
      
      // Update the same order in the original orders array for consistency
      const allOrdersUpdated = orders.map(order => 
        order.id === updatedOrder.id ? updatedOrder : order
      );
      
      // Log the update for debugging
      console.log(`Updated ${fieldName} for order ${orderId} to "${value}"`);
      
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
      }
    } finally {
      setIsSavingField(false);
    }
  }, [selectedOrderId, editingField, fieldValue]);

  // Get validation status for an order
  const getOrderValidationStatus = useCallback((order: DeliveryOrder): 'valid' | 'warning' | 'error' => {
    // Check for trip number issues - most critical
    if (!order.tripNumber || 
        order.tripNumber.trim() === '' || 
        isNoiseOrTestTripNumber(order.tripNumber) ||
        ['n/a', 'na', 'none'].includes(order.tripNumber?.toLowerCase() || '')) {
      return 'error';
    }
    
    // Check for other missing fields - less critical
    if (order.missingFields && order.missingFields.length > 0) {
      // Missing driver is a warning
      if (order.missingFields.includes('driver')) {
        return 'warning';
      }
      
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
    if (!value || value.trim() === '') {
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
      // Check for noise/test values
      if (isNoiseOrTestTripNumber(value)) {
        return 'error';
      }
      
      // Check for N/A values
      if (['n/a', 'na', 'none'].includes(value.toLowerCase())) {
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
    
    console.log(`Applied verification changes to ${ordersWithIssues.length} orders`);
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
