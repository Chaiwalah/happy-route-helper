import { DeliveryOrder } from './csvParser';

export type Issue = {
  orderId: string;
  driver: string;
  message: string;
  details: string;
  severity: 'warning' | 'error';
};

export const detectIssues = (orders: DeliveryOrder[]): Issue[] => {
  const issues: Issue[] = [];
  const driverOrderCounts: Record<string, number> = {};
  
  // Count orders per driver
  orders.forEach(order => {
    const driver = order.driver || 'Unassigned';
    driverOrderCounts[driver] = (driverOrderCounts[driver] || 0) + 1;
  });
  
  // Check each order for potential issues
  orders.forEach(order => {
    const driver = order.driver || 'Unassigned';
    
    // Missing address issue - only add once per order
    if (order.missingAddress === true) {
      issues.push({
        orderId: order.id,
        driver,
        message: 'Missing address data',
        details: `Order ${order.id} is missing complete address information.`,
        severity: 'warning'
      });
    }
    
    // Missing time window
    if (!order.timeWindowStart && !order.timeWindowEnd) {
      issues.push({
        orderId: order.id,
        driver,
        message: 'Missing time window',
        details: `No delivery time window specified for order ${order.id}.`,
        severity: 'warning'
      });
    }
    
    // Additional issues can be added here but should avoid duplicating same issue type
    // for the same order
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
  
  return issues;
};
