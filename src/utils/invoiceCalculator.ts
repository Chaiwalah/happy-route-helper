
import { DeliveryOrder } from './csvParser';
import { Invoice, InvoiceItem, Issue } from './invoiceTypes';
import { organizeOrdersIntoRoutes } from './routeOrganizer';
import { calculateMultiStopRouteDistance } from './routeDistanceCalculator';
import { calculateInvoiceCosts } from './invoicePricing';
import { generateDriverSummaries } from './driverSummaryGenerator';
import { detectIssues } from './issueDetector';

// Re-export types and functions for backward compatibility
export type { Issue, InvoiceItem, DriverSummary, Invoice } from './invoiceTypes';
export { detectIssues } from './issueDetector';

export const generateInvoice = async (orders: DeliveryOrder[]): Promise<Invoice> => {
  // Format date for invoice 
  const today = new Date();
  const formattedDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  
  // Organize orders into routes by driver and date
  const routes = organizeOrdersIntoRoutes(orders);
  
  // Create invoice items based on routes
  const items: InvoiceItem[] = [];
  
  // Process each route
  for (const route of routes) {
    const routeOrders = route.orders;
    
    // Calculate total route distance using Mapbox Directions API for multi-stop routes
    const totalDistance = routeOrders.length > 1 
      ? await calculateMultiStopRouteDistance(routeOrders)
      : routeOrders[0].estimatedDistance || 0;
    
    // Determine if it's a single order or multi-stop route
    const routeType = routeOrders.length === 1 ? 'single' : 'multi-stop';
    const stops = routeOrders.length;
    
    // Apply billing logic with correct formulas
    const { baseCost, addOns, totalCost } = calculateInvoiceCosts(routeType, totalDistance, stops);
    
    // For multi-stop routes, create a single invoice item for the entire route
    if (routeType === 'multi-stop') {
      // Concatenate all order IDs into a single string
      const combinedOrderId = routeOrders.map(order => order.id).join(', ');
      const driver = routeOrders[0].driver || 'Unassigned';
      
      // Combine pickup/dropoff locations for display
      const pickupLocations = [...new Set(routeOrders.map(order => order.pickup || 'Unknown'))];
      const dropoffLocations = [...new Set(routeOrders.map(order => order.dropoff || 'Unknown'))];
      
      const pickup = pickupLocations.join(' → ');
      const dropoff = dropoffLocations.join(' → ');
      
      // Create a single invoice item for the entire route
      items.push({
        orderId: combinedOrderId,
        driver,
        pickup,
        dropoff,
        distance: totalDistance,
        stops,
        routeType,
        baseCost,
        addOns,
        totalCost
      });
    } else {
      // For single orders, create an invoice item for the individual order
      const order = routeOrders[0];
      const driver = order.driver || 'Unassigned';
      const pickup = order.pickup || 'Unknown location';
      const dropoff = order.dropoff || 'Unknown location';
      
      items.push({
        orderId: order.id,
        driver,
        pickup,
        dropoff,
        distance: totalDistance,
        stops: 1,
        routeType: 'single',
        baseCost,
        addOns,
        totalCost
      });
    }
  }
  
  // Calculate totals (no duplicated costs since each route is represented by a single item)
  const totalDistance = items.reduce((sum, item) => sum + item.distance, 0);
  const totalCost = items.reduce((sum, item) => sum + item.totalCost, 0);
  
  // Generate driver summaries
  const driverSummaries = generateDriverSummaries(items);
  
  return {
    date: formattedDate,
    items,
    totalDistance,
    totalCost,
    driverSummaries
  };
};
