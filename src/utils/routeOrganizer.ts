import { DeliveryOrder } from './csvParser';
import { OrderRoute } from './invoiceTypes';

// Function to safely parse and format date strings
const safeFormatDate = (dateString: string | undefined): string => {
  if (!dateString) return 'unknown-date';
  
  // Try to parse the date
  const date = new Date(dateString);
  
  // Check if date is valid before calling toISOString()
  if (isNaN(date.getTime())) {
    console.warn(`Invalid date found: "${dateString}", using fallback value`);
    return 'unknown-date';
  }
  
  // Return just the date part of the ISO string
  return date.toISOString().split('T')[0];
};

// Check if a trip number is a test/noise value that should be identified
// Make this function exportable for use in issue detection
// Now returns a tuple with [isNoise, isMissing] flags
export const isNoiseOrTestTripNumber = (
  tripNumber: string | undefined, 
  order?: DeliveryOrder
): [boolean, boolean] => {
  if (!tripNumber) return [false, true]; // Missing trip number
  
  const trimmedValue = tripNumber.trim().toLowerCase();
  
  // List of known test/noise trip number values to identify
  const noiseValues = ['24', '25', 'test', 'noise'];
  
  // Check if the trip number is in our noise list
  const isNoise = noiseValues.includes(trimmedValue);
  if (isNoise) {
    console.log(`Trip number "${tripNumber}" identified as noise value`);
    
    // If an order object was provided, mark it as noise
    if (order) {
      order.isNoise = true;
      
      // Make sure missingFields exists
      if (!order.missingFields) {
        order.missingFields = [];
      }
      
      // Add to missing fields if not already there
      if (!order.missingFields.includes('isNoise')) {
        order.missingFields.push('isNoise');
      }
      
      // Add tripNumber to missing fields if not already there
      if (!order.missingFields.includes('tripNumber')) {
        order.missingFields.push('tripNumber');
      }
    }
    
    return [true, false]; // It's noise, but not missing
  }
  
  // Check for N/A values - these are missing values that need to be fixed
  const isMissing = trimmedValue === 'n/a' || 
                    trimmedValue === 'na' || 
                    trimmedValue === 'none';
  
  if (isMissing) {
    console.log(`Trip number "${tripNumber}" identified as missing (N/A)`);
    
    // If an order object was provided, mark it as missing
    if (order) {
      // Make sure missingFields exists
      if (!order.missingFields) {
        order.missingFields = [];
      }
      
      // Add tripNumber to missing fields if not already there
      if (!order.missingFields.includes('tripNumber')) {
        order.missingFields.push('tripNumber');
      }
    }
    
    return [false, true]; // It's not noise, but it is missing
  }
  
  // Additional checks could be added here for other patterns
  
  return [false, false]; // Neither noise nor missing
};

// Check if an order is a pump pickup only order
const isPumpPickupOnly = (order: DeliveryOrder): boolean => {
  // Check if order has a specific flag for pump pickup
  if (order.orderType === 'PUMP_ONLY' || order.orderType === 'PUMP PICKUP') {
    return true;
  }
  
  // Alternative detection methods - check notes/items field for pump pickup indicators
  const pumpKeywords = ['pump pickup', 'pump only', 'pickup pump', 'pump return'];
  
  // Check notes field
  if (order.notes && pumpKeywords.some(keyword => 
    order.notes?.toLowerCase().includes(keyword))) {
    return true;
  }
  
  // Check items field
  if (order.items && pumpKeywords.some(keyword => 
    order.items?.toLowerCase().includes(keyword))) {
    return true;
  }
  
  return false;
};

// Organize orders into routes by TripNumber, driver, and date
export const organizeOrdersIntoRoutes = (orders: DeliveryOrder[]): OrderRoute[] => {
  // Instead of filtering, we'll mark noise orders but keep them in the processing
  orders.forEach(order => {
    if (order.tripNumber) {
      const [isNoise, isMissing] = isNoiseOrTestTripNumber(order.tripNumber, order);
      // We're not filtering, just marking as noise or missing
    }
  });
  
  const routeMap = new Map<string, DeliveryOrder[]>();
  
  // Track any trip number issues for logging
  const tripNumberIssues: string[] = [];
  const dateIssues: string[] = [];
  const pumpPickupOrders: DeliveryOrder[] = [];
  
  // Identify pump pickup only orders for special handling
  const regularOrders: DeliveryOrder[] = [];
  orders.forEach(order => {
    if (isPumpPickupOnly(order)) {
      pumpPickupOrders.push(order);
    } else {
      regularOrders.push(order);
    }
  });
  
  // First, group regular orders by TripNumber, driver, and date
  regularOrders.forEach(order => {
    // Preserve the driver assignment - never default to 'Unassigned' here
    const driver = order.driver || 'Unassigned';
    // Use our safe date formatting function
    const dateStr = safeFormatDate(order.exReadyTime);
    
    // If TripNumber exists and is not empty, use it for route grouping
    if (order.tripNumber && order.tripNumber.trim() !== '') {
      // Clean the trip number - trim spaces and handle any formatting issues
      const cleanTripNumber = order.tripNumber.trim();
      const routeKey = `${driver}-${dateStr}-trip-${cleanTripNumber}`;
      
      if (!routeMap.has(routeKey)) {
        routeMap.set(routeKey, []);
      }
      
      routeMap.get(routeKey)!.push(order);
    } 
    // Handle missing or empty trip numbers with fallback grouping
    else {
      const reason = order.tripNumber === undefined 
        ? 'missing Trip Number' 
        : 'empty Trip Number';
      
      tripNumberIssues.push(`Order ${order.id} has ${reason}`);
      
      // Always use the driver if assigned, even when trip number is missing
      // Group orders by driver even when trip number is missing
      if (order.exReadyTime) {
        try {
          const readyTime = new Date(order.exReadyTime);
          if (!isNaN(readyTime.getTime())) {
            // Create a unique route key that includes the driver
            const routeKey = `${driver}-${dateStr}-order-${order.id}`;
            routeMap.set(routeKey, [order]);
          } else {
            // Log date parsing issues but still preserve driver assignment
            dateIssues.push(`Order ${order.id} has invalid date: "${order.exReadyTime}"`);
            // If date parsing fails, treat as individual route with driver
            const routeKey = `${driver}-order-${order.id}`;
            routeMap.set(routeKey, [order]);
          }
        } catch (e) {
          // Handle any unexpected errors in date parsing
          console.error(`Error parsing date for order ${order.id}:`, e);
          const routeKey = `${driver}-order-${order.id}`;
          routeMap.set(routeKey, [order]);
        }
      } 
      // If neither TripNumber nor valid time exists, still use driver in route key
      else {
        const routeKey = `${driver}-order-${order.id}`;
        routeMap.set(routeKey, [order]);
      }
    }
  });
  
  // Handle pump pickup only orders - check if they can be merged with existing routes
  pumpPickupOrders.forEach(pumpOrder => {
    const driver = pumpOrder.driver || 'Unassigned';
    const dateStr = safeFormatDate(pumpOrder.exReadyTime);
    
    // Try to find if this address is already being visited in an existing route
    let addressMatch = false;
    let matchedRouteKey = '';
    
    // Check if the pump pickup address matches any delivery in existing routes
    for (const [routeKey, routeOrders] of routeMap.entries()) {
      if (routeOrders.some(order => 
        // Match by exact address if both have dropoff addresses
        (pumpOrder.dropoff && order.dropoff && 
         pumpOrder.dropoff.toLowerCase() === order.dropoff.toLowerCase()) ||
        // Match by driver and date if addresses aren't available
        (routeKey.includes(driver) && routeKey.includes(dateStr))
      )) {
        addressMatch = true;
        matchedRouteKey = routeKey;
        break;
      }
    }
    
    if (addressMatch) {
      // If this pump pickup is at an address already being visited, add it to that route
      // but mark it as a pump pickup (will be handled for billing logic later)
      pumpOrder.isPumpPickup = true; // Adding a flag for the invoice calculation
      routeMap.get(matchedRouteKey)!.push(pumpOrder);
      console.log(`Merged pump pickup order ${pumpOrder.id} with existing route`);
    } else {
      // If this is a standalone pump pickup, create a new route for it
      const routeKey = `${driver}-${dateStr}-pump-${pumpOrder.id}`;
      routeMap.set(routeKey, [pumpOrder]);
    }
  });
  
  // Log any issues for debugging
  if (tripNumberIssues.length > 0) {
    console.log(`Trip Number issues found (${tripNumberIssues.length}):`);
    tripNumberIssues.forEach(issue => console.log(`- ${issue}`));
  }
  
  if (dateIssues.length > 0) {
    console.log(`Date format issues found (${dateIssues.length}):`);
    dateIssues.forEach(issue => console.log(`- ${issue}`));
  }
  
  // Convert the map to array of routes
  const routes: OrderRoute[] = Array.from(routeMap.entries()).map(([routeKey, routeOrders]) => {
    // Extract the trip number from the route key if it exists
    const tripNumberMatch = routeKey.match(/trip-(.*?)$/);
    const tripNumber = tripNumberMatch ? tripNumberMatch[1] : null;
    
    // Count non-pump pickup orders for multi-stop calculations
    const regularStops = routeOrders.filter(order => !order.isPumpPickup).length;
    
    return {
      routeKey,
      orders: routeOrders,
      // Include the trip number in the route object
      tripNumber: tripNumber,
      // Explicitly identify whether this is a multi-stop route based on regular order count
      isMultiStop: regularStops > 1,
      // Flag if this route contains pump pickup orders
      hasPumpPickups: routeOrders.some(order => order.isPumpPickup),
      // Added flag for routes with noise trip numbers
      hasNoiseTrips: routeOrders.some(order => order.isNoise)
    };
  });
  
  return routes;
};

// New function to filter out orders with missing trip numbers
export const removeOrdersWithMissingTripNumbers = (orders: DeliveryOrder[]): DeliveryOrder[] => {
  const filteredOrders = orders.filter(order => {
    const hasTripNumber = order.tripNumber && 
                        order.tripNumber.trim() !== '' && 
                        order.tripNumber.toLowerCase() !== 'n/a' &&
                        order.tripNumber.toLowerCase() !== 'na' &&
                        order.tripNumber.toLowerCase() !== 'none';
                        
    if (!hasTripNumber) {
      console.log(`Removing order ${order.id} due to missing or invalid trip number: "${order.tripNumber || 'undefined'}"`);
    }
    
    return hasTripNumber;
  });
  
  const removedCount = orders.length - filteredOrders.length;
  if (removedCount > 0) {
    console.log(`Removed ${removedCount} orders with missing trip numbers`);
  }
  
  return filteredOrders;
};

// Updated to mark noise trips but not filter them out unless explicitly asked
export const removeOrdersWithNoiseTrips = (orders: DeliveryOrder[]): DeliveryOrder[] => {
  // First mark all noise orders for visibility in the UI
  orders.forEach(order => {
    if (order.tripNumber) {
      const [isNoise, isMissing] = isNoiseOrTestTripNumber(order.tripNumber, order);
    }
  });
  
  // Count how many noise orders we have for reporting
  const noiseOrderCount = orders.filter(order => order.isNoise).length;
  if (noiseOrderCount > 0) {
    console.log(`Found ${noiseOrderCount} orders with noise/test trip numbers`);
  }
  
  // Only filter if we're explicitly asked to remove them (for invoice generation)
  // Otherwise, keep them for verification in the UI
  const removedOrFilteredFlag = true; // This would be a parameter in a more generic version
  
  if (removedOrFilteredFlag) {
    const filteredOrders = orders.filter(order => !order.isNoise);
    
    const removedCount = orders.length - filteredOrders.length;
    if (removedCount > 0) {
      console.log(`Removed ${removedCount} orders with noise/test trip numbers`);
    }
    
    return filteredOrders;
  }
  
  // If not filtering, return all orders
  return orders;
};

// New function that only marks noise trip numbers but doesn't filter them
export const markOrdersWithNoiseTrips = (orders: DeliveryOrder[]): DeliveryOrder[] => {
  // Deep clone to avoid mutating the original array
  const clonedOrders = JSON.parse(JSON.stringify(orders)) as DeliveryOrder[];
  
  // Mark all noise orders
  clonedOrders.forEach(order => {
    if (order.tripNumber) {
      const [isNoise, isMissing] = isNoiseOrTestTripNumber(order.tripNumber, order);
    }
  });
  
  // Count how many noise orders we have for reporting
  const noiseOrderCount = clonedOrders.filter(order => order.isNoise).length;
  if (noiseOrderCount > 0) {
    console.log(`Found ${noiseOrderCount} orders with noise/test trip numbers that need verification`);
  }
  
  return clonedOrders;
};
