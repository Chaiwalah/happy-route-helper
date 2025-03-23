
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
  ordersWithIssues: string[];
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
  
  const ordersWithIssuesIds: string[] = [];
  const allTripNumbers: string[] = [];
  const allDrivers: string[] = [];
  
  // Process each order to identify issues
  processedOrders.forEach(order => {
    startPerformanceTracking(`processOrdersForVerification.processOrder.${order.id}`);
    
    // Ensure missingFields exists and is an array
    if (!order.missingFields) {
      order.missingFields = [];
    }
    
    // Clear existing missing fields for tripNumber and driver
    order.missingFields = order.missingFields.filter(
      field => field !== 'tripNumber' && field !== 'driver'
    );
    
    // Process trip number
    const hasTripNumberIssue = processTripNumber(order);
    
    // Process driver
    const hasDriverIssue = processDriver(order);
    
    // Collect valid trip numbers and drivers for suggestions
    if (order.tripNumber && !isEmptyValue(order.tripNumber)) {
      const normalizedTripNumber = normalizeFieldValue(order.tripNumber);
      const [isNoise, needsVerification] = isNoiseOrTestTripNumber(normalizedTripNumber);
      
      if (!isNoise && !needsVerification) {
        allTripNumbers.push(normalizedTripNumber);
      }
    }
    
    if (order.driver && !isEmptyValue(order.driver) && 
        !isUnassignedDriver(order.driver) && !isDriverNeedsVerification(order.driver)) {
      allDrivers.push(normalizeFieldValue(order.driver));
    }
    
    // Check if order has issues with trip number or driver
    if (hasTripNumberIssue || hasDriverIssue) {
      ordersWithIssuesIds.push(order.id);
      logDebug(`Order ${order.id} has validation issues: ${order.missingFields.join(', ')}`);
    }
    
    endPerformanceTracking(`processOrdersForVerification.processOrder.${order.id}`, {
      tripNumberIssue: hasTripNumberIssue,
      driverIssue: hasDriverIssue,
      isNoise: order.isNoise
    });
  });
  
  // Set unique suggested values for autocomplete
  const suggestedTripNumbers = [...new Set(allTripNumbers)].sort();
  const suggestedDrivers = [...new Set(allDrivers)].sort();
  
  logPerformance(`Order verification processing complete`, {
    totalOrders: processedOrders.length,
    ordersWithIssues: ordersWithIssuesIds.length,
    tripNumberIssues: processedOrders.filter(o => o.missingFields.includes('tripNumber')).length,
    driverIssues: processedOrders.filter(o => o.missingFields.includes('driver')).length
  });
  
  endPerformanceTracking('processOrdersForVerification', {
    totalOrders: processedOrders.length,
    ordersWithIssues: ordersWithIssuesIds.length
  });
  
  console.log("Final orders with issues:", ordersWithIssuesIds);
  
  return {
    ordersWithIssues: ordersWithIssuesIds,
    suggestedTripNumbers,
    suggestedDrivers
  };
};

/**
 * Process and normalize trip number for an order
 * @returns boolean indicating if there's an issue with the trip number
 */
function processTripNumber(order: DeliveryOrder): boolean {
  startPerformanceTracking(`processTripNumber.${order.id}`);
  
  // Handle null, undefined, or empty trip numbers
  if (!order.tripNumber || order.tripNumber.trim() === '') {
    order.missingFields.push('tripNumber');
    if (order.tripNumber === null || order.tripNumber === undefined) {
      order.tripNumber = '';
    }
    
    endPerformanceTracking(`processTripNumber.${order.id}`, { 
      result: 'missing-field', 
      reason: 'null/empty value'
    });
    
    return true;
  }
  
  // For non-empty values, normalize them
  const normalizedTripNumber = normalizeFieldValue(order.tripNumber);
  
  // Check if it's a test/noise value or needs verification
  const [isNoise, needsVerification] = isNoiseOrTestTripNumber(normalizedTripNumber);
  
  // Store the normalized value
  order.tripNumber = normalizedTripNumber;
  
  // Update missing fields and isNoise flag
  if (isNoise || needsVerification) {
    order.missingFields.push('tripNumber');
    order.isNoise = isNoise;
    
    endPerformanceTracking(`processTripNumber.${order.id}`, { 
      result: isNoise ? 'noise' : 'needs-verification', 
      reason: isNoise ? 'noise value' : 'needs verification'
    });
    
    return true;
  }
  
  // Valid trip number
  order.isNoise = false;
  
  endPerformanceTracking(`processTripNumber.${order.id}`, { 
    result: 'valid', 
    reason: 'valid trip number'
  });
  
  return false;
}

/**
 * Process and normalize driver for an order
 * @returns boolean indicating if there's an issue with the driver
 */
function processDriver(order: DeliveryOrder): boolean {
  startPerformanceTracking(`processDriver.${order.id}`);
  
  // Handle null, undefined, or empty drivers
  if (!order.driver || order.driver.trim() === '') {
    order.missingFields.push('driver');
    if (order.driver === null || order.driver === undefined) {
      order.driver = '';
    }
    
    endPerformanceTracking(`processDriver.${order.id}`, { 
      result: 'missing-field', 
      reason: 'null/empty value'
    });
    
    return true;
  }
  
  // For non-empty values, normalize them
  const normalizedDriver = normalizeFieldValue(order.driver);
  
  // Handle "Unassigned" driver
  if (isUnassignedDriver(normalizedDriver)) {
    order.driver = 'Unassigned';
    
    // Note: "Unassigned" is now considered valid
    endPerformanceTracking(`processDriver.${order.id}`, { 
      result: 'valid', 
      reason: 'unassigned driver'
    });
    
    return false;
  }
  
  // Handle placeholder values
  if (isPlaceholderValue(normalizedDriver)) {
    order.driver = normalizedDriver;
    order.missingFields.push('driver');
    
    endPerformanceTracking(`processDriver.${order.id}`, { 
      result: 'needs-verification', 
      reason: 'placeholder value'
    });
    
    return true;
  }
  
  // Valid driver
  order.driver = normalizedDriver;
  
  endPerformanceTracking(`processDriver.${order.id}`, { 
    result: 'valid', 
    reason: 'valid driver'
  });
  
  return false;
}
