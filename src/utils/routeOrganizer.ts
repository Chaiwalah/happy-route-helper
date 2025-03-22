
import { DeliveryOrder } from './csvParser';
import { OrderRoute } from './invoiceTypes';

// Organize orders into routes by driver, TripNumber, and date
export const organizeOrdersIntoRoutes = (orders: DeliveryOrder[]): OrderRoute[] => {
  const routeMap = new Map<string, DeliveryOrder[]>();
  
  // First, group orders by driver and TripNumber (if available)
  orders.forEach(order => {
    const driver = order.driver || 'Unassigned';
    
    // If TripNumber exists, use it for route grouping
    if (order.tripNumber) {
      const routeKey = `${driver}-trip-${order.tripNumber}`;
      
      if (!routeMap.has(routeKey)) {
        routeMap.set(routeKey, []);
      }
      
      routeMap.get(routeKey)!.push(order);
    } 
    // Fallback to time-based grouping if no TripNumber
    else if (order.exReadyTime) {
      // Extract date and hour from ready time for time window grouping
      const readyTime = new Date(order.exReadyTime);
      if (!isNaN(readyTime.getTime())) {
        const dateStr = readyTime.toISOString().split('T')[0];
        const hour = readyTime.getHours();
        
        // Group by driver, date, and hour window
        const routeKey = `${driver}-${dateStr}-hour-${hour}`;
        
        if (!routeMap.has(routeKey)) {
          routeMap.set(routeKey, []);
        }
        
        routeMap.get(routeKey)!.push(order);
      } else {
        // If date parsing fails, treat as individual route
        const routeKey = `${driver}-order-${order.id}`;
        routeMap.set(routeKey, [order]);
      }
    } 
    // If neither TripNumber nor valid time exists, treat as individual route
    else {
      const routeKey = `${driver}-order-${order.id}`;
      routeMap.set(routeKey, [order]);
    }
  });
  
  // Convert the map to array of routes
  const routes: OrderRoute[] = Array.from(routeMap.entries()).map(([routeKey, routeOrders]) => {
    return {
      routeKey,
      orders: routeOrders
    };
  });
  
  return routes;
};
