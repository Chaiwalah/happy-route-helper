
import { DeliveryOrder } from "./csvParser";

// Extend the DeliveryOrder type to include dispatcher investigation fields
declare module '@/utils/csvParser' {
  interface DeliveryOrder {
    createdAt?: string;
    assignedAt?: string;
    pickedUpAt?: string;
    deliveredAt?: string;
    
    dispatcher?: string;
    driverId?: string;
    
    priority?: 'STAT' | 'High' | 'Medium' | 'Low';
    status?: 'Created' | 'Assigned' | 'In Progress' | 'Delivered' | 'Cancelled';
    
    // For optimization results
    proposedDriverId?: string;
    proposedDriver?: string;
    proposedDistance?: number;
    
    // Flag for suspicious delays
    hasSuspiciousDelay?: boolean;
  }
}

export enum PriorityLevel {
  STAT = 'STAT',
  High = 'High',
  Medium = 'Medium',
  Low = 'Low'
}

export enum OrderStatus {
  Created = 'Created',
  Assigned = 'Assigned',
  InProgress = 'In Progress',
  Delivered = 'Delivered',
  Cancelled = 'Cancelled'
}

// Helper function to enhance orders with mock time data for demonstration
export const enhanceOrdersWithTimeData = (orders: DeliveryOrder[]): DeliveryOrder[] => {
  const now = new Date();
  
  return orders.map(order => {
    // Generate random times for demo purposes
    const createdAt = new Date(now.getTime() - Math.random() * 86400000 * 3); // Within last 3 days
    const assignedAt = new Date(createdAt.getTime() + (Math.random() * 7200000)); // 0-2 hours after creation
    const pickedUpAt = assignedAt ? new Date(assignedAt.getTime() + (Math.random() * 3600000)) : undefined; // 0-1 hour after assignment
    const deliveredAt = pickedUpAt ? new Date(pickedUpAt.getTime() + (Math.random() * 3600000)) : undefined; // 0-1 hour after pickup
    
    // Randomly assign priority and status
    const priorities = [PriorityLevel.STAT, PriorityLevel.High, PriorityLevel.Medium, PriorityLevel.Low];
    const statuses = [OrderStatus.Created, OrderStatus.Assigned, OrderStatus.InProgress, OrderStatus.Delivered];
    
    // Assign random driver ID with format D100X
    const driverId = `D100${Math.floor(Math.random() * 5) + 1}`;
    
    // Create enhanced order
    const enhancedOrder: DeliveryOrder = {
      ...order,
      createdAt: createdAt.toISOString(),
      assignedAt: assignedAt.toISOString(),
      pickedUpAt: pickedUpAt?.toISOString(),
      deliveredAt: deliveredAt?.toISOString(),
      
      dispatcher: Math.random() > 0.5 ? 'Alice Johnson' : 'Bob Williams',
      driverId,
      
      priority: priorities[Math.floor(Math.random() * priorities.length)],
      status: statuses[Math.floor(Math.random() * statuses.length)],
    };
    
    // Check for suspicious delays
    enhancedOrder.hasSuspiciousDelay = Math.random() > 0.7; // 30% chance of suspicious delay for demo
    
    return enhancedOrder;
  });
};
