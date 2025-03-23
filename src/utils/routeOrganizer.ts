
import { DeliveryOrder } from './csvParser';
import { 
  startPerformanceTracking, 
  endPerformanceTracking, 
  logTripNumberProcessing,
  logDebug
} from './performanceLogger';

// Comprehensive check if a trip number is a test/noise value or missing
export const isNoiseOrTestTripNumber = (
  tripNumber: string | undefined | null, 
  order?: DeliveryOrder
): [boolean, boolean] => {
  const orderId = order?.id || 'unknown-order';
  startPerformanceTracking(`isNoiseOrTestTripNumber.${orderId}`, { 
    tripNumber,
    tripNumberType: typeof tripNumber 
  });
  
  // Case 1: Null or undefined trip number - it's missing but not noise
  if (tripNumber === null || tripNumber === undefined) {
    logTripNumberProcessing(
      orderId,
      'Noise-Check',
      tripNumber,
      null,
      { result: [false, true], reason: 'Null or undefined value', status: 'MISSING' }
    );
    endPerformanceTracking(`isNoiseOrTestTripNumber.${orderId}`, { 
      result: [false, true],
      reason: 'No trip number (null/undefined)',
      status: 'MISSING'
    });
    return [false, true]; // Not noise, but missing
  }
  
  const trimmedValue = String(tripNumber).trim().toLowerCase();
  
  // Case 2: Empty string - it's missing but not noise
  if (trimmedValue === '') {
    logTripNumberProcessing(
      orderId,
      'Noise-Check',
      tripNumber,
      trimmedValue,
      { result: [false, true], reason: 'Empty string', status: 'MISSING' }
    );
    
    // Update order if provided
    if (order) {
      order.isNoise = false;
      if (!order.missingFields) order.missingFields = [];
      if (!order.missingFields.includes('tripNumber')) {
        order.missingFields.push('tripNumber');
      }
    }
    
    endPerformanceTracking(`isNoiseOrTestTripNumber.${orderId}`, { 
      result: [false, true],
      reason: 'Empty string',
      status: 'MISSING'
    });
    
    return [false, true]; // Not noise, but missing
  }
  
  // Case 3: Known noise/test values - EXPANDED for comprehensive detection
  const noiseValues = [
    '24', '25', 'test', 'noise', 'demo', 'sample', 
    'example', 'testing', 'temp', 'temporary', 
    't1', 't2', 't3', 'x1', 'x2', 'x3',
    'testtrip', 'testroute', 'testnumber',
    'test123', 'test456', 'test789',
    'test-trip', 'test-route', 'test-number',
    'trip-test', 'route-test', 'number-test',
    'dummy', 'dummy-trip', 'dummy-route',
    'not-used', 'not-real', 'fake',
    'debug', 'debugtrip', 'debug-trip'
  ];
  
  // Check if the trip number is a known noise value
  if (noiseValues.includes(trimmedValue) || 
      /^test[_\-]?\d+$/i.test(trimmedValue) || // test-123, test_456, etc.
      /^t[_\-]?\d+$/i.test(trimmedValue) ||    // t-123, t_456, etc.
      /^demo[_\-]?\d+$/i.test(trimmedValue) || // demo-123, demo_456, etc.
      /^x[_\-]?\d+$/i.test(trimmedValue) ||    // x-123, x_456, etc.
      /^fake[_\-]?\d+$/i.test(trimmedValue) || // fake-123, fake_456, etc.
      /^debug[_\-]?\d+$/i.test(trimmedValue)) {// debug-123, debug_456, etc.
    
    logDebug(`Trip number "${tripNumber}" identified as noise value`);
    
    // Update order if provided
    if (order) {
      order.isNoise = true;
      if (!order.missingFields) order.missingFields = [];
      if (!order.missingFields.includes('tripNumber')) {
        order.missingFields.push('tripNumber');
      }
    }
    
    logTripNumberProcessing(
      orderId,
      'Noise-Check',
      tripNumber,
      trimmedValue,
      { result: [true, false], reason: 'Matches known noise pattern', noiseValues, status: 'NOISE' }
    );
    
    endPerformanceTracking(`isNoiseOrTestTripNumber.${orderId}`, { 
      result: [true, false],
      reason: 'Matched noise value',
      matched: trimmedValue,
      status: 'NOISE'
    });
    
    return [true, false]; // It's noise, but not a missing value
  }
  
  // Case 4: Placeholder values (N/A, None, etc.) - they're missing but not noise
  const placeholderValues = [
    'n/a', 'na', 'none', 'null', 'undefined', '-',
    'placeholder', 'pending', 'tbd', 'to be determined',
    'not applicable', 'not assigned', 'not available'
  ];
  
  if (placeholderValues.includes(trimmedValue)) {
    logDebug(`Trip number "${tripNumber}" identified as placeholder (N/A)`);
    
    // Update order if provided
    if (order) {
      order.isNoise = false;
      if (!order.missingFields) order.missingFields = [];
      if (!order.missingFields.includes('tripNumber')) {
        order.missingFields.push('tripNumber');
      }
    }
    
    logTripNumberProcessing(
      orderId,
      'Noise-Check',
      tripNumber,
      trimmedValue,
      { result: [false, true], reason: 'Placeholder value', status: 'NEEDS_VERIFICATION' }
    );
    
    endPerformanceTracking(`isNoiseOrTestTripNumber.${orderId}`, { 
      result: [false, true],
      reason: 'Placeholder value',
      value: trimmedValue,
      status: 'NEEDS_VERIFICATION'
    });
    
    return [false, true]; // Not noise, but needs verification
  }
  
  // Case 5: Valid trip number format check - EXPANDED formats
  const validFormat = (
    // Standard formats with letters followed by numbers (with optional separators)
    /^([A-Za-z]{1,3}[\-\s]?\d{3,8}|\d{3,8})$/.test(trimmedValue) ||
    // Format like "Trip #12345" or "Route #12345"
    /^(trip|route|tr)[\s#]+\d{3,8}$/i.test(trimmedValue) ||
    // Format with slashes like TR/12345
    /^[A-Za-z]{1,3}\/\d{3,8}$/.test(trimmedValue) ||
    // Format with underscores like TR_12345
    /^[A-Za-z]{1,3}_\d{3,8}$/.test(trimmedValue)
  );
  
  if (!validFormat) {
    logDebug(`Trip number "${tripNumber}" has unusual format, flagging for verification`);
    
    // Update order if provided
    if (order) {
      // Not noise, but needs verification
      order.isNoise = false;
      if (!order.missingFields) order.missingFields = [];
      if (!order.missingFields.includes('tripNumber')) {
        order.missingFields.push('tripNumber');
      }
    }
    
    logTripNumberProcessing(
      orderId,
      'Noise-Check',
      tripNumber,
      trimmedValue,
      { result: [false, true], reason: 'Unusual format', status: 'NEEDS_VERIFICATION' }
    );
    
    endPerformanceTracking(`isNoiseOrTestTripNumber.${orderId}`, { 
      result: [false, true],
      reason: 'Unusual format',
      status: 'NEEDS_VERIFICATION'
    });
    
    return [false, true]; // Not noise, but needs verification due to unusual format
  }
  
  // Case 6: All checks passed - it's a valid trip number
  if (order) {
    order.isNoise = false;
    // Remove from missing fields if present
    if (order.missingFields && order.missingFields.includes('tripNumber')) {
      order.missingFields = order.missingFields.filter(f => f !== 'tripNumber');
    }
  }
  
  logTripNumberProcessing(
    orderId,
    'Noise-Check',
    tripNumber,
    trimmedValue,
    { result: [false, false], reason: 'Valid trip number', status: 'VALID' }
  );
  
  endPerformanceTracking(`isNoiseOrTestTripNumber.${orderId}`, { 
    result: [false, false],
    reason: 'Valid trip number',
    status: 'VALID'
  });
  
  return [false, false]; // Neither noise nor missing - it's valid
};

// New function that only marks noise trip numbers but doesn't filter them
export const markOrdersWithNoiseTrips = (orders: DeliveryOrder[]): DeliveryOrder[] => {
  startPerformanceTracking('markOrdersWithNoiseTrips', { orderCount: orders.length });
  
  // Deep clone to avoid mutating the original array
  const clonedOrders = JSON.parse(JSON.stringify(orders)) as DeliveryOrder[];
  
  // Mark all noise orders
  clonedOrders.forEach(order => {
    startPerformanceTracking(`markOrdersWithNoiseTrips.processOrder.${order.id}`);
    
    if (order.tripNumber) {
      const [isNoise, isMissing] = isNoiseOrTestTripNumber(order.tripNumber, order);
      
      logTripNumberProcessing(
        order.id,
        'Mark-Noise',
        order.tripNumber,
        order.tripNumber,
        { isNoise, isMissing, updated: order.isNoise }
      );
    }
    
    endPerformanceTracking(`markOrdersWithNoiseTrips.processOrder.${order.id}`, {
      isNoise: order.isNoise,
      hasTripNumber: !!order.tripNumber,
      missingFields: order.missingFields
    });
  });
  
  // Count how many noise orders we have for reporting
  const noiseOrderCount = clonedOrders.filter(order => order.isNoise === true).length;
  if (noiseOrderCount > 0) {
    logDebug(`Found ${noiseOrderCount} orders with noise/test trip numbers that need verification`);
  }
  
  endPerformanceTracking('markOrdersWithNoiseTrips', { 
    totalOrders: clonedOrders.length,
    noiseOrders: noiseOrderCount
  });
  
  return clonedOrders;
};

// Function that filters out orders with noise trip numbers
export const removeOrdersWithNoiseTrips = (orders: DeliveryOrder[]): DeliveryOrder[] => {
  startPerformanceTracking('removeOrdersWithNoiseTrips', { orderCount: orders.length });
  
  // First mark all orders
  const markedOrders = markOrdersWithNoiseTrips(orders);
  
  // Then filter out the noise ones
  const filteredOrders = markedOrders.filter(order => order.isNoise !== true);
  
  const removedCount = orders.length - filteredOrders.length;
  if (removedCount > 0) {
    logDebug(`Removed ${removedCount} orders with noise/test trip numbers`);
  }
  
  endPerformanceTracking('removeOrdersWithNoiseTrips', { 
    initialCount: orders.length,
    finalCount: filteredOrders.length,
    removed: removedCount
  });
  
  return filteredOrders;
};

// Function to remove orders with missing trip numbers
export const removeOrdersWithMissingTripNumbers = (orders: DeliveryOrder[]): DeliveryOrder[] => {
  startPerformanceTracking('removeOrdersWithMissingTripNumbers', { orderCount: orders.length });
  
  const filteredOrders = orders.filter(order => 
    order.tripNumber && order.tripNumber.trim() !== ''
  );
  
  const removedCount = orders.length - filteredOrders.length;
  if (removedCount > 0) {
    logDebug(`Removed ${removedCount} orders with missing trip numbers`);
  }
  
  endPerformanceTracking('removeOrdersWithMissingTripNumbers', { 
    initialCount: orders.length,
    finalCount: filteredOrders.length,
    removed: removedCount
  });
  
  return filteredOrders;
};

// Function to organize orders into routes
export const organizeOrdersIntoRoutes = (orders: DeliveryOrder[]): any[] => {
  startPerformanceTracking('organizeOrdersIntoRoutes', { orderCount: orders.length });
  
  // First, filter out orders with noise/test trip numbers
  const filteredOrders = removeOrdersWithNoiseTrips(orders);
  
  if (orders.length > filteredOrders.length) {
    logDebug(`Filtered out ${orders.length - filteredOrders.length} orders with test/noise trip numbers`);
  }
  
  // Organize by trip number - just a placeholder implementation for now
  const routes: any[] = [];
  
  // Group orders by trip number
  startPerformanceTracking('organizeOrdersIntoRoutes.groupByTripNumber');
  const ordersByTripNumber: Record<string, DeliveryOrder[]> = {};
  
  filteredOrders.forEach(order => {
    if (order.tripNumber && order.tripNumber.trim() !== '') {
      const tripNumber = order.tripNumber.trim();
      if (!ordersByTripNumber[tripNumber]) {
        ordersByTripNumber[tripNumber] = [];
      }
      ordersByTripNumber[tripNumber].push(order);
    }
  });
  endPerformanceTracking('organizeOrdersIntoRoutes.groupByTripNumber', { 
    uniqueTripNumbers: Object.keys(ordersByTripNumber).length 
  });
  
  // Convert groups to routes
  startPerformanceTracking('organizeOrdersIntoRoutes.createRoutes');
  Object.entries(ordersByTripNumber).forEach(([tripNumber, tripOrders]) => {
    routes.push({
      tripNumber,
      orders: tripOrders,
      driver: tripOrders[0].driver || 'Unassigned'
    });
  });
  endPerformanceTracking('organizeOrdersIntoRoutes.createRoutes', { 
    routesCreated: routes.length 
  });
  
  endPerformanceTracking('organizeOrdersIntoRoutes', { 
    initialCount: orders.length,
    finalCount: filteredOrders.length,
    routesCreated: routes.length
  });
  
  return routes;
};
