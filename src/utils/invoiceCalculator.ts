
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
    
    // Create invoice items for each order in the route
    routeOrders.forEach(order => {
      const driver = order.driver || 'Unassigned';
      const pickup = order.pickup || 'Unknown location';
      const dropoff = order.dropoff || 'Unknown location';
      
      // Get individual order distance, default to 0 if not available
      const orderDistance = order.estimatedDistance || 0;
      
      // For multi-stop routes with assigned drivers, distribute costs evenly
      // For unassigned orders, each is already its own route (single order)
      let itemBaseCost = baseCost;
      let itemAddOns = addOns;
      let itemTotalCost = totalCost;
      
      if (routeType === 'multi-stop' && driver !== 'Unassigned') {
        // Distribute the costs evenly among orders in the route
        itemBaseCost = baseCost / stops;
        itemAddOns = addOns / stops;
        itemTotalCost = totalCost / stops;
      }
      
      items.push({
        orderId: order.id,
        driver,
        pickup,
        dropoff,
        distance: orderDistance,
        stops,
        routeType,
        baseCost: itemBaseCost,
        addOns: itemAddOns,
        totalCost: itemTotalCost
      });
    });
  }
  
  // Calculate totals
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
