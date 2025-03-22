import { DeliveryOrder } from '@/utils/csvParser';
import { isEmptyValue, isUnassignedDriver } from './validationUtils';
import { isNoiseOrTestTripNumber } from '@/utils/routeOrganizer';
import { logDebug } from './logUtils';
import { processFieldValue } from './statusUtils';

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
    // Safely access properties with null checking
    const rawTripNumber = order.tripNumber === undefined || order.tripNumber === null ? '' : order.tripNumber;
    const tripNumberAsString = processFieldValue(rawTripNumber);
    
    const hasTripNumber = !isEmptyValue(rawTripNumber);
    const isTripNumberNoise = hasTripNumber && isNoiseOrTestTripNumber(tripNumberAsString);
    
    // Log raw trip number for debugging
    logDebug(`Raw trip number for ${order.id}:`, {
      value: rawTripNumber,
      type: typeof rawTripNumber,
      asString: tripNumberAsString
    });
    
    // Log trip number validation for all orders
    logDebug(`Trip Number Validation for ${order.id}:`, {
      rawValue: rawTripNumber,
      hasTripNumber,
      isTripNumberNoise,
      isEmptyValue: isEmptyValue(rawTripNumber),
      tripNumberAsString
    });
    
    // Normalize the trip number value - handle all possible types
    if (rawTripNumber === null || rawTripNumber === undefined || isEmptyValue(rawTripNumber)) {
      // Handle null, undefined, or empty values
      order.tripNumber = '';
    } else if (typeof rawTripNumber === 'object') {
      // Handle object representation, safely extract value
      const objValue = (rawTripNumber as any)?.value;
      order.tripNumber = objValue === undefined || objValue === null || objValue === 'undefined' 
        ? '' 
        : String(objValue);
    } else {
      // Ensure string representation for other types
      order.tripNumber = String(rawTripNumber);
    }
    
    // Final normalization - empty strings for truly empty values
    if (order.tripNumber === 'undefined' || order.tripNumber === 'null') {
      order.tripNumber = '';
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
    
    // Similar enhanced check for driver - handle all possible types safely
    const rawDriver = order.driver === undefined || order.driver === null ? '' : order.driver;
    const driverAsString = processFieldValue(rawDriver);
    
    const hasValidDriver = !isEmptyValue(rawDriver) && !isUnassignedDriver(driverAsString);
    
    // Log driver validation for all orders
    logDebug(`Driver Validation for ${order.id}:`, {
      rawValue: rawDriver,
      hasValidDriver,
      isEmptyValue: isEmptyValue(rawDriver),
      isUnassigned: isUnassignedDriver(driverAsString),
      driverAsString
    });
    
    // Normalize the driver value - handle all possible types
    if (rawDriver === null || rawDriver === undefined || isEmptyValue(rawDriver)) {
      // Handle null, undefined, or empty values
      order.driver = 'Unassigned';
    } else if (typeof rawDriver === 'object') {
      // Handle object representation, safely extract value
      const objValue = (rawDriver as any)?.value;
      const valueAsString = objValue === undefined || objValue === null || objValue === 'undefined' 
        ? '' 
        : String(objValue);
      
      // Only set to 'Unassigned' if value is truly empty
      order.driver = valueAsString === '' ? 'Unassigned' : valueAsString;
    } else {
      // Non-empty string or other primitive - keep as is or convert to string
      const driverStr = String(rawDriver);
      order.driver = driverStr === '' ? 'Unassigned' : driverStr;
    }
    
    // Final normalization - ensure 'Unassigned' for truly empty values
    if (order.driver === 'undefined' || order.driver === 'null' || order.driver === '') {
      order.driver = 'Unassigned';
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
    .map(o => o.tripNumber ?? '')
    .filter((value): value is string => 
      typeof value === 'string' && 
      value.trim() !== '' && 
      !isNoiseOrTestTripNumber(value)
    );
  
  // Find all unique drivers for suggestions
  const allDrivers = processedOrders
    .map(o => o.driver ?? '')
    .filter((value): value is string => 
      typeof value === 'string' && 
      value.trim() !== '' && 
      value !== 'Unassigned'
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
