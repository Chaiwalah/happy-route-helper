
import { DeliveryOrder } from './csvParser';
import { calculateRouteDistance } from './mapboxService';

// Calculate the total route distance for multi-stop routes using Mapbox Directions API
export const calculateMultiStopRouteDistance = async (routeOrders: DeliveryOrder[]): Promise<number> => {
  // Extract all addresses in order
  const addresses: string[] = [];
  
  // Add all pickup and dropoff locations in sequence
  routeOrders.forEach(order => {
    if (order.pickup && !addresses.includes(order.pickup)) {
      addresses.push(order.pickup);
    }
    
    if (order.dropoff && !addresses.includes(order.dropoff)) {
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
  
  // If API call fails or not enough addresses, sum individual estimated distances
  return routeOrders.reduce((sum, order) => sum + (order.estimatedDistance || 0), 0);
};
