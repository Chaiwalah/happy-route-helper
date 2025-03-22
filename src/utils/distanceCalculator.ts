
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
  getCachedAddress
} from './performanceLogger';

// Maximum time to wait for a distance calculation (in milliseconds)
const CALCULATION_TIMEOUT = 10000; // 10 seconds
const MAX_RETRIES = 2; // Maximum number of retries for failed calculations
const CONCURRENT_BATCHES = 3; // Number of batches to process in parallel
const BATCH_SIZE = 5; // Size of each batch

/**
 * Calculate distances for multiple orders with improved performance
 */
export const calculateDistances = async (
  orders: DeliveryOrder[]
): Promise<DeliveryOrder[]> => {
  startPerformanceTracking('calculateDistances', { orderCount: orders.length });
  logInfo(`Starting distance calculations for ${orders.length} orders`);
  
  // Create a copy of the orders to avoid mutation
  const updatedOrders = [...orders];
  
  // Set up batching with improved concurrency
  const batches: DeliveryOrder[][] = [];
  
  // Create smaller batches for parallel processing
  for (let i = 0; i < updatedOrders.length; i += BATCH_SIZE) {
    batches.push(updatedOrders.slice(i, i + BATCH_SIZE));
  }
  
  logInfo(`Split ${updatedOrders.length} orders into ${batches.length} batches of max ${BATCH_SIZE} orders each`);
  startPerformanceTracking('calculateDistances.processBatches', { batchCount: batches.length });
  
  // Process multiple batches in parallel with a concurrency limit
  for (let i = 0; i < batches.length; i += CONCURRENT_BATCHES) {
    const currentBatches = batches.slice(i, i + CONCURRENT_BATCHES);
    
    try {
      // Process current set of batches concurrently
      await Promise.all(
        currentBatches.map(async (batch, batchIndex) => {
          const batchNumber = i + batchIndex + 1;
          startPerformanceTracking(`calculateDistances.processBatch.${batchNumber}`, { 
            batchSize: batch.length,
            batchNumber 
          });
          
          // Process all orders in this batch concurrently
          await Promise.all(
            batch.map(order => processOrderDistance(order, updatedOrders.length))
          );
          
          endPerformanceTracking(`calculateDistances.processBatch.${batchNumber}`, {
            batchSize: batch.length,
            batchNumber
          });
        })
      );
    } catch (error) {
      logError(`Error processing batch set ${i / CONCURRENT_BATCHES + 1}:`, error);
    }
  }
  
  endPerformanceTracking('calculateDistances.processBatches', { 
    batchCount: batches.length, 
    ordersProcessed: updatedOrders.length 
  });
  
  const totalWithDistance = updatedOrders.filter(o => o.estimatedDistance !== undefined).length;
  const totalTimeSeconds = (performance.now() - (performanceLogger as any).operations.get('calculateDistances')) / 1000;
  
  logPerformance(`Distance calculations completed`, {
    totalOrders: updatedOrders.length,
    ordersWithDistance: totalWithDistance,
    timeSeconds: totalTimeSeconds.toFixed(2),
    averageTimePerOrder: (totalTimeSeconds / updatedOrders.length).toFixed(2)
  });
  
  endPerformanceTracking('calculateDistances', { 
    totalOrders: updatedOrders.length, 
    ordersWithDistance: totalWithDistance,
    timeSeconds: totalTimeSeconds.toFixed(2)
  });
  
  return updatedOrders;
};

/**
 * Process a single order's distance with improved error handling and caching
 */
async function processOrderDistance(order: DeliveryOrder, totalOrderCount: number): Promise<void> {
  startPerformanceTracking(`processOrderDistance.${order.id}`, {
    hasPickup: !!order.pickup,
    hasDropoff: !!order.dropoff
  });
  
  try {
    // Already has a distance? Skip calculation
    if (order.distance && !isNaN(parseFloat(order.distance.toString()))) {
      order.estimatedDistance = parseFloat(order.distance.toString());
      logProgress(order.id, totalOrderCount);
      endPerformanceTracking(`processOrderDistance.${order.id}`, { 
        result: 'used-existing', 
        distance: order.estimatedDistance 
      });
      return;
    }
    
    // Try to calculate distance using Mapbox if both pickup and dropoff are available
    if (order.pickup && order.dropoff) {
      for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        try {
          startPerformanceTracking(`processOrderDistance.${order.id}.attempt${attempt+1}`);
          
          // Try getting cached coordinates first
          let pickupCoords = getCachedAddress(order.pickup);
          let dropoffCoords = getCachedAddress(order.dropoff);
          
          // If not cached, geocode the addresses
          if (!pickupCoords) {
            logDebug(`Geocoding pickup address: ${order.pickup}`);
            startPerformanceTracking(`geocodeAddress.${order.id}.pickup`);
            pickupCoords = await geocodeWithTimeout(order.pickup);
            endPerformanceTracking(`geocodeAddress.${order.id}.pickup`, { 
              success: !!pickupCoords,
              coords: pickupCoords
            });
            
            // Cache the result if successful
            if (pickupCoords) {
              cacheAddress(order.pickup, pickupCoords);
            }
          } else {
            logDebug(`Using cached pickup coordinates for ${order.pickup}`);
          }
          
          if (!dropoffCoords) {
            logDebug(`Geocoding dropoff address: ${order.dropoff}`);
            startPerformanceTracking(`geocodeAddress.${order.id}.dropoff`);
            dropoffCoords = await geocodeWithTimeout(order.dropoff);
            endPerformanceTracking(`geocodeAddress.${order.id}.dropoff`, { 
              success: !!dropoffCoords,
              coords: dropoffCoords
            });
            
            // Cache the result if successful
            if (dropoffCoords) {
              cacheAddress(order.dropoff, dropoffCoords);
            }
          } else {
            logDebug(`Using cached dropoff coordinates for ${order.dropoff}`);
          }
          
          // Calculate route distance if we have both coordinates
          if (pickupCoords && dropoffCoords) {
            logDebug(`Calculating route distance for ${order.id}`);
            startPerformanceTracking(`calculateRouteDistance.${order.id}`);
            
            // Calculate route distance with timeout
            const routeDistance = await Promise.race([
              calculateRouteDistance([pickupCoords, dropoffCoords]),
              new Promise<null>((_, reject) => 
                setTimeout(() => reject(new Error('Distance calculation timeout')), CALCULATION_TIMEOUT)
              )
            ]);
            
            endPerformanceTracking(`calculateRouteDistance.${order.id}`, { 
              success: routeDistance !== null,
              distance: routeDistance
            });
            
            if (routeDistance !== null) {
              order.estimatedDistance = Number(routeDistance.toFixed(1));
              logProgress(order.id, totalOrderCount);
              
              endPerformanceTracking(`processOrderDistance.${order.id}.attempt${attempt+1}`, { 
                success: true,
                distance: order.estimatedDistance,
                attempt: attempt + 1
              });
              
              endPerformanceTracking(`processOrderDistance.${order.id}`, { 
                result: 'calculated', 
                distance: order.estimatedDistance,
                attempts: attempt + 1
              });
              
              return; // Success, exit the function
            }
          } else {
            // Could not get coordinates for one or both addresses
            logWarning(`Could not geocode addresses for order ${order.id}`, {
              pickupSuccess: !!pickupCoords,
              dropoffSuccess: !!dropoffCoords,
              pickup: order.pickup,
              dropoff: order.dropoff
            });
            
            endPerformanceTracking(`processOrderDistance.${order.id}.attempt${attempt+1}`, { 
              success: false,
              reason: 'geocoding-failed',
              attempt: attempt + 1
            });
            
            // Use a default distance if it's the last attempt
            if (attempt === MAX_RETRIES) {
              order.estimatedDistance = generateDefaultDistance();
              logProgress(order.id, totalOrderCount);
            }
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          
          // Last attempt? Log error and use default
          if (attempt === MAX_RETRIES) {
            logError(`Failed to calculate distance for order ${order.id} after ${MAX_RETRIES + 1} attempts: ${errorMessage}`);
            order.estimatedDistance = generateDefaultDistance();
            logProgress(order.id, totalOrderCount);
          } else {
            // Not last attempt, wait briefly before retry
            logWarning(`Attempt ${attempt + 1} failed for order ${order.id}: ${errorMessage}. Retrying...`);
            await new Promise(r => setTimeout(r, 500)); // Wait 500ms before retry
          }
          
          endPerformanceTracking(`processOrderDistance.${order.id}.attempt${attempt+1}`, { 
            success: false,
            error: errorMessage,
            attempt: attempt + 1
          });
        }
      }
    } else {
      // Missing pickup or dropoff, use default
      logWarning(`Missing pickup or dropoff for order ${order.id}, using default distance`, {
        hasPickup: !!order.pickup,
        hasDropoff: !!order.dropoff
      });
      
      order.estimatedDistance = generateDefaultDistance();
      logProgress(order.id, totalOrderCount);
    }
    
    // If we got here, we used a default distance
    endPerformanceTracking(`processOrderDistance.${order.id}`, { 
      result: 'default', 
      distance: order.estimatedDistance
    });
  } catch (error) {
    logError(`Unexpected error processing order ${order.id}:`, error);
    // Ensure we still set a distance even in case of errors
    order.estimatedDistance = generateDefaultDistance();
    logProgress(order.id, totalOrderCount);
    
    endPerformanceTracking(`processOrderDistance.${order.id}`, { 
      result: 'error', 
      distance: order.estimatedDistance,
      error: error instanceof Error ? error.message : String(error)
    });
  }
}

/**
 * Geocode an address with timeout protection
 */
async function geocodeWithTimeout(address: string): Promise<[number, number] | null> {
  try {
    return await Promise.race([
      geocodeAddress(address),
      new Promise<null>((_, reject) => 
        setTimeout(() => reject(new Error('Geocoding timeout')), CALCULATION_TIMEOUT / 2)
      )
    ]);
  } catch (error) {
    logError(`Geocoding error for ${address}:`, error);
    return null;
  }
}

// Log progress to console for debugging
const logProgress = (orderId: string, total: number) => {
  const current = parseInt(orderId.replace('order-', ''));
  const percentage = Math.round((current / total) * 100);
  logDebug(`Distance calculation progress: ${orderId}/${total} (${percentage}%)`);
};

// Log warning with timestamp
const logWarning = (message: string, data?: any) => {
  logDebug(`⚠️ WARNING: ${message}`, data);
};

// Generate a default distance if real calculation fails
const generateDefaultDistance = (): number => {
  return Math.round((5 + Math.random() * 10) * 10) / 10; // 5-15 miles
};
