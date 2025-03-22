
import { DeliveryOrder } from "./csvParser";

export interface TimeEvent {
  timestamp: Date;
  type: 'created' | 'assigned' | 'pickedUp' | 'delivered';
  performedBy?: string;
}

export interface DriverSchedule {
  driverId: string;
  driverName: string;
  shiftStart: Date;
  shiftEnd: Date;
  breaks?: { start: Date; end: Date }[];
  maxDailyHours: number;
  currentOrders?: string[]; // IDs of orders currently assigned
}

export interface OptimizationResult {
  originalTotalDistance: number;
  optimizedTotalDistance: number;
  distanceSaved: number;
  percentageSaved: number;
  originalTotalTime: number; // in minutes
  optimizedTotalTime: number; // in minutes
  timeSaved: number; // in minutes
  reassignments: {
    orderId: string;
    originalDriver: string;
    proposedDriver: string;
    distanceSaved: number;
    timeSaved: number; // in minutes
  }[];
}

// Mock driver schedules for demo purposes
export const getMockDriverSchedules = (date: Date): DriverSchedule[] => {
  // Create schedules for the provided date
  const day = new Date(date);
  day.setHours(0, 0, 0, 0);
  
  return [
    {
      driverId: "D1001",
      driverName: "John Smith",
      shiftStart: new Date(day.getTime() + 8 * 60 * 60 * 1000), // 8 AM
      shiftEnd: new Date(day.getTime() + 16 * 60 * 60 * 1000), // 4 PM
      maxDailyHours: 8,
      currentOrders: []
    },
    {
      driverId: "D1002",
      driverName: "Sarah Jones",
      shiftStart: new Date(day.getTime() + 10 * 60 * 60 * 1000), // 10 AM
      shiftEnd: new Date(day.getTime() + 18 * 60 * 60 * 1000), // 6 PM
      maxDailyHours: 8,
      breaks: [
        { 
          start: new Date(day.getTime() + 13 * 60 * 60 * 1000), // 1 PM
          end: new Date(day.getTime() + 13.5 * 60 * 60 * 1000) // 1:30 PM
        }
      ],
      currentOrders: []
    },
    {
      driverId: "D1003",
      driverName: "Miguel Rodriguez",
      shiftStart: new Date(day.getTime() + 12 * 60 * 60 * 1000), // 12 PM
      shiftEnd: new Date(day.getTime() + 20 * 60 * 60 * 1000), // 8 PM
      maxDailyHours: 8,
      currentOrders: []
    }
  ];
};

// Check if an order has suspicious delays
export const checkForSuspiciousDelays = (order: DeliveryOrder): boolean => {
  if (!order.createdAt || !order.assignedAt) return false;
  
  const createdDate = new Date(order.createdAt);
  const assignedDate = new Date(order.assignedAt);
  
  // If it took more than 1 hour to assign, flag as suspicious
  const hourDifference = (assignedDate.getTime() - createdDate.getTime()) / (1000 * 60 * 60);
  
  // Check if it's a STAT/urgent order
  const isUrgent = order.priority === 'STAT' || order.priority === 'High';
  
  // For urgent orders, even 30 minutes delay is suspicious
  if (isUrgent && hourDifference > 0.5) return true;
  
  // For regular orders, anything over 2 hours is suspicious
  return hourDifference > 2;
};

// Simulate route optimization
export const optimizeRoutes = (
  orders: DeliveryOrder[],
  drivers: DriverSchedule[]
): OptimizationResult => {
  // This is a simplified optimization algorithm for demonstration purposes
  // In a real application, you'd use a more sophisticated routing algorithm
  
  // Create a deep copy of orders to avoid modifying originals
  const optimizedOrders = JSON.parse(JSON.stringify(orders)) as DeliveryOrder[];
  
  // Calculate original metrics
  const originalTotalDistance = orders.reduce((sum, order) => sum + (order.estimatedDistance || 0), 0);
  const originalTotalTime = orders.reduce((sum, order) => sum + ((order.estimatedDistance || 0) * 2), 0); // Assume 2 minutes per mile
  
  // Simple mock optimization: for each order, check if another driver would be better
  const reassignments = [];
  
  for (const order of optimizedOrders) {
    const currentDriverId = order.driverId;
    
    // Skip orders without a driver or distance
    if (!currentDriverId || !order.estimatedDistance) continue;
    
    // Find the current driver
    const currentDriver = drivers.find(d => d.driverId === currentDriverId);
    if (!currentDriver) continue;
    
    // Randomly decide if we "found" a better route (for demo purposes)
    // In reality, this would be a complex routing algorithm
    if (Math.random() > 0.7) {
      // Find an available driver who wasn't the original one
      const availableDrivers = drivers.filter(d => 
        d.driverId !== currentDriverId && 
        d.shiftStart <= new Date(order.assignedAt || Date.now()) &&
        d.shiftEnd >= new Date(order.assignedAt || Date.now())
      );
      
      if (availableDrivers.length > 0) {
        // For demo purposes, pick a random available driver
        const newDriver = availableDrivers[Math.floor(Math.random() * availableDrivers.length)];
        
        // Calculate a fake improvement (10-30% better)
        const improvementFactor = 0.7 + (Math.random() * 0.2); // 0.7-0.9
        const newDistance = order.estimatedDistance * improvementFactor;
        const distanceSaved = order.estimatedDistance - newDistance;
        const timeSaved = distanceSaved * 2; // 2 minutes per mile saved
        
        // Update the order
        order.proposedDriverId = newDriver.driverId;
        order.proposedDriver = newDriver.driverName;
        order.proposedDistance = newDistance;
        
        // Track the reassignment
        reassignments.push({
          orderId: order.id,
          originalDriver: currentDriver.driverName,
          proposedDriver: newDriver.driverName,
          distanceSaved,
          timeSaved
        });
      }
    }
  }
  
  // Calculate optimized metrics
  const optimizedTotalDistance = optimizedOrders.reduce((sum, order) => {
    // Use proposed distance if available, otherwise use original
    return sum + (order.proposedDistance || order.estimatedDistance || 0);
  }, 0);
  
  const optimizedTotalTime = optimizedTotalDistance * 2; // Assume 2 minutes per mile
  
  return {
    originalTotalDistance,
    optimizedTotalDistance,
    distanceSaved: originalTotalDistance - optimizedTotalDistance,
    percentageSaved: ((originalTotalDistance - optimizedTotalDistance) / originalTotalDistance) * 100,
    originalTotalTime,
    optimizedTotalTime,
    timeSaved: originalTotalTime - optimizedTotalTime,
    reassignments
  };
};
