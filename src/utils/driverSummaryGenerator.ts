
import { InvoiceItem, DriverSummary } from './invoiceTypes';

export const generateDriverSummaries = (items: InvoiceItem[]): DriverSummary[] => {
  const driverMap = new Map<string, DriverSummary>();
  
  items.forEach(item => {
    const driver = item.driver;
    if (!driverMap.has(driver)) {
      driverMap.set(driver, {
        name: driver,
        orderCount: 0,
        totalDistance: 0,
        totalEarnings: 0
      });
    }
    
    const summary = driverMap.get(driver)!;
    summary.orderCount += 1;
    summary.totalDistance += item.distance;
    summary.totalEarnings += item.totalCost;
  });
  
  return Array.from(driverMap.values());
};
