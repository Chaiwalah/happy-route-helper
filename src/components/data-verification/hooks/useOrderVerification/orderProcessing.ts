
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
  
  // Find all unique valid trip numbers for suggestions (excluding noise values and nulls)
  const allTripNumbers = processedOrders
    .map(o => o.tripNumber)
    .filter(value => 
      value !== null && 
      !isEmptyValue(value) && 
      !isNoiseOrTestTripNumber(normalizeFieldValue(value))
    )
    .map(value => normalizeFieldValue(value));
  
  // Find all unique valid drivers for suggestions (excluding unassigned and nulls)
  const allDrivers = processedOrders
    .map(o => o.driver)
    .filter(value => 
      value !== null && 
      !isEmptyValue(value) && 
      !isUnassignedDriver(value)
    )
    .map(value => normalizeFieldValue(value));
  
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
 * Now properly handles null values as missing
 */
function processTripNumber(order: DeliveryOrder): void {
  // Capture the raw trip number for reference
  const rawTripNumber = order.tripNumber;
  
  // Log raw trip number for debugging
  logDebug(`Trip number for ${order.id}:`, {
    rawValue: rawTripNumber,
    rawType: typeof rawTripNumber,
    isNull: rawTripNumber === null
  });
  
  // If trip number is null, it's truly missing
  if (rawTripNumber === null) {
    // Already null, leave it as null to indicate it's missing
    logDebug(`Order ${order.id} has null Trip Number (truly missing)`);
    
    // Add to missing fields if not already there
    if (!order.missingFields.includes('tripNumber')) {
      order.missingFields.push('tripNumber');
    }
    return;
  }
  
  // For non-null values, normalize them
  const normalizedTripNumber = normalizeFieldValue(rawTripNumber);
  
  // Log normalized trip number
  logDebug(`Normalized trip number for ${order.id}:`, {
    original: rawTripNumber,
    normalized: normalizedTripNumber
  });
  
  // Check if the trip number is valid
  const isTripNumberEmpty = isEmptyValue(rawTripNumber);
  const isTripNumberNoise = !isTripNumberEmpty && isNoiseOrTestTripNumber(normalizedTripNumber);
  
  // Store the normalized value if it was not null
  order.tripNumber = normalizedTripNumber;
  
  // Update missing fields based on validation
  if (isTripNumberEmpty || isTripNumberNoise) {
    // Trip number is empty or noise - add to missing fields if not already there
    if (!order.missingFields.includes('tripNumber')) {
      order.missingFields.push('tripNumber');
      logDebug(`Added missing field flag: Order ${order.id} has ${isTripNumberEmpty ? 'empty' : 'noise'} Trip Number "${normalizedTripNumber || ''}"`);
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
 * Now properly handles null values as missing and preserves explicit "Unassigned"
 */
function processDriver(order: DeliveryOrder): void {
  // Capture the raw driver for reference
  const rawDriver = order.driver;
  
  // Log raw driver for debugging
  logDebug(`Driver for ${order.id}:`, {
    rawValue: rawDriver,
    rawType: typeof rawDriver,
    isNull: rawDriver === null
  });
  
  // If driver is null, it's truly missing
  if (rawDriver === null) {
    // Leave it as null to indicate it's missing (not Unassigned)
    logDebug(`Order ${order.id} has null Driver (truly missing)`);
    
    // Add to missing fields if not already there
    if (!order.missingFields.includes('driver')) {
      order.missingFields.push('driver');
    }
    return;
  }
  
  // For non-null values, normalize them
  const normalizedDriver = normalizeFieldValue(rawDriver);
  
  // Log normalized driver
  logDebug(`Normalized driver for ${order.id}:`, {
    original: rawDriver,
    normalized: normalizedDriver
  });
  
  // Check if the driver is valid
  const isDriverEmpty = isEmptyValue(rawDriver);
  const isDriverExplicitlyUnassigned = !isDriverEmpty && normalizedDriver.toLowerCase() === 'unassigned';
  
  // Store the normalized value
  // Important: We preserve the original "Unassigned" if it was explicitly set
  if (isDriverExplicitlyUnassigned) {
    order.driver = 'Unassigned'; // Standardize capitalization
  } else if (isDriverEmpty) {
    // For empty values, we maintain them as empty strings, not "Unassigned"
    order.driver = '';
  } else {
    // For non-empty, non-unassigned values, use the normalized value
    order.driver = normalizedDriver;
  }
  
  // Update missing fields based on validation
  if (isDriverEmpty || isDriverExplicitlyUnassigned) {
    // Driver is empty or explicitly Unassigned - add to missing fields if not already there
    if (!order.missingFields.includes('driver')) {
      order.missingFields.push('driver');
      const reason = isDriverEmpty ? 'empty' : 'explicitly Unassigned';
      logDebug(`Added missing field flag: Order ${order.id} has ${reason} Driver "${order.driver || ''}"`);
    }
  } else {
    // Driver exists and is valid - remove from missing fields if present
    if (order.missingFields.includes('driver')) {
      order.missingFields = order.missingFields.filter(field => field !== 'driver');
      logDebug(`Removed driver from missing fields for ${order.id}`);
    }
  }
}
