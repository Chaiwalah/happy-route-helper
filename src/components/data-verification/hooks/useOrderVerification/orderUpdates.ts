
import { DeliveryOrder } from '@/utils/csvParser';
import { isEmptyValue, isUnassignedDriver, validateField } from './validationUtils';
import { isNoiseOrTestTripNumber } from '@/utils/routeOrganizer';
import { logDebug } from './logUtils';
import { toast } from '@/components/ui/use-toast';

/**
 * Update the order with the new field value
 */
export const updateOrder = async (
  orderId: string, 
  fieldName: keyof DeliveryOrder, 
  value: string,
  ordersWithIssues: DeliveryOrder[],
  orders: DeliveryOrder[],
  onOrdersVerified: (verifiedOrders: DeliveryOrder[]) => void,
  setValidationMessage: (message: string | null) => void
): Promise<boolean> => {
  try {
    logDebug(`Attempting to update ${fieldName} for order ${orderId} to "${value}"`);
    
    // Simple validation
    if (!validateField(fieldName, value, setValidationMessage)) {
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
      const isUnassigned = isUnassignedDriver(value);
      
      if (!isEmpty && !isUnassigned) {
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
      
      logDebug(`Updated driver: ${previousValue} -> ${value}, isEmpty: ${isEmpty}, isUnassigned: ${isUnassigned}`);
      
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

/**
 * Handle approve action to verify all orders
 */
export const approveOrders = (
  orders: DeliveryOrder[], 
  ordersWithIssues: DeliveryOrder[], 
  onOrdersVerified: (verifiedOrders: DeliveryOrder[]) => void
): void => {
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
};
