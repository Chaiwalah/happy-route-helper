
import { DeliveryOrder } from './csvParser';

export interface OrderRoute {
  routeKey: string;
  orders: DeliveryOrder[];
  tripNumber: string | null;
  isMultiStop: boolean;
  hasPumpPickups?: boolean;
}

export interface InvoiceItem {
  routeKey: string;
  tripNumber: string | null;
  orderId: string;
  driver: string;
  pickup: string;
  dropoff: string;
  distance: number;
  stops: number;
  billableStops?: number; // Count of stops excluding pump pickups at existing addresses
  hasPumpPickups?: boolean;
  pumpPickupCount?: number;
  routeType: 'single' | 'multi-stop';
  baseCost: number;
  addOns: number;
  totalCost: number;
  timeWindow?: string;
  orderIds: string[];
  orders: DeliveryOrder[];
  cost: number; // For backward compatibility
  recalculated?: boolean;
  originalDistance?: number;
  // PDF generation fields
  details?: string;
  timestamp?: string;
  date?: string;
}

export interface DriverSummary {
  driver: string;
  totalOrders: number;
  totalRoutes: number;
  totalDistance: number;
  totalCost: number;
  singleOrders: number;
  multiStopRoutes: number;
  averageStopsPerRoute: number;
  pumpPickupCount?: number;
}

export interface Invoice {
  id: string;
  date: string; 
  items: InvoiceItem[];
  totalDistance: number;
  totalCost: number;
  driverSummaries: DriverSummary[];
  status: 'draft' | 'reviewed' | 'finalized';
  lastModified: string;
  recalculatedCount?: number;
  weekEnding: string;
  businessName: string;
  businessType: 'pharmacy' | 'lab' | 'hospital' | 'other';
  contactPerson: string;
  pdfSettings?: PDFTemplateSettings;
}

export interface PDFTemplateSettings {
  logo?: string;
  companyName: string;
  companyAddress: string;
  companyContact: string;
  showDriverDetails: boolean;
  showItemDetails: boolean;
  template: 'standard' | 'detailed' | 'minimal';
  color: string;
}

export interface Issue {
  orderId: string;
  driver: string;
  message: string;
  details: string;
  severity: 'info' | 'warning' | 'error';
}

export interface InvoiceGenerationSettings {
  allowManualDistanceAdjustment: boolean;
  flagDriverLoadThreshold: number;
  flagDistanceThreshold: number;
  flagTimeWindowThreshold: number;
}
