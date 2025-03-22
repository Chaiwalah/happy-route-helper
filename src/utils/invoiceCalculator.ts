
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
  
  // Organize orders into routes by TripNumber, driver, and date
  const routes = organizeOrdersIntoRoutes(orders);
  
  // Create invoice items based on routes
  const items: InvoiceItem[] = [];
  
  // Process each route
  for (const route of routes) {
    const routeOrders = route.orders;
    
    // Explicitly determine if it's a single order or multi-stop route
    const routeType = routeOrders.length === 1 ? 'single' : 'multi-stop';
    const stops = routeOrders.length;
    
    // Calculate total route distance using Mapbox Directions API for multi-stop routes
    const totalDistance = await calculateMultiStopRouteDistance(routeOrders);
    
    // Apply billing logic with correct formulas
    const { baseCost, addOns, totalCost } = calculateInvoiceCosts(routeType, totalDistance, stops);
    
    // Concatenate all order IDs into a single string
    const combinedOrderId = routeOrders.map(order => order.id).join(', ');
    
    // For consistency, get driver from first order (all orders in a route should have same driver)
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
