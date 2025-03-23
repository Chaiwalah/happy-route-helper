
import { DeliveryOrder } from "./csvParser";
import { geocodeAddress, calculateRouteDistance } from "./mapboxService";
import { toast } from '@/components/ui/use-toast';
import {
  startPerformanceTracking,
  endPerformanceTracking,
  logDebug,
  logInfo,
  logError,
  logPerformance,
  cacheAddress,
  getCachedAddress,
  startBatchLogging,
  endBatchLogging
} from './performanceLogger';

// Type definition for coordinates
export type Coordinates = [number, number]; // [longitude, latitude]

// Configuration - OPTIMIZED PARAMETERS
const CALCULATION_TIMEOUT = 5000; // 5 seconds (reduced from 8s)
const MAX_RETRIES = 1; // Keep at 1 for faster processing
const CONCURRENT_BATCHES = 10; // Increased from 5 for better parallelism
const BATCH_SIZE = 12; // Increased from 8

// SIMPLE IN-MEMORY CACHING
const addressCache = new Map<string, Coordinates>();

/**
 * Calculate distances for multiple orders with improved performance
 */
export const calculateDistances = async (
  orders: DeliveryOrder[]
): Promise<DeliveryOrder[]> => {
  startPerformanceTracking('calculateDistances', { orderCount: orders.length });
  logInfo(`Starting distance calculations for ${orders.length} orders`);
  startBatchLogging(); // Start batch operations to reduce console output
  
  // Create a copy of the orders to avoid mutation
  const updatedOrders = [...orders];
  
  // Prioritize orders that don't have distances yet
  const ordersToProcess = updatedOrders.map((order, index) => ({ 
    order, 
    index,
    hasDistance: order.distance !== undefined || order.estimatedDistance !== undefined
  }));
  
  // Sort orders to prioritize those without distances
  ordersToProcess.sort((a, b) => (a.hasDistance === b.hasDistance) ? 0 : a.hasDistance ? 1 : -1);
  
  // Set up batching with improved concurrency
  const batches: Array<typeof ordersToProcess> = [];
  
  // Create smaller batches for parallel processing
  for (let i = 0; i < ordersToProcess.length; i += BATCH_SIZE) {
    batches.push(ordersToProcess.slice(i, i + BATCH_SIZE));
  }
  
  logInfo(`Split ${updatedOrders.length} orders into ${batches.length} batches of max ${BATCH_SIZE} orders each`);
  startPerformanceTracking('calculateDistances.processBatches', { batchCount: batches.length });
  
  // Process multiple batches in parallel with a concurrency limit
  for (let i = 0; i < batches.length; i += CONCURRENT_BATCHES) {
    const currentBatches = batches.slice(i, i + CONCURRENT_BATCHES);
    const batchStartTime = performance.now();
    
    try {
      // Process current set of batches concurrently
      await Promise.all(
        currentBatches.map(async (batch, batchIndex) => {
          const batchNumber = i + batchIndex + 1;
          startPerformanceTracking(`calculateDistances.processBatch.${batchNumber}`);
          
          // Process all orders in this batch concurrently
          await Promise.all(
            batch.map(({ order }) => processOrderDistance(order, updatedOrders.length))
          );
          
          endPerformanceTracking(`calculateDistances.processBatch.${batchNumber}`);
        })
      );
      
      const batchEndTime = performance.now();
      logPerformance(`Processed batches ${i+1} to ${Math.min(i+CONCURRENT_BATCHES, batches.length)}`, {
        processingTimeMs: (batchEndTime - batchStartTime).toFixed(2),
        batchesProcessed: currentBatches.length,
        ordersProcessed: currentBatches.reduce((sum, batch) => sum + batch.length, 0)
      });
    } catch (error) {
      logError(`Error processing batch set ${i / CONCURRENT_BATCHES + 1}:`, error);
    }
  }
  
  endPerformanceTracking('calculateDistances.processBatches');
  
  const totalWithDistance = updatedOrders.filter(o => o.estimatedDistance !== undefined).length;
  const startTime = performance.now();
  const totalTimeSeconds = (performance.now() - startTime) / 1000;
  
  logPerformance(`Distance calculations completed`, {
    totalOrders: updatedOrders.length,
    ordersWithDistance: totalWithDistance,
    timeSeconds: totalTimeSeconds.toFixed(2),
    averageTimePerOrder: (totalTimeSeconds / updatedOrders.length).toFixed(2),
    cacheSize: addressCache.size
  });
  
  endBatchLogging(); // End batch operations
  endPerformanceTracking('calculateDistances');
  
  return updatedOrders;
};

/**
 * Process a single order's distance with improved error handling and caching
 */
async function processOrderDistance(order: DeliveryOrder, totalOrderCount: number): Promise<void> {
  startPerformanceTracking(`processOrderDistance.${order.id}`);
  
  try {
    // Already has a distance? Skip calculation or use depending on settings
    if (order.distance && !isNaN(parseFloat(order.distance.toString()))) {
      order.estimatedDistance = parseFloat(order.distance.toString());
      endPerformanceTracking(`processOrderDistance.${order.id}`, { 
        result: 'used-existing',
        value: order.estimatedDistance
      });
      return;
    }
    
    // Try to calculate distance using Mapbox if both pickup and dropoff are available
    if (order.pickup && order.dropoff) {
      // First check if the exact pickup/dropoff pair is in our local simple cache
      const cacheKey = `${order.pickup}|${order.dropoff}`.toLowerCase();
      const cachedDistance = addressCache.get(cacheKey);
      
      if (cachedDistance) {
        order.estimatedDistance = cachedDistance[0]; // Use first element for distance
        endPerformanceTracking(`processOrderDistance.${order.id}`, { 
          result: 'cache-hit',
          value: order.estimatedDistance
        });
        return;
      }
      
      for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        try {
          startPerformanceTracking(`processOrderDistance.${order.id}.attempt${attempt+1}`);
          
          // Try getting cached coordinates first
          let pickupCoords = getCachedAddress(order.pickup);
          let dropoffCoords = getCachedAddress(order.dropoff);
          
          // If not cached, geocode the addresses
          if (!pickupCoords) {
            startPerformanceTracking(`geocodeAddress.${order.id}.pickup`);
            pickupCoords = await geocodeWithTimeout(order.pickup);
            endPerformanceTracking(`geocodeAddress.${order.id}.pickup`);
            
            if (pickupCoords) {
              cacheAddress(order.pickup, pickupCoords);
            }
          }
          
          if (!dropoffCoords) {
            startPerformanceTracking(`geocodeAddress.${order.id}.dropoff`);
            dropoffCoords = await geocodeWithTimeout(order.dropoff);
            endPerformanceTracking(`geocodeAddress.${order.id}.dropoff`);
            
            if (dropoffCoords) {
              cacheAddress(order.dropoff, dropoffCoords);
            }
          }
          
          // Calculate route distance if we have both coordinates
          if (pickupCoords && dropoffCoords) {
            startPerformanceTracking(`calculateRouteDistance.${order.id}`);
            
            // Calculate route distance with timeout
            const routeDistance = await Promise.race([
              calculateRouteDistance([pickupCoords, dropoffCoords]),
              new Promise<null>((_, reject) => 
                setTimeout(() => reject(new Error('Distance calculation timeout')), CALCULATION_TIMEOUT)
              )
            ]);
            
            endPerformanceTracking(`calculateRouteDistance.${order.id}`);
            
            if (routeDistance !== null) {
              const finalDistance = typeof routeDistance === 'number' ? 
                Number(routeDistance.toFixed(1)) : generateDefaultDistance();
              
              order.estimatedDistance = finalDistance;
              
              // Cache the result for this exact pickup/dropoff pair
              addressCache.set(cacheKey, [finalDistance, Date.now()]);
              
              endPerformanceTracking(`processOrderDistance.${order.id}.attempt${attempt+1}`);
              endPerformanceTracking(`processOrderDistance.${order.id}`);
              
              return; // Success, exit the function
            }
          } else {
            // Could not get coordinates for one or both addresses
            endPerformanceTracking(`processOrderDistance.${order.id}.attempt${attempt+1}`);
            
            // Use a default distance if it's the last attempt
            if (attempt === MAX_RETRIES) {
              order.estimatedDistance = generateDefaultDistance();
            }
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          
          // Last attempt? Log error and use default
          if (attempt === MAX_RETRIES) {
            logError(`Failed to calculate distance for order ${order.id}`, error);
            order.estimatedDistance = generateDefaultDistance();
          }
          
          endPerformanceTracking(`processOrderDistance.${order.id}.attempt${attempt+1}`);
        }
      }
    } else {
      // Missing pickup or dropoff, use default
      order.estimatedDistance = generateDefaultDistance();
    }
    
    // If we got here, we used a default distance
    endPerformanceTracking(`processOrderDistance.${order.id}`);
  } catch (error) {
    logError(`Unexpected error processing order ${order.id}:`, error);
    // Ensure we still set a distance even in case of errors
    order.estimatedDistance = generateDefaultDistance();
    
    endPerformanceTracking(`processOrderDistance.${order.id}`);
  }
}

/**
 * Geocode an address with timeout protection
 */
async function geocodeWithTimeout(address: string): Promise<Coordinates | null> {
  try {
    const result = await Promise.race([
      geocodeAddress(address),
      new Promise<null>((_, reject) => 
        setTimeout(() => reject(new Error('Geocoding timeout')), CALCULATION_TIMEOUT / 2)
      )
    ]);
    
    // Return result directly if it's already a valid tuple
    if (result && Array.isArray(result) && result.length === 2 && 
        typeof result[0] === 'number' && typeof result[1] === 'number') {
      return [result[0], result[1]]; // Explicitly return as Coordinates
    }
    
    // Handle object with longitude/latitude properties
    if (result && typeof result === 'object' && 'longitude' in result && 'latitude' in result) {
      const lng = Number((result as any).longitude);
      const lat = Number((result as any).latitude);
      if (!isNaN(lng) && !isNaN(lat)) {
        return [lng, lat]; // Explicitly return as Coordinates
      }
    }
    
    return null;
  } catch (error) {
    logError(`Geocoding error for ${address}:`, error);
    return null;
  }
}

// Generate a default distance if real calculation fails
const generateDefaultDistance = (): number => {
  return Math.round((5 + Math.random() * 10) * 10) / 10; // 5-15 miles
};

// Helper function to clear address cache (exposed for testing/debug)
export const clearAddressCache = (): void => {
  addressCache.clear();
  logInfo(`Address cache cleared`, { previousSize: addressCache.size });
};

// Helper to get cache statistics (exposed for testing/debug)
export const getAddressCacheStats = (): { size: number, hitRatio: number } => {
  return { 
    size: addressCache.size,
    hitRatio: 0 // Would need to track this separately
  };
};
