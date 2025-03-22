
import { DeliveryOrder } from './csvParser';
import { Issue, InvoiceGenerationSettings } from './invoiceTypes';

export const detectIssues = (
  orders: DeliveryOrder[], 
  settings?: Partial<InvoiceGenerationSettings>
): Issue[] => {
  const issues: Issue[] = [];
  const driverOrderCounts: Record<string, number> = {};
  
  // Default settings - updating the flagDistanceThreshold from 50 to 150 miles
  const effectiveSettings: InvoiceGenerationSettings = {
    allowManualDistanceAdjustment: true,
    flagDriverLoadThreshold: 10,
    flagDistanceThreshold: 150, // Updated from 50 to 150 miles for statewide deliveries
    flagTimeWindowThreshold: 30,
    ...settings
  };
  
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
    
    // Flag orders with long distances - updated threshold to 150 miles
    if (order.estimatedDistance && order.estimatedDistance > effectiveSettings.flagDistanceThreshold) {
      issues.push({
        orderId: order.id,
        driver,
        message: 'Exceptionally long route',
        details: `Order ${order.id} has an estimated distance of ${order.estimatedDistance.toFixed(1)} miles, which exceeds the ${effectiveSettings.flagDistanceThreshold} mile threshold for statewide deliveries.`,
        severity: 'warning'
      });
    }
    
    // Flag orders with tight delivery timeframes
    if (order.exReadyTime && order.exDeliveryTime) {
      try {
        const readyTime = new Date(order.exReadyTime).getTime();
        const deliveryTime = new Date(order.exDeliveryTime).getTime();
        
        if (!isNaN(readyTime) && !isNaN(deliveryTime)) {
          const diffMinutes = (deliveryTime - readyTime) / (1000 * 60);
          
          // Check if delivery window is too short (less than threshold)
          if (diffMinutes < effectiveSettings.flagTimeWindowThreshold) {
            issues.push({
              orderId: order.id,
              driver,
              message: 'Tight delivery window',
              details: `Order ${order.id} has only ${diffMinutes.toFixed(0)} minutes between pickup and delivery time, which is less than the ${effectiveSettings.flagTimeWindowThreshold} minute threshold.`,
              severity: 'warning'
            });
          }
        }
      } catch (e) {
        // Handle invalid date formats
        console.error('Error parsing date for order', order.id, e);
      }
    }
  });
  
  // Check for drivers with high load (more than threshold orders)
  Object.entries(driverOrderCounts).forEach(([driver, count]) => {
    if (count > effectiveSettings.flagDriverLoadThreshold && driver !== 'Unassigned') {
      issues.push({
        orderId: 'multiple',
        driver,
        message: 'High driver load',
        details: `${driver} has ${count} orders assigned, which exceeds the threshold of ${effectiveSettings.flagDriverLoadThreshold} orders.`,
        severity: 'warning'
      });
    }
  });
  
  // Group orders by Trip Number to check for potential routing issues
  const tripOrderCounts: Record<string, DeliveryOrder[]> = {};
  orders.forEach(order => {
    if (order.tripNumber) {
      if (!tripOrderCounts[order.tripNumber]) {
        tripOrderCounts[order.tripNumber] = [];
      }
      tripOrderCounts[order.tripNumber].push(order);
    }
  });
  
  // Flag multi-stop routes with many stops (potential efficiency issue)
  Object.entries(tripOrderCounts).forEach(([tripNumber, tripOrders]) => {
    if (tripOrders.length > 5) { // More than 5 stops might be inefficient
      const driver = tripOrders[0].driver || 'Unassigned';
      issues.push({
        orderId: tripOrders.map(o => o.id).join(', '),
        driver,
        message: 'Route has many stops',
        details: `Trip #${tripNumber} has ${tripOrders.length} stops, which may impact efficiency and delivery times.`,
        severity: 'warning'
      });
    }
  });
  
  return issues;
};
