
import { DeliveryOrder } from '@/utils/csvParser';
import { isEmptyValue, isUnassignedDriver } from './validationUtils';
import { isNoiseOrTestTripNumber } from '@/utils/routeOrganizer';
import { logDebug } from './logUtils';

/**
 * Process orders and identify issues
 */
export const processOrdersForVerification = (
  orders: DeliveryOrder[]
): {
  ordersWithIssues: DeliveryOrder[];
  suggestedTripNumbers: string[];
  suggestedDrivers: string[];
} => {
  if (!orders || orders.length === 0) {
    logDebug("No orders to process for verification");
    return { 
      ordersWithIssues: [], 
      suggestedTripNumbers: [], 
      suggestedDrivers: [] 
    };
  }
  
  // Deep clone orders to avoid mutating original array
  const processedOrders = JSON.parse(JSON.stringify(orders)) as DeliveryOrder[];
  
  // Enhanced processing to identify orders with issues
  const ordersWithTripNumberIssues = processedOrders.filter(order => {
    // Ensure missingFields exists and is an array
    if (!order.missingFields) {
      order.missingFields = [];
    }
    
    // First, ensure we handle trip number validation correctly
    const hasTripNumber = !isEmptyValue(order.tripNumber);
    const isTripNumberNoise = hasTripNumber && 
      isNoiseOrTestTripNumber(String(typeof order.tripNumber === 'object' ? 
        order.tripNumber.value || '' : order.tripNumber || ''));
    
    // Log raw trip number for debugging
    logDebug(`Raw trip number for ${order.id}:`, {
      value: order.tripNumber,
      type: typeof order.tripNumber
    });
    
    // Log trip number validation for all orders
    logDebug(`Trip Number Validation for ${order.id}:`, {
      rawValue: order.tripNumber,
      hasTripNumber,
      isTripNumberNoise,
      isEmptyValue: isEmptyValue(order.tripNumber)
    });
    
    // Normalize the trip number value
    if (isEmptyValue(order.tripNumber)) {
      // If trip number is undefined, null, or an undefined object, set it to empty string
      order.tripNumber = '';
    } else if (typeof order.tripNumber === 'object') {
      // If it's an object, try to extract the value
      order.tripNumber = String(order.tripNumber.value || '');
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
        logDebug(`Added missing field flag: Order ${order.id} has ${hasTripNumber ? 'noise' : 'missing'} Trip Number "${order.tripNumber || ''}"`);
      }
    }
    
    // Similar enhanced check for driver
    const hasValidDriver = !isEmptyValue(order.driver) && !isUnassignedDriver(order.driver);
    
    // Log driver validation for all orders
    logDebug(`Driver Validation for ${order.id}:`, {
      rawValue: order.driver,
      hasValidDriver,
      isEmptyValue: isEmptyValue(order.driver),
      isUnassigned: isUnassignedDriver(order.driver)
    });
    
    // Normalize the driver value
    if (isEmptyValue(order.driver)) {
      // If driver is undefined, null, or an undefined object, set to 'Unassigned'
      order.driver = 'Unassigned';
    } else if (typeof order.driver === 'object') {
      // If it's an object, try to extract the value
      const driverValue = order.driver.value || '';
      order.driver = driverValue === '' ? 'Unassigned' : String(driverValue);
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
        logDebug(`Added missing field flag: Order ${order.id} has missing or invalid Driver "${order.driver || ''}"`);
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
      !isEmptyValue(value) && !isUnassignedDriver(value)
    );
  
  // Set unique suggested values for autocomplete
  const suggestedTripNumbers = [...new Set(allTripNumbers)].sort();
  const suggestedDrivers = [...new Set(allDrivers)].sort();
  
  logDebug(`Orders updated, count: ${processedOrders.length}, issues: ${ordersWithTripNumberIssues.length}`);
  logDebug(`Orders with issues: ${ordersWithTripNumberIssues.map(o => o.id).join(', ')}`);
  
  return {
    ordersWithIssues: ordersWithTripNumberIssues,
    suggestedTripNumbers,
    suggestedDrivers
  };
};
