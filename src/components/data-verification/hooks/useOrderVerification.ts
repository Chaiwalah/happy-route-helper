
"use client"

import { useState, useEffect } from 'react';
import { DeliveryOrder } from '@/utils/csvParser';
import { toast } from "@/components/ui/use-toast";
import { isNoiseOrTestTripNumber } from '@/utils/routeOrganizer';

export const useOrderVerification = (
  initialOrders: DeliveryOrder[],
  onOrdersVerified: (orders: DeliveryOrder[]) => void
) => {
  const [verifiedOrders, setVerifiedOrders] = useState<DeliveryOrder[]>(initialOrders);
  const [selectedOrderIndex, setSelectedOrderIndex] = useState<number | null>(null);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [fieldValue, setFieldValue] = useState<string>("");
  
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
      
      console.log("DataVerification: Orders updated, count:", processedOrders.length);
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
    console.log("Selected order for editing:", verifiedOrders[index].id);
  };
  
  const handleFieldEdit = (field: string, value: string) => {
    setEditingField(field);
    setFieldValue(value || "");
    console.log(`Editing field: ${field}, current value: ${value || "(empty)"}`);
  };
  
  const handleFieldUpdate = () => {
    if (selectedOrderIndex === null || !editingField) return;
    
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
    
    const updatedOrder = updatedOrders[selectedOrderIndex];
    console.log(`Updated ${editingField} for order ${updatedOrder.id} to: ${fieldValue}`);
    
    toast({
      title: "Field updated",
      description: `${editingField} for order ${updatedOrder.id} updated successfully.`,
    });
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
    handleFieldUpdate,
    handleVerificationComplete,
    setFieldValue
  };
};
