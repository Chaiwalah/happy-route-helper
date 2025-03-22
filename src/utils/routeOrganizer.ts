
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

// Organize orders into routes by TripNumber, driver, and date
export const organizeOrdersIntoRoutes = (orders: DeliveryOrder[]): OrderRoute[] => {
  const routeMap = new Map<string, DeliveryOrder[]>();
  
  // Track any trip number issues for logging
  const tripNumberIssues: string[] = [];
  const dateIssues: string[] = [];
  
  // First, group orders by TripNumber, driver, and date
  orders.forEach(order => {
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
    
    return {
      routeKey,
      orders: routeOrders,
      // Include the trip number in the route object
      tripNumber: tripNumber,
      // Explicitly identify whether this is a multi-stop route based on order count
      isMultiStop: routeOrders.length > 1
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
