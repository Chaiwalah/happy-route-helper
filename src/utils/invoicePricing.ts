
// Apply billing logic and calculate costs
export const calculateInvoiceCosts = (
  routeType: 'single' | 'multi-stop', 
  totalDistance: number, 
  stops: number,
  hasPumpPickups: boolean = false,
  pumpPickupCount: number = 0
): { baseCost: number, addOns: number, totalCost: number } => {
  let baseCost = 0;
  let addOns = 0;
  
  // For routes with pump pickups, we only count non-pump-pickup stops for the additional stops fee
  const billableStops = hasPumpPickups ? stops - pumpPickupCount : stops;
  
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
    // Calculate add-ons: $12 per each additional stop beyond the first
    // Only count regular stops, not pump pickups at existing addresses
    addOns = Math.max(0, billableStops - 1) * 12; 
  }
  
  return {
    baseCost: parseFloat(baseCost.toFixed(2)),
    addOns: parseFloat(addOns.toFixed(2)),
    totalCost: parseFloat((baseCost + addOns).toFixed(2))
  };
};
