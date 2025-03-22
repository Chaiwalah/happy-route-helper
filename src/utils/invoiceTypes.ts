
import { DeliveryOrder } from './csvParser';

export type Issue = {
  orderId: string;
  driver: string;
  message: string;
  details: string;
  severity: 'warning' | 'error';
};

export type InvoiceItem = {
  orderId: string;
  driver: string;
  pickup: string;
  dropoff: string;
  distance: number;
  stops: number;
  routeType: 'single' | 'multi-stop';
  baseCost: number;
  addOns: number;
  totalCost: number;
};

export type DriverSummary = {
  name: string;
  orderCount: number;
  totalDistance: number;
  totalEarnings: number;
};

export type Invoice = {
  date: string;
  items: InvoiceItem[];
  totalDistance: number;
  totalCost: number;
  driverSummaries: DriverSummary[];
};

export type OrderRoute = {
  routeKey: string;
  orders: DeliveryOrder[];
};
