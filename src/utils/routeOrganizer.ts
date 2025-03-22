
import { DeliveryOrder } from './csvParser';
import { OrderRoute } from './invoiceTypes';

// Organize orders into routes by driver and date
export const organizeOrdersIntoRoutes = (orders: DeliveryOrder[]): OrderRoute[] => {
  // Treat each order as its own route to avoid grouping separate physical deliveries
  const routes: OrderRoute[] = orders.map(order => {
    const driver = order.driver || 'Unassigned';
    // Create a unique route key using the order ID
    const routeKey = `${order.id}`;
    
    return {
      routeKey,
      orders: [order]
    };
  });
  
  return routes;
};
