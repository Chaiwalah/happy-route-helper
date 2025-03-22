
import { DeliveryOrder } from './csvParser';
import { OrderRoute } from './invoiceTypes';

// Organize orders into routes by TripNumber, driver, and date
export const organizeOrdersIntoRoutes = (orders: DeliveryOrder[]): OrderRoute[] => {
  const routeMap = new Map<string, DeliveryOrder[]>();
  
  // First, group orders by TripNumber, driver, and date
  orders.forEach(order => {
    const driver = order.driver || 'Unassigned';
    const dateStr = order.exReadyTime 
      ? new Date(order.exReadyTime).toISOString().split('T')[0] 
      : 'unknown-date';
    
    // If TripNumber exists, use it for route grouping - this is the primary grouping method
    if (order.tripNumber) {
      const routeKey = `${driver}-${dateStr}-trip-${order.tripNumber}`;
      
      if (!routeMap.has(routeKey)) {
        routeMap.set(routeKey, []);
      }
      
      routeMap.get(routeKey)!.push(order);
    } 
    // Fallback to treating as individual route if no TripNumber
    else {
      // Check if we have a valid timestamp to potentially group by time window
      if (order.exReadyTime) {
        const readyTime = new Date(order.exReadyTime);
        if (!isNaN(readyTime.getTime())) {
          // Since there's no Trip Number, treat as an individual order
          const routeKey = `${driver}-${dateStr}-order-${order.id}`;
          routeMap.set(routeKey, [order]);
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
    }
  });
  
  // Convert the map to array of routes
  const routes: OrderRoute[] = Array.from(routeMap.entries()).map(([routeKey, routeOrders]) => {
    return {
      routeKey,
      orders: routeOrders,
      // Explicitly identify whether this is a multi-stop route based on order count
      isMultiStop: routeOrders.length > 1
    };
  });
  
  return routes;
};
