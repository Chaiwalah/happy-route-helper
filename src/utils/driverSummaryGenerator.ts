
import { InvoiceItem, DriverSummary } from './invoiceTypes';

export const generateDriverSummaries = (items: InvoiceItem[]): DriverSummary[] => {
  const driverMap = new Map<string, DriverSummary>();
  
  items.forEach(item => {
    const driver = item.driver;
    if (!driverMap.has(driver)) {
      driverMap.set(driver, {
        driver, // Use 'driver' instead of 'name' to match the DriverSummary interface
        trips: 0, // Change 'orderCount' to 'trips' to match the interface
        totalDistance: 0,
        totalEarnings: 0
      });
    }
    
    const summary = driverMap.get(driver)!;
    summary.trips += 1; // Update 'trips' instead of 'orderCount'
    summary.totalDistance += item.distance;
    summary.totalEarnings += item.totalCost || 0;
  });
  
  return Array.from(driverMap.values());
};
