
import { DeliveryOrder } from "./csvParser";
import { geocodeAddress, calculateRouteDistance } from "./mapboxService";

export const calculateDistances = async (
  orders: DeliveryOrder[]
): Promise<DeliveryOrder[]> => {
  // This is a mock that simulates API latency
  await new Promise(resolve => setTimeout(resolve, 500));
  
  const updatedOrders = [...orders];
  
  // Process each order individually first
  for (let i = 0; i < updatedOrders.length; i++) {
    const order = updatedOrders[i];
    
    // Check if the CSV already has a distance field
    if (order.distance && !isNaN(parseFloat(order.distance.toString()))) {
      order.estimatedDistance = parseFloat(order.distance.toString());
      continue;
    }
    
    // Try to calculate distance using Mapbox if both pickup and dropoff are available
    if (order.pickup && order.dropoff) {
      try {
        const routeDistance = await calculateRouteDistance([order.pickup, order.dropoff]);
        if (routeDistance !== null) {
          order.estimatedDistance = Number(routeDistance.toFixed(1));
          continue;
        }
      } catch (error) {
        console.error('Error calculating individual route distance:', error);
      }
    }
    
    // Fallback to a default distance if API call fails or addresses are missing
    order.estimatedDistance = generateDefaultDistance();
  }
  
  return updatedOrders;
};

// Generate a default distance if real calculation fails
const generateDefaultDistance = (): number => {
  return Math.round((5 + Math.random() * 10) * 10) / 10; // 5-15 miles
};
