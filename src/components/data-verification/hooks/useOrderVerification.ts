
"use client"

import { useState, useEffect, useCallback } from 'react';
import { DeliveryOrder } from '@/utils/csvParser';
import { toast } from "@/components/ui/use-toast";
import { isNoiseOrTestTripNumber } from '@/utils/routeOrganizer';

export type FieldValidationStatus = 'none' | 'valid' | 'invalid' | 'warning';

export const useOrderVerification = (
  initialOrders: DeliveryOrder[],
  onOrdersVerified: (orders: DeliveryOrder[]) => void
) => {
  const [verifiedOrders, setVerifiedOrders] = useState<DeliveryOrder[]>(initialOrders);
  const [selectedOrderIndex, setSelectedOrderIndex] = useState<number | null>(null);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [fieldValue, setFieldValue] = useState<string>("");
  const [isSavingField, setIsSavingField] = useState(false);
  const [validationMessage, setValidationMessage] = useState<string | null>(null);
  
  // Generate lists of existing trip numbers and drivers for autocomplete
  const [suggestedTripNumbers, setSuggestedTripNumbers] = useState<string[]>([]);
  const [suggestedDrivers, setSuggestedDrivers] = useState<string[]>([]);
  
  // Common validation patterns
  const tripNumberPattern = /^(TR-|TN-|T-)?[0-9]{3,}$/i; // Matches TR-123, TN-123, T-123, or just 123
  const driverNamePattern = /^[A-Za-z. -]{2,}$/; // Simple name validation
  
  // Validate a trip number
  const validateTripNumber = (tripNumber: string): boolean => {
    if (!tripNumber || tripNumber.trim() === '') return false;
    if (isNoiseOrTestTripNumber(tripNumber)) return false; 
    return tripNumberPattern.test(tripNumber);
  };

  // Get validation status for any field
  const getFieldValidationStatus = useCallback((fieldName: string, value: string): FieldValidationStatus => {
    // Don't validate empty fields as invalid, just as missing
    if (!value || value.trim() === '') return 'none';
    
    switch (fieldName) {
      case 'tripNumber':
        if (isNoiseOrTestTripNumber(value)) return 'warning';
        return validateTripNumber(value) ? 'valid' : 'invalid';
      case 'driver':
        return driverNamePattern.test(value) ? 'valid' : 'warning';
      case 'pickup':
      case 'dropoff':
        return value.length > 5 ? 'valid' : 'warning';
      default:
        return 'none';
    }
  }, []);
  
  // Update state when orders prop changes
  useEffect(() => {
    if (initialOrders && initialOrders.length > 0) {
      // Preprocess the orders to remove any false positives in missingFields
      const processedOrders = initialOrders.map(order => {
        // Create a copy to avoid mutating props
        const updatedOrder = { ...order };
        
        // Fix missing fields detection for trip numbers that are "N/A" but not empty
        if (updatedOrder.tripNumber && updatedOrder.tripNumber.trim() !== '' && 
            updatedOrder.missingFields.includes('tripNumber')) {
          // If we have a non-empty trip number but it's flagged as missing, remove it from missingFields
          // This fixes the case where "N/A" is a valid value but treated as missing
          updatedOrder.missingFields = updatedOrder.missingFields.filter(field => field !== 'tripNumber');
          console.log(`Fixed false positive: Order ${updatedOrder.id} has Trip Number "${updatedOrder.tripNumber}" but was incorrectly marked as missing`);
        }
        
        // Additional check for "N/A" as a trip number - mark as missing or noise
        if (updatedOrder.tripNumber && (
            updatedOrder.tripNumber.trim() === 'N/A' || 
            updatedOrder.tripNumber.trim() === 'n/a')) {
          // Replace "N/A" with empty string to trigger proper trip number validation
          updatedOrder.tripNumber = '';
          
          // Add tripNumber to missingFields if not already there
          if (!updatedOrder.missingFields.includes('tripNumber')) {
            updatedOrder.missingFields.push('tripNumber');
            console.log(`Marked Order ${updatedOrder.id} with "N/A" Trip Number as missing`);
          }
        }
        
        // Skip unstructured field validation from Special Instructions
        if (updatedOrder.notes && updatedOrder.notes.includes('SPECIAL INSTRUCTIONS')) {
          console.log(`Order ${updatedOrder.id} has special instructions that may contain unstructured data`);
          // No need to flag special instructions fields as issues
        }
        
        return updatedOrder;
      });
      
      setVerifiedOrders(processedOrders);
      
      // Reset selection state when orders change
      setSelectedOrderIndex(null);
      setEditingField(null);
      setFieldValue("");
      setValidationMessage(null);
      
      console.log("DataVerification: Orders updated, count:", processedOrders.length);
      
      // Extract unique trip numbers and drivers for suggestions
      const tripNumbers = processedOrders
        .map(order => order.tripNumber?.trim())
        .filter((tripNumber): tripNumber is string => 
          Boolean(tripNumber) && 
          !isNoiseOrTestTripNumber(tripNumber))
        .filter((value, index, self) => self.indexOf(value) === index);
      
      const drivers = processedOrders
        .map(order => order.driver?.trim())
        .filter((driver): driver is string => Boolean(driver))
        .filter((value, index, self) => self.indexOf(value) === index);
      
      setSuggestedTripNumbers(tripNumbers);
      setSuggestedDrivers(drivers);
    }
  }, [initialOrders]);
  
  // Filter orders with missing or potentially problematic data
  // Exclude noise trip numbers from verification as they'll be filtered out anyway
  const ordersRequiringVerification = verifiedOrders.filter(order => {
    // Skip orders with test/noise trip numbers from verification
    if (order.tripNumber && isNoiseOrTestTripNumber(order.tripNumber)) {
      return false;
    }
    
    // Include orders with actual missing fields or missing trip numbers
    return order.missingFields.length > 0 || !order.tripNumber || order.tripNumber.trim() === '';
  });
  
  // Focus on Trip Number field issues specifically
  const ordersWithTripNumberIssues = verifiedOrders.filter(order => {
    // Skip testing/noise trip numbers
    if (order.tripNumber && isNoiseOrTestTripNumber(order.tripNumber)) {
      return false;
    }
    
    // Include actually missing trip numbers
    return !order.tripNumber || order.tripNumber.trim() === '' || order.missingFields.includes('tripNumber');
  });
  
  const handleOrderEdit = (index: number) => {
    setSelectedOrderIndex(index);
    setEditingField(null);
    setValidationMessage(null);
    console.log("Selected order for editing:", verifiedOrders[index].id);
  };
  
  const handleFieldEdit = (field: string, value: string) => {
    setEditingField(field);
    setFieldValue(value || "");
    setValidationMessage(null);
    console.log(`Editing field: ${field}, current value: ${value || "(empty)"}`);
  };
  
  const handleFieldValueChange = (value: string) => {
    setFieldValue(value);
    
    // Clear any validation message when user types
    if (validationMessage) {
      setValidationMessage(null);
    }
  };
  
  const handleFieldUpdate = async () => {
    if (selectedOrderIndex === null || !editingField) return;
    
    setIsSavingField(true);
    setValidationMessage(null);
    
    // Validate field before saving
    let isValid = true;
    let validationMsg = '';
    
    // Special validation for trip number
    if (editingField === 'tripNumber') {
      if (!fieldValue || fieldValue.trim() === '') {
        isValid = false;
        validationMsg = 'Trip Number cannot be empty';
      } else if (isNoiseOrTestTripNumber(fieldValue)) {
        // Still valid but show warning
        validationMsg = 'Warning: This Trip Number may be filtered out as noise data';
      } else if (!validateTripNumber(fieldValue)) {
        // Still let them save but with warning
        validationMsg = 'Warning: Trip Number format is unusual. Consider using format TR-123';
      }
    }
    
    // Simulate a slight delay for the save operation to show loading state
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // Using immutable update pattern
    const updatedOrders = verifiedOrders.map((order, index) => {
      if (index === selectedOrderIndex) {
        // Create a new object with the updated field
        const updatedOrder = { ...order };
        
        // Typesafe way to update the dynamic property
        (updatedOrder as any)[editingField] = fieldValue;
        
        // If we're updating a field that was missing, remove it from missingFields
        if (updatedOrder.missingFields.includes(editingField)) {
          updatedOrder.missingFields = updatedOrder.missingFields.filter(f => f !== editingField);
        }
        
        // Special case for Trip Number - always mark as resolved if we manually set a value
        if (editingField === 'tripNumber' && fieldValue.trim() !== '') {
          updatedOrder.missingFields = updatedOrder.missingFields.filter(f => f !== 'tripNumber');
        }
        
        return updatedOrder;
      }
      return order;
    });
    
    setVerifiedOrders(updatedOrders);
    
    // Reset editing state
    setEditingField(null);
    setFieldValue("");
    setIsSavingField(false);
    
    const updatedOrder = updatedOrders[selectedOrderIndex];
    console.log(`Updated ${editingField} for order ${updatedOrder.id} to: ${fieldValue}`);
    
    // Update our autocomplete suggestions
    if (editingField === 'tripNumber' && fieldValue && !suggestedTripNumbers.includes(fieldValue)) {
      setSuggestedTripNumbers([...suggestedTripNumbers, fieldValue]);
    } else if (editingField === 'driver' && fieldValue && !suggestedDrivers.includes(fieldValue)) {
      setSuggestedDrivers([...suggestedDrivers, fieldValue]);
    }
    
    // Show success message or validation warning
    if (validationMsg) {
      setValidationMessage(validationMsg);
    } else {
      setValidationMessage(`Field successfully updated. ${isValid ? '' : 'There may still be validation issues.'}`);
      
      toast({
        title: "Field updated",
        description: `${editingField} for order ${updatedOrder.id} updated successfully.`,
      });
    }
  };
  
  const handleVerificationComplete = () => {
    // Check for any remaining issues with trip numbers
    const stillMissingTripNumbers = verifiedOrders.filter(order => 
      // Skip test/noise trip numbers from this check
      !(order.tripNumber && isNoiseOrTestTripNumber(order.tripNumber)) &&
      // Only flag actually missing or empty trip numbers
      (!order.tripNumber || order.tripNumber.trim() === '')
    ).length;
    
    if (stillMissingTripNumbers > 0) {
      const confirmComplete = window.confirm(
        `There are still ${stillMissingTripNumbers} orders missing trip numbers. Do you want to continue anyway?`
      );
      
      if (!confirmComplete) {
        return;
      }
    }
    
    onOrdersVerified(verifiedOrders);
    
    toast({
      title: "Data verification complete",
      description: `${verifiedOrders.length} orders have been verified and updated.`,
    });
  };

  return {
    verifiedOrders,
    selectedOrderIndex,
    editingField,
    fieldValue,
    ordersRequiringVerification,
    ordersWithTripNumberIssues,
    handleOrderEdit,
    handleFieldEdit,
    handleFieldValueChange,
    handleFieldUpdate,
    handleVerificationComplete,
    setFieldValue,
    isSavingField,
    validationMessage,
    suggestedTripNumbers,
    suggestedDrivers,
    getFieldValidationStatus
  };
};
