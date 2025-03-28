
import { DeliveryOrder } from './csvParser';
import { Issue, InvoiceGenerationSettings } from './invoiceTypes';
import { isNoiseOrTestTripNumber } from './routeOrganizer';

export const detectIssues = (
  orders: DeliveryOrder[], 
  settings?: Partial<InvoiceGenerationSettings>
): Issue[] => {
  const issues: Issue[] = [];
  const driverOrderCounts: Record<string, number> = {};
  
  // Default settings - removing flagDistanceThreshold consideration
  const effectiveSettings: InvoiceGenerationSettings = {
    baseRate: 25,
    mileageRate: 1.1,
    additionalStopFee: 12,
    distanceThreshold: 25,
    allowManualDistanceAdjustment: true,
    applyUrbanFee: false,
    urbanFeeAmount: 5,
    applyRushFee: false,
    rushFeePercentage: 15,
    calculateTotalMileage: true,
    flagDriverLoadThreshold: 10,
    flagDistanceThreshold: 0, // Set to 0 to effectively disable distance-based flagging
    flagTimeWindowThreshold: 30,
    ...settings
  };
  
  // Count orders per driver
  orders.forEach(order => {
    const driver = order.driver || 'Unassigned';
    driverOrderCounts[driver] = (driverOrderCounts[driver] || 0) + 1;
  });
  
  // Log specific orders for trip number verification
  const ordersToCheck = [17, 22, 23, 24];
  ordersToCheck.forEach(orderNum => {
    const orderIndex = orderNum - 1; // Convert to 0-based index
    if (orderIndex >= 0 && orderIndex < orders.length) {
      const order = orders[orderIndex];
      console.log(`Order ${order.id} (${orderNum}): Trip Number = "${order.tripNumber || 'N/A'}", Driver = "${order.driver || 'Unassigned'}"`);
    }
  });
  
  // Detect noise/test trip numbers
  const ordersWithNoiseTrips = orders.filter(order => {
    if (!order.tripNumber) return false;
    const [isNoise] = isNoiseOrTestTripNumber(order.tripNumber);
    return isNoise;
  });
  
  // Add a global issue if there are orders with noise trip numbers
  if (ordersWithNoiseTrips.length > 0) {
    issues.push({
      orderId: 'multiple',
      driver: 'All',
      message: 'Orders with test/noise trip numbers',
      details: `There are ${ordersWithNoiseTrips.length} orders with test or noise trip numbers (e.g., "TEST", "24", "25"). These will be excluded from invoice generation.`,
      severity: 'warning',
      type: 'warning'
    });
  }
  
  // Check each order for potential issues - ONE issue per order with missing fields
  orders.forEach(order => {
    const driver = order.driver || 'Unassigned';
    
    // Filter out 'driver' from missingFields if it's unassigned 
    // (this is now considered a valid state, not a missing field)
    const actualMissingFields = order.missingFields?.filter(field => 
      !(field === 'driver' && (order.driver === 'Unassigned' || !order.driver))
    ) || [];
    
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
            case 'tripNumber': return 'trip number';
            default: return field;
          }
        })
        .join(', ');
      
      issues.push({
        orderId: order.id,
        driver,
        message: `Incomplete order data`,
        details: `Order ${order.id} is missing: ${missingFieldsFormatted}.`,
        severity: 'warning',
        type: 'warning'
      });
    }
    
    // Specifically check for empty trip number (not just null but also empty string)
    if ((!order.tripNumber || order.tripNumber.trim() === '') && !order.missingFields?.includes('tripNumber')) {
      issues.push({
        orderId: order.id,
        driver,
        message: 'Missing trip number',
        details: `Order ${order.id} has no trip number assigned, which may affect route organization and invoice generation.`,
        severity: 'warning',
        type: 'warning'
      });
    }
    
    // Flag orders with noise/test trip numbers
    if (order.tripNumber) {
      const [isNoise] = isNoiseOrTestTripNumber(order.tripNumber);
      if (isNoise) {
        issues.push({
          orderId: order.id,
          driver,
          message: 'Test/noise trip number',
          details: `Order ${order.id} has a test or noise trip number "${order.tripNumber}" and will be excluded from invoice generation.`,
          severity: 'info',
          type: 'info'
        });
      }
    }
    
    // Flag orders with tight delivery timeframes
    if (order.exReadyTime && order.exDeliveryTime) {
      try {
        const readyTime = new Date(order.exReadyTime).getTime();
        const deliveryTime = new Date(order.exDeliveryTime).getTime();
        
        if (!isNaN(readyTime) && !isNaN(deliveryTime)) {
          const diffMinutes = (deliveryTime - readyTime) / (1000 * 60);
          
          // Check if delivery window is too short (less than threshold)
          if (effectiveSettings.flagTimeWindowThreshold && diffMinutes < effectiveSettings.flagTimeWindowThreshold) {
            issues.push({
              orderId: order.id,
              driver,
              message: 'Tight delivery window',
              details: `Order ${order.id} has only ${diffMinutes.toFixed(0)} minutes between pickup and delivery time, which is less than the ${effectiveSettings.flagTimeWindowThreshold} minute threshold.`,
              severity: 'warning',
              type: 'warning'
            });
          }
        }
      } catch (e) {
        // Handle invalid date formats
        console.error('Error parsing date for order', order.id, e);
      }
    }
  });
  
  // Count orders with missing trip numbers
  const ordersWithMissingTripNumbers = orders.filter(
    order => !order.tripNumber || order.tripNumber.trim() === ''
  ).length;
  
  // Add a global issue if there are orders with missing trip numbers
  if (ordersWithMissingTripNumbers > 0) {
    issues.push({
      orderId: 'multiple',
      driver: 'All',
      message: 'Orders with missing trip numbers',
      details: `There are ${ordersWithMissingTripNumbers} orders with missing trip numbers. Consider removing them using the 'Remove Orders with Missing Trip Numbers' button.`,
      severity: 'warning',
      type: 'warning'
    });
  }
  
  // Check for drivers with high load (more than threshold orders)
  Object.entries(driverOrderCounts).forEach(([driver, count]) => {
    if (effectiveSettings.flagDriverLoadThreshold && count > effectiveSettings.flagDriverLoadThreshold && driver !== 'Unassigned') {
      issues.push({
        orderId: 'multiple',
        driver,
        message: 'High driver load',
        details: `${driver} has ${count} orders assigned, which exceeds the threshold of ${effectiveSettings.flagDriverLoadThreshold} orders.`,
        severity: 'warning',
        type: 'warning'
      });
    }
  });
  
  // Group orders by Trip Number to check for potential routing issues
  const tripOrderCounts: Record<string, DeliveryOrder[]> = {};
  orders.forEach(order => {
    // Only count valid trip numbers
    if (order.tripNumber && order.tripNumber.trim() !== '') {
      const tripNumber = order.tripNumber.trim();
      if (!tripOrderCounts[tripNumber]) {
        tripOrderCounts[tripNumber] = [];
      }
      tripOrderCounts[tripNumber].push(order);
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
        severity: 'warning',
        type: 'warning'
      });
    }
  });
  
  // Identify conflicting trip numbers (same trip number but different drivers)
  const tripDrivers: Record<string, Set<string>> = {};
  orders.forEach(order => {
    // Only process valid trip numbers
    if (order.tripNumber && order.tripNumber.trim() !== '') {
      const tripNumber = order.tripNumber.trim();
      if (!tripDrivers[tripNumber]) {
        tripDrivers[tripNumber] = new Set();
      }
      tripDrivers[tripNumber].add(order.driver || 'Unassigned');
    }
  });
  
  Object.entries(tripDrivers).forEach(([tripNumber, drivers]) => {
    if (drivers.size > 1) {
      issues.push({
        orderId: 'multiple',
        driver: Array.from(drivers).join(', '),
        message: 'Conflicting trip assignment',
        details: `Trip #${tripNumber} is assigned to multiple drivers: ${Array.from(drivers).join(', ')}. This may indicate a data error.`,
        severity: 'error',
        type: 'error'
      });
    }
  });
  
  return issues;
};
