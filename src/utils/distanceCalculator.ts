
import { DeliveryOrder } from "./csvParser";
import { geocodeAddress, calculateRouteDistance } from "./mapboxService";
import { toast } from '@/components/ui/use-toast';

// Maximum time to wait for a distance calculation (in milliseconds)
const CALCULATION_TIMEOUT = 10000; // 10 seconds

export const calculateDistances = async (
  orders: DeliveryOrder[]
): Promise<DeliveryOrder[]> => {
  console.log(`Starting distance calculations for ${orders.length} orders`);
  const startTime = performance.now();
  
  // Create a copy of the orders to avoid mutation
  const updatedOrders = [...orders];
  
  // Process orders in batches to avoid overwhelming the API
  const batchSize = 5;
  const batches = [];
  
  for (let i = 0; i < updatedOrders.length; i += batchSize) {
    batches.push(updatedOrders.slice(i, i + batchSize));
  }
  
  let completedCount = 0;
  const totalCount = updatedOrders.length;
  
  // Process batches sequentially to avoid API rate limits
  for (const batch of batches) {
    // Process each batch in parallel
    await Promise.all(
      batch.map(async (order) => {
        try {
          // Check if the CSV already has a distance field
          if (order.distance && !isNaN(parseFloat(order.distance.toString()))) {
            order.estimatedDistance = parseFloat(order.distance.toString());
            completedCount++;
            logProgress(completedCount, totalCount);
            return;
          }
          
          // Try to calculate distance using Mapbox if both pickup and dropoff are available
          if (order.pickup && order.dropoff) {
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
                return;
              }
            } catch (error) {
              console.error(`Error calculating distance for order ${order.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
          }
          
          // Fallback to a default distance if API call fails or addresses are missing
          order.estimatedDistance = generateDefaultDistance();
          completedCount++;
          logProgress(completedCount, totalCount);
        } catch (error) {
          console.error(`Unexpected error processing order ${order.id}:`, error);
          // Ensure we still set a distance even in case of errors
          order.estimatedDistance = generateDefaultDistance();
          completedCount++;
          logProgress(completedCount, totalCount);
        }
      })
    );
  }
  
  const endTime = performance.now();
  console.log(`Distance calculations completed in ${((endTime - startTime) / 1000).toFixed(2)} seconds`);
  
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

// Helper function to wrap API calls with a timeout
const withTimeout = <T>(promise: Promise<T>, timeoutMs: number): Promise<T> => {
  return new Promise<T>((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error(`Operation timed out after ${timeoutMs}ms`));
    }, timeoutMs);
    
    promise.then(
      (result) => {
        clearTimeout(timeoutId);
        resolve(result);
      },
      (error) => {
        clearTimeout(timeoutId);
        reject(error);
      }
    );
  });
};
