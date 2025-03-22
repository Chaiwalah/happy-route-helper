
import { DeliveryOrder } from '@/utils/csvParser';
import { isEmptyValue, isUnassignedDriver, normalizeFieldValue } from './validationUtils';
import { isNoiseOrTestTripNumber } from '@/utils/routeOrganizer';
import { logDebug } from './logUtils';

/**
 * Process orders and identify issues with a unified approach
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
  const ordersWithIssues = processedOrders.map(order => {
    // Ensure missingFields exists and is an array
    if (!order.missingFields) {
      order.missingFields = [];
    }
    
    // Process and validate trip number
    processTripNumber(order);
    
    // Process and validate driver
    processDriver(order);
    
    return order;
  }).filter(order => {
    // Return true if order has issues with trip number or driver
    return order.missingFields.includes('tripNumber') || order.missingFields.includes('driver');
  });
  
  // Find all unique trip numbers for suggestions (excluding noise values)
  const allTripNumbers = processedOrders
    .map(o => normalizeFieldValue(o.tripNumber))
    .filter(value => 
      value && 
      value.trim() !== '' && 
      !isNoiseOrTestTripNumber(value)
    );
  
  // Find all unique drivers for suggestions
  const allDrivers = processedOrders
    .map(o => normalizeFieldValue(o.driver))
    .filter(value => 
      value && 
      value.trim() !== '' && 
      value !== 'Unassigned'
    );
  
  // Set unique suggested values for autocomplete
  const suggestedTripNumbers = [...new Set(allTripNumbers)].sort();
  const suggestedDrivers = [...new Set(allDrivers)].sort();
  
  logDebug(`Orders processed: total=${processedOrders.length}, with issues=${ordersWithIssues.length}`);
  
  return {
    ordersWithIssues,
    suggestedTripNumbers,
    suggestedDrivers
  };
};

/**
 * Process and normalize trip number for an order
 */
function processTripNumber(order: DeliveryOrder): void {
  // Normalize the trip number for consistent handling
  const rawTripNumber = order.tripNumber;
  const normalizedTripNumber = normalizeFieldValue(rawTripNumber);
  
  // Log raw and normalized trip number for debugging
  logDebug(`Trip number for ${order.id}:`, {
    rawValue: rawTripNumber,
    rawType: typeof rawTripNumber,
    normalized: normalizedTripNumber
  });
  
  // Check if the trip number is valid
  const isTripNumberEmpty = isEmptyValue(rawTripNumber);
  const isTripNumberNoise = !isTripNumberEmpty && isNoiseOrTestTripNumber(normalizedTripNumber);
  
  // Store the normalized value
  order.tripNumber = normalizedTripNumber;
  
  // Update missing fields based on validation
  if (isTripNumberEmpty || isTripNumberNoise) {
    // Trip number is missing or noise - add to missing fields if not already there
    if (!order.missingFields.includes('tripNumber')) {
      order.missingFields.push('tripNumber');
      logDebug(`Added missing field flag: Order ${order.id} has ${isTripNumberEmpty ? 'missing' : 'noise'} Trip Number "${normalizedTripNumber || ''}"`);
    }
  } else {
    // Trip number exists and is valid - remove from missing fields if present
    if (order.missingFields.includes('tripNumber')) {
      order.missingFields = order.missingFields.filter(field => field !== 'tripNumber');
      logDebug(`Removed trip number from missing fields for ${order.id}`);
    }
  }
}

/**
 * Process and normalize driver for an order
 */
function processDriver(order: DeliveryOrder): void {
  // Normalize the driver for consistent handling
  const rawDriver = order.driver;
  const normalizedDriver = normalizeFieldValue(rawDriver);
  
  // Log raw and normalized driver for debugging
  logDebug(`Driver for ${order.id}:`, {
    rawValue: rawDriver,
    rawType: typeof rawDriver,
    normalized: normalizedDriver
  });
  
  // Check if the driver is valid
  const isDriverEmpty = isEmptyValue(rawDriver);
  const isDriverUnassigned = !isDriverEmpty && normalizedDriver.toLowerCase() === 'unassigned';
  
  // Store the normalized value, with special handling for empty values
  order.driver = isDriverEmpty ? 'Unassigned' : normalizedDriver;
  
  // Update missing fields based on validation
  if (isDriverEmpty || isDriverUnassigned) {
    // Driver is missing or unassigned - add to missing fields if not already there
    if (!order.missingFields.includes('driver')) {
      order.missingFields.push('driver');
      logDebug(`Added missing field flag: Order ${order.id} has ${isDriverEmpty ? 'missing' : 'unassigned'} Driver "${order.driver || ''}"`);
    }
  } else {
    // Driver exists and is valid - remove from missing fields if present
    if (order.missingFields.includes('driver')) {
      order.missingFields = order.missingFields.filter(field => field !== 'driver');
      logDebug(`Removed driver from missing fields for ${order.id}`);
    }
  }
}
