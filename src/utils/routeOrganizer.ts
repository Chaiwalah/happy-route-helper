
import { DeliveryOrder } from './csvParser';

// Check if a trip number is a test/noise value that should be ignored or missing
export const isNoiseOrTestTripNumber = (
  tripNumber: string | undefined | null, 
  order?: DeliveryOrder
): [boolean, boolean] => {
  if (!tripNumber) return [false, true]; // No trip number means it's missing, not noise
  
  const trimmedValue = String(tripNumber).trim().toLowerCase();
  
  // List of known test/noise trip number values to ignore
  const noiseValues = ['24', '25', 'test', 'noise'];
  
  // Check if the trip number is in our noise list
  if (noiseValues.includes(trimmedValue)) {
    console.log(`Trip number "${tripNumber}" identified as noise value`);
    
    // Mark the order as having a noise value if provided
    if (order) {
      order.isNoise = true;
      
      // Add to missing fields if not already there
      if (!order.missingFields) {
        order.missingFields = [];
      }
      if (!order.missingFields.includes('tripNumber')) {
        order.missingFields.push('tripNumber');
      }
    }
    
    return [true, false]; // It's noise, but not a missing value
  }
  
  // N/A values are not noise, they're missing values that need to be fixed in verification
  if (trimmedValue === 'n/a' || trimmedValue === 'na' || trimmedValue === 'none') {
    console.log(`Trip number "${tripNumber}" identified as missing (N/A)`);
    
    // Mark as not noise, but update missingFields if order provided
    if (order) {
      order.isNoise = false;
      
      // Add to missing fields if not already there
      if (!order.missingFields) {
        order.missingFields = [];
      }
      if (!order.missingFields.includes('tripNumber')) {
        order.missingFields.push('tripNumber');
      }
    }
    
    return [false, true]; // Not noise, but it is missing
  }
  
  // Neither noise nor missing - it's a valid trip number
  if (order) {
    order.isNoise = false;
  }
  
  return [false, false];
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
  const noiseOrderCount = clonedOrders.filter(order => order.isNoise === true).length;
  if (noiseOrderCount > 0) {
    console.log(`Found ${noiseOrderCount} orders with noise/test trip numbers that need verification`);
  }
  
  return clonedOrders;
};

// Function that filters out orders with noise trip numbers
export const removeOrdersWithNoiseTrips = (orders: DeliveryOrder[]): DeliveryOrder[] => {
  // First mark all orders
  const markedOrders = markOrdersWithNoiseTrips(orders);
  
  // Then filter out the noise ones
  const filteredOrders = markedOrders.filter(order => order.isNoise !== true);
  
  const removedCount = orders.length - filteredOrders.length;
  if (removedCount > 0) {
    console.log(`Removed ${removedCount} orders with noise/test trip numbers`);
  }
  
  return filteredOrders;
};

// Function to remove orders with missing trip numbers
export const removeOrdersWithMissingTripNumbers = (orders: DeliveryOrder[]): DeliveryOrder[] => {
  const filteredOrders = orders.filter(order => 
    order.tripNumber && order.tripNumber.trim() !== ''
  );
  
  const removedCount = orders.length - filteredOrders.length;
  if (removedCount > 0) {
    console.log(`Removed ${removedCount} orders with missing trip numbers`);
  }
  
  return filteredOrders;
};

// Function to organize orders into routes
export const organizeOrdersIntoRoutes = (orders: DeliveryOrder[]): any[] => {
  // First, filter out orders with noise/test trip numbers
  const filteredOrders = removeOrdersWithNoiseTrips(orders);
  
  if (orders.length > filteredOrders.length) {
    console.log(`Filtered out ${orders.length - filteredOrders.length} orders with test/noise trip numbers`);
  }
  
  // Organize by trip number - just a placeholder implementation for now
  const routes: any[] = [];
  
  // Group orders by trip number
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
  
  // Convert groups to routes
  Object.entries(ordersByTripNumber).forEach(([tripNumber, tripOrders]) => {
    routes.push({
      tripNumber,
      orders: tripOrders,
      driver: tripOrders[0].driver || 'Unassigned'
    });
  });
  
  return routes;
};
