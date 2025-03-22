
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

// Check if a trip number is a test/noise value that should be ignored
// Make this function exportable by adding 'export'
export const isNoiseOrTestTripNumber = (tripNumber: string | undefined): boolean => {
  if (!tripNumber) return false;
  
  const trimmedValue = tripNumber.trim();
  
  // List of known test/noise trip number values to ignore
  const noiseValues = ['24', '25', 'TEST', 'NOISE', 'test', 'noise'];
  
  // Check if the trip number is in our noise list
  if (noiseValues.includes(trimmedValue)) {
    return true;
  }
  
  // Additional checks could be added here for other patterns
  
  return false;
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
  // First, filter out orders with noise/test trip numbers
  const filteredOrders = orders.filter(order => 
    !(order.tripNumber && isNoiseOrTestTripNumber(order.tripNumber))
  );
  
  if (orders.length > filteredOrders.length) {
    console.log(`Filtered out ${orders.length - filteredOrders.length} orders with test/noise trip numbers`);
  }
  
  const routeMap = new Map<string, DeliveryOrder[]>();
  
  // Track any trip number issues for logging
  const tripNumberIssues: string[] = [];
  const dateIssues: string[] = [];
  const pumpPickupOrders: DeliveryOrder[] = [];
  
  // Identify pump pickup only orders for special handling
  const regularOrders: DeliveryOrder[] = [];
  filteredOrders.forEach(order => {
    if (isPumpPickupOnly(order)) {
      pumpPickupOrders.push(order);
    } else {
      regularOrders.push(order);
    }
  });
  
  // First, group regular orders by TripNumber, driver, and date
  regularOrders.forEach(order => {
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
      
      // Check if we have a valid timestamp to potentially group by time window
      if (order.exReadyTime) {
        try {
          const readyTime = new Date(order.exReadyTime);
          if (!isNaN(readyTime.getTime())) {
            // Since there's no valid Trip Number, treat as an individual order
            const routeKey = `${driver}-${dateStr}-order-${order.id}`;
            routeMap.set(routeKey, [order]);
          } else {
            // Log date parsing issues
            dateIssues.push(`Order ${order.id} has invalid date: "${order.exReadyTime}"`);
            // If date parsing fails, treat as individual route
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
      // If neither TripNumber nor valid time exists, treat as individual route
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
      hasPumpPickups: routeOrders.some(order => order.isPumpPickup)
    };
  });
  
  return routes;
};

// New function to filter out orders with missing trip numbers
export const removeOrdersWithMissingTripNumbers = (orders: DeliveryOrder[]): DeliveryOrder[] => {
  const filteredOrders = orders.filter(order => order.tripNumber && order.tripNumber.trim() !== '');
  
  const removedCount = orders.length - filteredOrders.length;
  if (removedCount > 0) {
    console.log(`Removed ${removedCount} orders with missing trip numbers`);
  }
  
  return filteredOrders;
};

// New function to filter out noise/test trip numbers
export const removeOrdersWithNoiseTrips = (orders: DeliveryOrder[]): DeliveryOrder[] => {
  const filteredOrders = orders.filter(order => 
    !(order.tripNumber && isNoiseOrTestTripNumber(order.tripNumber))
  );
  
  const removedCount = orders.length - filteredOrders.length;
  if (removedCount > 0) {
    console.log(`Removed ${removedCount} orders with noise/test trip numbers`);
  }
  
  return filteredOrders;
};
