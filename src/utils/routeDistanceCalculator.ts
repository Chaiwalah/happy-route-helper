import { DeliveryOrder } from './csvParser';
import { calculateRouteDistance, geocodeAddress } from './mapboxService';
import { startPerformanceTracking, endPerformanceTracking, cacheAddress, getCachedAddress } from './performanceLogger';

// Define the Coordinates type to match mapboxService
type Coordinates = [number, number]; // [longitude, latitude]

// Cache for route distance calculations
const distanceCache: { [key: string]: number } = {};

/**
 * Calculate the total route distance for multi-stop routes using Mapbox Directions API
 */
export const calculateMultiStopRouteDistance = async (routeOrders: DeliveryOrder[]): Promise<number> => {
  startPerformanceTracking('calculateMultiStopRouteDistance', { orderCount: routeOrders.length });

  // Generate a cache key based on order IDs
  const cacheKey = routeOrders.map(order => order.id).join('|');
  
  // Check if we already calculated this route
  if (distanceCache[cacheKey] !== undefined) {
    console.log(`Using cached distance for route with ${routeOrders.length} orders`);
    endPerformanceTracking('calculateMultiStopRouteDistance', { source: 'cache' });
    return distanceCache[cacheKey];
  }
  
  console.log(`Calculating distance for route with ${routeOrders.length} orders`);
  
  // If it's a single order, use its estimated distance or calculate it
  if (routeOrders.length === 1) {
    const order = routeOrders[0];
    
    // If we already have a distance from CSV, use it
    if (order.distance && !isNaN(parseFloat(order.distance.toString()))) {
      const distance = parseFloat(order.distance.toString());
      distanceCache[cacheKey] = distance;
      endPerformanceTracking('calculateMultiStopRouteDistance', { source: 'csv' });
      return distance;
    }
    
    // If we have estimatedDistance from earlier calculation, use it
    if (order.estimatedDistance) {
      distanceCache[cacheKey] = order.estimatedDistance;
      endPerformanceTracking('calculateMultiStopRouteDistance', { source: 'estimated' });
      return order.estimatedDistance;
    }
    
    // Otherwise calculate the distance if we have both pickup and dropoff
    if (order.pickup && order.dropoff) {
      try {
        // First geocode both addresses to get coordinates
        let pickupCoords = getCachedAddress(order.pickup);
        if (!pickupCoords) {
          pickupCoords = await geocodeAddress(order.pickup);
          if (pickupCoords) {
            cacheAddress(order.pickup, pickupCoords);
          }
        }
        
        let dropoffCoords = getCachedAddress(order.dropoff);
        if (!dropoffCoords) {
          dropoffCoords = await geocodeAddress(order.dropoff);
          if (dropoffCoords) {
            cacheAddress(order.dropoff, dropoffCoords);
          }
        }
        
        if (pickupCoords && dropoffCoords) {
          // Ensure coordinates are correctly typed
          const routeDistance = await calculateRouteDistance([
            pickupCoords as Coordinates, 
            dropoffCoords as Coordinates
          ]);
          
          if (routeDistance !== null) {
            const distance = Number(routeDistance.toFixed(1));
            distanceCache[cacheKey] = distance;
            endPerformanceTracking('calculateMultiStopRouteDistance', { source: 'calculated' });
            return distance;
          }
        }
      } catch (error) {
        console.error('Error calculating individual route distance:', error);
      }
    }
    
    // Fallback to estimatedDistance or 0 if everything fails
    const fallback = order.estimatedDistance || 0;
    distanceCache[cacheKey] = fallback;
    endPerformanceTracking('calculateMultiStopRouteDistance', { source: 'fallback' });
    return fallback;
  }
  
  // For multi-stop routes with more than 5 orders, use a simpler estimation approach
  // to avoid expensive API calls and performance issues
  if (routeOrders.length > 5) {
    console.log(`Using simplified distance calculation for large route with ${routeOrders.length} orders`);
    
    // Sum individual estimates with a reduction factor
    const totalDistance = routeOrders.reduce((sum, order) => {
      if (order.distance && !isNaN(parseFloat(order.distance.toString()))) {
        return sum + parseFloat(order.distance.toString());
      }
      return sum + (order.estimatedDistance || 0);
    }, 0) * 0.85; // Apply 15% reduction for route optimization
    
    const distance = Number(totalDistance.toFixed(1));
    distanceCache[cacheKey] = distance;
    endPerformanceTracking('calculateMultiStopRouteDistance', { source: 'simplified' });
    return distance;
  }
  
  // For multi-stop routes, first check if all orders have valid estimatedDistance values
  const allHaveEstimatedDistances = routeOrders.every(order => 
    order.estimatedDistance !== undefined && order.estimatedDistance !== null
  );
  
  // If all orders have estimated distances, we can calculate a reasonable approximation quickly
  if (allHaveEstimatedDistances) {
    console.log('Using pre-calculated distances for multi-stop route');
    
    // For multi-stop, use the sum but apply a small optimization factor (0.9)
    // since direct routes between stops are usually shorter than individual routes
    const totalDistance = routeOrders.reduce((sum, order) => 
      sum + (order.estimatedDistance || 0), 0) * 0.9;
    
    const distance = Number(totalDistance.toFixed(1));
    distanceCache[cacheKey] = distance;
    endPerformanceTracking('calculateMultiStopRouteDistance', { source: 'pre-calculated' });
    return distance;
  }
  
  // Otherwise, extract all addresses in order to calculate the full chain distance
  const addresses: string[] = [];
  const coordinates: Coordinates[] = [];
  
  // Start with the pickup of the first order (assuming all orders in a trip start from the same pharmacy)
  if (routeOrders[0].pickup) {
    addresses.push(routeOrders[0].pickup);
  }
  
  // Add all dropoffs in sequence to create the full route chain
  routeOrders.forEach(order => {
    if (order.dropoff) {
      addresses.push(order.dropoff);
    }
  });
  
  // Geocode all addresses first
  for (const address of addresses) {
    // Check cache first
    const cachedCoords = getCachedAddress(address);
    if (cachedCoords) {
      coordinates.push(cachedCoords);
      continue;
    }
    
    // If not in cache, geocode it
    const coords = await geocodeAddress(address);
    if (coords && Array.isArray(coords) && coords.length === 2 && 
        typeof coords[0] === 'number' && typeof coords[1] === 'number') {
      const typedCoords: Coordinates = [coords[0], coords[1]];
      coordinates.push(typedCoords);
      cacheAddress(address, typedCoords);
    }
  }
  
  // Calculate the full route distance with all coordinates
  if (coordinates.length >= 2) {
    try {
      console.log(`Calculating multi-stop route with ${coordinates.length} coordinates`);
      const routeDistance = await calculateRouteDistance(coordinates);
      if (routeDistance !== null) {
        const distance = Number(routeDistance.toFixed(1));
        distanceCache[cacheKey] = distance;
        endPerformanceTracking('calculateMultiStopRouteDistance', { source: 'full-route' });
        return distance;
      }
    } catch (error) {
      console.error('Error calculating multi-stop route distance:', error);
    }
  }
  
  // If API call fails, sum individual estimated distances as a fallback
  const fallbackDistance = routeOrders.reduce((sum, order) => {
    // Use distance from CSV if available
    if (order.distance && !isNaN(parseFloat(order.distance.toString()))) {
      return sum + parseFloat(order.distance.toString());
    }
    // Otherwise use estimatedDistance or 0
    return sum + (order.estimatedDistance || 0);
  }, 0);
  
  const distance = Number(fallbackDistance.toFixed(1));
  distanceCache[cacheKey] = distance;
  endPerformanceTracking('calculateMultiStopRouteDistance', { source: 'fallback-sum' });
  return distance;
};
