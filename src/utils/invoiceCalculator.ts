
import { DeliveryOrder } from './csvParser';
import { Invoice, InvoiceItem, Issue, InvoiceGenerationSettings, DriverSummary } from './invoiceTypes';
import { organizeOrdersIntoRoutes } from './routeOrganizer';
import { calculateMultiStopRouteDistance } from './routeDistanceCalculator';
import { calculateInvoiceCosts } from './invoicePricing';
import { generateDriverSummaries } from './driverSummaryGenerator';
import { detectIssues } from './issueDetector';

// Re-export types and functions for backward compatibility
export type { Issue, InvoiceItem, Invoice, DriverSummary } from './invoiceTypes';
export { detectIssues } from './issueDetector';

// Default settings for invoice generation - disabled distance threshold flagging
const defaultSettings: InvoiceGenerationSettings = {
  allowManualDistanceAdjustment: true,
  flagDriverLoadThreshold: 10,
  flagDistanceThreshold: 0, // Set to 0 to effectively disable distance-based flagging
  flagTimeWindowThreshold: 30
};

export const generateInvoice = async (
  orders: DeliveryOrder[], 
  settings: Partial<InvoiceGenerationSettings> = {}
): Promise<Invoice> => {
  // Merge default settings with provided settings
  const effectiveSettings = { ...defaultSettings, ...settings };
  
  // Format date for invoice 
  const today = new Date();
  const formattedDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const timestamp = today.toISOString();
  
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
    
    // Create time window information
    const timeWindows = routeOrders.map(order => {
      const start = order.timeWindowStart || order.exReadyTime;
      const end = order.timeWindowEnd || order.exDeliveryTime;
      if (start && end) {
        return `${start} - ${end}`;
      } else if (start) {
        return `From ${start}`;
      } else if (end) {
        return `Until ${end}`;
      }
      return '';
    }).filter(Boolean);
    
    const timeWindow = timeWindows.length > 0 ? timeWindows.join(' | ') : undefined;
    
    // Store all order IDs separately for multi-stop routes
    const orderIds = routeOrders.map(order => order.id);
    
    // Create a single invoice item for the entire route
    items.push({
      routeKey: route.routeKey,
      tripNumber: route.tripNumber,
      orderId: combinedOrderId,
      driver,
      pickup,
      dropoff,
      distance: totalDistance,
      stops,
      routeType,
      baseCost,
      addOns,
      totalCost,
      timeWindow,
      orderIds,
      orders: routeOrders,
      cost: totalCost // For backward compatibility
    });
  }
  
  // Calculate totals
  const totalDistance = items.reduce((sum, item) => sum + item.distance, 0);
  const totalCost = items.reduce((sum, item) => sum + (item.totalCost || 0), 0);
  
  // Generate driver summaries
  const driverSummaries = generateDriverSummaries(items);
  
  return {
    id: `INV-${formattedDate}-${Math.floor(Math.random() * 1000)}`,
    date: formattedDate,
    items,
    totalDistance,
    totalCost,
    driverSummaries,
    status: 'draft',
    lastModified: timestamp,
    weekEnding: '',
    businessName: '',
    businessType: 'pharmacy',
    contactPerson: ''
  };
};

// Function to manually recalculate an invoice item's distance and cost
export const recalculateInvoiceItem = (
  invoice: Invoice, 
  itemIndex: number, 
  newDistance: number
): Invoice => {
  if (itemIndex < 0 || itemIndex >= invoice.items.length) {
    console.error('Invalid item index for recalculation');
    return invoice;
  }
  
  const updatedInvoice = { ...invoice };
  const item = { ...updatedInvoice.items[itemIndex] };
  
  // Store original distance if this is the first recalculation
  if (!item.recalculated) {
    item.originalDistance = item.distance;
  }
  
  // Update distance and recalculation flags
  item.distance = newDistance;
  item.recalculated = true;
  
  // Recalculate costs based on new distance
  const { baseCost, addOns, totalCost } = calculateInvoiceCosts(
    item.routeType || 'single', 
    newDistance, 
    item.stops || 1
  );
  
  item.baseCost = baseCost;
  item.addOns = addOns;
  item.totalCost = totalCost;
  item.cost = totalCost; // For backward compatibility
  
  // Update item in the invoice
  updatedInvoice.items[itemIndex] = item;
  
  // Recalculate invoice totals
  updatedInvoice.totalDistance = updatedInvoice.items.reduce((sum, i) => sum + i.distance, 0);
  updatedInvoice.totalCost = updatedInvoice.items.reduce((sum, i) => sum + (i.totalCost || 0), 0);
  
  // Update recalculated count
  updatedInvoice.recalculatedCount = (updatedInvoice.recalculatedCount || 0) + 1;
  
  // Update last modified timestamp
  updatedInvoice.lastModified = new Date().toISOString();
  
  // Regenerate driver summaries with updated data
  updatedInvoice.driverSummaries = generateDriverSummaries(updatedInvoice.items);
  
  return updatedInvoice;
};

// Function to finalize the invoice
export const finalizeInvoice = (invoice: Invoice): Invoice => {
  return {
    ...invoice,
    status: 'finalized',
    lastModified: new Date().toISOString()
  };
};

// Function to mark invoice as reviewed
export const reviewInvoice = (invoice: Invoice): Invoice => {
  return {
    ...invoice,
    status: 'reviewed',
    lastModified: new Date().toISOString()
  };
};
