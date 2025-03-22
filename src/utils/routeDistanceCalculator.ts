import { DeliveryOrder } from './csvParser';
import { calculateRouteDistance } from './mapboxService';

// Calculate the total route distance for multi-stop routes using Mapbox Directions API
export const calculateMultiStopRouteDistance = async (routeOrders: DeliveryOrder[]): Promise<number> => {
  // If it's a single order, use its estimated distance or calculate it
  if (routeOrders.length === 1) {
    const order = routeOrders[0];
    
    // If we already have a distance from CSV, use it
    if (order.distance && !isNaN(parseFloat(order.distance.toString()))) {
      return parseFloat(order.distance.toString());
    }
    
    // If we have estimatedDistance from earlier calculation, use it
    if (order.estimatedDistance) {
      return order.estimatedDistance;
    }
    
    // Otherwise calculate the distance if we have both pickup and dropoff
    if (order.pickup && order.dropoff) {
      try {
        const routeDistance = await calculateRouteDistance([order.pickup, order.dropoff]);
        if (routeDistance !== null) {
          return Number(routeDistance.toFixed(1));
        }
      } catch (error) {
        console.error('Error calculating individual route distance:', error);
      }
    }
    
    // Fallback to estimatedDistance or 0 if everything fails
    return order.estimatedDistance || 0;
  }
  
  // For multi-stop routes, extract all addresses in sequential order
  // The sequence should be: pickup → stop1 → stop2 → ... → final stop
  const addresses: string[] = [];
  
  // Start with the first pickup
  if (routeOrders[0].pickup) {
    addresses.push(routeOrders[0].pickup);
  }
  
  // Add all dropoffs in sequence
  routeOrders.forEach(order => {
    if (order.dropoff) {
      addresses.push(order.dropoff);
    }
  });
  
  // If we have enough addresses, calculate the route distance
  if (addresses.length >= 2) {
    try {
      const routeDistance = await calculateRouteDistance(addresses);
      if (routeDistance !== null) {
        return Number(routeDistance.toFixed(1));
      }
    } catch (error) {
      console.error('Error calculating multi-stop route distance:', error);
    }
  }
  
  // If API call fails, sum individual estimated distances as a fallback
  return routeOrders.reduce((sum, order) => {
    // Use distance from CSV if available
    if (order.distance && !isNaN(parseFloat(order.distance.toString()))) {
      return sum + parseFloat(order.distance.toString());
    }
    // Otherwise use estimatedDistance or 0
    return sum + (order.estimatedDistance || 0);
  }, 0);
};
