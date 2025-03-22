
// Apply billing logic and calculate costs
export const calculateInvoiceCosts = (routeType: 'single' | 'multi-stop', totalDistance: number, stops: number): { baseCost: number, addOns: number, totalCost: number } => {
  let baseCost = 0;
  let addOns = 0;
  
  if (routeType === 'single') {
    // Single-order under 25 miles: flat $25
    if (totalDistance < 25) {
      baseCost = 25;
      addOns = 0;
    } 
    // Single-order over 25 miles: $1.10 per mile
    else {
      baseCost = totalDistance * 1.10;
      addOns = 0;
    }
  } else {
    // Multi-stop routes: (total mileage × $1.10) + $12 for each extra stop
    baseCost = totalDistance * 1.10;
    addOns = (stops - 1) * 12; // $12 per each extra stop beyond the first
  }
  
  return {
    baseCost,
    addOns,
    totalCost: baseCost + addOns
  };
};
