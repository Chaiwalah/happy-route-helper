
import { DeliveryOrder } from './csvParser';
import { Issue } from './invoiceTypes';

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
    
    // Filter out 'driver' from missingFields if it's unassigned 
    // (this is now considered a valid state, not a missing field)
    const actualMissingFields = order.missingFields.filter(field => 
      !(field === 'driver' && (order.driver === 'Unassigned' || !order.driver))
    );
    
    // Consolidate missing fields into a single issue
    if (actualMissingFields.length > 0) {
      // Format the list of missing fields for human reading
      const missingFieldsFormatted = actualMissingFields
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
  
  return issues;
};
