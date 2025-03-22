
import { DeliveryOrder } from "./csvParser";

export type InvoiceItem = {
  orderId: string;
  driver: string;
  pickup: string;
  dropoff: string;
  distance: number;
  baseCost: number;
  addOns: number;
  totalCost: number;
  notes?: string;
};

export type Invoice = {
  items: InvoiceItem[];
  totalDistance: number;
  totalCost: number;
  driverSummaries: DriverSummary[];
  date: string;
};

export type DriverSummary = {
  name: string;
  orderCount: number;
  totalDistance: number;
  totalEarnings: number;
};

export const generateInvoice = (
  orders: DeliveryOrder[], 
  ratePerMile: number = 1.5, 
  baseRate: number = 10
): Invoice => {
  const invoiceItems: InvoiceItem[] = orders.map(order => {
    const distance = order.estimatedDistance || 0;
    const baseCost = baseRate + (distance * ratePerMile);
    
    // Simplified - in a real app, add-ons might depend on specific order properties
    const addOns = calculateAddOns(order);
    
    return {
      orderId: order.id,
      driver: order.driver,
      pickup: order.pickup,
      dropoff: order.dropoff,
      distance,
      baseCost: Number(baseCost.toFixed(2)),
      addOns,
      totalCost: Number((baseCost + addOns).toFixed(2)),
      notes: order.notes
    };
  });
  
  // Calculate driver summaries
  const driverMap = new Map<string, DriverSummary>();
  
  invoiceItems.forEach(item => {
    if (!driverMap.has(item.driver)) {
      driverMap.set(item.driver, {
        name: item.driver,
        orderCount: 0,
        totalDistance: 0,
        totalEarnings: 0
      });
    }
    
    const driverSummary = driverMap.get(item.driver)!;
    driverSummary.orderCount += 1;
    driverSummary.totalDistance += item.distance;
    driverSummary.totalEarnings += item.totalCost;
    
    // Update with rounded values
    driverSummary.totalDistance = Number(driverSummary.totalDistance.toFixed(1));
    driverSummary.totalEarnings = Number(driverSummary.totalEarnings.toFixed(2));
  });
  
  const totalDistance = invoiceItems.reduce((sum, item) => sum + item.distance, 0);
  const totalCost = invoiceItems.reduce((sum, item) => sum + item.totalCost, 0);
  
  return {
    items: invoiceItems,
    totalDistance: Number(totalDistance.toFixed(1)),
    totalCost: Number(totalCost.toFixed(2)),
    driverSummaries: Array.from(driverMap.values()),
    date: new Date().toISOString().split('T')[0]
  };
};

// Calculate any add-ons for special circumstances
const calculateAddOns = (order: DeliveryOrder): number => {
  let addOns = 0;
  
  // Example addon: Long distance fee
  if (order.estimatedDistance && order.estimatedDistance > 15) {
    addOns += 5; // $5 long distance fee
  }
  
  // Example addon: After-hours delivery
  const endTimeHour = extractHour(order.timeWindowEnd);
  if (endTimeHour && endTimeHour >= 20) { // After 8pm
    addOns += 7.5; // $7.50 after-hours fee
  }
  
  return addOns;
};

// Helper to extract hour from time string
const extractHour = (timeString: string): number | null => {
  // Try to match various time formats
  const timeRegex = /(\d{1,2})(?::(\d{2}))?(?:\s*(am|pm))?/i;
  const match = timeString.match(timeRegex);
  
  if (!match) return null;
  
  let hour = parseInt(match[1], 10);
  const minutes = match[2] ? parseInt(match[2], 10) : 0;
  const period = match[3] ? match[3].toLowerCase() : null;
  
  // Adjust for 12-hour format
  if (period === 'pm' && hour < 12) {
    hour += 12;
  } else if (period === 'am' && hour === 12) {
    hour = 0;
  }
  
  return hour;
};

export type Issue = {
  severity: 'warning' | 'error';
  orderId: string;
  driver: string;
  message: string;
  details?: string;
};

export const detectIssues = (orders: DeliveryOrder[]): Issue[] => {
  const issues: Issue[] = [];
  const driversOrderCount = new Map<string, number>();
  
  // Count orders per driver
  orders.forEach(order => {
    driversOrderCount.set(
      order.driver, 
      (driversOrderCount.get(order.driver) || 0) + 1
    );
  });
  
  // Check each order for potential issues
  orders.forEach(order => {
    // Issue: Driver overloaded with too many orders
    const orderCount = driversOrderCount.get(order.driver) || 0;
    if (orderCount > 10) {
      issues.push({
        severity: 'warning',
        orderId: order.id,
        driver: order.driver,
        message: `Driver overloaded with ${orderCount} orders`,
        details: 'Consider redistributing orders across drivers'
      });
    }
    
    // Issue: Long distance delivery
    if (order.estimatedDistance && order.estimatedDistance > 15) {
      issues.push({
        severity: 'warning',
        orderId: order.id,
        driver: order.driver,
        message: `Long distance (${order.estimatedDistance} miles)`,
        details: 'Long distances may require special handling'
      });
    }
    
    // Issue: Late delivery window
    const endTimeHour = extractHour(order.timeWindowEnd);
    if (endTimeHour && endTimeHour >= 21) { // After 9pm
      issues.push({
        severity: 'warning',
        orderId: order.id,
        driver: order.driver,
        message: 'Late delivery window',
        details: `End time ${order.timeWindowEnd} may be after pharmacy closing hours`
      });
    }
    
    // Issue: Missing data
    if (!order.pickup || !order.dropoff) {
      issues.push({
        severity: 'error',
        orderId: order.id,
        driver: order.driver,
        message: 'Missing address data',
        details: !order.pickup ? 'Pickup address missing' : 'Dropoff address missing'
      });
    }
  });
  
  return issues;
};
