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
  stops: number;
  routeType: 'single' | 'multi-stop';
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

// Helper function to process orders into routes
const organizeOrdersIntoRoutes = (orders: DeliveryOrder[]): Map<string, DeliveryOrder[]> => {
  // Group orders by driver and day
  const routes = new Map<string, DeliveryOrder[]>();
  
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
    const routeKey = `${driver}-${deliveryDate}`;
    
    // Add order to the appropriate route
    if (!routes.has(routeKey)) {
      routes.set(routeKey, []);
    }
    
    routes.get(routeKey)!.push(order);
  });
  
  return routes;
};

export const generateInvoice = (orders: DeliveryOrder[]): Invoice => {
  // Format date for invoice 
  const today = new Date();
  const formattedDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  
  // Organize orders into routes by driver and date
  const routes = organizeOrdersIntoRoutes(orders);
  
  // Create invoice items based on routes
  const items: InvoiceItem[] = [];
  
  // Process each route
  routes.forEach((routeOrders, routeKey) => {
    // Calculate total route distance - use the maximum estimated distance
    // as a simplification (in a real system, you'd calculate the optimal route)
    const totalDistance = Math.max(...routeOrders.map(order => order.estimatedDistance || 0));
    
    // Determine if it's a single order or multi-stop route
    const routeType = routeOrders.length === 1 ? 'single' : 'multi-stop';
    const stops = routeOrders.length;
    
    // Apply billing logic
    let routeCost = 0;
    let baseCost = 0;
    let addOns = 0;
    
    if (routeType === 'single') {
      // Single-order under 25 miles: flat $25
      if (totalDistance < 25) {
        baseCost = 25;
      } 
      // Single-order over 25 miles: $1.10 per mile
      else {
        baseCost = totalDistance * 1.10;
      }
      routeCost = baseCost;
    } else {
      // Multi-stop routes: (total mileage × $1.10) + $12 for each extra stop
      baseCost = totalDistance * 1.10;
      addOns = (stops - 1) * 12;
      routeCost = baseCost + addOns;
    }
    
    // Create an invoice item for each order in the route
    routeOrders.forEach(order => {
      const driver = order.driver || 'Unassigned';
      const pickup = order.pickup || 'Unknown location';
      const dropoff = order.dropoff || 'Unknown location';
      
      // Get individual order distance, default to 0 if not available
      const orderDistance = order.estimatedDistance || 0;
      
      // For the invoice, we need to distribute the route cost among orders
      // Simplest approach: divide equally among all orders in the route
      const orderCost = routeCost / stops;
      
      // Keep track of missing fields but don't add surcharges - that's no longer part of the billing logic
      
      items.push({
        orderId: order.id,
        driver,
        pickup,
        dropoff,
        distance: orderDistance,
        stops,
        routeType,
        baseCost: baseCost / stops, // Distribute base cost equally
        addOns: addOns / stops,     // Distribute add-ons equally
        totalCost: orderCost
      });
    });
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
            case 'pickupLocation': return 'pickup location';
            case 'exReadyTime': return 'expected ready time';
            case 'exDeliveryTime': return 'expected delivery time';
            case 'actualPickupTime': return 'actual pickup time';
            case 'actualDeliveryTime': return 'actual delivery time';
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
