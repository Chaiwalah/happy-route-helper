
import { DeliveryOrder } from '@/utils/csvParser';
import { isEmptyValue, isUnassignedDriver, normalizeFieldValue } from './validationUtils';
import { isNoiseOrTestTripNumber } from '@/utils/routeOrganizer';
import { logDebug } from './logUtils';
import {
  startPerformanceTracking,
  endPerformanceTracking,
  logTripNumberProcessing,
  logDriverProcessing,
  logPerformance
} from '@/utils/performanceLogger';

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
  startPerformanceTracking('processOrdersForVerification', { orderCount: orders?.length || 0 });
  
  if (!orders || orders.length === 0) {
    logDebug("No orders to process for verification");
    endPerformanceTracking('processOrdersForVerification', { status: 'no-orders' });
    return { 
      ordersWithIssues: [], 
      suggestedTripNumbers: [], 
      suggestedDrivers: [] 
    };
  }
  
  // Deep clone orders to avoid mutating original array
  startPerformanceTracking('processOrdersForVerification.cloneOrders');
  const processedOrders = JSON.parse(JSON.stringify(orders)) as DeliveryOrder[];
  endPerformanceTracking('processOrdersForVerification.cloneOrders');
  
  // Enhanced processing to identify orders with issues
  startPerformanceTracking('processOrdersForVerification.processAllOrders');
  const processStartTime = performance.now();
  
  let tripNumberProcessingTime = 0;
  let driverProcessingTime = 0;
  
  const ordersWithIssues = processedOrders.map(order => {
    startPerformanceTracking(`processOrdersForVerification.processOrder.${order.id}`);
    
    // Ensure missingFields exists and is an array
    if (!order.missingFields) {
      order.missingFields = [];
    }
    
    // Process and validate trip number
    const tripNumberStartTime = performance.now();
    processTripNumber(order);
    const tripNumberEndTime = performance.now();
    tripNumberProcessingTime += (tripNumberEndTime - tripNumberStartTime);
    
    // Process and validate driver
    const driverStartTime = performance.now();
    processDriver(order);
    const driverEndTime = performance.now();
    driverProcessingTime += (driverEndTime - driverStartTime);
    
    endPerformanceTracking(`processOrdersForVerification.processOrder.${order.id}`, {
      tripNumberIssue: order.missingFields.includes('tripNumber'),
      driverIssue: order.missingFields.includes('driver'),
      isNoise: order.isNoise
    });
    
    return order;
  }).filter(order => {
    // Return true if order has issues with trip number or driver
    const hasIssues = order.missingFields.includes('tripNumber') || order.missingFields.includes('driver');
    
    if (hasIssues) {
      logDebug(`Order ${order.id} has validation issues: ${order.missingFields.join(', ')}`);
    }
    
    return hasIssues;
  });
  
  const processEndTime = performance.now();
  endPerformanceTracking('processOrdersForVerification.processAllOrders', {
    totalOrdersProcessed: processedOrders.length,
    ordersWithIssues: ordersWithIssues.length,
    tripNumberProcessingTimeMs: tripNumberProcessingTime.toFixed(2),
    driverProcessingTimeMs: driverProcessingTime.toFixed(2)
  });
  
  // Find all unique valid trip numbers for suggestions (excluding noise values and nulls)
  startPerformanceTracking('processOrdersForVerification.buildSuggestions');
  
  const allTripNumbers = processedOrders
    .map(o => o.tripNumber)
    .filter(value => 
      value !== null && 
      !isEmptyValue(value) && 
      !isNoiseOrTestTripNumber(normalizeFieldValue(value))[0]
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
  
  endPerformanceTracking('processOrdersForVerification.buildSuggestions', {
    uniqueTripNumbers: suggestedTripNumbers.length,
    uniqueDrivers: suggestedDrivers.length
  });
  
  logPerformance(`Order verification processing complete`, {
    totalOrders: processedOrders.length,
    ordersWithIssues: ordersWithIssues.length,
    tripNumberIssues: ordersWithIssues.filter(o => o.missingFields.includes('tripNumber')).length,
    driverIssues: ordersWithIssues.filter(o => o.missingFields.includes('driver')).length,
    processingTimeMs: (processEndTime - processStartTime).toFixed(2)
  });
  
  endPerformanceTracking('processOrdersForVerification', {
    totalOrders: processedOrders.length,
    ordersWithIssues: ordersWithIssues.length,
    suggestionCount: {
      tripNumbers: suggestedTripNumbers.length,
      drivers: suggestedDrivers.length
    }
  });
  
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
  startPerformanceTracking(`processTripNumber.${order.id}`);
  
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
    
    logTripNumberProcessing(
      order.id,
      'Process-TripNumber',
      null,
      null,
      { decision: 'missing', reason: 'null value' }
    );
    
    endPerformanceTracking(`processTripNumber.${order.id}`, { 
      result: 'missing-field', 
      reason: 'null value' 
    });
    
    return;
  }
  
  // For non-null values, normalize them
  const normalizedTripNumber = normalizeFieldValue(rawTripNumber);
  
  // Log normalized trip number
  logDebug(`Normalized trip number for ${order.id}:`, {
    original: rawTripNumber,
    normalized: normalizedTripNumber
  });
  
  // Use the updated isNoiseOrTestTripNumber function that returns a tuple
  const [isNoise, isMissing] = isNoiseOrTestTripNumber(normalizedTripNumber, order);
  
  // Check if the trip number is valid
  const isTripNumberEmpty = isEmptyValue(rawTripNumber);
  
  // Store the normalized value if it was not null
  order.tripNumber = normalizedTripNumber;
  
  // Update missing fields based on validation
  if (isTripNumberEmpty || isNoise || isMissing) {
    // Trip number is empty, noise, or missing - add to missing fields if not already there
    if (!order.missingFields.includes('tripNumber')) {
      order.missingFields.push('tripNumber');
      
      if (isNoise) {
        logDebug(`Added missing field flag: Order ${order.id} has noise Trip Number "${normalizedTripNumber || ''}"`);
        // Also mark the order as having a noise value
        order.isNoise = true;
        
        logTripNumberProcessing(
          order.id,
          'Process-TripNumber',
          rawTripNumber,
          normalizedTripNumber,
          { decision: 'missing-noise', reason: 'noise value', isNoise, isMissing }
        );
      } else if (isMissing) {
        logDebug(`Added missing field flag: Order ${order.id} has missing Trip Number "${normalizedTripNumber || ''}"`);
        
        logTripNumberProcessing(
          order.id,
          'Process-TripNumber',
          rawTripNumber,
          normalizedTripNumber,
          { decision: 'missing-na', reason: 'N/A value', isNoise, isMissing }
        );
      } else {
        logDebug(`Added missing field flag: Order ${order.id} has empty Trip Number "${normalizedTripNumber || ''}"`);
        
        logTripNumberProcessing(
          order.id,
          'Process-TripNumber',
          rawTripNumber,
          normalizedTripNumber,
          { decision: 'missing-empty', reason: 'empty value' }
        );
      }
    }
  } else {
    // Trip number exists and is valid - remove from missing fields if present
    if (order.missingFields.includes('tripNumber')) {
      order.missingFields = order.missingFields.filter(field => field !== 'tripNumber');
      logDebug(`Removed trip number from missing fields for ${order.id}`);
      
      logTripNumberProcessing(
        order.id,
        'Process-TripNumber',
        rawTripNumber,
        normalizedTripNumber,
        { decision: 'valid', reason: 'valid trip number', wasInMissingFields: true }
      );
    } else {
      logTripNumberProcessing(
        order.id,
        'Process-TripNumber',
        rawTripNumber,
        normalizedTripNumber,
        { decision: 'valid', reason: 'valid trip number' }
      );
    }
    
    // Also ensure isNoise is set to false
    order.isNoise = false;
  }
  
  endPerformanceTracking(`processTripNumber.${order.id}`, { 
    result: order.missingFields.includes('tripNumber') ? 'missing-field' : 'valid',
    isMissing: order.missingFields.includes('tripNumber'),
    isNoise: order.isNoise
  });
}

/**
 * Process and normalize driver for an order
 * Now properly handles null values as missing and preserves explicit "Unassigned"
 */
function processDriver(order: DeliveryOrder): void {
  startPerformanceTracking(`processDriver.${order.id}`);
  
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
    
    logDriverProcessing(
      order.id,
      'Process-Driver',
      null,
      null,
      { decision: 'missing', reason: 'null value' }
    );
    
    endPerformanceTracking(`processDriver.${order.id}`, { 
      result: 'missing-field', 
      reason: 'null value' 
    });
    
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
    
    logDriverProcessing(
      order.id,
      'Process-Driver',
      rawDriver,
      'Unassigned',
      { decision: 'unassigned', reason: 'Explicit Unassigned' }
    );
  } else if (isDriverEmpty) {
    // For empty values, we maintain them as empty strings, not "Unassigned"
    order.driver = '';
    
    logDriverProcessing(
      order.id,
      'Process-Driver',
      rawDriver,
      '',
      { decision: 'empty', reason: 'Empty value' }
    );
  } else {
    // For non-empty, non-unassigned values, use the normalized value
    order.driver = normalizedDriver;
    
    logDriverProcessing(
      order.id,
      'Process-Driver',
      rawDriver,
      normalizedDriver,
      { decision: 'valid', reason: 'Valid driver name' }
    );
  }
  
  // Update missing fields based on validation
  if (isDriverEmpty || isDriverExplicitlyUnassigned) {
    // Driver is empty or explicitly Unassigned - add to missing fields if not already there
    if (!order.missingFields.includes('driver')) {
      order.missingFields.push('driver');
      const reason = isDriverEmpty ? 'empty' : 'explicitly Unassigned';
      logDebug(`Added missing field flag: Order ${order.id} has ${reason} Driver "${order.driver || ''}"`);
      
      logDriverProcessing(
        order.id,
        'Process-Driver',
        rawDriver,
        order.driver,
        { decision: 'missing-field-added', reason }
      );
    }
  } else {
    // Driver exists and is valid - remove from missing fields if present
    if (order.missingFields.includes('driver')) {
      order.missingFields = order.missingFields.filter(field => field !== 'driver');
      logDebug(`Removed driver from missing fields for ${order.id}`);
      
      logDriverProcessing(
        order.id,
        'Process-Driver',
        rawDriver,
        order.driver,
        { decision: 'valid', reason: 'Valid driver', wasInMissingFields: true }
      );
    }
  }
  
  endPerformanceTracking(`processDriver.${order.id}`, { 
    result: order.missingFields.includes('driver') ? 'missing-field' : 'valid',
    isMissing: order.missingFields.includes('driver'),
    isExplicitlyUnassigned: isDriverExplicitlyUnassigned
  });
}
