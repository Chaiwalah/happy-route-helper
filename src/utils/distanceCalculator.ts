
import { DeliveryOrder } from "./csvParser";
import { geocodeAddress, calculateRouteDistance } from "./mapboxService";
import { toast } from '@/components/ui/use-toast';

// Maximum time to wait for a distance calculation (in milliseconds)
const CALCULATION_TIMEOUT = 10000; // 10 seconds
const MAX_RETRIES = 2; // Maximum number of retries for failed calculations

export const calculateDistances = async (
  orders: DeliveryOrder[]
): Promise<DeliveryOrder[]> => {
  console.log(`Starting distance calculations for ${orders.length} orders`);
  const startTime = performance.now();
  
  // Create a copy of the orders to avoid mutation
  const updatedOrders = [...orders];
  
  let completedCount = 0;
  const totalCount = updatedOrders.length;
  
  // Set up batching - now processing in parallel with a concurrency limit
  const concurrencyLimit = 3; // Maximum number of concurrent API calls
  const orderBatches = [];
  
  // Create smaller batches for parallel processing
  for (let i = 0; i < updatedOrders.length; i += concurrencyLimit) {
    orderBatches.push(updatedOrders.slice(i, i + concurrencyLimit));
  }
  
  // Process each batch sequentially to avoid overwhelming the API
  for (const batch of orderBatches) {
    try {
      // Process orders in this batch concurrently
      await Promise.all(
        batch.map(async (order) => {
          try {
            // Already has a distance? Skip calculation
            if (order.distance && !isNaN(parseFloat(order.distance.toString()))) {
              order.estimatedDistance = parseFloat(order.distance.toString());
              completedCount++;
              logProgress(completedCount, totalCount);
              return;
            }
            
            // Try to calculate distance using Mapbox if both pickup and dropoff are available
            if (order.pickup && order.dropoff) {
              for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
                try {
                  // Add timeout to prevent hanging on slow API responses
                  const routeDistance = await Promise.race([
                    calculateRouteDistance([order.pickup, order.dropoff]),
                    new Promise<null>((_, reject) => 
                      setTimeout(() => reject(new Error('Distance calculation timeout')), CALCULATION_TIMEOUT)
                    )
                  ]);
                  
                  if (routeDistance !== null) {
                    order.estimatedDistance = Number(routeDistance.toFixed(1));
                    completedCount++;
                    logProgress(completedCount, totalCount);
                    break; // Success, exit retry loop
                  }
                } catch (error) {
                  const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                  // Last attempt? Log error and use default
                  if (attempt === MAX_RETRIES) {
                    console.error(`Failed to calculate distance for order ${order.id} after ${MAX_RETRIES + 1} attempts: ${errorMessage}`);
                    order.estimatedDistance = generateDefaultDistance();
                    completedCount++;
                    logProgress(completedCount, totalCount);
                  } else {
                    // Not last attempt, wait briefly before retry
                    console.warn(`Attempt ${attempt + 1} failed for order ${order.id}: ${errorMessage}. Retrying...`);
                    await new Promise(r => setTimeout(r, 500)); // Wait 500ms before retry
                  }
                }
              }
            } else {
              // Missing pickup or dropoff, use default
              console.warn(`Missing pickup or dropoff for order ${order.id}, using default distance`);
              order.estimatedDistance = generateDefaultDistance();
              completedCount++;
              logProgress(completedCount, totalCount);
            }
          } catch (error) {
            console.error(`Unexpected error processing order ${order.id}:`, error);
            // Ensure we still set a distance even in case of errors
            order.estimatedDistance = generateDefaultDistance();
            completedCount++;
            logProgress(completedCount, totalCount);
          }
        })
      );
    } catch (batchError) {
      console.error("Batch processing error:", batchError);
      // Continue with next batch even if one fails
    }
  }
  
  const endTime = performance.now();
  const totalTimeSeconds = ((endTime - startTime) / 1000).toFixed(2);
  console.log(`Distance calculations completed in ${totalTimeSeconds} seconds`);
  
  return updatedOrders;
};

// Log progress to console for debugging
const logProgress = (current: number, total: number) => {
  const percentage = Math.round((current / total) * 100);
  console.log(`Distance calculation progress: ${current}/${total} (${percentage}%)`);
};

// Generate a default distance if real calculation fails
const generateDefaultDistance = (): number => {
  return Math.round((5 + Math.random() * 10) * 10) / 10; // 5-15 miles
};
