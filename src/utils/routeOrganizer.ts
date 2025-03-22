
// New function that only marks noise trip numbers but doesn't filter them
export const markOrdersWithNoiseTrips = (orders: DeliveryOrder[]): DeliveryOrder[] => {
  // Deep clone to avoid mutating the original array
  const clonedOrders = JSON.parse(JSON.stringify(orders)) as DeliveryOrder[];
  
  // Mark all noise orders
  clonedOrders.forEach(order => {
    if (order.tripNumber) {
      const [isNoise, isMissing] = isNoiseOrTestTripNumber(order.tripNumber, order);
    }
  });
  
  // Count how many noise orders we have for reporting
  const noiseOrderCount = clonedOrders.filter(order => order.isNoise === true).length;
  if (noiseOrderCount > 0) {
    console.log(`Found ${noiseOrderCount} orders with noise/test trip numbers that need verification`);
  }
  
  return clonedOrders;
};
