
import { DeliveryOrder } from "./csvParser";

// This is a simplified mock implementation. In a real application, 
// you would integrate with a mapping API like Google Maps, Mapbox, etc.
export const calculateDistances = async (
  orders: DeliveryOrder[]
): Promise<DeliveryOrder[]> => {
  // This is a mock that simulates API latency
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  return orders.map(order => {
    // Mock distance calculation - in a real app, this would call an API
    const estimatedDistance = mockDistanceCalculation(order.pickup, order.dropoff);
    
    return {
      ...order,
      estimatedDistance
    };
  });
};

// Mock function to generate semi-realistic distances
const mockDistanceCalculation = (origin: string, destination: string): number => {
  // Generate a somewhat consistent but random-looking distance
  // This uses string hashing for consistency - same addresses always give same distance
  const seed = hashString(`${origin}-${destination}`);
  const random = seededRandom(seed);
  
  // Generate distance between 1 and 20 miles
  return Math.round((1 + random * 19) * 10) / 10;
};

// Simple string hash function to generate a numeric seed
const hashString = (str: string): number => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
};

// Seeded random number generator
const seededRandom = (seed: number): number => {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
};
