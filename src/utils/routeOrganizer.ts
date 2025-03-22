
import { DeliveryOrder } from './csvParser';
import { OrderRoute } from './invoiceTypes';

// Organize orders into routes by driver and date
export const organizeOrdersIntoRoutes = (orders: DeliveryOrder[]): OrderRoute[] => {
  // Group orders by driver and day
  const routesMap = new Map<string, DeliveryOrder[]>();
  
  orders.forEach(order => {
    const driver = order.driver || 'Unassigned';
    
    // Extract delivery date (or use current date if missing)
    let deliveryDate = 'unknown-date';
    
    if (order.exDeliveryTime) {
      // Try to extract date from expected delivery time
      try {
        const dateObj = new Date(order.exDeliveryTime);
        deliveryDate = dateObj.toISOString().split('T')[0]; // YYYY-MM-DD format
      } catch (e) {
        // If parsing fails, use the string directly
        deliveryDate = order.exDeliveryTime.split(' ')[0]; // Take first part as date
      }
    }
    
    // Create a route key combining driver and date
    let routeKey;
    
    // For unassigned orders, create a unique route key using the order ID
    if (driver === 'Unassigned') {
      routeKey = `${order.id}-unassigned`;
    } else {
      // For assigned orders, group by driver and date
      routeKey = `${driver}-${deliveryDate}`;
    }
    
    // Add order to the appropriate route
    if (!routesMap.has(routeKey)) {
      routesMap.set(routeKey, []);
    }
    
    routesMap.get(routeKey)!.push(order);
  });
  
  // Convert map to array of OrderRoute objects
  const routes: OrderRoute[] = [];
  for (const [routeKey, routeOrders] of routesMap.entries()) {
    routes.push({
      routeKey,
      orders: routeOrders
    });
  }
  
  return routes;
};
