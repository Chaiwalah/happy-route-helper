
import { useMemo } from 'react';
import { DeliveryOrder } from '@/utils/csvParser';
import { format } from 'date-fns';

export const useMapData = (orders: DeliveryOrder[], selectedDriver: string | null, selectedDate: Date | null, sortByDistance: 'asc' | 'desc' | null) => {
  // Get unique drivers from orders
  const drivers = useMemo(() => {
    const driverSet = new Set<string>();
    orders.forEach(order => {
      if (order.driver && order.driver.trim()) {
        driverSet.add(order.driver);
      }
    });
    return Array.from(driverSet).sort();
  }, [orders]);

  // Get unique dates from orders
  const dates = useMemo(() => {
    const dateSet = new Set<string>();
    orders.forEach(order => {
      // Try to get date from either the date field or exReadyTime/exDeliveryTime
      let dateStr = order.date ? order.date.split('T')[0] : null;
      
      // If no explicit date, try to extract from time fields
      if (!dateStr && order.exReadyTime) {
        dateStr = order.exReadyTime.split('T')[0];
      } else if (!dateStr && order.exDeliveryTime) {
        dateStr = order.exDeliveryTime.split('T')[0];
      }
      
      if (dateStr) {
        dateSet.add(dateStr);
      }
    });
    return Array.from(dateSet).sort();
  }, [orders]);

  // Get unique trips
  const trips = useMemo(() => {
    const tripSet = new Set<string>();
    orders.forEach(order => {
      if (order.tripNumber && order.tripNumber.trim()) {
        tripSet.add(order.tripNumber);
      }
    });
    return Array.from(tripSet).sort();
  }, [orders]);

  // Driver statistics by date
  const driverStats = useMemo(() => {
    const stats: Record<string, { 
      totalOrders: number; 
      totalDistance: number;
      tripCounts: Record<string, number>;
      date: string;
    }> = {};
    
    orders.forEach(order => {
      if (!order.driver || !order.driver.trim()) return;
      
      // Get date from order
      let dateStr = order.date ? order.date.split('T')[0] : null;
      if (!dateStr && order.exReadyTime) {
        dateStr = order.exReadyTime.split('T')[0];
      } else if (!dateStr && order.exDeliveryTime) {
        dateStr = order.exDeliveryTime.split('T')[0];
      }
      
      if (!dateStr) return;
      
      // Skip if filtered by date and doesn't match
      if (selectedDate && dateStr !== format(selectedDate, 'yyyy-MM-dd')) return;
      
      // Skip if filtered by driver and doesn't match
      if (selectedDriver && order.driver !== selectedDriver) return;
      
      const key = `${order.driver}_${dateStr}`;
      
      if (!stats[key]) {
        stats[key] = { 
          totalOrders: 0, 
          totalDistance: 0,
          tripCounts: {},
          date: dateStr
        };
      }
      
      stats[key].totalOrders++;
      
      // Add distance if available
      if (order.estimatedDistance) {
        stats[key].totalDistance += Number(order.estimatedDistance);
      } else if (order.distance) {
        stats[key].totalDistance += Number(order.distance);
      }
      
      // Count trips
      if (order.tripNumber && order.tripNumber.trim()) {
        if (!stats[key].tripCounts[order.tripNumber]) {
          stats[key].tripCounts[order.tripNumber] = 0;
        }
        stats[key].tripCounts[order.tripNumber]++;
      }
    });
    
    // Convert to array and sort
    let statsArray = Object.entries(stats).map(([key, value]) => {
      const [driver, date] = key.split('_');
      return {
        driver,
        date,
        totalOrders: value.totalOrders,
        totalDistance: parseFloat(value.totalDistance.toFixed(1)),
        tripCounts: value.tripCounts,
        tripCount: Object.keys(value.tripCounts).length
      };
    });
    
    // Sort by distance if requested
    if (sortByDistance === 'asc') {
      statsArray = statsArray.sort((a, b) => a.totalDistance - b.totalDistance);
    } else if (sortByDistance === 'desc') {
      statsArray = statsArray.sort((a, b) => b.totalDistance - a.totalDistance);
    }
    
    return statsArray;
  }, [orders, selectedDriver, selectedDate, sortByDistance]);

  return {
    drivers,
    dates,
    trips,
    driverStats
  };
};
