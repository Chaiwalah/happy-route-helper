
import { DeliveryOrder } from '@/utils/csvParser';
import { 
  isEmptyValue, 
  isUnassignedDriver, 
  normalizeFieldValue, 
  isPlaceholderValue, 
  isDriverNeedsVerification 
} from './validationUtils';
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
      isNoise: order.isNoise,
      processingTime: {
        tripNumber: tripNumberEndTime - tripNumberStartTime,
        driver: driverEndTime - driverStartTime
      }
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
    .filter(value => {
      if (value === null || isEmptyValue(value)) return false;
      const normalizedValue = normalizeFieldValue(value);
      const [isNoise, needsVerification] = isNoiseOrTestTripNumber(normalizedValue);
      return !isNoise && !needsVerification;
    })
    .map(value => normalizeFieldValue(value));
  
  // Find all unique valid drivers for suggestions (excluding unassigned and nulls)
  const allDrivers = processedOrders
    .map(o => o.driver)
    .filter(value => 
      value !== null && 
      !isEmptyValue(value) && 
      !isUnassignedDriver(value) &&
      !isDriverNeedsVerification(value)
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
 * Process and normalize trip number for an order with enhanced verification status
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
      { decision: 'missing', reason: 'null value', status: 'MISSING' }
    );
    
    endPerformanceTracking(`processTripNumber.${order.id}`, { 
      result: 'missing-field', 
      reason: 'null value',
      status: 'MISSING'
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
  
  // Empty trip number after normalization
  if (normalizedTripNumber === '') {
    order.tripNumber = ''; // Store empty string for UI display
    
    // Add to missing fields if not already there
    if (!order.missingFields.includes('tripNumber')) {
      order.missingFields.push('tripNumber');
    }
    
    logTripNumberProcessing(
      order.id,
      'Process-TripNumber',
      rawTripNumber,
      '',
      { decision: 'missing-empty', reason: 'empty value', status: 'MISSING' }
    );
    
    endPerformanceTracking(`processTripNumber.${order.id}`, { 
      result: 'missing-field', 
      reason: 'empty value',
      status: 'MISSING'
    });
    
    return;
  }
  
  // Use the comprehensive checker for noise or verification
  const [isNoise, needsVerification] = isNoiseOrTestTripNumber(normalizedTripNumber, order);
  
  // Store the normalized value
  order.tripNumber = normalizedTripNumber;
  
  // Update missing fields based on validation
  if (isNoise) {
    // Trip number is noise
    if (!order.missingFields.includes('tripNumber')) {
      order.missingFields.push('tripNumber');
      logDebug(`Added missing field flag: Order ${order.id} has noise Trip Number "${normalizedTripNumber}"`);
    }
    
    // Mark the order as having a noise value
    order.isNoise = true;
    
    logTripNumberProcessing(
      order.id,
      'Process-TripNumber',
      rawTripNumber,
      normalizedTripNumber,
      { decision: 'missing-noise', reason: 'noise value', isNoise, needsVerification, status: 'NOISE' }
    );
    
    endPerformanceTracking(`processTripNumber.${order.id}`, { 
      result: 'missing-noise', 
      reason: 'noise value',
      status: 'NOISE'
    });
  } 
  else if (needsVerification) {
    // Trip number needs verification (placeholders like N/A)
    if (!order.missingFields.includes('tripNumber')) {
      order.missingFields.push('tripNumber');
      logDebug(`Added missing field flag: Order ${order.id} has Trip Number needing verification "${normalizedTripNumber}"`);
    }
    
    // Mark it as NOT noise
    order.isNoise = false;
    
    logTripNumberProcessing(
      order.id,
      'Process-TripNumber',
      rawTripNumber,
      normalizedTripNumber,
      { decision: 'needs-verification', reason: 'placeholder or unusual value', isNoise, needsVerification, status: 'NEEDS_VERIFICATION' }
    );
    
    endPerformanceTracking(`processTripNumber.${order.id}`, { 
      result: 'needs-verification', 
      reason: 'placeholder value',
      status: 'NEEDS_VERIFICATION'
    });
  }
  else {
    // Trip number exists and is valid - remove from missing fields if present
    if (order.missingFields.includes('tripNumber')) {
      order.missingFields = order.missingFields.filter(field => field !== 'tripNumber');
      logDebug(`Removed trip number from missing fields for ${order.id}`);
    }
    
    // Also ensure isNoise is set to false
    order.isNoise = false;
    
    logTripNumberProcessing(
      order.id,
      'Process-TripNumber',
      rawTripNumber,
      normalizedTripNumber,
      { decision: 'valid', reason: 'valid trip number', status: 'VALID' }
    );
    
    endPerformanceTracking(`processTripNumber.${order.id}`, { 
      result: 'valid', 
      reason: 'valid trip number',
      status: 'VALID'
    });
  }
}

/**
 * Process and normalize driver for an order with enhanced verification status
 * Now properly handles placeholder values that need verification
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
  
  // If driver is null, it's truly missing (not the same as "Unassigned")
  if (rawDriver === null) {
    // Leave it as null to indicate it's missing
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
      { decision: 'missing', reason: 'null value', status: 'MISSING' }
    );
    
    endPerformanceTracking(`processDriver.${order.id}`, { 
      result: 'missing-field', 
      reason: 'null value',
      status: 'MISSING'
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
  
  // Empty driver after normalization
  if (normalizedDriver === '') {
    order.driver = ''; // Store empty string for UI display
    
    // Add to missing fields if not already there
    if (!order.missingFields.includes('driver')) {
      order.missingFields.push('driver');
    }
    
    logDriverProcessing(
      order.id,
      'Process-Driver',
      rawDriver,
      '',
      { decision: 'missing-empty', reason: 'empty value', status: 'MISSING' }
    );
    
    endPerformanceTracking(`processDriver.${order.id}`, { 
      result: 'missing-field', 
      reason: 'empty value',
      status: 'MISSING'
    });
    
    return;
  }
  
  // Check for explicitly "Unassigned" driver
  if (isUnassignedDriver(rawDriver)) {
    order.driver = 'Unassigned'; // Standardize capitalization
    
    // Add to missing fields if not already there (needs to be assigned)
    if (!order.missingFields.includes('driver')) {
      order.missingFields.push('driver');
    }
    
    logDriverProcessing(
      order.id,
      'Process-Driver',
      rawDriver,
      'Unassigned',
      { decision: 'needs-assignment', reason: 'Explicitly Unassigned', status: 'NEEDS_ASSIGNMENT' }
    );
    
    endPerformanceTracking(`processDriver.${order.id}`, { 
      result: 'needs-assignment', 
      reason: 'explicitly unassigned',
      status: 'NEEDS_ASSIGNMENT'
    });
    
    return;
  }
  
  // Check for placeholder values like 'n/a', 'none', etc.
  if (isPlaceholderValue(rawDriver)) {
    // Store the normalized value but mark it for verification
    order.driver = normalizedDriver;
    
    // Add to missing fields if not already there (needs verification)
    if (!order.missingFields.includes('driver')) {
      order.missingFields.push('driver');
    }
    
    logDriverProcessing(
      order.id,
      'Process-Driver',
      rawDriver,
      normalizedDriver,
      { decision: 'needs-verification', reason: 'Placeholder value', status: 'NEEDS_VERIFICATION' }
    );
    
    endPerformanceTracking(`processDriver.${order.id}`, { 
      result: 'needs-verification', 
      reason: 'placeholder value',
      status: 'NEEDS_VERIFICATION'
    });
    
    return;
  }
  
  // For all other cases, use the normalized value as is (valid driver)
  order.driver = normalizedDriver;
  
  // Remove from missing fields if present (it's valid)
  if (order.missingFields.includes('driver')) {
    order.missingFields = order.missingFields.filter(field => field !== 'driver');
    logDebug(`Removed driver from missing fields for ${order.id}`);
  }
  
  logDriverProcessing(
    order.id,
    'Process-Driver',
    rawDriver,
    normalizedDriver,
    { decision: 'valid', reason: 'Valid driver name', status: 'VALID' }
  );
  
  endPerformanceTracking(`processDriver.${order.id}`, { 
    result: 'valid', 
    reason: 'valid driver',
    status: 'VALID'
  });
}
