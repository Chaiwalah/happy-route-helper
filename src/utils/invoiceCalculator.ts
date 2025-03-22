
import { DeliveryOrder } from './csvParser';

export type Issue = {
  orderId: string;
  driver: string;
  message: string;
  details: string;
  severity: 'warning' | 'error';
};

export type InvoiceItem = {
  orderId: string;
  driver: string;
  pickup: string;
  dropoff: string;
  distance: number;
  baseCost: number;
  addOns: number;
  totalCost: number;
};

export type DriverSummary = {
  name: string;
  orderCount: number;
  totalDistance: number;
  totalEarnings: number;
};

export type Invoice = {
  date: string;
  items: InvoiceItem[];
  totalDistance: number;
  totalCost: number;
  driverSummaries: DriverSummary[];
};

export const generateInvoice = (
  orders: DeliveryOrder[], 
  ratePerMile: number, 
  baseRate: number
): Invoice => {
  // Format date for invoice 
  const today = new Date();
  const formattedDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  
  // Create invoice items for each order
  const items: InvoiceItem[] = orders.map(order => {
    const driver = order.driver || 'Unassigned';
    const pickup = order.pickup || 'Unknown location';
    const dropoff = order.dropoff || 'Unknown location';
    
    // Get distance, default to 0 if not available
    const distance = order.estimatedDistance || 0;
    
    // Calculate costs
    const baseCost = baseRate;
    const distanceCost = distance * ratePerMile;
    
    // Additional costs (can be expanded later)
    let addOns = 0;
    
    // Add a single surcharge based on the number of missing fields
    if (order.missingFields.length > 0) {
      // Base surcharge of $5 for any missing fields
      addOns += 5;
      
      // Add $0.50 for each additional missing field beyond the first
      if (order.missingFields.length > 1) {
        addOns += (order.missingFields.length - 1) * 0.50;
      }
    }
    
    const totalCost = baseCost + distanceCost + addOns;
    
    return {
      orderId: order.id,
      driver,
      pickup,
      dropoff,
      distance,
      baseCost: baseCost + distanceCost, // Base + distance cost
      addOns,
      totalCost
    };
  });
  
  // Calculate totals
  const totalDistance = items.reduce((sum, item) => sum + item.distance, 0);
  const totalCost = items.reduce((sum, item) => sum + item.totalCost, 0);
  
  // Generate driver summaries
  const driverMap = new Map<string, DriverSummary>();
  
  items.forEach(item => {
    const driver = item.driver;
    if (!driverMap.has(driver)) {
      driverMap.set(driver, {
        name: driver,
        orderCount: 0,
        totalDistance: 0,
        totalEarnings: 0
      });
    }
    
    const summary = driverMap.get(driver)!;
    summary.orderCount += 1;
    summary.totalDistance += item.distance;
    summary.totalEarnings += item.totalCost;
  });
  
  const driverSummaries = Array.from(driverMap.values());
  
  return {
    date: formattedDate,
    items,
    totalDistance,
    totalCost,
    driverSummaries
  };
};

export const detectIssues = (orders: DeliveryOrder[]): Issue[] => {
  const issues: Issue[] = [];
  const driverOrderCounts: Record<string, number> = {};
  
  // Count orders per driver
  orders.forEach(order => {
    const driver = order.driver || 'Unassigned';
    driverOrderCounts[driver] = (driverOrderCounts[driver] || 0) + 1;
  });
  
  // Check each order for potential issues - ONE issue per order with missing fields
  orders.forEach(order => {
    const driver = order.driver || 'Unassigned';
    
    // Consolidate missing fields into a single issue
    if (order.missingFields.length > 0) {
      // Format the list of missing fields for human reading
      const missingFieldsFormatted = order.missingFields
        .map(field => {
          switch(field) {
            case 'address': return 'delivery address';
            case 'timeWindow': return 'time window';
            case 'pickup': return 'pickup location';
            case 'items': return 'items';
            default: return field;
          }
        })
        .join(', ');
      
      issues.push({
        orderId: order.id,
        driver,
        message: `Incomplete order data`,
        details: `Order ${order.id} is missing: ${missingFieldsFormatted}.`,
        severity: 'warning'
      });
    }
  });
  
  // Check for drivers with high load (more than 10 orders)
  Object.entries(driverOrderCounts).forEach(([driver, count]) => {
    if (count > 10 && driver !== 'Unassigned') {
      issues.push({
        orderId: 'multiple',
        driver,
        message: 'High driver load',
        details: `${driver} has ${count} orders assigned, which may be excessive.`,
        severity: 'warning'
      });
    }
  });
  
  // Debug check to ensure we don't have more issues than orders (excluding driver load issues)
  const missingFieldIssues = issues.filter(issue => issue.message === 'Incomplete order data');
  if (missingFieldIssues.length > orders.length) {
    console.warn(`Warning: More missing field issues (${missingFieldIssues.length}) than total orders (${orders.length})`);
  }
  
  return issues;
};
